import { after } from 'next/server';
import { announce } from '@/lib/push';
import { addPost, getMedia, type PostKind } from '@/lib/data';
import { getPage } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const KINDS: PostKind[] = ['text', 'photo', 'voice', 'video'];
const MAX_PHOTOS = 10;

export async function POST(req: Request) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { kind, text, mediaId, mediaIds, showAt, pageId } = await req.json().catch(() => ({}));
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
  // a scheduled surprise: delivered on a later day (the daily job tells her when it arrives)
  let when: string | undefined;
  if (showAt) {
    const d = new Date(showAt);
    if (isNaN(d.getTime())) return fail('That delivery date doesn’t look right.');
    if (d.getTime() <= Date.now()) return fail('Pick a delivery date in the future, or send it now.');
    if (d.getTime() > Date.now() + 2 * 366 * 86_400_000) return fail('Pick a delivery date within the next two years.');
    when = d.toISOString();
  }
  if (pageId !== undefined && !(await getPage(String(pageId)))) return fail('That scrapbook page doesn’t exist any more.');
  const post = await addPost(s, { kind, text: text ? String(text) : undefined, mediaIds: kind === 'text' ? undefined : ids, showAt: when, pageId: pageId ? String(pageId) : undefined });
  if (!when) after(() => announce(s, pageId ? { kind: 'page' } : { kind: 'post', postKind: kind }));
  return json(post, 201);
}
