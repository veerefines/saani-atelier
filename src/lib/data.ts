import * as db from './db';
import type { Session } from './session';

export type Media = { id: string; createdAt: string; ownerId: string; mime: string; size: number; ready: boolean };

export type PostKind = 'text' | 'photo' | 'voice' | 'video';
export type Post = {
  id: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  kind: PostKind;
  text?: string;
  /** the first (or only) file; albums keep every photo in mediaIds */
  mediaId?: string;
  mediaIds?: string[];
  reactions: string[];
  look: number; // which paper / tilt style to use
};

export type Letter = {
  id: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  unlockAt?: string | null;
  openedAt?: string | null;
  seal: number;
};

export type Mood = 'happy' | 'sad' | 'homesick' | 'unmotivated' | 'anxious' | 'proud';
export type JarNote = {
  id: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  mood: Mood;
  text: string;
  drawnAt?: string | null;
  color: number;
};

export type BingoState = { id: 'bingo'; createdAt: string; done: Record<string, { at: string; mediaId?: string }> };
export type Seen = { id: 'seen'; createdAt: string; love?: string; letters?: string; jar?: string };
/** A Milano list item. Friends' tips carry who suggested them. */
export type Wish = { id: string; createdAt: string; text: string; done: boolean; fromId?: string; fromName?: string; placeId?: string };
/** A friend's dare or cheer pinned to a bingo square. */
export type Dare = { id: string; createdAt: string; authorId: string; authorName: string; squareId: string; text: string };

const now = () => new Date().toISOString();
const pick = (n: number) => Math.floor(Math.random() * n);

/* posts */
export const listPosts = () => db.list<Post>('posts');
export async function addPost(s: Session, p: { kind: PostKind; text?: string; mediaIds?: string[] }) {
  const post: Post = {
    id: db.newId('p_'),
    createdAt: now(),
    authorId: s.id,
    authorName: s.name,
    kind: p.kind,
    text: p.text?.slice(0, 4000),
    mediaId: p.mediaIds?.[0],
    ...(p.mediaIds && p.mediaIds.length > 1 ? { mediaIds: p.mediaIds } : {}),
    reactions: [],
    look: pick(6),
  };
  return db.put('posts', post);
}
/** Every file a post points at (albums have several). */
export const postMedia = (p: Post) => p.mediaIds ?? (p.mediaId ? [p.mediaId] : []);
export async function deletePost(s: Session, id: string) {
  const post = await db.get<Post>('posts', id);
  if (!post || (post.authorId !== s.id && s.role !== 'saanika')) return false;
  for (const m of postMedia(post)) await deleteMedia(m);
  await db.remove('posts', id);
  return true;
}
export function toggleReaction(id: string, emoji: string) {
  return db.update<Post>('posts', id, (p) => ({
    ...p,
    reactions: p.reactions.includes(emoji) ? p.reactions.filter((e) => e !== emoji) : [...p.reactions, emoji],
  }));
}

/* letters */
export const listLetters = () => db.list<Letter>('letters');
export function addLetter(s: Session, l: { title: string; body: string; unlockAt?: string | null }) {
  const letter: Letter = {
    id: db.newId('l_'),
    createdAt: now(),
    authorId: s.id,
    authorName: s.name,
    title: l.title.slice(0, 120),
    body: l.body.slice(0, 6000),
    unlockAt: l.unlockAt || null,
    openedAt: null,
    seal: pick(4),
  };
  return db.put('letters', letter);
}
export function isLocked(l: Letter) {
  return Boolean(l.unlockAt && new Date(l.unlockAt).getTime() > Date.now());
}
/** Keep a sealed letter's words off the client until its day. */
export const hideIfLocked = (l: Letter): Letter => (isLocked(l) ? { ...l, body: '' } : l);
export async function openLetter(id: string) {
  const l = await db.update<Letter>('letters', id, (l) => (isLocked(l) ? l : { ...l, openedAt: l.openedAt ?? now() }));
  return l && hideIfLocked(l);
}
export async function deleteLetter(s: Session, id: string) {
  const l = await db.get<Letter>('letters', id);
  if (!l || l.authorId !== s.id) return false;
  await db.remove('letters', id);
  return true;
}

/* jar */
export const listJar = () => db.list<JarNote>('jar');
export function addJarNote(s: Session, n: { mood: Mood; text: string }) {
  const note: JarNote = {
    id: db.newId('j_'),
    createdAt: now(),
    authorId: s.id,
    authorName: s.name,
    mood: n.mood,
    text: n.text.slice(0, 1200),
    drawnAt: null,
    color: pick(6),
  };
  return db.put('jar', note);
}
export async function drawJarNote(mood: Mood) {
  const notes = (await listJar()).filter((n) => n.mood === mood);
  if (!notes.length) return null;
  // favour notes she hasn't read yet, then the ones read longest ago
  const unread = notes.filter((n) => !n.drawnAt);
  const pool = unread.length ? unread : [...notes].sort((a, b) => ((a.drawnAt ?? '') < (b.drawnAt ?? '') ? -1 : 1)).slice(0, 3);
  const chosen = pool[pick(pool.length)];
  return db.update<JarNote>('jar', chosen.id, (n) => ({ ...n, drawnAt: now() }));
}
export async function deleteJarNote(s: Session, id: string) {
  const n = await db.get<JarNote>('jar', id);
  if (!n || n.authorId !== s.id) return false;
  await db.remove('jar', id);
  return true;
}

/* bingo */
export async function getBingo(): Promise<BingoState> {
  return (await db.get<BingoState>('state', 'bingo')) ?? { id: 'bingo', createdAt: now(), done: {} };
}
export async function setSquare(squareId: string, done: boolean, mediaId?: string) {
  const cur = await getBingo();
  const next = { ...cur, done: { ...cur.done } };
  if (done) next.done[squareId] = { at: now(), mediaId };
  else delete next.done[squareId];
  return db.put('state', next);
}

/* seen markers for "new" badges */
export async function getSeen(): Promise<Seen> {
  return (await db.get<Seen>('state', 'seen')) ?? { id: 'seen', createdAt: now() };
}
export async function markSeen(area: 'love' | 'letters' | 'jar') {
  const cur = await getSeen();
  return db.put('state', { ...cur, [area]: now() });
}

/* Milano wishlist */
export const listWishes = () => db.list<Wish>('wishes');
/** placeId links the item back to its card in the Milano guide. */
export const addWish = (text: string, placeId?: string) =>
  db.put<Wish>('wishes', { id: db.newId('w_'), createdAt: now(), text: text.slice(0, 140), done: false, ...(placeId ? { placeId } : {}) });
export const toggleWish = (id: string) => db.update<Wish>('wishes', id, (w) => ({ ...w, done: !w.done }));
export const deleteWish = (id: string) => db.remove('wishes', id);
/** A friend's tip lands on her list, signed. */
export const addTip = (s: Session, text: string) =>
  db.put<Wish>('wishes', { id: db.newId('w_'), createdAt: now(), text: text.slice(0, 140), done: false, fromId: s.id, fromName: s.name });
export async function deleteTip(s: Session, id: string) {
  const w = await db.get<Wish>('wishes', id);
  if (!w || w.fromId !== s.id) return false;
  await db.remove('wishes', id);
  return true;
}

/* bingo dares & cheers from friends */
export const listDares = () => db.list<Dare>('dares');
export const addDare = (s: Session, squareId: string, text: string) =>
  db.put<Dare>('dares', { id: db.newId('d_'), createdAt: now(), authorId: s.id, authorName: s.name, squareId, text: text.slice(0, 280) });
export async function deleteDare(s: Session, id: string) {
  const d = await db.get<Dare>('dares', id);
  if (!d || d.authorId !== s.id) return false;
  await db.remove('dares', id);
  return true;
}

/* media */
export async function createMedia(s: Session, mime: string, size: number) {
  const m: Media = { id: db.newId('m_'), createdAt: now(), ownerId: s.id, mime, size, ready: false };
  await db.put('media', m);
  return m;
}
export const getMedia = (id: string) => db.get<Media>('media', id);
export const markMediaReady = (id: string) => db.update<Media>('media', id, (m) => ({ ...m, ready: true }));
export async function deleteMedia(id: string) {
  await db.deleteMediaFile(id);
  await db.remove('media', id);
}

/* seed Varun's default letters & jar notes once (from content/home.ts) */
export async function ensureSeeded(seed: {
  letters: { title: string; body: string; unlockAt?: string | null; from: string }[];
  jar: { mood: Mood; text: string; from: string }[];
}) {
  const flag = await db.get('state', 'seeded');
  if (flag) return;
  for (const l of seed.letters)
    await addLetter({ id: 'seed', name: l.from, role: 'wellwisher' }, l);
  for (const n of seed.jar) await addJarNote({ id: 'seed', name: n.from, role: 'wellwisher' }, n);
  await db.put('state', { id: 'seeded', createdAt: now() });
}
