import PageHead from '@/components/home/Back';
import Lookbook from '@/components/home/Lookbook';
import { listLook } from '@/lib/extras';

export default async function LookbookPage() {
  const items = await listLook();
  return (
    <main className="h-page h-page-wide">
      <PageHead kicker="your eye, your style" title="Lookbook" sub="Outfits, sketches and Pinterest boards in one place. Private unless you share them." />
      <Lookbook items={items} />
    </main>
  );
}
