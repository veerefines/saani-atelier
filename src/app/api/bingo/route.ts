import { setSquare } from '@/lib/data';
import { bingo } from '@/content/home';
import { requireSession, isResponse, json, fail } from '@/lib/api';

export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { squareId, done, mediaId } = await req.json().catch(() => ({}));
  if (!bingo.some((q) => q.id === squareId)) return fail('Unknown square.');
  return json(await setSquare(squareId, Boolean(done), mediaId || undefined));
}
