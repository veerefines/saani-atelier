'use client';

import { useState } from 'react';
import type { Item, NewItem, Project } from '@/lib/corner-model';
import { uploadFile } from '@/lib/upload-client';

/** What every workspace tab can read and do. */
export type Ctx = {
  project: Project;
  items: Item[];
  /** add an item; resolves to the saved item, or throws with a friendly message */
  add: (item: Record<string, unknown> & Partial<NewItem>) => Promise<Item>;
  patchItem: (id: string, body: Record<string, unknown>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  reorder: (ids: string[]) => Promise<void>;
  patchProject: (body: Record<string, unknown>) => Promise<void>;
  goTo: (tab: Tab) => void;
};
export type Tab = 'overview' | 'documents' | 'inspiration' | 'moodboard' | 'elements' | 'management' | 'assistant';

/** Run something async with a busy flag, an error message and a short success note. */
export function useAction() {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const run = async (label: string, fn: () => Promise<unknown>, success = '') => {
    setBusy(label);
    setErr('');
    setOk('');
    try {
      await fn();
      if (success) {
        setOk(success);
        setTimeout(() => setOk(''), 2500);
      }
      return true;
    } catch (e) {
      setErr((e as Error).message);
      return false;
    } finally {
      setBusy('');
    }
  };
  return { busy, err, ok, run, setErr };
}

export function Status({ err, ok }: { err: string; ok: string }) {
  return (
    <>
      {err && <p className="h-err">{err}</p>}
      {ok && <p className="nudge-ok">{ok}</p>}
    </>
  );
}

/** Upload a private My Corner file and get its media id back. */
export const uploadCorner = (f: File, onProgress?: (pct: number) => void) => uploadFile(f, onProgress, { purpose: 'corner' });

/** A button that opens the file picker. */
export function FileButton({ label, accept, disabled, onFile }: { label: string; accept: string; disabled?: boolean; onFile: (f: File) => void }) {
  return (
    <label className={`pc-btn cn-file${disabled ? ' disabled' : ''}`}>
      {label}
      <input type="file" accept={accept} hidden disabled={disabled} onChange={(e) => (e.target.files?.[0] && onFile(e.target.files[0]), (e.target.value = ''))} />
    </label>
  );
}

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fileSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
