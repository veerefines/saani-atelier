/**
 * When everyone's awake: for "good time to call" and the meetup planner. Works in 30-minute slots
 * (India is on a half hour) and treats 8 AM–11 PM as the hours people are happy to pick up.
 */
export const AWAKE = { from: 8 * 60, to: 23 * 60 };
export const SLOT = 30;

const fmts = new Map<string, Intl.DateTimeFormat>();
/** Minutes since midnight in a time zone. */
export function minutesIn(d: Date, tz: string) {
  let f = fmts.get(tz);
  if (!f) fmts.set(tz, (f = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz })));
  const p = f.formatToParts(d);
  return (Number(p.find((x) => x.type === 'hour')!.value) % 24) * 60 + Number(p.find((x) => x.type === 'minute')!.value);
}
export const awake = (d: Date, tz: string) => {
  const m = minutesIn(d, tz);
  return m >= AWAKE.from && m < AWAKE.to;
};
const weekday = (d: Date, tz: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: tz }).format(d);

/**
 * Good times in the next `days` days for a call between me (myTz) and everyone in `tzs`: one per day,
 * the nicest slot that day (evenings for me first, then the earliest everyone's awake).
 */
export function goodTimes(myTz: string, tzs: string[], days = 7, from = new Date()) {
  const start = new Date(Math.ceil((from.getTime() + 60 * 60_000) / (SLOT * 60_000)) * SLOT * 60_000);
  const out: { at: Date; score: number }[] = [];
  let bestToday: { at: Date; score: number } | null = null;
  let today = '';
  for (let t = start.getTime(); t < start.getTime() + days * 86_400_000; t += SLOT * 60_000) {
    const d = new Date(t);
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: myTz }).format(d);
    if (day !== today) {
      if (bestToday) out.push(bestToday);
      bestToday = null;
      today = day;
    }
    if (!awake(d, myTz) || !tzs.every((z) => awake(d, z))) continue;
    const mine = minutesIn(d, myTz);
    // after classes in the evening is nicest for her; weekends any daytime too
    const wk = ['Sat', 'Sun'].includes(weekday(d, myTz));
    const score = (mine >= 18 * 60 && mine <= 21 * 60 ? 3 : 0) + (wk && mine >= 11 * 60 ? 2 : 0) + (mine >= 12 * 60 ? 1 : 0);
    if (!bestToday || score > bestToday.score) bestToday = { at: d, score };
  }
  if (bestToday) out.push(bestToday);
  return out.map((x) => x.at);
}
