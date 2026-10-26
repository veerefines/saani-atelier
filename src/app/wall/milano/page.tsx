import PageHead from '@/components/home/Back';
import Tips from '@/components/wall/Tips';
import { getSession } from '@/lib/auth';
import { getMine } from '@/lib/wall';

export default async function WallMilano() {
  const session = (await getSession())!;
  const mine = await getMine(session);
  return (
    <main className="h-page w-page">
      <PageHead back="/wall" kicker="la dolce vita" title="Milano Mei Milo!" sub="Know a place she’d love? Tell her where to go." />
      <Tips tips={mine.tips} name={session.name} />
    </main>
  );
}
