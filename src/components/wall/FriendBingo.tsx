'use client';

import { sfx } from '@/lib/sound';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Square } from '@/content/home';
import type { Dare } from '@/lib/data';
import { api } from '@/lib/upload-client';
import { deleteMine } from './Composer';

const FLOWERS = ['🌷', '🌸', '💐', '🌼', '🪷'];
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * Her bingo board as friends see it: which squares she's stitched (and when), never her photos.
 * Tap a square to leave a dare or a cheer; she sees it on that square.
 */
export default function FriendBingo({ squares, doneAt, dares: initial }: { squares: Square[]; doneAt: Record<string, string>; dares: Dare[] }) {
  const [dares, setDares] = useState(initial);
  const [active, setActive] = useState<Square | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const count = Object.keys(doneAt).length;
  const mineFor = (id: string) => dares.filter((d) => d.squareId === id);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !text.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const d = await api<Dare>('/api/dares', 'POST', { squareId: active.id, text });
      setDares((ds) => [d, ...ds]);
      sfx('stitch');
      setText('');
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  async function remove(id: string) {
    try {
      if (await deleteMine('dares', id)) setDares((ds) => ds.filter((d) => d.id !== id));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <>
      <div className="bingo-progress">
        <div className="bingo-bar" aria-hidden="true">
          <span style={{ width: `${(count / squares.length) * 100}%` }} />
        </div>
        <span className="bingo-count">
          {count}/{squares.length}
        </span>
      </div>

      <div className="bingo" role="grid" aria-label="Her bingo board">
        {squares.map((s, i) => {
          const d = Boolean(doneAt[s.id]);
          const n = mineFor(s.id).length;
          return (
            <button
              key={s.id}
              className={`sq${d ? ' done' : ''}${s.id === 'free' ? ' free' : ''}`}
              onClick={() => {
                setErr('');
                setText('');
                setActive(s);
              }}
              aria-label={`${s.label}${d ? ', she did it' : ''}${n ? `, ${n} dares from you` : ''}`}
            >
              <span className="sq-label">{s.label}</span>
              {d && <span className="sq-flower">{FLOWERS[i % FLOWERS.length]}</span>}
              {n > 0 && <span className="sq-dare">💌{n > 1 ? n : ''}</span>}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {active && (
          <>
            <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActive(null)} />
            <motion.div
              className="sheet"
              role="dialog"
              aria-label={active.label}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            >
              <div className="grip" />
              <p className="group">{active.group}</p>
              <h2>{active.label}</h2>
              <p className="w-sq-status">
                {doneAt[active.id] ? `She did this on ${fmt(doneAt[active.id])} 🌷` : 'Not stitched yet. Give her a nudge?'}
              </p>

              {mineFor(active.id).length > 0 && (
                <ul className="w-dares">
                  {mineFor(active.id).map((d) => (
                    <li key={d.id}>
                      <span>{d.text}</span>
                      <button onClick={() => remove(d.id)}>Delete</button>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={add} className="w-dare-form">
                <label className="w-label" htmlFor="dare">
                  {doneAt[active.id] ? 'Cheer her on for this one' : 'Dare her, or cheer her on'}
                </label>
                <textarea
                  id="dare"
                  className="h-textarea"
                  rows={3}
                  maxLength={280}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={doneAt[active.id] ? 'SO proud of you for this…' : 'Do it this weekend, and send me a photo…'}
                />
                {err && <p className="h-err">{err}</p>}
                <div className="sheet-actions">
                  <button className="cta" disabled={busy || !text.trim()}>
                    {busy ? 'Pinning…' : 'Pin it to this square'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
