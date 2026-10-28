import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { removeSeeded } from '@/lib/data';
import { touchPresence } from '@/lib/extras';
import '@/components/journey/journey.css';
import '@/components/home/home.css';
import '@/components/wall/wall.css';
import '@/components/corner/corner.css';
import Jelly from '@/components/jelly/Jelly';
import MusicPlayer from '@/components/home/MusicPlayer';
import RadioChip from '@/components/home/RadioChip';

export const dynamic = 'force-dynamic';

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'saanika') redirect('/wall');
  // the old placeholder letters and jar notes go, once
  await removeSeeded().catch(() => {});
  // so the admin page can show when she was last here
  await touchPresence().catch(() => {});
  return (
    <div className="h-root">
      {children}
      {/* Jelly floats on every page of her desk (the gift and the journey are their own pages, without her) */}
      <Jelly />
      <MusicPlayer />
      <RadioChip />
    </div>
  );
}
