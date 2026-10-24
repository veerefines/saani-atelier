import { deleteMedia } from '@/lib/data';
import { getLook, removeLook, saveLook } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** Share or unshare, or change the caption. */
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const cur = await getLook(id);
  if (!cur) return fail('Not found.', 404);
  const { shared, caption } = await req.json().catch(() => ({}));
  return json(
    await saveLook({
      ...cur,
      ...(shared !== undefined ? { shared: Boolean(shared) } : {}),
      ...(caption !== undefined ? { caption: String(caption).slice(0, 200) } : {}),
    }),
  );
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const cur = await getLook(id);
  if (!cur) return fail('Not found.', 404);
  if (cur.mediaId) await deleteMedia(cur.mediaId);
  await removeLook(id);
  return json({ ok: true });
}
