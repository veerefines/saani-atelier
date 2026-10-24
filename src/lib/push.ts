import crypto from 'node:crypto';
import webpush from 'web-push';
import * as db from './db';

/**
 * Web push to Saanika's devices: "something new arrived".
 * Subscriptions live in the docs store (collection "push"); only she can subscribe.
 */

export type PushSub = {
  id: string;
  createdAt: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
export const pushReady = Boolean(PUBLIC && PRIVATE);
export const vapidPublicKey = () => PUBLIC ?? null;

let configured = false;
function configure() {
  if (configured || !pushReady) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://saani-atelier.vercel.app', PUBLIC!, PRIVATE!);
  configured = true;
}

const idFor = (endpoint: string) => 'ps_' + crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 24);

export async function saveSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  return db.put<PushSub>('push', { id: idFor(sub.endpoint), createdAt: new Date().toISOString(), endpoint: sub.endpoint, keys: sub.keys });
}
export const removeSubscription = (endpoint: string) => db.remove('push', idFor(endpoint));

/** Tell her something arrived. Never throws: a failed push must not fail the friend's post. */
export async function notifySaanika(msg: { title: string; body: string; url: string }) {
  if (!pushReady) return { sent: 0, removed: 0 };
  configure();
  const subs = await db.list<PushSub>('push').catch(() => [] as PushSub[]);
  let sent = 0;
  let removed = 0;
  const payload = JSON.stringify({ ...msg, icon: '/icons/icon-192.png', badge: '/icons/favicon-48.png' });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 60 * 24, urgency: 'normal' });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // the browser has dropped this subscription (uninstalled, permission removed): forget it
        if (code === 404 || code === 410) {
          await db.remove('push', s.id).catch(() => {});
          removed++;
        } else {
          console.error('Push failed:', code ?? (e as Error).message);
        }
      }
    }),
  );
  return { sent, removed };
}

type Arrival =
  | { kind: 'post'; postKind: string }
  | { kind: 'letter'; locked: boolean }
  | { kind: 'jar'; mood: string }
  | { kind: 'dare'; square: string }
  | { kind: 'tip' };

/** Word an arrival from a friend and send it. Only friends' actions notify her. */
export function announce(from: { name: string; role: string }, a: Arrival) {
  if (from.role !== 'wellwisher') return Promise.resolve({ sent: 0, removed: 0 });
  const who = from.name.split(' ')[0];
  const m =
    a.kind === 'post'
      ? {
          title: '💌 Your wall of love',
          body:
            a.postKind === 'photo'
              ? `${who} pinned photos for you`
              : a.postKind === 'voice'
                ? `${who} left you a voice note`
                : a.postKind === 'video'
                  ? `${who} sent you a little film`
                  : `${who} left you a message`,
          url: '/home/love',
        }
      : a.kind === 'letter'
        ? { title: '✉️ Open when…', body: a.locked ? `${who} sealed a letter for later` : `${who} sealed a letter for you`, url: '/home/letters' }
        : a.kind === 'jar'
          ? { title: '🫙 Your message jar', body: `${who} dropped a note in your jar`, url: '/home/jar' }
          : a.kind === 'dare'
            ? { title: '🌷 Milano bingo', body: `${who} left you a dare: “${a.square}”`, url: '/home/bingo' }
            : { title: '📮 Milano corner', body: `${who} added a tip to your list`, url: '/home/milano' };
  return notifySaanika(m);
}
