import { notFound } from 'next/navigation';
import PageHead from '@/components/home/Back';
import ScrapbookCollage from '@/components/home/ScrapbookCollage';
import { getPage } from '@/lib/extras';
import { pagePosts } from '@/lib/data';

export default async function ScrapbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await getPage(id);
  if (!page) notFound();
  const posts = (await pagePosts(id)).reverse(); // oldest first, like pages being added to
  return (
    <main className="h-page h-page-wide">
      <PageHead back="/home/scrapbooks" kicker={`${page.emoji} a scrapbook page`} title={page.title} sub={page.note} />
      <ScrapbookCollage pageId={page.id} posts={posts} layout={page.layout ?? {}} />
    </main>
  );
}
