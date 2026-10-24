import { after } from 'next/server';
import { getMood, markMoodAlerted, setMood } from '@/lib/extras';
import { MOODS } from '@/content/mood';
import { notifyFriends } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Her mood today, for her desk and her people's. */
export async function GET() {
  const s = await requireSession();
  if (isResponse(s)) return s;
  return json(await getMood());
}

/** She says how she's feeling. On a low day her people get one gentle nudge to send some love. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { mood, note } = await req.json().catch(() => ({}));
  const m = MOODS.find((x) => x.id === mood);
  if (!m) return fail('Pick how you’re feeling.');
  const text = String(note ?? '').trim();
  if (text.length > 100) return fail('Keep it short: 100 characters at most.');
  const saved = await setMood(m.id, text);
  if (m.low && saved.alerted !== saved.day) {
    await markMoodAlerted(saved.day);
    after(() => notifyFriends({ title: `${m.emoji} Saanika’s feeling ${m.label} today`, body: 'A little nudge, a voice note or a song would help.', url: '/wall#nudges' }));
  }
  return json(saved);
}
