import { setChecked } from '@/lib/extras';
import { checklist } from '@/content/checklist';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Tick or untick a settling-in task. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { itemId, done } = await req.json().catch(() => ({}));
  if (!checklist.some((c) => c.id === itemId)) return fail('Unknown task.');
  return json(await setChecked(itemId, Boolean(done)));
}
