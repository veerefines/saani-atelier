import { buildBrief } from '@/lib/brief';
import { requireSession, isResponse, json } from '@/lib/api';

/** Jelly's morning brief for her desk (?tz= is her own clock, for today's reminders). */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json(await buildBrief(new URL(req.url).searchParams.get('tz')));
}
