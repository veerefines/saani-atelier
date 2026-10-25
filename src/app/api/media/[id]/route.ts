import { NextResponse } from 'next/server';
import { getMedia } from '@/lib/data';
import { readLocalMedia, signedDownload, usingSupabase } from '@/lib/db';
import { requireSession, isResponse, fail } from '@/lib/api';

/**
 * Private media: only signed-in people can see it, and My Corner files only their owner.
 * Supports Range requests (needed by iPhone video); ?download=1 saves it under its original name.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { id } = await params;
  const m = await getMedia(id);
  if (!m || !m.ready || (m.private && m.ownerId !== s.id)) return fail('Not found.', 404);
  const download = new URL(req.url).searchParams.has('download');
  const name = m.filename || `${id}.${m.mime.split('/')[1]?.split(/[;+]/)[0] || 'bin'}`;

  if (usingSupabase) return NextResponse.redirect(await signedDownload(id, download ? name : undefined), 302);

  const buf = await readLocalMedia(id);
  if (!buf) return fail('Not found.', 404);
  const total = buf.length;
  const headers: Record<string, string> = {
    'Content-Type': m.mime,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
    ...(download ? { 'Content-Disposition': `attachment; filename="${name.replace(/[^\w.\- ]+/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}` } : {}),
  };
  const range = req.headers.get('range');
  const match = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (match) {
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
    if (start >= total || start > end) return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    return new NextResponse(new Uint8Array(buf.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1) },
    });
  }
  return new NextResponse(new Uint8Array(buf), { headers: { ...headers, 'Content-Length': String(total) } });
}
