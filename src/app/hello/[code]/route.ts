import { NextResponse, type NextRequest } from 'next/server';
import { findInvite } from '@/lib/invites';
import { createSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

/** Personal magic link: /hello/<code> signs the person in and sends them on. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = findInvite(decodeURIComponent(code));
  const url = req.nextUrl.clone();
  url.search = '';

  if (!invite) {
    url.pathname = '/';
    url.searchParams.set('e', 'link');
    return NextResponse.redirect(url, 303);
  }

  url.pathname = invite.role === 'saanika' ? '/' : '/wall';
  const res = NextResponse.redirect(url, 303);
  const token = await createSession({ id: invite.id, name: invite.name, role: invite.role });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
