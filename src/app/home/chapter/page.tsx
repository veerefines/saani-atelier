import PageHead from '@/components/home/Back';
import Chapter from '@/components/home/Chapter';
import { DIARY_MOODS, listDiary } from '@/lib/extras';

export default async function ChapterPage() {
  const entries = await listDiary();
  return (
    <main className="h-page">
      <PageHead kicker="chapter six" title="My chapter" sub="A photo and a line a day. They become the newest chapter of your journey. Private unless you share a day." />
      <Chapter entries={entries.reverse()} moods={DIARY_MOODS} />
    </main>
  );
}
