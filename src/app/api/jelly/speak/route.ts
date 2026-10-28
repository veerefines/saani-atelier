import { getChatAny } from '@/lib/corner';
import { speakPart, speakPiece } from '@/lib/jelly-voice';
import { briefSaid } from '@/lib/brief';
import { ANSWER_DIRECTION, pieces } from '@/components/jelly/lines';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** One piece of a chat answer in Jelly's voice (or a note to use the backup voice). */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const u = new URL(req.url);
  const part = Math.max(0, Math.floor(Number(u.searchParams.get('part') ?? 0)) || 0);
  // the morning brief, as it was first said that day
  const day = u.searchParams.get('brief');
  if (day) {
    const said = /^\d{4}-\d{2}-\d{2}$/.test(day) ? await briefSaid(day) : null;
    if (!said) return fail('No brief for that day.', 404);
    return json(await speakPiece(`brief_${day}`, pieces(said, ANSWER_DIRECTION), part, s.id));
  }
  const chat = await getChatAny(u.searchParams.get('chat') ?? '');
  if (!chat) return fail('That chat isn’t here.', 404);
  return json(await speakPart(chat, u.searchParams.get('turn') ?? '', part, s.id));
}
