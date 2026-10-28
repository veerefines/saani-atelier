import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { linkGoogle } from '@/lib/google';
import { requireSession, isResponse } from '@/lib/api';

/** Back from Google: keep her connection, then back to the meetups page. */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const u = new URL(req.url);
  const back = (r: string) => {
    const res = NextResponse.redirect(`${u.origin}/home/meetups?google=${r}`);
    res.cookies.delete({ name: 'g_state', path: '/api/google' });
    return res;
  };
  const want = (await cookies()).get('g_state')?.value;
  if (u.searchParams.get('error')) return back('declined');
  const code = u.searchParams.get('code');
  if (!code || !want || u.searchParams.get('state') !== want) return back('error');
  try {
    await linkGoogle(code, u.origin);
    return back('linked');
  } catch (e) {
    console.error('google link', (e as Error).message);
    return back('error');
  }
}
