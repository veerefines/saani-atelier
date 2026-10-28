import { NextResponse } from 'next/server';
import { consentUrl, googleReady, newState } from '@/lib/google';
import { requireSession, isResponse } from '@/lib/api';

/** Saani taps "Connect Google": off to Google's consent screen (calendar events only). */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const origin = new URL(req.url).origin;
  if (!googleReady()) return NextResponse.redirect(`${origin}/home/meetups?google=off`);
  const state = newState();
  const res = NextResponse.redirect(consentUrl(origin, state));
  // checked on the way back, so nobody else can link their Google to her account
  res.cookies.set('g_state', state, { httpOnly: true, secure: origin.startsWith('https'), sameSite: 'lax', path: '/api/google', maxAge: 600 });
  return res;
}
