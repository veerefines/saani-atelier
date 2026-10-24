import { deleteSong } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { id } = await params;
  return (await deleteSong(s, id)) ? json({ ok: true }) : fail('You can only delete your own songs.', 403);
}
