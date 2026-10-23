import { markSeen } from '@/lib/data';
import { requireSession, isResponse, json, fail } from '@/lib/api';

export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { area } = await req.json().catch(() => ({}));
  if (!['love', 'letters', 'jar'].includes(area)) return fail('Unknown area.');
  return json(await markSeen(area));
}
