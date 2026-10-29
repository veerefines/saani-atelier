import { milanDay, monthOf } from '@/lib/money';
import { jellyTake } from '@/lib/money-take';
import { getBudget, listExpenses } from '@/lib/money-store';
import { requireSession, isResponse, json } from '@/lib/api';

/** Jelly's take on a month: the facts for the charts, plus her headline and tips (cached until the month changes). */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const q = new URL(req.url).searchParams.get('month');
  const today = milanDay();
  const month = q && /^\d{4}-\d{2}$/.test(q) ? q : monthOf(today);
  const [all, budget] = await Promise.all([listExpenses(), getBudget()]);
  const { f, take } = await jellyTake(all, budget, month, today);

  return json({
    month,
    shares: f.shares,
    compare: f.compare,
    beforeTotal: f.beforeTotal,
    sameDay: f.sameDay,
    change: f.change,
    projected: f.projected,
    spent: f.summary.spent,
    inEur: f.summary.inEur,
    net: f.summary.net,
    byIn: f.summary.byIn,
    headline: take.headline,
    tips: take.tips,
    via: take.via,
  });
}
