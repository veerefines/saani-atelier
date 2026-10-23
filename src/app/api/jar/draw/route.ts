import { drawJarNote, type Mood } from '@/lib/data';
import { requireSession, isResponse, json } from '@/lib/api';

export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { mood } = await req.json().catch(() => ({}));
  return json({ note: await drawJarNote(mood as Mood) });
}
