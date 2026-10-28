import { NextResponse } from 'next/server';
import { fired, listReminders, saveReminder } from '@/lib/reminders';
import { notifyPerson, notifySaanika } from '@/lib/push';
import { listMeetups, saveMeetup } from '@/lib/meetups';

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
  // meetups starting in the next 20 minutes: a nudge with the Meet link (once)
  const soon = (await listMeetups()).filter((m) => !m.cancelled && !m.nudged && Date.parse(m.start) > now.getTime() - 5 * 60_000 && Date.parse(m.start) <= now.getTime() + 20 * 60_000);
  for (const m of soon) {
    const msg = { title: `💻 “${m.title}” starts soon`, body: 'Tap to join on Google Meet', url: m.meetLink ?? '/home/meetups' };
    await notifySaanika({ ...msg, url: '/home/meetups' });
    await Promise.all(m.friendIds.filter((f) => m.rsvp[f] !== 'no').map((f) => notifyPerson(f, { ...msg, url: '/wall' })));
    await saveMeetup({ ...m, nudged: true });
  }
  return NextResponse.json({ ok: true, due: due.length, sent, meetups: soon.length });
}
