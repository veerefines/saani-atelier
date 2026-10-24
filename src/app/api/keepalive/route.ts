import { NextResponse } from 'next/server';
import { list } from '@/lib/db';

/**
 * Called once a day by Vercel Cron (see vercel.json). Supabase pauses free projects
 * after about a week without activity; a tiny read keeps the site's data awake.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 401 });
  }
  const started = Date.now();
  await list('state');
  return NextResponse.json({ ok: true, ms: Date.now() - started });
}
