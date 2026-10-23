import { addWish } from '@/lib/data';
import { requireSession, isResponse, json, fail } from '@/lib/api';

export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { text } = await req.json().catch(() => ({}));
  if (!String(text ?? '').trim()) return fail('Write a place or a plan.');
  return json(await addWish(String(text)), 201);
}
