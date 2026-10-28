'use client';

import { sfx } from '@/lib/sound';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DiaryEntry } from '@/lib/extras';
import { api, mediaUrl, uploadFile } from '@/lib/upload-client';

const fmtDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
const todayMilan = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** Her diary: write today, see the days so far, share the ones she wants to. */
export default function Chapter({ entries: initial, moods }: { entries: DiaryEntry[]; moods: string[] }) {
  const [entries, setEntries] = useState(initial);
  const [text, setText] = useState('');
  const [mood, setMood] = useState(moods[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return setPreview('');
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!text.trim() && !file) return setErr('Write a line or add a photo.');
    setBusy(true);
    try {
      const mediaId = file ? await uploadFile(file) : undefined;
      sfx('page');
      const d = await api<DiaryEntry>('/api/diary', 'POST', { text, mood, mediaId, shared, day: todayMilan() });
      setEntries((x) => [d, ...x]);
      setText('');
      setFile(null);
      setShared(false);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  async function toggleShare(d: DiaryEntry) {
    setEntries((x) => x.map((y) => (y.id === d.id ? { ...y, shared: !y.shared } : y)));
    api(`/api/diary/${d.id}`, 'PATCH', { shared: !d.shared }).catch(() => setEntries(initial));
  }
  async function remove(d: DiaryEntry) {
    if (!confirm('Delete this day?')) return;
    setEntries((x) => x.filter((y) => y.id !== d.id));
    api(`/api/diary/${d.id}`, 'DELETE').catch(() => setEntries(initial));
  }

  return (
    <>
      <form className="w-card dy-form" onSubmit={save}>
        <img className="h-tape" src="/reveal/washi.webp" alt="" />
        <p className="whisper w-hint">{fmtDay(todayMilan())} in Milano</p>
        <div className="dy-moods" role="group" aria-label="Today felt">
          {moods.map((m) => (
            <button type="button" key={m} className="dy-mood" aria-pressed={mood === m} onClick={() => setMood(m)}>
              {m}
            </button>
          ))}
        </div>
        <textarea className="h-textarea" rows={3} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="Today I…" aria-label="Today’s line" />
        <div className="dy-row">
          {preview ? (
            <span className="dy-thumb">
              <img src={preview} alt="" />
              <button type="button" onClick={() => setFile(null)} aria-label="Remove photo">
                ×
              </button>
            </span>
          ) : (
            <button type="button" className="ghost-btn" style={{ padding: '0 16px' }} onClick={() => fileRef.current?.click()}>
              📷 Add a photo
            </button>
          )}
          <label className="dy-share">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            share with my people
          </label>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => (setFile(e.target.files?.[0] ?? null), (e.target.value = ''))} />
        </div>
        {err && <p className="h-err">{err}</p>}
        <div className="w-send">
          <button className="cta" disabled={busy}>
            {busy ? 'Saving…' : 'Add to my chapter'}
          </button>
        </div>
      </form>

      <section className="dy-list" aria-label="Your days">
        <AnimatePresence initial={false}>
          {entries.map((d) => (
            <motion.article key={d.id} className="dy-entry" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
              {d.mediaId && <img className="dy-photo" src={mediaUrl(d.mediaId)} alt="" loading="lazy" />}
              <div className="dy-text">
                <p className="dy-day">
                  {fmtDay(d.day)} <span>{d.mood}</span>
                </p>
                {d.text && <p className="hand">{d.text}</p>}
                <div className="dy-actions">
                  <button onClick={() => toggleShare(d)} aria-pressed={d.shared}>
                    {d.shared ? '💗 shared with your people' : '🔒 just for you'}
                  </button>
                  <button onClick={() => remove(d)}>Delete</button>
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
        {!entries.length && <p className="h-empty whisper">Your first day goes here.</p>}
      </section>
    </>
  );
}
