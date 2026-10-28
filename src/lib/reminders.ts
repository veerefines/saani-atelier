import * as db from './db';

/**
 * Jelly's reminders: "remind me to call home at 7 PM". Saved with the time zone she set them in
 * (Mumbai before she flies, Milano after), sent as a push by /api/tick (a free GitHub timer calls it
 * every ten minutes), and popped by Jelly herself if the site is open at the time. Repeats keep their
 * wall-clock time across summer time changes.
 */
export type Repeat = 'none' | 'daily' | 'weekly';
export type Reminder = {
  id: string;
  createdAt: string;
  text: string;
  /** when it's next due */
  at: string;
  tz: string;
  repeat: Repeat;
  via: 'chat' | 'hand';
  sentAt?: string | null;
  done?: boolean;
};

const COL = 'reminders';
export const MAX_REMINDERS = 60;
export const isRepeat = (x: unknown): x is Repeat => x === 'none' || x === 'daily' || x === 'weekly';

/** A real IANA time zone, or Milano's. */
export function zoneOr(tz: unknown, fallback = 'Europe/Rome') {
  if (typeof tz !== 'string' || !tz || tz.length > 60) return fallback;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return fallback;
  }
}

/** The wall-clock parts of a moment in a zone. */
function partsIn(at: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}

/** A wall-clock time in a zone ("2026-10-28", "19:00") as a moment. */
export function zoned(day: string, hhmm: string, tz: string): Date | null {
  const dm = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!dm || !tm || +tm[1] > 23 || +tm[2] > 59) return null;
  const want = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2]);
  let t = want;
  // twice is enough to settle on the zone's offset (and lands sensibly in a summer-time gap)
  for (let i = 0; i < 2; i++) {
    const p = partsIn(new Date(t), tz);
    t += want - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
  }
  return new Date(t);
}

/** The next time a repeating reminder is due after `after`, at the same wall-clock time. */
export function nextAt(r: Pick<Reminder, 'at' | 'tz' | 'repeat'>, after: Date): string | null {
  if (r.repeat === 'none') return null;
  const step = r.repeat === 'daily' ? 1 : 7;
  const p = partsIn(new Date(r.at), r.tz);
  const hhmm = `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
  let day = new Date(Date.UTC(p.y, p.m - 1, p.d, 12));
  for (let i = 0; i < 400; i++) {
    day = new Date(day.getTime() + step * 86_400_000);
    const t = zoned(day.toISOString().slice(0, 10), hhmm, r.tz);
    if (t && t > after) return t.toISOString();
  }
  return null;
}

export const listReminders = async () => (await db.list<Reminder>(COL)).sort((a, b) => (a.at < b.at ? -1 : 1));
export const getReminder = (id: string) => db.get<Reminder>(COL, id);
export const saveReminder = (r: Reminder) => db.put<Reminder>(COL, r);
export const removeReminder = (id: string) => db.remove(COL, id);
export const newReminderId = () => db.newId('rm_');

/** It went off (as a push, or Jelly said it on screen): roll a repeat on, or put it to rest. */
export function fired(r: Reminder, now: Date): Reminder {
  const next = nextAt(r, now);
  return next ? { ...r, at: next, sentAt: now.toISOString() } : { ...r, sentAt: now.toISOString(), done: true };
}

/** Make one: from Jelly's "[remind: …]" tag or the form. Returns an error message or the reminder. */
export async function addReminder(input: { text: unknown; day: unknown; time: unknown; tz: unknown; repeat: unknown; via: Reminder['via'] }, now = new Date()): Promise<string | Reminder> {
  const text = typeof input.text === 'string' ? input.text.replace(/\s+/g, ' ').trim().slice(0, 140) : '';
  if (!text) return 'What should Jelly remind you about?';
  const tz = zoneOr(input.tz);
  const at = zoned(String(input.day ?? ''), String(input.time ?? ''), tz);
  if (!at) return 'Jelly couldn’t work out when that is.';
  if (at.getTime() < now.getTime() - 60_000) return 'That time has already passed.';
  if (at.getTime() > now.getTime() + 400 * 86_400_000) return 'That’s a bit too far ahead for Jelly.';
  const open = (await listReminders()).filter((r) => !r.done);
  if (open.length >= MAX_REMINDERS) return `Jelly can hold up to ${MAX_REMINDERS} reminders at once.`;
  return saveReminder({ id: newReminderId(), createdAt: now.toISOString(), text, at: at.toISOString(), tz, repeat: isRepeat(input.repeat) ? input.repeat : 'none', via: input.via });
}
