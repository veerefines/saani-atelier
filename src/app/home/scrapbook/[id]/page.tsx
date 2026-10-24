import { notFound } from 'next/navigation';
import PageHead from '@/components/home/Back';
import LoveWall from '@/components/home/LoveWall';
import { getPage } from '@/lib/extras';
import { pagePosts } from '@/lib/data';

export default async function ScrapbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await getPage(id);
  if (!page) notFound();
  const posts = await pagePosts(id);
  return (
    <main className="h-page">
      <PageHead back="/home/scrapbooks" kicker={`${page.emoji} a scrapbook page`} title={page.title} sub={page.note} />
      <LoveWall posts={posts} seenBefore={null} trackSeen={false} />
    </main>
  );
}
