import { notFound } from 'next/navigation';
import PageHead from '@/components/home/Back';
import Workspace from '@/components/corner/Workspace';
import { getProject, listItems } from '@/lib/corner';
import { assistantReady } from '@/lib/assistant';
import '@/components/corner/corner.css';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  return (
    <main className="h-page h-page-wide cn-page">
      <PageHead back="/home/corner" backLabel="My Corner" title="" />
      <Workspace initial={{ project, items: await listItems(id) }} aiReady={assistantReady()} />
    </main>
  );
}
