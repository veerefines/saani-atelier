import { happeningKinds, happenings } from '@/content/happenings';
import { listOccasions } from './extras';
import { listReminders } from './reminders';
import { SEASONS } from './jelly-seasons';
import { listMeetups } from './meetups';
import type { CalEvent } from './ical';

/**
 * Saani's calendar: everything with a date, in one place. Workshops, shows and markets from the
 * Milano guide, special days from admin, festivals, her reminders and meetups with her friends.
 * Days are Milano days (YYYY-MM-DD).
 */
export type CalKind = 'event' | 'special' | 'festival' | 'reminder' | 'meetup';
export type CalItem = {
  id: string;
  kind: CalKind;
  title: string;
  start: string;
  end: string;
  /** "18:30" Milano time, if it has one */
  time?: string;
  emoji: string;
  tint: string;
  /** "Exhibitions", "Special day"… */
  label: string;
  note?: string;
  where?: string;
  href?: string;
  /** dates still to be confirmed by the organiser */
  tentative?: boolean;
  /** new to the guide this month */
  isNew?: boolean;
  /** for "add to my calendar" */
  ev: CalEvent;
};

const milanParts = (iso: string) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return { day, time };
};
const overlaps = (a: { start: string; end: string }, from: string, to: string) => a.start <= to && a.end >= from;
const daysAgo = (day: string, today: string) => (Date.parse(today) - Date.parse(day)) / 86_400_000;

export async function calendarItems(from: string, to: string, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())) {
  const [occasions, reminders, meetups] = await Promise.all([listOccasions().catch(() => []), listReminders().catch(() => []), listMeetups().catch(() => [])]);
  const out: CalItem[] = [];

  // the Milano guide's workshops, shows, markets and big dates
  for (const h of happenings) {
    const k = happeningKinds.find((x) => x.id === h.kind)!;
    for (const e of h.editions ?? []) {
      if (!overlaps(e, from, to)) continue;
      const id = `h:${h.id}:${e.start}`;
      out.push({
        id,
        kind: 'event',
        title: h.title,
        start: e.start,
        end: e.end,
        time: e.time,
        emoji: k.icon,
        tint: k.tint,
        label: k.label,
        note: h.note,
        where: h.details?.address ?? h.where,
        href: `/home/milano?event=${h.id}#happenings`,
        tentative: e.tentative,
        isNew: Boolean(h.added && h.added > '2026-10-24' && daysAgo(h.added, today) <= 30),
        ev: { uid: id, title: h.title, start: e.start, end: e.end, time: e.time, where: h.details?.address ?? h.where, details: [h.note, h.details?.time, h.details?.price].filter(Boolean).join('\n'), url: h.links[0]?.url },
      });
    }
  }

  // special days from admin (her birthday, departure day…)
  for (const o of occasions) {
    if (!overlaps({ start: o.date, end: o.date }, from, to)) continue;
    const id = `o:${o.id}`;
    out.push({ id, kind: 'special', title: o.title, start: o.date, end: o.date, emoji: o.emoji, tint: '#ffd6e4', label: 'Special day', note: o.note, ev: { uid: id, title: `${o.emoji} ${o.title}`, start: o.date, end: o.date, details: o.note } });
  }

  // festivals and seasons (Jelly dresses up for these)
  for (const s of SEASONS) {
    if (!overlaps(s, from, to)) continue;
    const id = `f:${s.id}`;
    out.push({ id, kind: 'festival', title: s.name, start: s.start, end: s.end, emoji: s.emoji, tint: s.tint.replace(/([\d.]+)\)$/, (_m, a) => `${Math.min(0.32, Number(a) * 1.6).toFixed(2)})`), label: 'Festival', note: s.hello, ev: { uid: id, title: `${s.emoji} ${s.name}`, start: s.start, end: s.end } });
  }

  // her reminders
  for (const r of reminders) {
    if (r.done) continue;
    const { day, time } = milanParts(r.at);
    if (!overlaps({ start: day, end: day }, from, to)) continue;
    const id = `r:${r.id}`;
    out.push({ id, kind: 'reminder', title: r.text, start: day, end: day, time, emoji: '⏰', tint: '#fff1c4', label: r.repeat === 'none' ? 'Reminder' : `Reminder (${r.repeat})`, ev: { uid: id, title: `⏰ ${r.text}`, start: day, end: day, time, minutes: 15 } });
  }

  // video calls with her friends
  for (const m of meetups) {
    if (m.cancelled) continue;
    const { day, time } = milanParts(m.start);
    if (!overlaps({ start: day, end: day }, from, to)) continue;
    const id = `m:${m.id}`;
    out.push({ id, kind: 'meetup', title: m.title, start: day, end: day, time, emoji: '💻', tint: '#d3e9f6', label: 'Meetup on Google Meet', href: '/home/meetups', ev: { uid: id, title: m.title, start: day, end: day, time, minutes: m.minutes, where: m.meetLink ?? 'Google Meet', url: m.meetLink ?? undefined } });
  }

  const order: Record<CalKind, number> = { special: 0, festival: 1, meetup: 2, event: 3, reminder: 4 };
  return out.sort((a, b) => (a.start === b.start ? order[a.kind] - order[b.kind] || (a.time ?? '').localeCompare(b.time ?? '') : a.start < b.start ? -1 : 1));
}

/** The first and last day of a month ("2026-12"). */
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

/** One item by its id, looking a year back and two ahead. */
export async function calendarItem(id: string) {
  const now = new Date();
  const from = new Date(now.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 730 * 86_400_000).toISOString().slice(0, 10);
  return (await calendarItems(from, to)).find((x) => x.id === id) ?? null;
}
