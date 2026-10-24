import { getMedia } from '@/lib/data';
import { clearKeepsakeMedia, setKeepsakeMedia } from '@/lib/extras';
import { keepsakeFiles } from '@/content/keepsakes';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

const known = (name: unknown): name is keyof typeof keepsakeFiles => typeof name === 'string' && name in keepsakeFiles;

/** Put an uploaded image (ideally a transparent PNG) in a keepsake spot, e.g. "sunglasses". */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { name, mediaId } = await req.json().catch(() => ({}));
  if (!known(name)) return fail('Unknown keepsake.');
  const m = await getMedia(String(mediaId ?? ''));
  if (!m || !m.ready || m.ownerId !== s.id) return fail('The image didn’t finish uploading. Try again.');
  if (!m.mime.startsWith('image/')) return fail('Keepsakes need an image (a transparent PNG works best).');
  return json(await setKeepsakeMedia(name, m.id), 201);
}

/** Back to public/her/<name>.png, or nothing. */
export async function DELETE(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { name } = await req.json().catch(() => ({}));
  if (!known(name)) return fail('Unknown keepsake.');
  await clearKeepsakeMedia(name);
  return json({ ok: true });
}
