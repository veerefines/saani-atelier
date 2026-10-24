import { NextResponse } from 'next/server';
import { findInvite } from '@/lib/invites';
import { createSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

export async function POST(req: Request) {
  let code = '';
  try {
    const body = await req.json();
    code = String(body?.code ?? '');
  } catch {
    /* empty body */
  }

  const invite = await findInvite(code);
  if (!invite) {
    // Slow wrong guesses down so codes can't be brute-forced.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = await createSession({ id: invite.id, name: invite.name, role: invite.role });
  const res = NextResponse.json({ ok: true, role: invite.role, name: invite.name });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
