import { getPage, savePage, type PieceSpot } from '@/lib/extras';
import { pagePosts } from '@/lib/data';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const clamp = (n: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number(n)));

/** She rearranged her scrapbook page: remember where each piece sits. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const page = await getPage(id);
  if (!page) return fail('Page not found.', 404);
  const { layout } = await req.json().catch(() => ({}));
  if (!layout || typeof layout !== 'object') return fail('Nothing to save.');
  const pieces = new Set((await pagePosts(id)).map((p) => p.id));
  const next: Record<string, PieceSpot> = {};
  for (const [pid, v] of Object.entries(layout as Record<string, PieceSpot>)) {
    if (!pieces.has(pid) || !v || [v.x, v.y, v.r].some((n) => typeof n !== 'number' || !Number.isFinite(n))) continue;
    next[pid] = { x: clamp(v.x, 0, 85), y: clamp(v.y, 0, 400), r: clamp(v.r, -15, 15) };
  }
  return json((await savePage({ ...page, layout: next })).layout ?? {});
}
