import { addPost, getMedia, type PostKind } from '@/lib/data';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const KINDS: PostKind[] = ['text', 'photo', 'voice', 'video'];

export async function POST(req: Request) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { kind, text, mediaId } = await req.json().catch(() => ({}));
  if (!KINDS.includes(kind)) return fail('Choose what you’re sending.');
  if (kind === 'text' && !String(text ?? '').trim()) return fail('Write something first.');
  if (kind !== 'text') {
    const m = mediaId && (await getMedia(mediaId));
    if (!m || !m.ready || m.ownerId !== s.id) return fail('The file didn’t finish uploading. Try again.');
  }
  const post = await addPost(s, { kind, text: text ? String(text) : undefined, mediaId: kind === 'text' ? undefined : mediaId });
  return json(post, 201);
}
