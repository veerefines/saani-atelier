import { calendarItem, calendarItems, monthRange } from '@/lib/calendar';
import { ics } from '@/lib/ical';
import { requireSession, isResponse, fail } from '@/lib/api';

/**
 * A calendar file for Apple Calendar (or any calendar): one item (?item=…), or a whole month
 * (?month=YYYY-MM). On an iPhone it opens straight into "Add to Calendar".
 */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const u = new URL(req.url);
  const id = u.searchParams.get('item');
  const month = u.searchParams.get('month');
  let events;
  let name = 'saani-atelier';
  if (id) {
    const it = await calendarItem(id);
    if (!it) return fail('That isn’t on the calendar any more.', 404);
    events = [it.ev];
    name = it.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'event';
  } else if (month && /^\d{4}-\d{2}$/.test(month)) {
    const { from, to } = monthRange(month);
    events = (await calendarItems(from, to)).filter((x) => x.kind !== 'reminder').map((x) => x.ev);
    if (!events.length) return fail('Nothing on that month yet.', 404);
    name = `milano-${month}`;
  } else return fail('Which event, or which month?');
  return new Response(ics(events, month ? `Milano · ${month}` : 'Saani’s Atelier'), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.ics"`, 'Cache-Control': 'no-store' },
  });
}
