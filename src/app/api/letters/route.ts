import { after } from 'next/server';
import { announce } from '@/lib/push';
import { addLetter } from '@/lib/data';
import { requireSession, isResponse, json, fail } from '@/lib/api';

export async function POST(req: Request) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { title, body, unlockAt } = await req.json().catch(() => ({}));
  if (!String(title ?? '').trim() || !String(body ?? '').trim()) return fail('Give the letter a title and a message.');
  let when: string | null = null;
  if (unlockAt) {
    const d = new Date(unlockAt);
    if (isNaN(d.getTime())) return fail('That date doesn’t look right.');
    when = d.toISOString();
  }
  const letter = await addLetter(s, { title: String(title), body: String(body), unlockAt: when });
  after(() => announce(s, { kind: 'letter', locked: Boolean(when && new Date(when).getTime() > Date.now()) }));
  return json(letter, 201);
}
