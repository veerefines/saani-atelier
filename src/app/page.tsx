import { redirect } from 'next/navigation';
import GiftScene from '@/components/GiftScene';
import { getSession, hasSeenReveal } from '@/lib/auth';
import { site } from '@/content/site';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ replay?: string; e?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();

  if (session?.role === 'wellwisher') redirect('/wall');
  if (session?.role === 'saanika' && !sp.replay && (await hasSeenReveal())) redirect('/home');

  return (
    <GiftScene
      initialStage={session?.role === 'saanika' ? 'tied' : 'locked'}
      note={site.note}
      error={sp.e}
    />
  );
}
