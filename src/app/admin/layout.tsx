import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import '@/components/journey/journey.css';
import '@/components/home/home.css';
import '@/components/wall/wall.css';

export const dynamic = 'force-dynamic';

/** The atelier's admin: only invites with admin rights. Everyone else goes back to their own desk. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/');
  if (!s.admin) redirect(s.role === 'saanika' ? '/home' : '/wall');
  return <div className="h-root">{children}</div>;
}
