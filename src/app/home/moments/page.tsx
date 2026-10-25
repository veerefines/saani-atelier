import PageHead from '@/components/home/Back';
import { MySentMoments } from '@/components/home/Moments';
import { listMoments } from '@/lib/extras';
import { getInvites } from '@/lib/invites';

export default async function MomentsPage() {
  const [moments, invites] = await Promise.all([listMoments(), getInvites()]);
  return (
    <main className="h-page">
      <PageHead kicker="a little peek at Milano" title="Moments" sub="Send your people a photo, a little video or a voice note. They can react to it from their desks." />
      <MySentMoments initial={moments} friends={invites.filter((i) => i.role === 'wellwisher').map((i) => ({ id: i.id, name: i.name }))} />
    </main>
  );
}
