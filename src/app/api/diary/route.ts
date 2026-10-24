import { getMedia } from '@/lib/data';
import { DIARY_MOODS, milanDay, newDiaryId, saveDiary } from '@/lib/extras';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** A day in her own chapter: a line, a mood, maybe a photo. Private unless she shares it. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { text, mood, mediaId, shared, day } = await req.json().catch(() => ({}));
  const line = String(text ?? '').trim();
  if (!line && !mediaId) return fail('Write a line or add a photo.');
  if (mood !== undefined && !DIARY_MOODS.includes(mood)) return fail('Pick a mood from the list.');
  if (mediaId) {
    const m = await getMedia(String(mediaId));
    if (!m || !m.ready || m.ownerId !== s.id) return fail('The photo didn’t finish uploading. Try again.');
  }
  const d = typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : milanDay();
  return json(
    await saveDiary({
      id: newDiaryId(),
      createdAt: new Date().toISOString(),
      day: d,
      text: line.slice(0, 600),
      mood: mood ?? '🌷',
      ...(mediaId ? { mediaId: String(mediaId) } : {}),
      shared: Boolean(shared),
    }),
    201,
  );
}
