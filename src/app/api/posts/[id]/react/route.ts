import { toggleReaction } from '@/lib/data';
import { reactions } from '@/content/home';
import { requireSession, isResponse, json, fail } from '@/lib/api';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const { emoji } = await req.json().catch(() => ({}));
  if (!reactions.includes(emoji)) return fail('Unknown reaction.');
  const post = await toggleReaction(id, emoji);
  return post ? json(post) : fail('Post not found.', 404);
}
