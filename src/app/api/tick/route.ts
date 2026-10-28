import { NextResponse } from 'next/server';
import { fired, listReminders, saveReminder } from '@/lib/reminders';
import { notifySaanika } from '@/lib/push';

/**
 * Every ten minutes (a free GitHub Actions timer, .github/workflows/tick.yml): send the reminders
 * that are due as a push, and roll repeating ones on. Locally, ALLOW_TEST_CLOCK=1 lets tests pass ?now=.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 401 });
  }
  const q = new URL(req.url).searchParams.get('now');
  const now = q && process.env.ALLOW_TEST_CLOCK === '1' && !isNaN(Date.parse(q)) ? new Date(q) : new Date();
  const due = (await listReminders()).filter((r) => !r.done && Date.parse(r.at) <= now.getTime());
  let sent = 0;
  for (const r of due) {
    const late = now.getTime() - Date.parse(r.at) > 60 * 60_000;
    const p = await notifySaanika({ title: late ? '⏰ Jelly’s reminder (a little late)' : '⏰ Jelly’s reminder', body: r.text, url: '/home' });
    sent += p.sent;
    await saveReminder(fired(r, now));
  }
  return NextResponse.json({ ok: true, due: due.length, sent });
}
