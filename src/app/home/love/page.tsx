import PageHead from '@/components/home/Back';
import Keepsakes from '@/components/Keepsakes';
import LoveWall from '@/components/home/LoveWall';
import { getSeen, wallPosts } from '@/lib/data';

export default async function LovePage() {
  const [posts, seen] = await Promise.all([wallPosts(), getSeen()]);
  return (
    <main className="h-page">
      <Keepsakes set="love" />
      <PageHead kicker="pinned up, just for you" title="Yaadon ka Samandar!" sub="Messages, voice notes and little films from your people." />
      <LoveWall posts={posts} seenBefore={seen.love ?? null} />
    </main>
  );
}
