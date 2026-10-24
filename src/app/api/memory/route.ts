import { wallPosts } from '@/lib/data';
import { requireSession, isResponse, json } from '@/lib/api';

/** A random thing from her wall of love, to bring back on her desk. Skips the one she just saw. */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const not = new URL(req.url).searchParams.get('not');
  const posts = await wallPosts();
  const pool = posts.length > 1 ? posts.filter((p) => p.id !== not) : posts;
  return json(pool.length ? { post: pool[Math.floor(Math.random() * pool.length)], total: posts.length } : { post: null, total: 0 });
}
