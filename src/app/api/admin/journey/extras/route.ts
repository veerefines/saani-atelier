import { getMedia } from '@/lib/data';
import { addJourneyExtra } from '@/lib/extras';
import { chapters } from '@/content/journey';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

const MAX_PHOTOS = 20;

/** Add more to a journey chapter: a set of photos or a video, with an optional caption. */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { chapter, mediaIds, caption } = await req.json().catch(() => ({}));
  if (!chapters.some((c) => c.id === chapter)) return fail('Unknown chapter.');
  const ids = Array.isArray(mediaIds) ? [...new Set(mediaIds.map(String))] : [];
  if (!ids.length) return fail('Choose at least one file.');
  if (ids.length > MAX_PHOTOS) return fail(`Up to ${MAX_PHOTOS} at a time.`);
  const media = await Promise.all(ids.map(getMedia));
  if (media.some((m) => !m || !m.ready || m.ownerId !== s.id)) return fail('A file didn’t finish uploading. Try again.');
  const kinds = new Set(media.map((m) => (m!.mime.startsWith('image/') ? 'photo' : m!.mime.startsWith('video/') ? 'video' : 'other')));
  if (kinds.has('other')) return fail('Photos and videos only.');
  if (kinds.size > 1) return fail('Add one kind at a time: photos, or a video.');
  const kind = [...kinds][0] as 'photo' | 'video';
  if (kind === 'video' && ids.length > 1) return fail('One video at a time.');
  const text = String(caption ?? '').trim().slice(0, 120);
  return json(await addJourneyExtra({ chapter, kind, mediaIds: ids, ...(text ? { caption: text } : {}) }), 201);
}

