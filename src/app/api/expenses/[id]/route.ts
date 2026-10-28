import { fallbackFor, isCategory, isKind, kindOf } from '@/lib/money';
import { getExpense, removeExpense, saveExpense } from '@/lib/money-store';
import { milanDay } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** Change a spend (its rate stays the one from when she added it). */
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const x = await getExpense((await params).id);
  if (!x) return fail('That spend isn’t here any more.', 404);
  const b = await req.json().catch(() => ({}));
  const amount = b.amount === undefined ? x.amount : Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return fail('How much was it?');
  const day = typeof b.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.day) && b.day <= milanDay() ? b.day : x.day;
  // switching between a spend and money in moves it to that side's categories
  const kind = isKind(b.kind) ? b.kind : kindOf(x);
  const category = isCategory(b.category, kind) ? b.category : isCategory(x.category, kind) ? x.category : fallbackFor(kind);
  return json(
    await saveExpense({
      ...x,
      kind,
      amount,
      currency: b.currency === 'INR' || b.currency === 'EUR' ? b.currency : x.currency,
      category,
      note: typeof b.note === 'string' ? b.note.trim().slice(0, 120) : x.note,
      day,
    }),
  );
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  await removeExpense((await params).id);
  return json({ ok: true });
}
