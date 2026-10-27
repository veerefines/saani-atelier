import PageHead from '@/components/home/Back';
import JellyHome from '@/components/jelly/JellyHome';
import { checkIn } from '@/lib/jelly-world';

export const dynamic = 'force-dynamic';

/** Jelly's Corner: the little home Saani decorates with pearls earned all over her Atelier. */
export default async function JellysCorner({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <main className="h-page h-page-wide">
      <PageHead kicker="her little home" title="Jelly’s Corner" sub="Pearls, presents and one very pampered jellyfish." />
      <JellyHome initial={await checkIn()} initialTab={tab} />
    </main>
  );
}
