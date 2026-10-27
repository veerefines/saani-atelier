import { arrange } from '@/lib/jelly';
import { checkIn } from '@/lib/jelly-world';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Jelly's home: pearls, things, how the room is arranged, and every achievement's progress. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json(await checkIn());
}

/** Rearrange her room (and pick its backdrop). */
export async function PUT(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const body = await req.json().catch(() => ({}));
  const r = await arrange(body.placed, body.backdrop);
  if (typeof r === 'string') return fail(r);
  return json(await checkIn());
}
