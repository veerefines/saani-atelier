import { removePage } from '@/lib/extras';
import { requireAdmin, isResponse, json } from '@/lib/api';

/** Remove a page. Pieces friends added stay theirs (still in their sent box). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { id } = await params;
  await removePage(id);
  return json({ ok: true });
}
