import { cookies } from 'next/headers';
import { inviteById } from './invites';
import { readSessionToken, SESSION_COOKIE, SEEN_COOKIE, type Session } from './session';

/**
 * Current signed-in person, or null. Also null if their invite was removed.
 * Name and admin rights come from their invite as it is now, so changes apply without signing in again.
 */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const session = await readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const invite = await inviteById(session.id);
  if (!invite || invite.role !== session.role) return null;
  return { id: invite.id, name: invite.name, role: invite.role, ...(invite.admin ? { admin: true } : {}) };
}

export async function hasSeenReveal(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(SEEN_COOKIE)?.value === '1';
}
