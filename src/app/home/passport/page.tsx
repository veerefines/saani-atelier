import PageHead from '@/components/home/Back';
import Passport from '@/components/home/Passport';
import { listStamps } from '@/lib/extras';

export default async function PassportPage() {
  const stamps = await listStamps();
  return (
    <main className="h-page h-page-wide">
      <PageHead kicker="collect them all" title="Milano passport" sub="Check in when you’re at a place from your guide and it stamps your passport. Your people can see your stamps." />
      <Passport stamps={stamps} />
    </main>
  );
}
