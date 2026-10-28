import { editFact, forget, memories, remember } from '@/lib/jelly-memory';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** What Jelly remembers about her. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json({ facts: (await memories()).reverse() });
}

/** Tell Jelly something to remember. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { text } = await req.json().catch(() => ({}));
  const f = await remember(text, 'her');
  if (!f) return fail('Jelly can’t keep that one (too short, or something private).');
  return json(f, 201);
}

/** Change something Jelly remembers. */
export async function PATCH(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id, text } = await req.json().catch(() => ({}));
  const f = typeof id === 'string' ? await editFact(id, text) : null;
  if (!f) return fail('Couldn’t change that one.');
  return json(f);
}

/** Forget something. */
export async function DELETE(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== 'string') return fail('Which one?');
  await forget(id);
  return json({ ok: true });
}
