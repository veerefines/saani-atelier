import PageHead from '@/components/home/Back';
import Keepsakes from '@/components/Keepsakes';
import Bingo from '@/components/home/Bingo';
import { getBingo } from '@/lib/data';
import { bingo } from '@/content/home';

export default async function BingoPage() {
  const state = await getBingo();
  return (
    <main className="h-page">
      <Keepsakes set="bingo" />
      <PageHead kicker="twenty-five little adventures" title="Milano bingo" sub="Do the thing, tap the square, collect your reward." />
      <Bingo squares={bingo} done={state.done} />
    </main>
  );
}
