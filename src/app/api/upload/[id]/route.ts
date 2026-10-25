import { getMedia, markMediaReady } from '@/lib/data';
import { saveLocalMedia, usingSupabase } from '@/lib/db';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** Local development: the file body itself. */
export async function PUT(req: Request, { params }: Ctx) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  if (usingSupabase) return fail('Uploads go straight to storage.', 400);
  const { id } = await params;
  const m = await getMedia(id);
  if (!m || m.ownerId !== s.id) return fail('Upload not found.', 404);
  const body = await req.arrayBuffer();
  if (body.byteLength > m.size) return fail('That file is bigger than expected. Try again.', 413);
  await saveLocalMedia(id, body);
  await markMediaReady(id);
  return json({ ok: true });
}

/** Supabase: the browser uploaded directly; confirm it. */
export async function POST(_req: Request, { params }: Ctx) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { id } = await params;
  const m = await getMedia(id);
  if (!m || m.ownerId !== s.id) return fail('Upload not found.', 404);
  await markMediaReady(id);
  return json({ ok: true });
}
