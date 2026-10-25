import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Tiny document store.
 * - Production: Supabase table `docs` + private storage bucket `media` (see supabase/schema.sql).
 * - Development without Supabase keys: JSON files + media files in ./.data on disk.
 */

export type Doc = { id: string; createdAt: string } & Record<string, unknown>;

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const usingSupabase = Boolean(SB_URL && SB_KEY);

let sb: SupabaseClient | null = null;
function supabase() {
  if (!sb) sb = createClient(SB_URL as string, SB_KEY as string, { auth: { persistSession: false } });
  return sb;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const colFile = (col: string) => path.join(DATA_DIR, `${col}.json`);

// serialise local writes per collection
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => {}));
  return next;
}

async function readLocal(col: string): Promise<Record<string, Doc>> {
  try {
    return JSON.parse(await fs.readFile(colFile(col), 'utf8'));
  } catch {
    return {};
  }
}
async function writeLocal(col: string, data: Record<string, Doc>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = colFile(col) + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 1));
  await fs.rename(tmp, colFile(col));
}

export async function list<T extends Doc>(col: string): Promise<T[]> {
  if (usingSupabase) {
    const { data, error } = await supabase()
      .from('docs')
      .select('data')
      .eq('collection', col)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => r.data as T);
  }
  const all = Object.values(await readLocal(col)) as T[];
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function get<T extends Doc>(col: string, id: string): Promise<T | null> {
  if (usingSupabase) {
    const { data, error } = await supabase().from('docs').select('data').eq('collection', col).eq('id', id).maybeSingle();
    if (error) throw error;
    return (data?.data as T) ?? null;
  }
  return ((await readLocal(col))[id] as T) ?? null;
}

export async function put<T extends Doc>(col: string, doc: T): Promise<T> {
  if (usingSupabase) {
    const { error } = await supabase()
      .from('docs')
      .upsert({ collection: col, id: doc.id, data: doc, created_at: doc.createdAt });
    if (error) throw error;
    return doc;
  }
  return withLock(col, async () => {
    const all = await readLocal(col);
    all[doc.id] = doc;
    await writeLocal(col, all);
    return doc;
  });
}

export async function update<T extends Doc>(col: string, id: string, fn: (d: T) => T): Promise<T | null> {
  if (usingSupabase) {
    const cur = await get<T>(col, id);
    if (!cur) return null;
    return put(col, fn(cur));
  }
  return withLock(col, async () => {
    const all = await readLocal(col);
    const cur = all[id] as T | undefined;
    if (!cur) return null;
    const next = fn(cur);
    all[id] = next;
    await writeLocal(col, all);
    return next;
  });
}

export async function remove(col: string, id: string): Promise<void> {
  if (usingSupabase) {
    const { error } = await supabase().from('docs').delete().eq('collection', col).eq('id', id);
    if (error) throw error;
    return;
  }
  await withLock(col, async () => {
    const all = await readLocal(col);
    delete all[id];
    await writeLocal(col, all);
  });
}

/* ---------- media files ---------- */

const MEDIA_DIR = path.join(DATA_DIR, 'media');

export async function saveLocalMedia(id: string, body: ArrayBuffer) {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  await fs.writeFile(path.join(MEDIA_DIR, id), Buffer.from(body));
}
export async function readLocalMedia(id: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(MEDIA_DIR, id));
  } catch {
    return null;
  }
}
export async function deleteMediaFile(id: string) {
  if (usingSupabase) {
    await supabase().storage.from('media').remove([id]);
    return;
  }
  await fs.rm(path.join(MEDIA_DIR, id), { force: true });
}
export async function signedUpload(id: string) {
  const { data, error } = await supabase().storage.from('media').createSignedUploadUrl(id);
  if (error) throw error;
  return data.signedUrl;
}
/** A short-lived link to a stored file; with a filename, the browser downloads it under that name. */
export async function signedDownload(id: string, downloadAs?: string) {
  const { data, error } = await supabase()
    .storage.from('media')
    .createSignedUrl(id, 60 * 60, downloadAs ? { download: downloadAs } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export function newId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
