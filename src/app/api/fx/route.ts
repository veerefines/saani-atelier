import { eurInr } from '@/lib/fx';
import { requireSession, isResponse, json } from '@/lib/api';

/** Today's euro to rupee rate, and the last month of it. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json(await eurInr());
}
