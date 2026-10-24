import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { ensureSeeded } from '@/lib/data';
import { touchPresence } from '@/lib/extras';
import { seedJar, seedLetters } from '@/content/home';
import '@/components/journey/journey.css';
import '@/components/home/home.css';

export const dynamic = 'force-dynamic';

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'saanika') redirect('/wall');
  await ensureSeeded({ letters: seedLetters, jar: seedJar });
  // so the admin page can show when she was last here
  await touchPresence().catch(() => {});
  return <div className="h-root">{children}</div>;
}
