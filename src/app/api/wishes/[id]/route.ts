import { deleteWish, toggleWish } from '@/lib/data';
import { requireSession, isResponse, json } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };
export async function POST(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  return json(await toggleWish(id));
}
export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  await deleteWish(id);
  return json({ ok: true });
}
