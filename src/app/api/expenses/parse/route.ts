import { parseSpends } from '@/lib/money-parse';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Plain words to drafts she can check before they're added ("esselunga 23,40 and metro 2"). Saves nothing. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const b = await req.json().catch(() => ({}));
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (!text) return fail('Tell Jelly what you spent.');
  return json(await parseSpends(text));
}
