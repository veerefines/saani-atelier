import { dismissNudges } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Saanika clears nudges she's seen: { ids: [...] } or { all: true }. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { ids, all } = await req.json().catch(() => ({}));
  if (all === true) return json({ cleared: await dismissNudges('all') });
  if (!Array.isArray(ids) || !ids.length || ids.length > 100) return fail('Nothing to clear.');
  return json({ cleared: await dismissNudges(ids.map(String)) });
}
