import { NextResponse } from 'next/server';
import { getSession } from './auth';
import type { Session } from './session';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Returns the session or a 401/403 response. */
export async function requireSession(role?: Session['role']): Promise<Session | NextResponse> {
  const s = await getSession();
  if (!s) return fail('Sign in again to continue.', 401);
  if (role && s.role !== role) return fail(role === 'saanika' ? 'This is only for Saanika.' : 'This is for her friends to do.', 403);
  return s;
}
export const isResponse = (x: unknown): x is NextResponse => x instanceof NextResponse;
