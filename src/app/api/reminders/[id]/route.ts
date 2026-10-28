import { fired, getReminder, removeReminder, saveReminder } from '@/lib/reminders';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** Jelly just said it on screen ({ fired: true }), so no push is needed; or mark it done. */
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const r = await getReminder((await params).id);
  if (!r) return fail('That reminder isn’t here any more.', 404);
  const b = await req.json().catch(() => ({}));
  if (b.fired) {
    // only once it's due (a minute's grace for clocks)
    if (Date.parse(r.at) > Date.now() + 60_000 || r.done) return json(r);
    return json(await saveReminder(fired(r, new Date())));
  }
  if (b.done === true) return json(await saveReminder({ ...r, done: true }));
  return fail('Nothing to change.');
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  await removeReminder((await params).id);
  return json({ ok: true });
}
