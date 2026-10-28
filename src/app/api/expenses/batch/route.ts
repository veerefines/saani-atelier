import { eurInr } from '@/lib/fx';
import { draftFrom } from '@/lib/money-parse';
import { newExpenseId, saveExpense } from '@/lib/money-store';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Add several at once (the drafts she checked), all at today's rate. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const b = await req.json().catch(() => ({}));
  const items = Array.isArray(b.items) ? b.items.slice(0, 8) : [];
  const drafts = items.map((x: unknown) => (x && typeof x === 'object' ? draftFrom(x as Record<string, unknown>) : null));
  if (!drafts.length || drafts.some((d: unknown) => !d)) return fail('One of those needs an amount.');
  const rate = (await eurInr()).inr;
  const at = new Date().toISOString();
  const saved = [];
  for (const d of drafts) saved.push(await saveExpense({ id: newExpenseId(), createdAt: at, rate, source: 'jelly', ...d! }));
  return json({ items: saved }, 201);
}
