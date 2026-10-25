import PageHead from '@/components/home/Back';
import CornerHome from '@/components/corner/CornerHome';
import { listProjects } from '@/lib/corner';
import '@/components/corner/corner.css';

export const dynamic = 'force-dynamic';

/** My Corner: her own fashion and project workspace (only she can open it). */
export default async function MyCorner() {
  return (
    <main className="h-page h-page-wide cn-page">
      <PageHead kicker="your studio" title="My Corner" sub="A little space for big ideas." />
      <CornerHome initial={await listProjects()} />
    </main>
  );
}
