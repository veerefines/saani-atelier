import { people, setZone, validZone } from '@/lib/zones';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/**
 * "Good time to call": the signed-in person tells us their time zone (from their browser) and gets
 * back who they'd call (Saanika gets all her friends; a friend gets Saanika), and where everyone is
 * for the clocks on the desk.
 */
export async function POST(req: Request) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { tz } = await req.json().catch(() => ({}));
  if (!validZone(tz)) return fail('Unknown time zone.');
  await setZone(s.id, tz);
  const all = await people();
  const others = all.filter((p) => p.id !== s.id && (s.role === 'saanika' || p.role === 'saanika'));
  return json({
    tz,
    others: others.map(({ name, tz, city, known }) => ({ name, tz, city, known })),
    // for the desk clocks: who is where (first names and their city only)
    everyone: all.map((p) => ({ name: p.name.split(' ')[0], tz: p.tz, saanika: p.role === 'saanika', me: p.id === s.id })),
  });
}
