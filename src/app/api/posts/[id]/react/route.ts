import { after } from 'next/server';
import * as db from '@/lib/db';
import { toggleReaction, type Post } from '@/lib/data';
import { reactions } from '@/content/home';
import { notifyPerson } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const WHAT: Record<string, string> = { text: 'message', photo: 'photo', voice: 'voice note', video: 'video' };

/** Saanika reacts to (or un-reacts from) a post. Adding one tells whoever posted it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const { emoji } = await req.json().catch(() => ({}));
  if (!reactions.includes(emoji)) return fail('Unknown reaction.');
  const before = await db.get<Post>('posts', id);
  const post = await toggleReaction(id, emoji);
  if (!post) return fail('Post not found.', 404);
  if (before && !before.reactions.includes(emoji) && post.authorId !== 'seed') {
    after(() =>
      notifyPerson(post.authorId, {
        title: `Saanika ${emoji}`,
        body: `She reacted ${emoji} to your ${post.pageId ? 'scrapbook piece' : (WHAT[post.kind] ?? 'post')}`,
        url: '/wall/sent',
      }),
    );
  }
  return json(post);
}
