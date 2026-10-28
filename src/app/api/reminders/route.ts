import { addReminder, listReminders } from '@/lib/reminders';
import { checkIn } from '@/lib/jelly-world';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Her reminders: the ones still to come, and the last few done. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const all = await listReminders();
  return json({ open: all.filter((r) => !r.done), done: all.filter((r) => r.done).slice(-5).reverse() });
}

/** Set one by hand: { text, day: YYYY-MM-DD, time: HH:MM, tz, repeat }. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const b = await req.json().catch(() => ({}));
  const r = await addReminder({ text: b.text, day: b.day, time: b.time, tz: b.tz, repeat: b.repeat, via: 'hand' });
  if (typeof r === 'string') return fail(r);
  return json({ reminder: r, ...(await checkIn()) }, 201);
}
