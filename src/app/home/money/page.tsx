import PageHead from '@/components/home/Back';
import Money from '@/components/home/Money';
import { milanDay, monthOf, summary } from '@/lib/money';
import { getBudget, listExpenses } from '@/lib/money-store';

export default async function MoneyPage() {
  const [all, budget] = await Promise.all([listExpenses(), getBudget()]);
  const month = monthOf(milanDay());
  return (
    <main className="h-page">
      <PageHead kicker="conti in ordine" title="Soldi" sub="What you spend in Milano, in euros or rupees, with today’s rate and a gentle budget." />
      <Money initial={{ month, expenses: all.filter((x) => monthOf(x.day) === month), summary: summary(all, budget, month), budget }} />
    </main>
  );
}
