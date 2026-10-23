import PageHead from '@/components/home/Back';
import Keepsakes from '@/components/Keepsakes';
import Letters from '@/components/home/Letters';
import { hideIfLocked, listLetters } from '@/lib/data';

export default async function LettersPage() {
  const letters = (await listLetters()).map(hideIfLocked);
  return (
    <main className="h-page">
      <Keepsakes set="letters" />
      <PageHead kicker="sealed with love" title="Open when…" sub="Each one is for a particular moment. Some open on their own day." />
      <Letters letters={letters} />
    </main>
  );
}
