import { getMedia } from '@/lib/data';
import { clearSlotMedia, setSlotMedia } from '@/lib/extras';
import { journeySlots } from '@/lib/journey-slots';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

/** Put an uploaded photo, video or the music into a journey slot (replacing the placeholder). */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { slot, mediaId } = await req.json().catch(() => ({}));
  const known = journeySlots().find((x) => x.slot === slot);
  if (!known) return fail('Unknown journey slot.');
  const m = await getMedia(String(mediaId ?? ''));
  if (!m || !m.ready || m.ownerId !== s.id) return fail('The file didn’t finish uploading. Try again.');
  const want = known.kind === 'photo' ? 'image/' : known.kind === 'video' ? 'video/' : 'audio/'; // the music is the only audio slot left
  if (!m.mime.startsWith(want)) return fail(`This slot needs ${known.kind === 'photo' ? 'a photo' : known.kind === 'video' ? 'a video' : 'an audio file'}.`);
  return json(await setSlotMedia(known.slot, m.id, m.mime), 201);
}

/** Back to the placeholder (or the file in public/journey). */
export async function DELETE(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { slot } = await req.json().catch(() => ({}));
  if (!journeySlots().some((x) => x.slot === slot)) return fail('Unknown journey slot.');
  await clearSlotMedia(String(slot));
  return json({ ok: true });
}
