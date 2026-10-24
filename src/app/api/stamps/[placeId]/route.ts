import { removeStamp } from '@/lib/extras';
import { requireSession, isResponse, json } from '@/lib/api';

export async function DELETE(_req: Request, { params }: { params: Promise<{ placeId: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { placeId } = await params;
  await removeStamp(placeId);
  return json({ ok: true });
}
