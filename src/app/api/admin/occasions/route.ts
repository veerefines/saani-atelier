import { newOccasionId, saveOccasion, type Occasion } from '@/lib/extras';
import * as db from '@/lib/db';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

/** Add or edit an occasion: her birthday, an exam, a festival. */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { id, date, title, emoji, remindDays, note } = await req.json().catch(() => ({}));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? '')) || isNaN(Date.parse(`${date}T12:00:00Z`))) return fail('Pick a date.');
  if (!String(title ?? '').trim()) return fail('Give it a name.');
  const days = Math.round(Number(remindDays ?? 3));
  if (!(days >= 0 && days <= 30)) return fail('Remind friends between 0 and 30 days before.');
  const existing = id ? await db.get<Occasion>('occasions', String(id)) : null;
  if (id && !existing) return fail('That occasion doesn’t exist any more.', 404);
  return json(
    await saveOccasion({
      id: existing?.id ?? newOccasionId(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      date: String(date),
      title: String(title).trim().slice(0, 60),
      emoji: String(emoji ?? '').trim().slice(0, 8) || '🎉',
      remindDays: days,
      ...(String(note ?? '').trim() ? { note: String(note).trim().slice(0, 280) } : {}),
    }),
    existing ? 200 : 201,
  );
}
