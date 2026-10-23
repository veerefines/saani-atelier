import { addJarNote, type Mood } from '@/lib/data';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const MOODS: Mood[] = ['happy', 'sad', 'homesick', 'unmotivated', 'anxious', 'proud'];

export async function POST(req: Request) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { mood, text } = await req.json().catch(() => ({}));
  if (!MOODS.includes(mood)) return fail('Pick a mood for this note.');
  if (!String(text ?? '').trim()) return fail('Write a note first.');
  return json(await addJarNote(s, { mood, text: String(text) }), 201);
}
