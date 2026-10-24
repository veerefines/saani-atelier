import { after } from 'next/server';
import * as db from '@/lib/db';
import { deleteLetter, openLetter, type Letter } from '@/lib/data';
import { notifyPerson } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** Saanika opens a letter (only once it's unlocked). */
export async function POST(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const before = await db.get<Letter>('letters', id);
  const l = await openLetter(id);
  if (!l) return fail('Letter not found.', 404);
  // the first time she opens it, the writer hears about it
  if (before && !before.openedAt && l.openedAt && before.authorId !== 'seed') {
    after(() => notifyPerson(before.authorId, { title: '✉️ Saanika opened your letter', body: `“${before.title}”`, url: '/wall/sent' }));
  }
  return json(l);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { id } = await params;
  return (await deleteLetter(s, id)) ? json({ ok: true }) : fail('You can only delete your own letters.', 403);
}
