import PageHead from '@/components/home/Back';
import Composer from '@/components/wall/Composer';
import Keepsakes from '@/components/Keepsakes';
import { getSession } from '@/lib/auth';
import { getMine } from '@/lib/wall';
import { upcomingOccasions } from '@/lib/extras';

export default async function WallLetters() {
  // every special day to come, festivals and anything added in admin
  const [mine, upcoming] = await Promise.all([getMine((await getSession())!), upcomingOccasions()]);
  return (
    <main className="h-page w-page">
      <Keepsakes set="letters" />
      <PageHead back="/wall" kicker="sealed with love" title="Likhe Jo Khat Tujhe!" sub="Write it for a particular moment. Lock it until a date if you like; she’ll see the envelope waiting." />
      <Composer mine={mine} only={['letter']} occasions={upcoming} />
    </main>
  );
}
