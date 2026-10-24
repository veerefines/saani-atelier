import { getLook, saveLook } from '@/lib/extras';
import { reactions } from '@/content/home';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** A friend reacts to something she shared. Toggles, one of each emoji per friend. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('wellwisher');
  if (isResponse(s)) return s;
  const { id } = await params;
  const cur = await getLook(id);
  if (!cur || !cur.shared) return fail('Not found.', 404);
  const { emoji } = await req.json().catch(() => ({}));
  if (!reactions.includes(emoji)) return fail('Unknown reaction.');
  const mine = cur.reactions.some((r) => r.by === s.id && r.emoji === emoji);
  const next = mine ? cur.reactions.filter((r) => !(r.by === s.id && r.emoji === emoji)) : [...cur.reactions, { by: s.id, name: s.name, emoji }];
  return json(await saveLook({ ...cur, reactions: next }));
}
