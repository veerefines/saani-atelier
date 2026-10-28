import { calendarItems, monthRange } from '@/lib/calendar';
import { milanDay } from '@/lib/extras';
import { requireSession, isResponse, json } from '@/lib/api';

/** Everything with a date in a month (?month=YYYY-MM, this month if not given). */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const q = new URL(req.url).searchParams.get('month');
  const month = q && /^\d{4}-\d{2}$/.test(q) ? q : milanDay().slice(0, 7);
  const { from, to } = monthRange(month);
  return json({ month, items: await calendarItems(from, to) });
}
