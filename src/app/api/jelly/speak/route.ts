import { getChatAny } from '@/lib/corner';
import { speakPart } from '@/lib/jelly-voice';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** One piece of a chat answer in Jelly's voice (or a note to use the backup voice). */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const u = new URL(req.url);
  const chat = await getChatAny(u.searchParams.get('chat') ?? '');
  const part = Math.max(0, Math.floor(Number(u.searchParams.get('part') ?? 0)) || 0);
  if (!chat) return fail('That chat isn’t here.', 404);
  return json(await speakPart(chat, u.searchParams.get('turn') ?? '', part, s.id));
}
