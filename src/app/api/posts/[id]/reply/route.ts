import { after } from 'next/server';
import * as db from '@/lib/db';
import { addReply, getMedia, isOnWall, pagePosts, type Post } from '@/lib/data';
import { reactions } from '@/content/home';
import { notifyPerson } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Her thank-you: an emoji, a line, or a voice note, sent back to whoever posted it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const post = await db.get<Post>('posts', id);
  const visible = post && (isOnWall(post) || (post.pageId && (await pagePosts(post.pageId)).some((p) => p.id === id)));
  if (!post || !visible) return fail('Post not found.', 404);
  const { emoji, text, mediaId } = await req.json().catch(() => ({}));
  const line = String(text ?? '').trim();
  if (emoji !== undefined && !reactions.includes(emoji) && emoji !== '🙏') return fail('Unknown emoji.');
  if (!emoji && !line && !mediaId) return fail('Say something back first.');
  if (mediaId) {
    const m = await getMedia(String(mediaId));
    if (!m || !m.ready || m.ownerId !== s.id || !m.mime.startsWith('audio/')) return fail('The voice note didn’t finish uploading. Try again.');
  }
  const updated = await addReply(id, { at: new Date().toISOString(), ...(emoji ? { emoji } : {}), ...(line ? { text: line.slice(0, 500) } : {}), ...(mediaId ? { mediaId: String(mediaId) } : {}) });
  after(() =>
    notifyPerson(post.authorId, {
      title: '💌 Saanika replied',
      body: line ? `“${line.slice(0, 80)}”` : mediaId ? 'She sent you a voice note back' : `She sent you ${emoji}`,
      url: '/wall/sent',
    }),
  );
  return json(updated);
}
