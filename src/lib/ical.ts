/**
 * Putting things in her own calendar: a Google Calendar link that opens the event ready to save,
 * and .ics text for Apple Calendar (and everything else). Times are Milano times; an event without
 * one is all-day. Shared by the server (which serves .ics files) and her screen.
 */

export type CalEvent = {
  uid: string;
  title: string;
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD, the last day (inclusive) */
  end: string;
  /** "18:30" in Milano, for a timed event */
  time?: string;
  /** how long a timed event lasts */
  minutes?: number;
  where?: string;
  details?: string;
  url?: string;
};

const TZ = 'Europe/Rome';
const compact = (d: string) => d.replace(/-/g, '');
const nextDay = (d: string) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
};
/** "2026-12-07" + "18:00" (+90 min) as local "20261207T180000" stamps. */
function timed(day: string, time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const startMin = h * 60 + m;
  const endMin = startMin + minutes;
  const endDay = endMin >= 1440 ? nextDay(day) : day;
  const e = endMin % 1440;
  const two = (n: number) => String(n).padStart(2, '0');
  return { s: `${compact(day)}T${two(h)}${two(m)}00`, e: `${compact(endDay)}T${two(Math.floor(e / 60))}${two(e % 60)}00` };
}

/** Opens Google Calendar with the event filled in, ready to save. */
export function googleLink(ev: CalEvent) {
  const dates = ev.time ? (({ s, e }) => `${s}/${e}`)(timed(ev.start, ev.time, ev.minutes ?? 90)) : `${compact(ev.start)}/${compact(nextDay(ev.end))}`;
  const p = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates, ctz: TZ });
  const details = [ev.details, ev.url].filter(Boolean).join('\n\n');
  if (details) p.set('details', details);
  if (ev.where) p.set('location', ev.where);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Text that's safe inside an .ics line, folded at 75 octets as the format asks. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const enc = new TextEncoder();
function fold(line: string) {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (enc.encode(cur + ch).length > 74) {
      out.push(cur);
      cur = ' ' + ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
}

/** A calendar file with one or more events (Apple Calendar, Outlook, Google import…). */
export function ics(events: CalEvent[], name = 'Saani’s Atelier') {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Saani’s Atelier//Milano//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`,
    `X-WR-TIMEZONE:${TZ}`,
    // Milano's time zone, so timed events land right wherever her phone is
    'BEGIN:VTIMEZONE',
    `TZID:${TZ}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
  for (const ev of events) {
    lines.push('BEGIN:VEVENT', `UID:${ev.uid}@saani-atelier`, `DTSTAMP:${stamp}`);
    if (ev.time) {
      const { s, e } = timed(ev.start, ev.time, ev.minutes ?? 90);
      lines.push(`DTSTART;TZID=${TZ}:${s}`, `DTEND;TZID=${TZ}:${e}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(ev.start)}`, `DTEND;VALUE=DATE:${compact(nextDay(ev.end))}`);
    }
    lines.push(`SUMMARY:${esc(ev.title)}`);
    if (ev.where) lines.push(`LOCATION:${esc(ev.where)}`);
    if (ev.details) lines.push(`DESCRIPTION:${esc(ev.details)}`);
    if (ev.url) lines.push(`URL:${ev.url}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
