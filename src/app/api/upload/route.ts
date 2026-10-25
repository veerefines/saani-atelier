import { createMedia } from '@/lib/data';
import { usingSupabase, signedUpload } from '@/lib/db';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const MAX = 50 * 1024 * 1024; // Supabase free plan limit per file
const MAX_DOC = 25 * 1024 * 1024;

/** My Corner documents: allowed by type and by file extension (both must agree). */
const DOC_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
};

/**
 * Step 1 of an upload: reserve an id and get somewhere to send the file.
 * Everyday uploads are photos, audio and video. My Corner (purpose "corner", Saanika only) also takes
 * PDF, DOCX, PPTX and TXT files, and those files are private to her.
 */
export async function POST(req: Request) {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const { mime, size, purpose, filename } = await req.json().catch(() => ({}));
  if (typeof size !== 'number' || size <= 0) return fail('That file looks empty. Try choosing it again.');
  if (typeof mime !== 'string') return fail('Only photos, audio and video can be uploaded.');

  if (purpose === 'corner') {
    if (s.role !== 'saanika') return fail('This is only for Saanika.', 403);
    const name = String(filename ?? '').trim().slice(0, 160);
    const ext = name.toLowerCase().split('.').pop() ?? '';
    const isImage = /^image\//.test(mime);
    const isDoc = DOC_TYPES[ext] === mime;
    if (!isImage && !isDoc) return fail('Upload a PDF, Word (DOCX), PowerPoint (PPTX), TXT file or an image.');
    const limit = isDoc ? MAX_DOC : MAX;
    if (size > limit) return fail(`That file is ${Math.round(size / 1024 / 1024)} MB; the limit is ${limit / 1024 / 1024} MB.`);
    const m = await createMedia(s, mime, size, { private: true, ...(name ? { filename: name } : {}) });
    if (usingSupabase) return json({ id: m.id, mode: 'supabase', url: await signedUpload(m.id) });
    return json({ id: m.id, mode: 'local', url: `/api/upload/${m.id}` });
  }

  if (!/^(image|audio|video)\//.test(mime)) return fail('Only photos, audio and video can be uploaded.');
  if (size > MAX) return fail(`That file is ${Math.round(size / 1024 / 1024)} MB; the limit is 50 MB.`);
  const m = await createMedia(s, mime, size);
  if (usingSupabase) return json({ id: m.id, mode: 'supabase', url: await signedUpload(m.id) });
  return json({ id: m.id, mode: 'local', url: `/api/upload/${m.id}` });
}
