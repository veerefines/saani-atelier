/** Times as she reads them: 7:30 AM, 9:30 PM. */
export function clock12(h: number, m = 0) {
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${h % 24 < 12 ? 'AM' : 'PM'}`;
}

/** An hour on its own, for scales and tooltips: 7 AM, 12 PM. */
export const hour12 = (h: number) => `${h % 12 || 12} ${h % 24 < 12 ? 'AM' : 'PM'}`;

/** "HH:MM" (as weather services send it) to 7:30 AM. */
export function fromHHMM(s: string) {
  const [h, m] = s.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? clock12(h, m) : s;
}

const fmts = new Map<string, Intl.DateTimeFormat>();
/** The time now in a time zone, 12-hour. */
export function timeIn12(d: Date, zone?: string) {
  const key = zone ?? '';
  let f = fmts.get(key);
  if (!f) fmts.set(key, (f = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', ...(zone ? { timeZone: zone } : {}) })));
  const p = f.formatToParts(d);
  return clock12(Number(p.find((x) => x.type === 'hour')!.value), Number(p.find((x) => x.type === 'minute')!.value));
}
