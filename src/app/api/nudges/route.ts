import { after } from 'next/server';
import { addNudge, listNudges, NUDGE_EMOJI } from '@/lib/extras';
import { notifySaanika } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Saanika sees every nudge; a friend sees their own (with her reactions and replies). */
export async function GET() {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const all = await listNudges();
  return json((s.role === 'saanika' ? all : all.filter((n) => n.authorId === s.id)).slice(0, 40));
}

/** A friend taps "thinking of you": an emoji and maybe a few words, sent to her as a notification. */
export async function POST(req: Request) {
  const s = await requireSession('wellwisher');
  if (isResponse(s)) return s;
  const { emoji, text } = await req.json().catch(() => ({}));
  if (!NUDGE_EMOJI.includes(emoji)) return fail('Pick one of the emoji.');
  const line = String(text ?? '').trim();
  if (line.length > 80) return fail('Keep it short: 80 characters at most.');
  // one tap is lovely; twenty in a row is a lot
  const last = (await listNudges()).find((n) => n.authorId === s.id);
  if (last && Date.now() - new Date(last.createdAt).getTime() < 30_000) return fail('She just got your last one. Give it a moment.', 429);
  const n = await addNudge(s, emoji, line);
  const first = s.name.split(' ')[0];
  after(() => notifySaanika({ title: `${emoji} ${first} is thinking of you`, body: line || 'Tap to send something back.', url: '/home#nudges' }));
  return json(n, 201);
}
