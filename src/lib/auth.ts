import { cookies } from 'next/headers';
import { isActiveInvite } from './invites';
import { readSessionToken, SESSION_COOKIE, SEEN_COOKIE, type Session } from './session';

/** Current signed-in person, or null. Also null if their invite was removed. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const session = await readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  if (!isActiveInvite(session.id)) return null;
  return session;
}

export async function hasSeenReveal(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(SEEN_COOKIE)?.value === '1';
}
