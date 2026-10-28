import { unlinkGoogle } from '@/lib/google';
import { requireSession, isResponse, json } from '@/lib/api';

/** Forget her Google connection (she can also remove it in her Google account). */
export async function POST() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  await unlinkGoogle();
  return json({ ok: true });
}
