import { addWish } from '@/lib/data';
import { places } from '@/content/milano';
import { requireSession, isResponse, json, fail } from '@/lib/api';

export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { text, placeId } = await req.json().catch(() => ({}));
  if (!String(text ?? '').trim()) return fail('Write a place or a plan.');
  if (placeId !== undefined && !places.some((p) => p.id === placeId)) return fail('Unknown place.');
  return json(await addWish(String(text), placeId), 201);
}
