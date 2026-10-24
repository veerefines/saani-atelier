import PageHead from '@/components/home/Back';
import Composer from '@/components/wall/Composer';
import Keepsakes from '@/components/Keepsakes';
import { getSession } from '@/lib/auth';
import { getMine } from '@/lib/wall';
import { listOccasions, milanDay } from '@/lib/extras';

export default async function WallLetters() {
  const [mine, occasions] = await Promise.all([getMine((await getSession())!), listOccasions()]);
  const today = milanDay();
  const upcoming = occasions.filter((o) => o.date > today).slice(0, 6).map((o) => ({ date: o.date, title: o.title, emoji: o.emoji }));
  return (
    <main className="h-page w-page">
      <Keepsakes set="letters" />
      <PageHead back="/wall" kicker="sealed with love" title="Open when…" sub="Write it for a particular moment. Lock it until a date if you like; she’ll see the envelope waiting." />
      <Composer mine={mine} only={['letter']} occasions={upcoming} />
    </main>
  );
}
