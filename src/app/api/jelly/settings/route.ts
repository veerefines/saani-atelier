import { setPrefs, view } from '@/lib/jelly';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/**
 * Saani's sound settings (the same on every device): `{ sound }` turns everything on or off, and
 * `{ audio: { music, sfx, voice, notes, haptics, on } }` changes any of the details.
 */
export async function PATCH(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const body = await req.json().catch(() => ({}));
  if (typeof body.sound === 'boolean') return json(view(await setPrefs({ on: body.sound })));
  if (body.audio && typeof body.audio === 'object') return json(view(await setPrefs(body.audio)));
  return fail('Say what to change: sound on or off, or the audio settings.');
}
