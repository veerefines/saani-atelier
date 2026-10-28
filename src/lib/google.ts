import crypto from 'node:crypto';
import * as db from './db';

/**
 * Saani's Google account, for meetups: she connects once (OAuth, "see and edit events" only), and
 * the site then puts each meetup in her Google Calendar with a real Google Meet link; Google emails
 * her friends the invite. The refresh token stays on the server, in the doc store.
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET switch it on; GOOGLE_API_BASE points at a fake in tests.
 */

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const AUTH = () => process.env.GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = () => (process.env.GOOGLE_API_BASE ? `${process.env.GOOGLE_API_BASE}/token` : 'https://oauth2.googleapis.com/token');
const CAL = () => (process.env.GOOGLE_API_BASE ? `${process.env.GOOGLE_API_BASE}/calendar/v3` : 'https://www.googleapis.com/calendar/v3');

export const googleReady = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

type Link = { id: 'saani'; createdAt: string; refreshToken: string };
const COL = 'google';
export const googleLinked = async () => Boolean((await db.get<Link>(COL, 'saani'))?.refreshToken);
export const unlinkGoogle = () => db.remove(COL, 'saani');

export const redirectUri = (origin: string) => `${origin}/api/google/callback`;
export const newState = () => crypto.randomBytes(18).toString('base64url');

/** Where to send her to say yes to Google. */
export function consentUrl(origin: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    // always ask, so Google sends a refresh token every time she connects
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH()}?${p.toString()}`;
}

/** She said yes: swap the code for tokens and keep the refresh token. */
export async function linkGoogle(code: string, origin: string) {
  const r = await fetch(TOKEN(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri(origin), grant_type: 'authorization_code' }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.refresh_token) throw new Error(j.error_description || j.error || 'Google didn’t send a token');
  await db.put<Link>(COL, { id: 'saani', createdAt: new Date().toISOString(), refreshToken: j.refresh_token });
  cached = j.access_token ? { token: j.access_token, until: Date.now() + (Number(j.expires_in) || 3000) * 1000 - 60_000 } : null;
}

let cached: { token: string; until: number } | null = null;
export class GoogleNotLinked extends Error {}

async function accessToken() {
  if (cached && cached.until > Date.now()) return cached.token;
  const link = await db.get<Link>(COL, 'saani');
  if (!link?.refreshToken) throw new GoogleNotLinked('Connect Google first.');
  const r = await fetch(TOKEN(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: link.refreshToken, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    // she removed the site's access in her Google account: ask her to connect again
    if (j.error === 'invalid_grant') await unlinkGoogle();
    throw new GoogleNotLinked('Google needs connecting again.');
  }
  cached = { token: j.access_token, until: Date.now() + (Number(j.expires_in) || 3000) * 1000 - 60_000 };
  return cached.token;
}

/** A meetup in her Google Calendar with a Google Meet link; Google emails the guests. */
export async function createMeet(m: { id: string; title: string; start: string; minutes: number; emails: string[]; note: string }) {
  const end = new Date(Date.parse(m.start) + m.minutes * 60_000).toISOString();
  const r = await fetch(`${CAL()}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: m.title,
      description: m.note,
      start: { dateTime: m.start, timeZone: 'Europe/Rome' },
      end: { dateTime: end, timeZone: 'Europe/Rome' },
      attendees: m.emails.map((email) => ({ email })),
      conferenceData: { createRequest: { requestId: m.id, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || `Google said ${r.status}`);
  const link = j.hangoutLink || j.conferenceData?.entryPoints?.find((e: { entryPointType: string }) => e.entryPointType === 'video')?.uri || null;
  return { eventId: String(j.id), meetLink: link as string | null };
}

/** Move a meetup, or change who's coming (Google tells the guests). */
export async function updateMeet(eventId: string, m: { title: string; start: string; minutes: number; emails: string[] }) {
  const end = new Date(Date.parse(m.start) + m.minutes * 60_000).toISOString();
  const r = await fetch(`${CAL()}/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary: m.title, start: { dateTime: m.start, timeZone: 'Europe/Rome' }, end: { dateTime: end, timeZone: 'Europe/Rome' }, attendees: m.emails.map((email) => ({ email })) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`Google said ${r.status}`);
}

/** Cancel it in Google too (Google tells the guests). */
export async function cancelMeet(eventId: string) {
  const r = await fetch(`${CAL()}/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${await accessToken()}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error(`Google said ${r.status}`);
}

/* ---------- friends' emails (for Google invites), set in admin ---------- */
type Emails = { id: 'emails'; createdAt: string; map: Record<string, string> };
export const friendEmails = async () => (await db.get<Emails>('friend-emails', 'emails'))?.map ?? {};
export const isEmail = (x: unknown): x is string => typeof x === 'string' && x.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
export async function setFriendEmail(id: string, email: string | null) {
  const map = { ...(await friendEmails()) };
  if (email) map[id] = email.trim().toLowerCase();
  else delete map[id];
  await db.put<Emails>('friend-emails', { id: 'emails', createdAt: new Date().toISOString(), map });
  return map;
}
