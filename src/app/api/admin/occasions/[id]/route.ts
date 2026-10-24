import { removeOccasion } from '@/lib/extras';
import { requireAdmin, isResponse, json } from '@/lib/api';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { id } = await params;
  await removeOccasion(id);
  return json({ ok: true });
}
