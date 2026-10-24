import crypto from 'node:crypto';
import * as db from './db';

export type Role = 'saanika' | 'wellwisher';

export type Invite = {
  id: string;
  name: string;
  role: Role;
  code: string;
  /** can open /admin */
  admin?: boolean;
  /** added from /admin (lives in the database), rather than in the INVITES setting */
  managed?: boolean;
};

type InviteDoc = { id: string; createdAt: string; name: string; code: string };

const DEMO_INVITES: Invite[] = [
  { id: 'saanika', name: 'Saanika', role: 'saanika', code: 'DEMO-SAANIKA' },
  { id: 'demo-friend', name: 'Demo Friend', role: 'wellwisher', code: 'DEMO-FRIEND', admin: true },
];

/** Letters and digits only, uppercase, so "tulip 7f2" and "TULIP-7F2" match. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Invites from the INVITES setting (Saanika, the first friends, admins). */
function fromEnv(): Invite[] {
  const raw = process.env.INVITES;
  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as Partial<Invite>[];
      return parsed
        .filter((i) => i.code && i.name && (i.role === 'saanika' || i.role === 'wellwisher'))
        .map((i) => ({
          id: i.id || slug(i.name as string),
          name: i.name as string,
          role: i.role as Role,
          code: i.code as string,
          ...(i.admin ? { admin: true } : {}),
        }));
    } catch {
      console.error('INVITES is not valid JSON. No invite codes are active.');
      return [];
    }
  }
  return process.env.NODE_ENV === 'production' ? [] : DEMO_INVITES;
}

// friends added (or removed) from /admin, cached for a few seconds so every request doesn't query
// the database; a removed friend loses access within this window on every server (instantly on the
// one that removed them)
let cache: { at: number; docs: InviteDoc[] } | null = null;
const CACHE_MS = 5_000;
async function addedFriends() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.docs;
  const docs = await db.list<InviteDoc>('invites').catch(() => [] as InviteDoc[]);
  cache = { at: Date.now(), docs };
  return docs;
}

/** Friends removed from /admin, including ones from the INVITES setting (which can't be edited from here). */
type Removed = { id: 'removed-friends'; createdAt: string; ids: string[] };
let removedCache: { at: number; ids: string[] } | null = null;
async function removedIds() {
  if (removedCache && Date.now() - removedCache.at < CACHE_MS) return removedCache.ids;
  const doc = await db.get<Removed>('state', 'removed-friends').catch(() => null);
  removedCache = { at: Date.now(), ids: doc?.ids ?? [] };
  return removedCache.ids;
}

/** Everyone who can sign in: the setting, plus friends added from /admin, minus anyone removed. */
export async function getInvites(): Promise<Invite[]> {
  const base = fromEnv();
  const [added, removed] = await Promise.all([addedFriends(), removedIds()]);
  const taken = new Set(base.map((i) => i.id));
  const gone = new Set(removed);
  return [
    ...base,
    ...added.filter((d) => !taken.has(d.id)).map((d) => ({ id: d.id, name: d.name, role: 'wellwisher' as Role, code: d.code, managed: true })),
  ].filter((i) => i.role === 'saanika' || !gone.has(i.id));
}

export async function findInvite(code: string): Promise<Invite | null> {
  const wanted = normalizeCode(code);
  if (!wanted) return null;
  return (await getInvites()).find((i) => normalizeCode(i.code) === wanted) ?? null;
}

export async function inviteById(id: string): Promise<Invite | null> {
  return (await getInvites()).find((i) => i.id === id) ?? null;
}

/* ---------- managed from /admin ---------- */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PREFIXES = ['DAISY', 'LILAC', 'POPPY', 'IRIS', 'ROSE', 'LOTUS', 'TULIP', 'PEONY', 'ORCHID', 'JASMINE'];

export function newCode() {
  const r = crypto.randomBytes(9);
  let s = '';
  for (let k = 1; k < 9; k++) s += ALPHABET[r[k] % ALPHABET.length];
  return `${PREFIXES[r[0] % PREFIXES.length]}-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** A new friend. Ids are unique among everyone, including the INVITES setting. */
export async function addFriend(name: string): Promise<Invite> {
  const clean = name.trim().slice(0, 40);
  const all = await getInvites();
  let id = slug(clean) || 'friend';
  for (let n = 2; all.some((i) => i.id === id); n++) id = `${slug(clean) || 'friend'}-${n}`;
  const doc: InviteDoc = { id, createdAt: new Date().toISOString(), name: clean, code: newCode() };
  await db.put('invites', doc);
  cache = null;
  return { id, name: clean, role: 'wellwisher', code: doc.code, managed: true };
}

/**
 * Remove a friend: their link stops working straight away. Friends added here are deleted; friends
 * from the INVITES setting are remembered as removed (so they stay out even though the setting still
 * lists them). Saanika can't be removed.
 */
export async function removeFriend(id: string): Promise<boolean> {
  const who = (await getInvites()).find((i) => i.id === id);
  if (!who || who.role === 'saanika') return false;
  if (who.managed) await db.remove('invites', id);
  else {
    const cur = await db.get<Removed>('state', 'removed-friends');
    await db.put<Removed>('state', { id: 'removed-friends', createdAt: cur?.createdAt ?? new Date().toISOString(), ids: [...new Set([...(cur?.ids ?? []), id])] });
  }
  cache = null;
  removedCache = null;
  return true;
}
