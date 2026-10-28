import { notFound } from 'next/navigation';
import PageHead from '@/components/home/Back';
import Composer from '@/components/wall/Composer';
import { getSession } from '@/lib/auth';
import { getPage, upcomingOccasions } from '@/lib/extras';
import { getMine } from '@/lib/wall';

export default async function WallScrapbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [page, mine, occasions] = await Promise.all([getPage(id), getMine((await getSession())!), upcomingOccasions()]);
  if (!page) notFound();
  return (
    <main className="h-page w-page">
      <PageHead back="/wall/scrapbooks" kicker={`${page.emoji} a scrapbook page`} title={page.title} sub={page.note || 'Add a photo, a note, a voice note or a little film to this page.'} />
      <Composer mine={{ ...mine, posts: mine.posts.filter((p) => p.pageId === id) }} only={['message', 'voice', 'video']} pageId={id} occasions={occasions} />
    </main>
  );
}
