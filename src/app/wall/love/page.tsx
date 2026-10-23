import PageHead from '@/components/home/Back';
import Composer from '@/components/wall/Composer';
import Keepsakes from '@/components/Keepsakes';
import { getSession } from '@/lib/auth';
import { getMine } from '@/lib/wall';

export default async function WallLove() {
  const mine = await getMine((await getSession())!);
  return (
    <main className="h-page w-page">
      <Keepsakes set="love" />
      <PageHead back="/wall" kicker="pinned up, just for her" title="Her wall of love" sub="A message, a whole photo album, a voice note or a little film." />
      <Composer mine={mine} only={['message', 'voice', 'video']} />
    </main>
  );
}
