import PageHead from '@/components/home/Back';
import Calendar from '@/components/home/Calendar';
import { calendarItems, monthRange } from '@/lib/calendar';
import { milanDay } from '@/lib/extras';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const today = milanDay();
  const month = today.slice(0, 7);
  const { from, to } = monthRange(month);
  return (
    <main className="h-page h-page-wide">
      <PageHead kicker="the little planner" title="Calendario" sub="Workshops, shows, markets, festivals, special days and meetups, all in one place. Add anything to your own calendar." />
      <Calendar initial={{ month, items: await calendarItems(from, to) }} today={today} />
    </main>
  );
}
