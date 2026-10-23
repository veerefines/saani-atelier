import { addDare } from '@/lib/data';
import { bingo } from '@/content/home';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** A friend pins a dare or cheer to one of her bingo squares. */
export async function POST(req: Request) {
  const s = await requireSession('wellwisher');
  if (isResponse(s)) return s;
  const { squareId, text } = await req.json().catch(() => ({}));
  if (!bingo.some((q) => q.id === squareId)) return fail('Unknown square.');
  if (!String(text ?? '').trim()) return fail('Write your dare or cheer first.');
  return json(await addDare(s, squareId, String(text)), 201);
}
