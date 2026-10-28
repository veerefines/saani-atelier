import { CATEGORIES, type CategoryId } from '@/lib/money';
import { setBudget } from '@/lib/money-store';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Her monthly budget in €, and any caps per category. */
export async function PUT(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const b = await req.json().catch(() => ({}));
  const monthly = Number(b.monthly ?? 0);
  if (!Number.isFinite(monthly) || monthly < 0 || monthly > 100_000) return fail('That budget doesn’t look right.');
  const caps: Partial<Record<CategoryId, number>> = {};
  for (const c of CATEGORIES) {
    const v = Number(b.caps?.[c.id]);
    if (Number.isFinite(v) && v > 0 && v <= 100_000) caps[c.id] = Math.round(v * 100) / 100;
  }
  return json(await setBudget(monthly, caps));
}
