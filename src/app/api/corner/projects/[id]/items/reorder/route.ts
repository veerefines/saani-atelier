import { getProject, reorderItems } from '@/lib/corner';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Save the order she arranged things in (the moodboard). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  if (!(await getProject(id))) return fail('That project isn’t here.', 404);
  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length || ids.length > 500) return fail('Nothing to arrange.');
  return (await reorderItems(id, ids.map(String))) ? json({ ok: true }) : fail('Something in that list isn’t in this project.');
}
