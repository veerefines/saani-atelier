import { addEvent } from '@/lib/jelly';
import { checkIn } from '@/lib/jelly-world';
import { isEvent } from '@/lib/quests';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Something only her screen saw (she heard the phrase, the brief, a fact, picked a mood), for the quests. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { name } = await req.json().catch(() => ({}));
  if (!isEvent(name) || ['catch20', 'pop30', 'says5'].includes(name)) return fail('Unknown event.');
  const { counted } = await addEvent(name);
  return json({ counted, ...(await checkIn()) });
}
