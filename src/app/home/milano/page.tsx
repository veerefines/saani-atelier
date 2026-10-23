import PageHead from '@/components/home/Back';
import Milano from '@/components/home/Milano';
import Keepsakes from '@/components/Keepsakes';
import { listWishes } from '@/lib/data';
import { milano } from '@/content/home';

export default async function MilanoPage() {
  const wishes = await listWishes();
  return (
    <main className="h-page h-page-wide">
      <PageHead kicker="la dolce vita" title="Milano corner" />
      <Milano
        info={milano}
        wishes={wishes}
        heroDecor={<Keepsakes set="milano" />}
        guideDecor={<Keepsakes set="guide" />}
        beachDecor={<Keepsakes set="beach" />}
      />
    </main>
  );
}
