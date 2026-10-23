import { addPost, getMedia, type PostKind } from '@/lib/data';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const KINDS: PostKind[] = ['text', 'photo', 'voice', 'video'];
const MAX_PHOTOS = 10;

export async function POST(req: Request) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { kind, text, mediaId, mediaIds } = await req.json().catch(() => ({}));
  if (!KINDS.includes(kind)) return fail('Choose what you’re sending.');
  if (kind === 'text' && !String(text ?? '').trim()) return fail('Write something first.');

  // one file, or (for photos) an album of several
  let ids: string[] = [];
  if (kind !== 'text') {
    ids = Array.isArray(mediaIds) ? mediaIds.map(String) : mediaId ? [String(mediaId)] : [];
    if (!ids.length) return fail('The file didn’t finish uploading. Try again.');
    if (ids.length > (kind === 'photo' ? MAX_PHOTOS : 1)) return fail(kind === 'photo' ? `Up to ${MAX_PHOTOS} photos at a time.` : 'One file at a time.');
    for (const id of ids) {
      const m = await getMedia(id);
      if (!m || !m.ready || m.ownerId !== s.id) return fail('The file didn’t finish uploading. Try again.');
    }
  }
  const post = await addPost(s, { kind, text: text ? String(text) : undefined, mediaIds: kind === 'text' ? undefined : ids });
  return json(post, 201);
}
