import PageHead from '@/components/home/Back';
import HerMilano from '@/components/wall/HerMilano';
import { getSession } from '@/lib/auth';
import { listDiary, listLook, listStamps } from '@/lib/extras';
import { places } from '@/content/milano';

/** What she has chosen to share: looks, days, and her passport progress. Nothing private. */
export default async function WallHer() {
  const s = (await getSession())!;
  const [look, diary, stamps] = await Promise.all([listLook(), listDiary(), listStamps()]);
  const stampNames = stamps.map((x) => ({ name: places.find((p) => p.id === x.placeId)?.name ?? 'a place', at: x.createdAt }));
  return (
    <main className="h-page h-page-wide">
      <PageHead back="/wall" kicker="what she’s shared" title="Her Milano life" sub="Looks, days and places she’s chosen to share with her people." />
      <HerMilano
        me={s.id}
        look={look.filter((x) => x.shared)}
        days={diary.filter((d) => d.shared).reverse()}
        stamps={stampNames}
        totalPlaces={places.length}
      />
    </main>
  );
}
