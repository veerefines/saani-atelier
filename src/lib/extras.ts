import * as db from './db';
import type { Nudge } from '@/content/nudges';
import type { MoodId } from '@/content/mood';
import type { Moment } from '@/content/moments';
import type { Session } from './session';

/**
 * Data for the everyday and surprise features: occasions, songs, her lookbook, passport,
 * diary and checklist, group scrapbook pages, admin-editable content, and the daily job's state.
 * Everything lives in the same doc store as the rest (local .data/ or Supabase "docs").
 */

const now = () => new Date().toISOString();

/* ---------- occasions: festivals, her birthday, exams ---------- */

export type Occasion = { id: string; createdAt: string; date: string; title: string; emoji: string; remindDays: number; note?: string };

/** Pre-filled the first time; dates checked against panchang calendars (Oct 2026). Admin edits the rest. */
const DEFAULT_OCCASIONS: Omit<Occasion, 'id' | 'createdAt'>[] = [
  { date: '2026-11-08', title: 'Diwali', emoji: '🪔', remindDays: 4, note: 'Happy Diwali, from all of us, far away and right here.' },
  { date: '2026-12-25', title: 'Christmas', emoji: '🎄', remindDays: 4, note: 'Your first Christmas in Milano.' },
  { date: '2027-01-01', title: 'New Year', emoji: '🎆', remindDays: 3, note: 'A whole new year of you.' },
  { date: '2027-03-22', title: 'Holi', emoji: '🎨', remindDays: 4, note: 'Throw some colour at Milano today.' },
  { date: '2027-08-16', title: 'Raksha Bandhan', emoji: '🧵', remindDays: 5 },
];

/** Added after the first set went live, so it's seeded on its own (once). */
const DEPARTURE: Omit<Occasion, 'id' | 'createdAt'> = {
  date: '2026-11-10',
  title: 'Departure day',
  emoji: '✈️',
  remindDays: 2,
  note: 'Buon viaggio! Every one of us is on that plane with you.',
};

export async function listOccasions(): Promise<Occasion[]> {
  const seeded = await db.get('state', 'occasions-seeded');
  if (!seeded) {
    for (const o of DEFAULT_OCCASIONS) await db.put<Occasion>('occasions', { id: db.newId('o_'), createdAt: now(), ...o });
    await db.put('state', { id: 'occasions-seeded', createdAt: now() });
  }
  if (!(await db.get('state', 'departure-seeded'))) {
    await db.put<Occasion>('occasions', { id: 'o_departure', createdAt: now(), ...DEPARTURE });
    await db.put('state', { id: 'departure-seeded', createdAt: now() });
  }
  // her flight moved from 27 Oct to 10 Nov 2026: move the already-seeded day too (once, keeping any edits)
  if (!(await db.get('state', 'departure-moved-nov10'))) {
    const d = await db.get<Occasion>('occasions', 'o_departure');
    if (d && d.date === '2026-10-27') await db.put<Occasion>('occasions', { ...d, date: DEPARTURE.date });
    await db.put('state', { id: 'departure-moved-nov10', createdAt: now() });
  }
  return (await db.list<Occasion>('occasions')).sort((a, b) => (a.date < b.date ? -1 : 1));
}
/** Every special day still to come (all of them: festivals and anything added in admin), for date pickers. */
export async function upcomingOccasions() {
  const today = milanDay();
  return (await listOccasions()).filter((o) => o.date > today).map((o) => ({ date: o.date, title: o.title, emoji: o.emoji }));
}
export const saveOccasion = (o: Occasion) => db.put<Occasion>('occasions', o);
export const removeOccasion = (id: string) => db.remove('occasions', id);
export const newOccasionId = () => db.newId('o_');

/** "YYYY-MM-DD" for a moment, in Milano. */
export function milanDay(at: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/* ---------- song dedications ---------- */

export type Song = {
  id: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  url: string;
  provider: 'spotify' | 'youtube' | 'apple';
  embed: string;
  note: string;
  /** the song's name and cover art, looked up once from Spotify / YouTube / Apple Music */
  title?: string;
  cover?: string;
  artChecked?: boolean;
};

/** Turn a share link into an embeddable player, or null if it isn't one we support. */
export function songEmbed(raw: string): { provider: Song['provider']; embed: string; url: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'open.spotify.com') {
    const m = u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
    if (m) return { provider: 'spotify', embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, url: u.href };
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtu.be') {
    const id = host === 'youtu.be' ? u.pathname.slice(1) : u.pathname.startsWith('/shorts/') ? u.pathname.split('/')[2] : u.searchParams.get('v');
    if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) return { provider: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${id}`, url: u.href };
  }
  if (host === 'music.apple.com' && /^\/[a-z]{2}\/(album|playlist|song)\//.test(u.pathname)) {
    return { provider: 'apple', embed: `https://embed.music.apple.com${u.pathname}${u.search}`, url: u.href };
  }
  return null;
}

/** Song name and cover art from each service's public oEmbed (no key needed), or the Apple Music page's preview tags. */
async function songArt(e: { provider: Song['provider']; url: string; embed: string }): Promise<{ title?: string; cover?: string }> {
  const get = (u: string) => fetch(u, { signal: AbortSignal.timeout(4000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SaanisAtelier/1.0)' } });
  try {
    if (e.provider === 'spotify' || e.provider === 'youtube') {
      const api = e.provider === 'spotify' ? `https://open.spotify.com/oembed?url=${encodeURIComponent(e.url)}` : `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(e.url)}`;
      const r = await get(api);
      const id = e.embed.split('/').pop();
      const fallback = e.provider === 'youtube' && id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined;
      if (!r.ok) return { cover: fallback };
      const j = (await r.json()) as { title?: string; thumbnail_url?: string };
      return { title: j.title?.slice(0, 120), cover: j.thumbnail_url ?? fallback };
    }
    const html = await (await get(e.url)).text();
    const meta = (p: string) => html.match(new RegExp(`<meta[^>]+property=["']og:${p}["'][^>]+content=["']([^"']+)`))?.[1];
    return { title: meta('title')?.replace(/ (on|-) Apple Music$/, '').slice(0, 120), cover: meta('image') };
  } catch {
    return {};
  }
}

/** Songs, filling in any cover art not looked up yet (older dedications) and saving it. */
export async function listSongs() {
  const songs = await db.list<Song>('songs');
  return Promise.all(
    songs.map(async (x) => {
      if (x.artChecked) return x;
      const next = { ...x, ...(await songArt(x)), artChecked: true };
      await db.put<Song>('songs', next).catch(() => {});
      return next;
    }),
  );
}
export async function addSong(s: Session, link: string, note: string) {
  const e = songEmbed(link);
  if (!e) return null;
  return db.put<Song>('songs', { id: db.newId('s_'), createdAt: now(), authorId: s.id, authorName: s.name, ...e, note: note.slice(0, 280), ...(await songArt(e)), artChecked: true });
}
export async function deleteSong(s: Session, id: string) {
  const x = await db.get<Song>('songs', id);
  if (!x || (x.authorId !== s.id && !s.admin)) return false;
  await db.remove('songs', id);
  return true;
}

/* ---------- her lookbook (photos + Pinterest) ---------- */

export type LookItem = {
  id: string;
  createdAt: string;
  kind: 'photo' | 'pin' | 'board';
  mediaId?: string;
  pinUrl?: string;
  caption: string;
  tags: string[];
  shared: boolean;
  reactions: { by: string; name: string; emoji: string }[];
};

/** A Pinterest pin or board link the widget can show (pin.it short links are resolved first). */
export async function pinterestLink(raw: string): Promise<{ kind: 'pin' | 'board'; url: string } | null> {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.hostname === 'pin.it') {
    try {
      const r = await fetch(u.href, { redirect: 'manual' });
      const loc = r.headers.get('location');
      if (!loc) return null;
      u = new URL(loc, u.href);
    } catch {
      return null;
    }
  }
  if (!/(^|\.)pinterest\.[a-z.]+$/.test(u.hostname)) return null;
  const clean = `https://www.pinterest.com${u.pathname.replace(/\/+$/, '')}/`;
  if (/^\/pin\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) return { kind: 'pin', url: clean };
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts.length === 2 && !['pin', 'search', 'ideas', 'today'].includes(parts[0])) return { kind: 'board', url: clean };
  return null;
}

export const listLook = () => db.list<LookItem>('lookbook');
export const getLook = (id: string) => db.get<LookItem>('lookbook', id);
export const saveLook = (x: LookItem) => db.put<LookItem>('lookbook', x);
export const removeLook = (id: string) => db.remove('lookbook', id);
export const newLookId = () => db.newId('lk_');

/* ---------- Milano passport ---------- */

export type Stamp = { id: string; createdAt: string; placeId: string; how: 'here' | 'manual' };
export const listStamps = () => db.list<Stamp>('stamps');
export const addStamp = (placeId: string, how: Stamp['how']) => db.put<Stamp>('stamps', { id: placeId, createdAt: now(), placeId, how });
export const removeStamp = (placeId: string) => db.remove('stamps', placeId);

/* ---------- her own chapter (diary) ---------- */

export const DIARY_MOODS = ['🌷', '☀️', '🥹', '😴', '🌧️', '✨', '💪', '🏡'];

export type DiaryEntry = { id: string; createdAt: string; day: string; text: string; mood: string; mediaId?: string; shared: boolean };
export const listDiary = async () => (await db.list<DiaryEntry>('diary')).sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.createdAt < b.createdAt ? -1 : 1));
export const getDiary = (id: string) => db.get<DiaryEntry>('diary', id);
export const saveDiary = (x: DiaryEntry) => db.put<DiaryEntry>('diary', x);
export const removeDiary = (id: string) => db.remove('diary', id);
export const newDiaryId = () => db.newId('dy_');

/* ---------- arrival checklist ---------- */

export type ChecklistState = { id: 'checklist'; createdAt: string; done: Record<string, string> };
export async function getChecklist(): Promise<ChecklistState> {
  return (await db.get<ChecklistState>('state', 'checklist')) ?? { id: 'checklist', createdAt: now(), done: {} };
}
export async function setChecked(itemId: string, done: boolean) {
  const cur = await getChecklist();
  const next = { ...cur, done: { ...cur.done } };
  if (done) next.done[itemId] = now();
  else delete next.done[itemId];
  return db.put('state', next);
}

/* ---------- group scrapbook pages ---------- */

/** Where she's placed each piece: x as % of the page width, y in % of the width too (so it scales), r = tilt. */
export type PieceSpot = { x: number; y: number; r: number };
export type Page = { id: string; createdAt: string; title: string; emoji: string; note?: string; layout?: Record<string, PieceSpot> };

/** A first page so friends have somewhere to add from day one (admin can add more or remove it). */
const STARTER_PAGE = { title: 'Welcome to Milano', emoji: '🌸', note: 'A photo, a wish, a voice note or a little film for her first days in Milano.' };

export async function listPages(): Promise<Page[]> {
  const seeded = await db.get('state', 'pages-seeded');
  if (!seeded) {
    await db.put<Page>('pages', { id: db.newId('pg_'), createdAt: now(), ...STARTER_PAGE });
    await db.put('state', { id: 'pages-seeded', createdAt: now() });
  }
  return (await db.list<Page>('pages')).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}
export const getPage = (id: string) => db.get<Page>('pages', id);
export const savePage = (p: Page) => db.put<Page>('pages', p);
export const removePage = (id: string) => db.remove('pages', id);
export const newPageId = () => db.newId('pg_');

/* ---------- admin-editable content ---------- */

export type RevealNote = { greeting: string; lines: string[]; signoff: string };
export type ContentDoc = { id: 'content'; createdAt: string; note?: RevealNote };
export async function getContent(): Promise<ContentDoc> {
  return (await db.get<ContentDoc>('state', 'content')) ?? { id: 'content', createdAt: now() };
}
export async function setRevealNote(note: RevealNote) {
  const cur = await getContent();
  return db.put('state', { ...cur, note });
}

/** Journey media uploaded from /admin, by slot (the placeholder path, e.g. /journey/photos/childhood-1.jpg). */
export type SlotMedia = { id: string; createdAt: string; slot: string; mediaId: string; mime: string };
const slotId = (slot: string) => 'jm_' + slot.replace(/[^a-z0-9]+/gi, '_');
export const listSlotMedia = () => db.list<SlotMedia>('journeyMedia');
export const setSlotMedia = (slot: string, mediaId: string, mime: string) => db.put<SlotMedia>('journeyMedia', { id: slotId(slot), createdAt: now(), slot, mediaId, mime });
export const clearSlotMedia = (slot: string) => db.remove('journeyMedia', slotId(slot));

/**
 * Extra photos, videos and voice notes added to a journey chapter from /admin, beyond the fixed
 * slots. A few photos show as polaroids; four or more become a film strip.
 */
export type JourneyExtra = {
  id: string;
  createdAt: string;
  chapter: string;
  kind: 'photo' | 'video' | 'voice';
  mediaIds: string[];
  caption?: string;
  /** who a voice note is from */
  from?: string;
};
export const listJourneyExtras = async () => (await db.list<JourneyExtra>('journeyExtras')).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
export const addJourneyExtra = (x: Omit<JourneyExtra, 'id' | 'createdAt'>) => db.put<JourneyExtra>('journeyExtras', { id: db.newId('jx_'), createdAt: now(), ...x });
export const getJourneyExtra = (id: string) => db.get<JourneyExtra>('journeyExtras', id);
export const removeJourneyExtra = (id: string) => db.remove('journeyExtras', id);

/** Keepsake images (sunglasses, peonies…) uploaded from /admin, by name; they win over public/her/<name>.png. */
export type KeepsakeMedia = { id: string; createdAt: string; name: string; mediaId: string };
export const listKeepsakeMedia = () => db.list<KeepsakeMedia>('keepsakeMedia');
export const setKeepsakeMedia = (name: string, mediaId: string) => db.put<KeepsakeMedia>('keepsakeMedia', { id: `ks_${name}`, createdAt: now(), name, mediaId });
export const clearKeepsakeMedia = (name: string) => db.remove('keepsakeMedia', `ks_${name}`);

/* ---------- presence and the daily job ---------- */

export type Presence = { id: 'presence'; createdAt: string; lastSeen: string };
export async function touchPresence() {
  const cur = await db.get<Presence>('state', 'presence');
  if (cur && Date.now() - new Date(cur.lastSeen).getTime() < 10 * 60_000) return;
  await db.put<Presence>('state', { id: 'presence', createdAt: cur?.createdAt ?? now(), lastSeen: now() });
}
export const getPresence = () => db.get<Presence>('state', 'presence');

export type DailyState = { id: 'daily'; createdAt: string; lastRun: string };
export const getDaily = () => db.get<DailyState>('state', 'daily');
export const setDaily = (lastRun: string) => db.put<DailyState>('state', { id: 'daily', createdAt: now(), lastRun });

/* ---------- nudges: "thinking of you" from a friend, with her reaction and reply ---------- */

export { NUDGE_EMOJI, REACT_EMOJI, type Nudge } from '@/content/nudges';

export async function listNudges() {
  return (await db.list<Nudge>('nudges')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function addNudge(s: Session, emoji: string, text: string) {
  return db.put<Nudge>('nudges', { id: db.newId('n_'), createdAt: now(), authorId: s.id, authorName: s.name, emoji, ...(text ? { text: text.slice(0, 80) } : {}) });
}
/** She clears nudges from her desk (some, or every one). */
export async function dismissNudges(ids: string[] | 'all') {
  const all = await listNudges();
  const at = now();
  let n = 0;
  for (const x of all) {
    if (x.dismissedAt || (ids !== 'all' && !ids.includes(x.id))) continue;
    await db.put<Nudge>('nudges', { ...x, dismissedAt: at });
    n++;
  }
  return n;
}
export async function answerNudge(id: string, a: { reaction?: string; reply?: string }) {
  return db.update<Nudge>('nudges', id, (n) => ({
    ...n,
    ...(a.reaction ? { reaction: a.reaction } : {}),
    ...(a.reply ? { reply: a.reply.slice(0, 200) } : {}),
    answeredAt: now(),
  }));
}

/* ---------- her mood today ---------- */

export type MoodDoc = { id: 'mood'; createdAt: string; mood: MoodId; note?: string; at: string; day: string; alerted?: string };
/** Today's mood (Milano day), or null if she hasn't said yet today. */
export async function getMood(): Promise<MoodDoc | null> {
  const m = await db.get<MoodDoc>('state', 'mood');
  return m && m.day === milanDay() ? m : null;
}
export async function setMood(mood: MoodId, note: string) {
  const cur = await db.get<MoodDoc>('state', 'mood');
  const day = milanDay();
  return db.put<MoodDoc>('state', { id: 'mood', createdAt: cur?.createdAt ?? now(), mood, ...(note ? { note: note.slice(0, 100) } : {}), at: now(), day, ...(cur?.alerted === day ? { alerted: day } : {}) });
}
export const markMoodAlerted = (day: string) => db.update<MoodDoc>('state', 'mood', (m) => ({ ...m, alerted: day }));

/** Her "thinking of you all", sent back to everyone at once. */
export type HerNudge = { id: 'her-nudge'; createdAt: string; emoji: string; at: string };
export const getHerNudge = () => db.get<HerNudge>('state', 'her-nudge');
export const setHerNudge = (emoji: string) => db.put<HerNudge>('state', { id: 'her-nudge', createdAt: now(), emoji, at: now() });

/** The journey's words, rewritten from /admin (by key; see src/lib/journey-text.ts). */
export type JourneyTextDoc = { id: 'journey-text'; createdAt: string; edits: Record<string, string> };
export async function getJourneyText(): Promise<Record<string, string>> {
  return (await db.get<JourneyTextDoc>('state', 'journey-text'))?.edits ?? {};
}
export async function setJourneyText(key: string, value: string) {
  const cur = await db.get<JourneyTextDoc>('state', 'journey-text');
  const edits = { ...(cur?.edits ?? {}) };
  if (value.trim()) edits[key] = value.trim();
  else delete edits[key]; // blank goes back to the original words
  return db.put<JourneyTextDoc>('state', { id: 'journey-text', createdAt: cur?.createdAt ?? now(), edits });
}

/* ---------- moments: what she sends her people ---------- */

export const listMoments = async () => (await db.list<Moment>('moments')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const getMoment = (id: string) => db.get<Moment>('moments', id);
export const addMoment = (m: Omit<Moment, 'id' | 'createdAt' | 'reactions'>) => db.put<Moment>('moments', { id: db.newId('mo_'), createdAt: now(), reactions: [], ...m });
export const saveMoment = (m: Moment) => db.put<Moment>('moments', m);
export const removeMoment = (id: string) => db.remove('moments', id);
