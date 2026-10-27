import * as db from './db';

/** What Jelly remembers about her friend: pats, chats, and when they last saw each other. */
export type JellyState = db.Doc & { pets: number; chats: number; lastSeen: string | null };

const COL = 'jelly';
const ID = 'friend';
const fresh = (): JellyState => ({ id: ID, createdAt: new Date().toISOString(), pets: 0, chats: 0, lastSeen: null });

export const jellyState = async () => (await db.get<JellyState>(COL, ID)) ?? fresh();

/** She came to My Corner: returns how Jelly remembered things before, and marks her as seen. */
export async function seen() {
  const before = await jellyState();
  await db.put<JellyState>(COL, { ...before, lastSeen: new Date().toISOString() });
  return before;
}

/** Pats (a few at a time, from the browser) and chats both count towards friendship. */
export async function bump(field: 'pets' | 'chats', n: number) {
  const s = await jellyState();
  return db.put<JellyState>(COL, { ...s, [field]: s[field] + n });
}
