/**
 * Soldi: what Saani spends in Milano, in euros or rupees, against a monthly budget, and the money
 * that comes in (from home, a stipend, work). Every entry keeps the rate from the moment she added
 * it, so last month's numbers never move. Only she sees it.
 * This part is shared with her screen (no database code here); money-store.ts saves things.
 */

/** "YYYY-MM-DD" in Milano, and days before or after one (as in extras.ts, without the store) */
export const milanDay = (at: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Each spend category has a fixed chart colour (it follows the category, never its rank). The eight
 * hues were checked as a set for colour-blind separation in this order, which is also the order the
 * pie draws its slices in; the smaller ones share a soft grey as "little bits".
 */
const BITS = '#b9aeb4';
export const CATEGORIES = [
  { id: 'rent', icon: '🏠', label: 'Rent & bills', color: '#3a7fd0' },
  { id: 'eating', icon: '🍝', label: 'Eating out', color: '#e0693a' },
  { id: 'groceries', icon: '🛒', label: 'Groceries', color: '#2fa97c' },
  { id: 'cafe', icon: '☕', label: 'Café & aperitivo', color: '#e6a21a' },
  { id: 'shopping', icon: '👗', label: 'Shopping', color: '#e27aa6' },
  { id: 'travel', icon: '✈️', label: 'Travel', color: '#2f8a3a' },
  { id: 'fun', icon: '🎟️', label: 'Fun', color: '#7458d6' },
  { id: 'transport', icon: '🚇', label: 'Transport', color: '#c8364f' },
  { id: 'uni', icon: '📚', label: 'Uni & supplies', color: BITS },
  { id: 'health', icon: '💊', label: 'Health', color: BITS },
  { id: 'phone', icon: '📱', label: 'Phone & subs', color: BITS },
  { id: 'other', icon: '✨', label: 'Other', color: BITS },
] as const;
export const BITS_COLOR = BITS;
/** The order she picks from (the pie's order is above). */
export const PICK_ORDER = ['groceries', 'cafe', 'eating', 'transport', 'rent', 'shopping', 'uni', 'fun', 'travel', 'health', 'phone', 'other'] as const;
export type CategoryId = (typeof CATEGORIES)[number]['id'];

/** Money coming in. */
export const IN_CATEGORIES = [
  { id: 'home', icon: '🏡', label: 'From home', color: '#3e9d6c' },
  { id: 'stipend', icon: '🎓', label: 'Stipend', color: '#3e9d6c' },
  { id: 'work', icon: '💼', label: 'Work', color: '#3e9d6c' },
  { id: 'refund', icon: '↩️', label: 'Refund', color: '#3e9d6c' },
  { id: 'gift', icon: '🎁', label: 'Gift', color: '#3e9d6c' },
  { id: 'other-in', icon: '✨', label: 'Other money in', color: '#3e9d6c' },
] as const;
export type InCategoryId = (typeof IN_CATEGORIES)[number]['id'];

export type Kind = 'out' | 'in';
export const isKind = (x: unknown): x is Kind => x === 'out' || x === 'in';
/** Entries from before money in existed have no kind: they're spends. */
export const kindOf = (x: { kind?: Kind }): Kind => (x.kind === 'in' ? 'in' : 'out');
export const listFor = (kind: Kind) => (kind === 'in' ? IN_CATEGORIES : CATEGORIES);
export const isCategory = (x: unknown, kind: Kind = 'out'): x is CategoryId | InCategoryId => listFor(kind).some((c) => c.id === x);
export const fallbackFor = (kind: Kind) => (kind === 'in' ? 'other-in' : 'other');
export const categoryOf = (id: string, kind: Kind = 'out') => {
  const l = listFor(kind) as readonly { id: string; icon: string; label: string; color: string }[];
  return l.find((c) => c.id === id) ?? l[l.length - 1];
};

export type Currency = 'EUR' | 'INR';
export type Expense = {
  id: string;
  createdAt: string;
  /** money out (a spend) or in; missing on older entries, which are spends */
  kind?: Kind;
  /** the Milano day it was spent */
  day: string;
  amount: number;
  currency: Currency;
  eur: number;
  inr: number;
  /** ₹ for €1 when she added it */
  rate: number;
  category: CategoryId | InCategoryId;
  note: string;
  /** where it was logged from, when not the Soldi page */
  source?: 'whatsapp';
};
export type Budget = { id: 'budget'; createdAt: string; monthly: number; caps: Partial<Record<CategoryId, number>> };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Both sides of a spend, from what she typed. */
export function priced(amount: number, currency: Currency, rate: number) {
  return currency === 'EUR' ? { eur: round2(amount), inr: round2(amount * rate) } : { eur: round2(amount / rate), inr: round2(amount) };
}

/* ---------- a month at a glance ---------- */
export const monthOf = (day: string) => day.slice(0, 7);
export const daysIn = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();

const sum = (l: Expense[], k: 'eur' | 'inr' = 'eur') => round2(l.reduce((s, x) => s + x[k], 0));
export const shiftMonth = (m: string, n: number) => {
  const d = new Date(`${m}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const byCatOf = (list: Expense[], budget: Budget) =>
  CATEGORIES.map((c) => ({ ...c, eur: sum(list.filter((x) => x.category === c.id)), cap: budget.caps[c.id] ?? null }))
    .filter((c) => c.eur > 0 || c.cap)
    .sort((a, b) => b.eur - a.eur);

export function summary(all: Expense[], budget: Budget, month: string, today = milanDay()) {
  const inMonth = all.filter((x) => monthOf(x.day) === month);
  const list = inMonth.filter((x) => kindOf(x) === 'out');
  const ins = inMonth.filter((x) => kindOf(x) === 'in');
  const spent = sum(list);
  const spentInr = sum(list, 'inr');
  const byCat = byCatOf(list, budget);
  const inEur = sum(ins);
  const byIn = IN_CATEGORIES.map((c) => ({ ...c, eur: sum(ins.filter((x) => x.category === c.id)) }))
    .filter((c) => c.eur > 0)
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
    inEur,
    inInr: sum(ins, 'inr'),
    inCount: ins.length,
    net: round2(inEur - spent),
    byIn,
  };
}
export type MonthSummary = ReturnType<typeof summary>;

function topOf(list: Expense[]) {
  const by: Record<string, number> = {};
  for (const x of list) by[x.category] = (by[x.category] ?? 0) + x.eur;
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  return top ? categoryOf(top[0]).label.toLowerCase() : null;
}

export const eur = (n: number) => `€${n % 1 ? n.toFixed(2) : n}`;

/** Jelly's weekly word on her money, kind and honest (no AI needed). */
export function jellyLine(s: MonthSummary) {
  const net = s.inEur ? ` ${eur(Math.round(s.inEur))} came in${s.net >= 0 ? `, so you’re ${eur(Math.round(s.net))} ahead for the month.` : ` and ${eur(Math.round(s.spent))} went out.`}` : '';
  return (base(s) + net).trim();
}
function base(s: MonthSummary) {
  if (!s.count) return s.inEur ? '' : s.budget ? `A fresh month, ${eur(s.budget)} to play with. Log your first spend and Jelly will keep count! 🫧` : 'Set a monthly budget and Jelly will keep an eye on it with you. 🫧';
  const week = s.week.eur ? `${eur(s.week.eur)} this week${s.week.top ? `, mostly ${s.week.top}` : ''}.` : 'Nothing spent this week, look at you!';
  if (s.pace === null || s.left === null) return `${week} Add a budget and Jelly can tell you how you’re pacing. ✨`;
  if (s.left < 0) return `${week} You’re ${eur(Math.abs(s.left))} over this month, cara. Tiny steps: one cosy night in? 🫶`;
  const diff = Math.round(s.pace - s.spent);
  if (s.onTrack) return `${week} You’re ${diff > 0 ? `${eur(diff)} under pace` : 'right on pace'}, brava! ${eur(Math.round(s.left))} left for ${s.daysLeft} days. ✨`;
  return `${week} A little ahead of pace (${eur(Math.round(-diff))}). ${eur(Math.round(s.left))} left for ${s.daysLeft} days, Jelly believes in you! 🫧`;
}
