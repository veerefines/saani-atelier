import PageHead from '@/components/home/Back';
import Checklist from '@/components/home/Checklist';
import { getChecklist } from '@/lib/extras';
import { checklist } from '@/content/checklist';

export default async function ChecklistPage() {
  const state = await getChecklist();
  return (
    <main className="h-page">
      <PageHead kicker="one thing at a time" title="Settling in" sub="The boring-but-important bits of moving to Milano. Tick them off as you go." />
      <Checklist items={checklist} done={state.done} />
    </main>
  );
}
