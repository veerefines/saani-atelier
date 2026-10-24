import { getContent } from '@/lib/extras';
import { site } from '@/content/site';
import { requireSession, isResponse, json } from '@/lib/api';

/** The reveal note, only for Saanika (the landing page doesn't carry it for signed-out visitors). */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json((await getContent()).note ?? site.note);
}
