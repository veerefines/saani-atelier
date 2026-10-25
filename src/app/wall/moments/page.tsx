import PageHead from '@/components/home/Back';
import { FriendMoments } from '@/components/home/Moments';
import { getSession } from '@/lib/auth';
import { listMoments } from '@/lib/extras';
import { sentTo } from '@/content/moments';

export default async function FriendMomentsPage() {
  const s = (await getSession())!;
  const moments = (await listMoments()).filter((m) => sentTo(m, s.id));
  return (
    <main className="h-page">
      <PageHead back="/wall" kicker="from Saanika" title="Her moments" sub="Little peeks at her days in Milano, sent to you." />
      <FriendMoments initial={moments} me={s.id} />
    </main>
  );
}
