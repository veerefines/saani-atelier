import { NextResponse } from 'next/server';
import { runDaily } from '@/lib/daily';

/**
 * Vercel Cron, once a day (see vercel.json): unlocked letters, arrived surprises, occasions,
 * reminders and the Sunday digest. It also keeps Supabase's free plan from pausing.
 * Locally, ALLOW_TEST_CLOCK=1 lets tests pass ?now=<ISO date>.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 401 });
  }
  const q = new URL(req.url).searchParams.get('now');
  const at = q && process.env.ALLOW_TEST_CLOCK === '1' && !isNaN(Date.parse(q)) ? new Date(q) : new Date();
  return NextResponse.json({ ok: true, ...(await runDaily(at)) });
}
