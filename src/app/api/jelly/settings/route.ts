import { jellyState, setPrefs, setSpotify, view } from '@/lib/jelly';
import { spotifyUri } from '@/lib/spotify';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/**
 * Saani's sound settings (the same on every device): `{ sound }` turns everything on or off, and
 * `{ audio: { music, sfx, voice, notes, haptics, on } }` changes any of the details, and
 * `{ spotify: link | null }` connects (or disconnects) Saani's radio.
 */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const v = view(await jellyState());
  return json({ audio: v.audio, spotify: v.spotify });
}

export async function PATCH(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const body = await req.json().catch(() => ({}));
  if (typeof body.sound === 'boolean') return json(view(await setPrefs({ on: body.sound })));
  if (body.audio && typeof body.audio === 'object') return json(view(await setPrefs(body.audio)));
  if (body.spotify === null) return json(view(await setSpotify(null)));
  if (body.spotify !== undefined) {
    const uri = spotifyUri(body.spotify);
    if (!uri) return fail('That doesn’t look like a Spotify link. In Spotify, tap ⋯ → Share → Copy link, then paste it here.');
    return json(view(await setSpotify(uri)));
  }
  return fail('Say what to change: sound on or off, or the audio settings.');
}
