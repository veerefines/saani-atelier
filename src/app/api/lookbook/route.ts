import { getMedia } from '@/lib/data';
import { newLookId, pinterestLink, saveLook } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const cleanTags = (t: unknown) =>
  (Array.isArray(t) ? t : String(t ?? '').split(','))
    .map((x) => String(x).trim().replace(/^#/, '').toLowerCase())
    .filter(Boolean)
    .slice(0, 6)
    .map((x) => x.slice(0, 20));

/** Add to her lookbook: an uploaded outfit or sketch, or a Pinterest pin or board. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { mediaId, link, caption, tags, shared } = await req.json().catch(() => ({}));
  const base = { id: newLookId(), createdAt: new Date().toISOString(), caption: String(caption ?? '').slice(0, 200), tags: cleanTags(tags), shared: Boolean(shared), reactions: [] };
  if (mediaId) {
    const m = await getMedia(String(mediaId));
    if (!m || !m.ready || m.ownerId !== s.id || !m.mime.startsWith('image/')) return fail('The photo didn’t finish uploading. Try again.');
    return json(await saveLook({ ...base, kind: 'photo', mediaId: String(mediaId) }), 201);
  }
  if (link) {
    const pin = await pinterestLink(String(link));
    if (!pin) return fail('That doesn’t look like a Pinterest pin or board link.');
    return json(await saveLook({ ...base, kind: pin.kind, pinUrl: pin.url }), 201);
  }
  return fail('Add a photo or paste a Pinterest link.');
}
