import { after } from 'next/server';
import * as db from '@/lib/db';
import { answerNudge, REACT_EMOJI, type Nudge } from '@/lib/extras';
import { notifyPerson } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Saanika answers a nudge with an emoji, a few words, or both. The friend gets a notification. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const n = await db.get<Nudge>('nudges', id);
  if (!n) return fail('That nudge isn’t here any more.', 404);
  const { reaction, reply } = await req.json().catch(() => ({}));
  const text = String(reply ?? '').trim();
  if (reaction && !REACT_EMOJI.includes(reaction)) return fail('Pick one of the emoji.');
  if (!reaction && !text) return fail('Send an emoji or a few words.');
  if (text.length > 200) return fail('Keep it short: 200 characters at most.');
  const done = await answerNudge(id, { reaction, reply: text });
  after(() =>
    notifyPerson(n.authorId, {
      title: `Saanika ${reaction ?? '💌'}`,
      body: text ? `“${text}”` : `She sent ${reaction} back to your ${n.emoji}`,
      url: '/wall#nudges',
    }),
  );
  return json(done);
}
