import { buy } from '@/lib/jelly';
import { checkIn } from '@/lib/jelly-world';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Buy something for Jelly's home with pearls. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const id = String((await req.json().catch(() => ({}))).id ?? '');
  const r = await buy(id);
  if (typeof r === 'string') return fail(r);
  return json(await checkIn());
}
