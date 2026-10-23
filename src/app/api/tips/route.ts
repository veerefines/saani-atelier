import { addTip } from '@/lib/data';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** A friend's Milano tip: it goes straight onto her list, signed. */
export async function POST(req: Request) {
  const s = await requireSession('wellwisher');
  if (isResponse(s)) return s;
  const { text } = await req.json().catch(() => ({}));
  if (!String(text ?? '').trim()) return fail('Write a place or a plan.');
  return json(await addTip(s, String(text)), 201);
}
