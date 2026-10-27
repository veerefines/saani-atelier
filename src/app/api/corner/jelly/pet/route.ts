import { addPets, view } from '@/lib/jelly';
import { requireSession, isResponse, json } from '@/lib/api';

/** A few pats at once (the browser gathers them up while she pets Jelly). */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const n = Math.round(Number((await req.json().catch(() => ({}))).n));
  return json(view(await addPets(Number.isFinite(n) ? Math.min(60, Math.max(1, n)) : 1)));
}
