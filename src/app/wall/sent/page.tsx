import PageHead from '@/components/home/Back';
import SentBox from '@/components/wall/SentBox';
import { getSession } from '@/lib/auth';
import { getMine } from '@/lib/wall';
import { bingo } from '@/content/home';

export default async function WallSent() {
  const mine = await getMine((await getSession())!);
  return (
    <main className="h-page w-page">
      <PageHead back="/wall" kicker="from you, with love" title="Your sent box" sub="Everything you’ve left for her, and what she’s opened, read and loved." />
      <SentBox box={mine} squares={bingo} />
    </main>
  );
}
