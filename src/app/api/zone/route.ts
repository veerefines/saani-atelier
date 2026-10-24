import { people, setZone, validZone } from '@/lib/zones';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/**
 * "Good time to call": the signed-in person tells us their time zone (from their browser) and gets
 * back who they'd call. Saanika gets all her friends; a friend gets Saanika.
 */
export async function POST(req: Request) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { tz } = await req.json().catch(() => ({}));
  if (!validZone(tz)) return fail('Unknown time zone.');
  await setZone(s.id, tz);
  const others = (await people()).filter((p) => p.id !== s.id && (s.role === 'saanika' || p.role === 'saanika'));
  return json({ tz, others: others.map(({ name, tz, city, known }) => ({ name, tz, city, known })) });
}
