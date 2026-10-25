import { after } from 'next/server';
import { getMoment, saveMoment } from '@/lib/extras';
import { MOMENT_REACTIONS, sentTo } from '@/content/moments';
import { notifySaanika } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** A friend reacts to a moment she sent them (tap again to take it back). She hears about new ones. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('wellwisher');
  if (isResponse(s)) return s;
  const { id } = await params;
  const m = await getMoment(id);
  if (!m || !sentTo(m, s.id)) return fail('That moment isn’t here.', 404);
  const { emoji } = await req.json().catch(() => ({}));
  if (!MOMENT_REACTIONS.includes(emoji)) return fail('Pick one of the emoji.');
  const mine = m.reactions.some((r) => r.by === s.id && r.emoji === emoji);
  const next = {
    ...m,
    reactions: mine ? m.reactions.filter((r) => !(r.by === s.id && r.emoji === emoji)) : [...m.reactions, { by: s.id, name: s.name, emoji, at: new Date().toISOString() }],
  };
  await saveMoment(next);
  if (!mine) after(() => notifySaanika({ title: `${s.name.split(' ')[0]} ${emoji} your moment`, body: m.caption ? `“${m.caption}”` : 'Tap to see who reacted.', url: '/home/moments' }));
  return json(next);
}
