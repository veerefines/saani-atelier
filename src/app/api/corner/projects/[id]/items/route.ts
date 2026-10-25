import { addItem, cleanItem, getProject } from '@/lib/corner';
import { pinterestLink } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Add something to a project: a document, an inspiration drop, a moodboard piece, or a design element. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  if (!(await getProject(id))) return fail('That project isn’t here.', 404);
  const item = await cleanItem(s, await req.json().catch(() => ({})), pinterestLink);
  if (typeof item === 'string') return fail(item);
  return json(await addItem(id, item), 201);
}
