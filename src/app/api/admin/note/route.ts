import { setRevealNote } from '@/lib/extras';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

/** The handwritten note at the end of the gift reveal. */
export async function PUT(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { greeting, lines, signoff } = await req.json().catch(() => ({}));
  const ls = (Array.isArray(lines) ? lines : String(lines ?? '').split(/\n\s*\n/)).map((l) => String(l).trim()).filter(Boolean);
  if (!String(greeting ?? '').trim() || !ls.length || !String(signoff ?? '').trim()) return fail('Fill in the greeting, the note and the sign-off.');
  if (ls.length > 8) return fail('Keep it to 8 short paragraphs so it fits the card.');
  const note = { greeting: String(greeting).trim().slice(0, 60), lines: ls.map((l) => l.slice(0, 400)), signoff: String(signoff).trim().slice(0, 120) };
  return json((await setRevealNote(note)).note);
}
