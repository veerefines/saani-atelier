import { newPageId, savePage } from '@/lib/extras';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

/** A new group scrapbook page friends can add to. */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { title, emoji, note } = await req.json().catch(() => ({}));
  if (!String(title ?? '').trim()) return fail('Give the page a title.');
  return json(
    await savePage({
      id: newPageId(),
      createdAt: new Date().toISOString(),
      title: String(title).trim().slice(0, 60),
      emoji: String(emoji ?? '').trim().slice(0, 8) || '📒',
      ...(String(note ?? '').trim() ? { note: String(note).trim().slice(0, 200) } : {}),
    }),
    201,
  );
}
