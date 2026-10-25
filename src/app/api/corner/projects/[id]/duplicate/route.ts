import { duplicateProject } from '@/lib/corner';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** A copy of a project and everything in it (sharing the same files). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const copy = await duplicateProject(id);
  return copy ? json(copy, 201) : fail('That project isn’t here.', 404);
}
