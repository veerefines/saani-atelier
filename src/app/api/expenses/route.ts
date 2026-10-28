import { eurInr } from '@/lib/fx';
import { isCategory, monthOf, summary } from '@/lib/money';
import { getBudget, listExpenses, newExpenseId, saveExpense } from '@/lib/money-store';
import { milanDay } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A month of her spends (this month unless ?month=YYYY-MM), with the summary and the budget. */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const q = new URL(req.url).searchParams.get('month');
  const month = q && /^\d{4}-\d{2}$/.test(q) ? q : monthOf(milanDay());
  const [all, budget] = await Promise.all([listExpenses(), getBudget()]);
  return json({ month, expenses: all.filter((x) => monthOf(x.day) === month), summary: summary(all, budget, month), budget });
}

/** Add a spend, in € or ₹. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const b = await req.json().catch(() => ({}));
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return fail('How much was it?');
  const currency = b.currency === 'INR' ? 'INR' : 'EUR';
  const category = isCategory(b.category) ? b.category : 'other';
  const day = typeof b.day === 'string' && DAY.test(b.day) && b.day <= milanDay() ? b.day : milanDay();
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 120) : '';
  const rate = (await eurInr()).inr;
  const x = await saveExpense({ id: newExpenseId(), createdAt: new Date().toISOString(), day, amount, currency, rate, category, note });
  return json(x, 201);
}
