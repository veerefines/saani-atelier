'use client';

/** Upload a file or recorded blob. Returns the media id once it's stored. */
export async function uploadFile(file: Blob, onProgress?: (pct: number) => void): Promise<string> {
  const mime = file.type || 'application/octet-stream';
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mime, size: file.size }),
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
