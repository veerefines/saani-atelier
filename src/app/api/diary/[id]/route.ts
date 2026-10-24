import { deleteMedia } from '@/lib/data';
import { getDiary, removeDiary, saveDiary } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** Share or unshare a day. */
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const cur = await getDiary(id);
  if (!cur) return fail('Not found.', 404);
  const { shared } = await req.json().catch(() => ({}));
  return json(await saveDiary({ ...cur, shared: Boolean(shared) }));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const cur = await getDiary(id);
  if (!cur) return fail('Not found.', 404);
  if (cur.mediaId) await deleteMedia(cur.mediaId);
  await removeDiary(id);
  return json({ ok: true });
}
