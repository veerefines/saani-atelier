/**
 * Soldi: what Saani spends in Milano, in euros or rupees, against a monthly budget. Every spend
 * keeps the rate from the moment she added it, so last month's numbers never move. Only she sees it.
 * This part is shared with her screen (no database code here); money-store.ts saves things.
 */

/** "YYYY-MM-DD" in Milano, and days before or after one (as in extras.ts, without the store) */
export const milanDay = (at: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const CATEGORIES = [
  { id: 'rent', icon: '🏠', label: 'Rent & bills' },
  { id: 'groceries', icon: '🛒', label: 'Groceries' },
  { id: 'transport', icon: '🚇', label: 'Transport' },
  { id: 'cafe', icon: '☕', label: 'Café & aperitivo' },
  { id: 'eating', icon: '🍝', label: 'Eating out' },
  { id: 'shopping', icon: '👗', label: 'Shopping' },
  { id: 'uni', icon: '📚', label: 'Uni & supplies' },
  { id: 'health', icon: '💊', label: 'Health' },
  { id: 'fun', icon: '🎟️', label: 'Fun' },
  { id: 'travel', icon: '✈️', label: 'Travel' },
  { id: 'phone', icon: '📱', label: 'Phone & subs' },
  { id: 'other', icon: '✨', label: 'Other' },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]['id'];
export const isCategory = (x: unknown): x is CategoryId => CATEGORIES.some((c) => c.id === x);
export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export type Currency = 'EUR' | 'INR';
export type Expense = {
  id: string;
  createdAt: string;
  /** the Milano day it was spent */
  day: string;
  amount: number;
  currency: Currency;
  eur: number;
  inr: number;
  /** ₹ for €1 when she added it */
  rate: number;
  category: CategoryId;
  note: string;
};
export type Budget = { id: 'budget'; createdAt: string; monthly: number; caps: Partial<Record<CategoryId, number>> };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Both sides of a spend, from what she typed. */
export function priced(amount: number, currency: Currency, rate: number) {
  return currency === 'EUR' ? { eur: round2(amount), inr: round2(amount * rate) } : { eur: round2(amount / rate), inr: round2(amount) };
}

/* ---------- a month at a glance ---------- */
export const monthOf = (day: string) => day.slice(0, 7);
const daysIn = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();

export function summary(all: Expense[], budget: Budget, month: string, today = milanDay()) {
  const list = all.filter((x) => monthOf(x.day) === month);
  const spent = round2(list.reduce((s, x) => s + x.eur, 0));
  const spentInr = round2(list.reduce((s, x) => s + x.inr, 0));
  const byCat = CATEGORIES.map((c) => ({ ...c, eur: round2(list.filter((x) => x.category === c.id).reduce((s, x) => s + x.eur, 0)), cap: budget.caps[c.id] ?? null }))
    .filter((c) => c.eur > 0 || c.cap)
    .sort((a, b) => b.eur - a.eur);
  const weekFrom = addDays(today, -6);
  const week = list.filter((x) => x.day >= weekFrom && x.day <= today);
  const weekEur = round2(week.reduce((s, x) => s + x.eur, 0));
  const total = daysIn(month);
  // how far through the month we are: all of it for past months, none of it for future ones
  const through = month < monthOf(today) ? total : month > monthOf(today) ? 0 : Number(today.slice(8, 10));
  const pace = budget.monthly ? round2((budget.monthly * through) / total) : null;
  return {
    month,
    count: list.length,
    spent,
    spentInr,
    budget: budget.monthly,
    left: budget.monthly ? round2(budget.monthly - spent) : null,
    pace,
    onTrack: pace === null ? null : spent <= pace * 1.05,
    week: { eur: weekEur, top: topOf(week) },
    byCat,
    daysLeft: total - through,
  };
}
export type MonthSummary = ReturnType<typeof summary>;

function topOf(list: Expense[]) {
  const by: Record<string, number> = {};
  for (const x of list) by[x.category] = (by[x.category] ?? 0) + x.eur;
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  return top ? categoryOf(top[0]).label.toLowerCase() : null;
}

const eur = (n: number) => `€${n % 1 ? n.toFixed(2) : n}`;

/** Jelly's weekly word on her money, kind and honest (no AI needed). */
export function jellyLine(s: MonthSummary) {
  if (!s.count) return s.budget ? `A fresh month, ${eur(s.budget)} to play with. Log your first spend and Jelly will keep count! 🫧` : 'Set a monthly budget and Jelly will keep an eye on it with you. 🫧';
  const week = s.week.eur ? `${eur(s.week.eur)} this week${s.week.top ? `, mostly ${s.week.top}` : ''}.` : 'Nothing spent this week, look at you!';
  if (s.pace === null || s.left === null) return `${week} Add a budget and Jelly can tell you how you’re pacing. ✨`;
  if (s.left < 0) return `${week} You’re ${eur(Math.abs(s.left))} over this month, cara. Tiny steps: one cosy night in? 🫶`;
  const diff = Math.round(s.pace - s.spent);
  if (s.onTrack) return `${week} You’re ${diff > 0 ? `${eur(diff)} under pace` : 'right on pace'}, brava! ${eur(Math.round(s.left))} left for ${s.daysLeft} days. ✨`;
  return `${week} A little ahead of pace (${eur(Math.round(-diff))}). ${eur(Math.round(s.left))} left for ${s.daysLeft} days, Jelly believes in you! 🫧`;
}
