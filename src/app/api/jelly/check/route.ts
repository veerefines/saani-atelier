import { checkIn } from '@/lib/jelly-world';
import { requireSession, isResponse, json } from '@/lib/api';

/** After she does something anywhere on the site: today's visit pearls and any achievements just reached. */
export async function POST() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json(await checkIn());
}
