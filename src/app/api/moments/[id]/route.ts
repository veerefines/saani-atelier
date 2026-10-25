import { deleteMedia } from '@/lib/data';
import { getMoment, removeMoment } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** She takes a moment back (and its file). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const m = await getMoment(id);
  if (!m) return fail('Already gone.', 404);
  await removeMoment(id);
  await deleteMedia(m.mediaId).catch(() => {});
  return json({ ok: true });
}
