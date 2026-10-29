import { SignJWT, jwtVerify } from 'jose';
import type { Role } from './invites';

export const SESSION_COOKIE = 'sa_session';
export const SEEN_COOKIE = 'sa_seen';
const MAX_AGE = 60 * 60 * 24 * 45;

/** admin comes from the person's current invite (see getSession), never from the token */
export type Session = { id: string; name: string; role: Role; admin?: boolean };

function secret() {
  const s =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== 'production' ? 'dev-only-secret-change-me-before-sharing-123' : '');
  if (!s) throw new Error('SESSION_SECRET is not set.');
  return new TextEncoder().encode(s);
}

export async function createSession(s: Session): Promise<string> {
  return new SignJWT({ name: s.name, role: s.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function readSessionToken(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role;
    if (!payload.sub || (role !== 'saanika' && role !== 'wellwisher')) return null;
    return { id: payload.sub, name: String(payload.name ?? ''), role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  };
}

/** A signed "stop these emails" link for one person, so an email can carry its own unsubscribe. */
export async function signUnsub(id: string): Promise<string> {
  return new SignJWT({ purpose: 'unsub' }).setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('400d').sign(secret());
}
export async function readUnsub(token?: string | null): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.purpose === 'unsub' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
