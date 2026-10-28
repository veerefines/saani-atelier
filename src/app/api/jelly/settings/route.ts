import { setSound, view } from '@/lib/jelly';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Saani's settings for Jelly: for now, whether voices and sounds are on (the same on every device). */
export async function PATCH(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const body = await req.json().catch(() => ({}));
  if (typeof body.sound !== 'boolean') return fail('Say whether sound should be on or off.');
  return json(view(await setSound(body.sound)));
}
