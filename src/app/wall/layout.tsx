import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import '@/components/journey/journey.css';
import '@/components/home/home.css';
import '@/components/wall/wall.css';

export const dynamic = 'force-dynamic';

/** The friends' side: signed-in well-wishers only. Saanika goes to her own desk. */
export default async function WallLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role === 'saanika') redirect('/home');
  return <div className="h-root">{children}</div>;
}
