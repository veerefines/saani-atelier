import { setJourneyText } from '@/lib/extras';
import { isJourneyTextKey } from '@/lib/journey-text';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

/** Rewrite one piece of the journey's text. A blank value goes back to the original words. */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { key, value } = await req.json().catch(() => ({}));
  if (typeof key !== 'string' || !isJourneyTextKey(key)) return fail('Unknown piece of the journey.');
  const text = String(value ?? '');
  if (text.length > 600) return fail('Keep it under 600 characters.');
  const doc = await setJourneyText(key, text);
  return json({ key, value: doc.edits[key] ?? null });
}
