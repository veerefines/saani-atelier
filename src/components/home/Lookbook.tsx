'use client';

import { useEffect, useRef, useState } from 'react';
import type { LookItem } from '@/lib/extras';
import { api, uploadFile } from '@/lib/upload-client';
import LookGrid from './LookGrid';

/** Her lookbook: outfits and sketches she uploads, and pins or boards from Pinterest. */
export default function Lookbook({ items: initial }: { items: LookItem[] }) {
  const [items, setItems] = useState(initial);
  const [mode, setMode] = useState<'photo' | 'pin'>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [link, setLink] = useState('');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [shared, setShared] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return setPreview('');
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      let body: Record<string, unknown>;
      if (mode === 'photo') {
        if (!file) throw new Error('Choose a photo of a look or a sketch.');
        body = { mediaId: await uploadFile(file) };
      } else {
        if (!link.trim()) throw new Error('Paste a Pinterest pin or board link.');
        body = { link };
      }
      const x = await api<LookItem>('/api/lookbook', 'POST', { ...body, caption, tags, shared });
      setItems((xs) => [x, ...xs]);
      setFile(null);
      setLink('');
      setCaption('');
      setTags('');
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  function toggleShare(x: LookItem) {
    setItems((xs) => xs.map((y) => (y.id === x.id ? { ...y, shared: !y.shared } : y)));
    api(`/api/lookbook/${x.id}`, 'PATCH', { shared: !x.shared }).catch(() => setItems(initial));
  }
  function remove(x: LookItem) {
    if (!confirm('Remove this from your lookbook?')) return;
    setItems((xs) => xs.filter((y) => y.id !== x.id));
    api(`/api/lookbook/${x.id}`, 'DELETE').catch(() => setItems(initial));
  }

  const allTags = [...new Set(items.flatMap((i) => i.tags))].slice(0, 12);
  const shown = filter === 'all' ? items : filter === 'pins' ? items.filter((i) => i.kind !== 'photo') : items.filter((i) => i.tags.includes(filter));

  return (
    <>
      <form className="w-card lk-form" onSubmit={add}>
        <img className="h-tape" src="/reveal/washi.webp" alt="" />
        <div className="w-tabs" role="tablist" aria-label="Add">
          <button type="button" role="tab" aria-selected={mode === 'photo'} className="w-tab" onClick={() => setMode('photo')}>
            👗 A look or sketch
          </button>
          <button type="button" role="tab" aria-selected={mode === 'pin'} className="w-tab" onClick={() => setMode('pin')}>
            📌 From Pinterest
          </button>
        </div>
        {mode === 'photo' ? (
          <div className="w-drop">
            {preview && <img src={preview} alt="" className="w-preview" />}
            <button type="button" className="ghost-btn" style={{ padding: '0 18px' }} onClick={() => fileRef.current?.click()}>
              {file ? 'Choose a different photo' : 'Choose a photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => (setFile(e.target.files?.[0] ?? null), (e.target.value = ''))} />
          </div>
        ) : (
          <>
            <input className="h-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://pinterest.com/pin/… or a board link" aria-label="Pinterest link" inputMode="url" />
            <p className="lk-help">In Pinterest, tap Share → Copy link on any pin or board, then paste it here.</p>
          </>
        )}
        <input className="h-input" style={{ marginTop: 10 }} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="A caption (optional)" aria-label="Caption" maxLength={200} />
        <input className="h-input" style={{ marginTop: 8 }} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, e.g. autumn, studio, inspo" aria-label="Tags" />
        <label className="dy-share" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
          share with my people
        </label>
        {err && <p className="h-err">{err}</p>}
        <div className="w-send">
          <button className="cta" disabled={busy}>
            {busy ? 'Adding…' : 'Add to my lookbook'}
          </button>
        </div>
      </form>

      {items.length > 0 && (
        <div className="mil-chips" role="group" aria-label="Filter">
          {['all', 'pins', ...allTags].map((t) => (
            <button key={t} className="mil-chip" aria-pressed={filter === t} onClick={() => setFilter(t)} style={{ ['--tint' as string]: '#fbd6e2' }}>
              {t === 'all' ? '✨ Everything' : t === 'pins' ? '📌 Pinterest' : `#${t}`}
            </button>
          ))}
        </div>
      )}

      <LookGrid
        items={shown}
        renderActions={(x) => (
          <div className="lk-actions">
            <button onClick={() => toggleShare(x)} aria-pressed={x.shared}>
              {x.shared ? '💗 shared' : '🔒 private'}
            </button>
            <button onClick={() => remove(x)}>Remove</button>
          </div>
        )}
      />
      {!items.length && <p className="h-empty whisper">Your first look goes here. Outfits, sketches, or your Pinterest boards.</p>}
    </>
  );
}
