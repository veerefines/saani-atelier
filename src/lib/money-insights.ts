import { CATEGORIES, categoryOf, daysIn, eur, kindOf, milanDay, monthOf, shiftMonth, summary, type Budget, type Expense } from './money';

/**
 * Jelly's take on a month of Soldi: the facts are worked out here, from the numbers alone (shared
 * with her screen, no AI or database). The route asks Jelly to turn them into a few kind, specific
 * tips, and falls back to tips() below when she can't answer.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;
const SMALL = 10; // € or less counts as a little everyday spend

export type Compare = { id: string; icon: string; label: string; color: string; now: number; before: number };
export type Tip = { icon: string; text: string };

export function facts(all: Expense[], budget: Budget, month: string, today = milanDay()) {
  const s = summary(all, budget, month, today);
  const current = month === monthOf(today);
  const total = daysIn(month);
  const through = month < monthOf(today) ? total : current ? Number(today.slice(8, 10)) : 0;
  const outs = all.filter((x) => monthOf(x.day) === month && kindOf(x) === 'out');

  // against last month by the same day (all of it, for a month that's over), so a half month isn't compared with a whole one
  const prevMonth = shiftMonth(month, -1);
  const upTo = current ? Math.min(through, daysIn(prevMonth)) : daysIn(prevMonth);
  const before = all.filter((x) => monthOf(x.day) === prevMonth && kindOf(x) === 'out' && Number(x.day.slice(8, 10)) <= upTo);
  const sumBy = (l: Expense[], id: string) => round2(l.filter((x) => x.category === id).reduce((t, x) => t + x.eur, 0));
  const compare: Compare[] = CATEGORIES.map((c) => ({ id: c.id, icon: c.icon, label: c.label, color: c.color, now: sumBy(outs, c.id), before: sumBy(before, c.id) }))
    .filter((c) => c.now || c.before)
    .sort((a, b) => Math.max(b.now, b.before) - Math.max(a.now, a.before));
  const beforeTotal = round2(before.reduce((t, x) => t + x.eur, 0));
  const moved = [...compare].sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before))[0];
  const change =
    moved && beforeTotal && Math.abs(moved.now - moved.before) >= 5
      ? { label: moved.label, icon: moved.icon, now: moved.now, before: moved.before, isNew: moved.before === 0, gone: moved.now === 0, pct: moved.before ? Math.round(((moved.now - moved.before) / moved.before) * 100) : null }
      : null;

  const projected = current && through >= 5 && s.spent ? Math.round((s.spent / through) * total) : null;
  const capsAtRisk = s.byCat.filter((c) => c.cap && c.eur >= c.cap * 0.8).map((c) => ({ label: c.label, icon: c.icon, eur: c.eur, cap: c.cap as number, over: c.eur > (c.cap as number) }));

  // the little spend that adds up
  const small: Record<string, { n: number; eur: number }> = {};
  for (const x of outs.filter((x) => x.eur <= SMALL)) {
    const k = (small[x.category] ??= { n: 0, eur: 0 });
    k.n++;
    k.eur = round2(k.eur + x.eur);
  }
  const habitAt = Object.entries(small).sort((a, b) => b[1].n - a[1].n)[0];
  const habit = habitAt && habitAt[1].n >= 4 ? { label: categoryOf(habitAt[0]).label, icon: categoryOf(habitAt[0]).icon, ...habitAt[1] } : null;

  // weekends against weekdays, per day
  const days = Array.from({ length: through }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const isWeekend = (d: string) => [0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay());
  const perDay = (want: boolean) => {
    const ds = days.filter((d) => isWeekend(d) === want);
    return ds.length ? round2(outs.filter((x) => isWeekend(x.day) === want).reduce((t, x) => t + x.eur, 0) / ds.length) : 0;
  };
  const weekend = through >= 7 ? { weekend: perDay(true), weekday: perDay(false) } : null;

  const top = [...outs].sort((a, b) => b.eur - a.eur)[0];
  const biggest = top ? { eur: top.eur, what: top.note || categoryOf(top.category).label, day: top.day } : null;

  return {
    month,
    current,
    summary: s,
    shares: s.byCat.filter((c) => c.eur > 0).map((c) => ({ id: c.id, label: c.label, icon: c.icon, color: c.color, eur: c.eur, pct: s.spent ? Math.round((c.eur / s.spent) * 100) : 0 })),
    compare,
    beforeTotal,
    sameDay: current ? upTo : null,
    change,
    projected,
    capsAtRisk,
    habit,
    weekend,
    biggest,
  };
}
export type Facts = ReturnType<typeof facts>;

/** The facts in a few lines, for Jelly to read (numbers and labels only). */
export function factSheet(f: Facts) {
  const s = f.summary;
  const L: string[] = [];
  L.push(`Month: ${f.month}${f.current ? ` (in progress, ${s.daysLeft} days left)` : ' (finished)'}.`);
  L.push(`Spent ${eur(s.spent)} over ${s.count} spends${s.budget ? ` against a budget of ${eur(s.budget)} (${s.left! >= 0 ? `${eur(s.left!)} left` : `${eur(-s.left!)} over`}; ${s.onTrack ? 'on pace' : 'ahead of pace'})` : ', no budget set'}.`);
  if (f.shares.length) L.push(`By category: ${f.shares.map((c) => `${c.label} ${eur(c.eur)} (${c.pct}%)`).join('; ')}.`);
  if (f.beforeTotal) L.push(`Last month${f.sameDay ? ` by day ${f.sameDay}` : ''}: ${eur(f.beforeTotal)}.`);
  if (f.change) L.push(`Biggest change vs last month: ${f.change.label} ${eur(f.change.before)} → ${eur(f.change.now)}${f.change.isNew ? ' (new this month)' : f.change.pct !== null ? ` (${f.change.pct > 0 ? '+' : ''}${f.change.pct}%)` : ''}.`);
  if (f.projected !== null) L.push(`At this pace the month ends around ${eur(f.projected)}.`);
  for (const c of f.capsAtRisk) L.push(`Cap ${c.over ? 'passed' : 'nearly used'}: ${c.label} ${eur(c.eur)} of ${eur(c.cap)}.`);
  if (f.habit) L.push(`Little spends that add up: ${f.habit.n} ${f.habit.label} spends of €10 or less, ${eur(f.habit.eur)} in all.`);
  if (f.weekend) L.push(`Per day: weekends ${eur(f.weekend.weekend)}, weekdays ${eur(f.weekend.weekday)}.`);
  if (f.biggest) L.push(`Biggest single spend: ${eur(f.biggest.eur)} (${f.biggest.what.slice(0, 40)}).`);
  if (s.inEur) L.push(`Money in: ${eur(s.inEur)} (${s.byIn.map((c) => `${c.label} ${eur(c.eur)}`).join(', ')}); net ${s.net >= 0 ? '+' : '−'}${eur(Math.abs(s.net))}.`);
  return L.join('\n');
}

const r = (n: number) => eur(Math.round(n));

/** Tips from the facts without AI: always something useful, never shaming. */
export function tips(f: Facts): { headline: string; tips: Tip[] } {
  const s = f.summary;
  const T: Tip[] = [];
  if (!s.count) return { headline: s.inEur ? `${r(s.inEur)} came in and nothing’s gone out yet. A lovely start! 🫧` : 'Nothing logged yet this month. Tell Jelly your first spend and the charts fill in! 🫧', tips: [] };
  const top = f.shares[0];
  const headline =
    s.left !== null && s.left < 0
      ? `You’re ${r(-s.left)} over this month, cara. Let’s steer it gently back. 🫶`
      : f.projected !== null && s.budget && f.projected > s.budget
        ? `At this pace you’d finish near ${r(f.projected)}, a little past your ${r(s.budget)}. Easy to fix! ✨`
        : top
          ? `${top.icon} ${top.label} is ${top.pct}% of your month. ${s.onTrack === false ? 'A touch ahead of pace.' : s.budget ? 'You’re pacing nicely, brava!' : ''}`.trim()
          : 'Jelly’s keeping count with you. ✨';
  for (const c of f.capsAtRisk.slice(0, 2)) T.push({ icon: c.icon, text: c.over ? `${c.label} is past its ${r(c.cap)} cap (${r(c.eur)}). Maybe pause it for the rest of the month?` : `${c.label} has used ${Math.round((c.eur / c.cap) * 100)}% of its cap. ${r(c.cap - c.eur)} to go.` });
  if (f.habit) T.push({ icon: f.habit.icon, text: `${f.habit.n} little ${f.habit.label.toLowerCase()} spends added up to ${r(f.habit.eur)}. Skipping just one a week would keep about ${r((f.habit.eur / f.habit.n) * 4)} a month in your pocket.` });
  if (f.change) {
    const c = f.change;
    T.push({ icon: c.icon, text: c.isNew ? `${c.label} is new this month (${r(c.now)}).` : c.gone ? `No ${c.label.toLowerCase()} this month, ${r(c.before)} less than last time. Nice!` : `${c.label} is ${c.now > c.before ? 'up' : 'down'} ${Math.abs(c.pct ?? 0)}% on last month (${r(c.before)} → ${r(c.now)}).` });
  }
  if (f.weekend && f.weekend.weekend > f.weekend.weekday * 1.6 && f.weekend.weekend - f.weekend.weekday > 8) T.push({ icon: '🗓️', text: `Weekends cost ${r(f.weekend.weekend)} a day against ${r(f.weekend.weekday)} on weekdays. A cosy Saturday plan could balance it.` });
  if (s.inEur && T.length < 4) T.push({ icon: '🏡', text: s.net >= 0 ? `${r(s.inEur)} came in, so you’re ${r(s.net)} ahead. Maybe tuck some of it away?` : `Spends are ${r(-s.net)} more than what came in this month.` });
  if (!T.length && top) T.push({ icon: top.icon, text: `Most of your money went on ${top.label.toLowerCase()} (${r(top.eur)}).` });
  return { headline, tips: T.slice(0, 4) };
}
