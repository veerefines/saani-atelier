import { after } from 'next/server';
import { getHerNudge, setHerNudge } from '@/lib/extras';
import { NUDGE_EMOJI } from '@/content/nudges';
import { notifyFriends } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** The last time she sent her people some love (friends show it on their desk). */
export async function GET() {
  const s = await requireSession();
  if (isResponse(s)) return s;
  return json(await getHerNudge());
}

/** Saanika sends everyone a little "thinking of you all". */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { emoji } = await req.json().catch(() => ({}));
  if (!NUDGE_EMOJI.includes(emoji)) return fail('Pick one of the emoji.');
  const last = await getHerNudge();
  if (last && Date.now() - new Date(last.at).getTime() < 60_000) return fail('They just got one. Give it a minute.', 429);
  const n = await setHerNudge(emoji);
  after(() => notifyFriends({ title: `${emoji} Saanika is thinking of you all`, body: 'Tap to send one back.', url: '/wall#nudges' }));
  return json(n, 201);
}
