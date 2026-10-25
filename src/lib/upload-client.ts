'use client';

/** Same as the server's limit (Supabase free plan, per file). */
export const MAX_UPLOAD = 50 * 1024 * 1024;
const MAX_SIDE = 2560;

/**
 * Phone photos are often 5–15 MB; shrink them to at most 2560px on the long side as JPEG.
 * PNG/WebP/GIF (which may be transparent) and anything the browser can't decode go up untouched.
 */
export async function shrinkImage(file: Blob): Promise<Blob> {
  // PNG, WebP and GIF may have transparency (keepsakes, stickers) that a JPEG would lose
  if (!file.type.startsWith('image/') || ['image/gif', 'image/png', 'image/webp'].includes(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

const mb = (n: number) => (n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0);

/** Some systems give Office files no type; work it out from the name. */
const BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
};

/**
 * Upload a file or recorded blob. Returns the media id once it's stored.
 * `purpose: 'corner'` is for My Corner (documents allowed; the file stays private to her).
 */
export async function uploadFile(original: Blob, onProgress?: (pct: number) => void, opts: { purpose?: 'corner' } = {}): Promise<string> {
  const file = await shrinkImage(original);
  const filename = original instanceof File ? original.name : undefined;
  if (file.size > MAX_UPLOAD) {
    throw new Error(
      file.type.startsWith('video/')
        ? `That video is ${mb(file.size)} MB; the limit is 50 MB. Trim it, or record a shorter one here.`
        : `That file is ${mb(file.size)} MB; the limit is 50 MB.`,
    );
  }
  const ext = filename?.toLowerCase().split('.').pop() ?? '';
  const mime = (file.type || BY_EXT[ext] || 'application/octet-stream').split(';')[0];
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mime, size: file.size, ...(opts.purpose ? { purpose: opts.purpose, filename } : {}) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed.');

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', data.url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed. Try again.')));
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'));
    if (data.mode === 'supabase') {
      const form = new FormData();
      form.append('cacheControl', '3600');
      form.append('', file);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.send(form);
    } else {
      xhr.setRequestHeader('Content-Type', mime);
      xhr.send(file);
    }
  });

  if (data.mode === 'supabase') await fetch(`/api/upload/${data.id}`, { method: 'POST' });
  return data.id as string;
}

export async function api<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data as T;
}

export const mediaUrl = (id?: string) => (id ? `/api/media/${id}` : '');
