import { deleteLetter, openLetter } from '@/lib/data';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** Saanika opens a letter (only once it's unlocked). */
export async function POST(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const l = await openLetter(id);
  return l ? json(l) : fail('Letter not found.', 404);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { id } = await params;
  return (await deleteLetter(s, id)) ? json({ ok: true }) : fail('You can only delete your own letters.', 403);
}
