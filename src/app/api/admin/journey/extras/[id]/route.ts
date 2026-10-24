import { deleteMedia } from '@/lib/data';
import { getJourneyExtra, removeJourneyExtra } from '@/lib/extras';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

/** Take an extra out of the journey (and delete its files). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { id } = await params;
  const x = await getJourneyExtra(id);
  if (!x) return fail('Already gone.', 404);
  await removeJourneyExtra(id);
  for (const m of x.mediaIds) await deleteMedia(m).catch(() => {});
  return json({ ok: true });
}
