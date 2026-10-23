import { createMedia } from '@/lib/data';
import { usingSupabase, signedUpload } from '@/lib/db';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const MAX = 100 * 1024 * 1024;

/** Step 1 of an upload: reserve an id and get somewhere to send the file. */
export async function POST(req: Request) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { mime, size } = await req.json().catch(() => ({}));
  if (typeof mime !== 'string' || !/^(image|audio|video)\//.test(mime)) return fail('Only photos, audio and video can be uploaded.');
  if (typeof size !== 'number' || size <= 0 || size > MAX) return fail('That file is too big. Keep it under 100 MB.');
  const m = await createMedia(s, mime, size);
  if (usingSupabase) return json({ id: m.id, mode: 'supabase', url: await signedUpload(m.id) });
  return json({ id: m.id, mode: 'local', url: `/api/upload/${m.id}` });
}
