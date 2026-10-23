import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, SEEN_COOKIE } from '@/lib/session';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/';
  url.search = '';
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(SEEN_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
