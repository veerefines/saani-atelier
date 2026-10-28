'use client';

import { sfx } from '@/lib/sound';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Wish } from '@/lib/data';
import { api } from '@/lib/upload-client';
import { deleteMine } from './Composer';

const IDEAS = ['The best gelato near her school', 'A café to study in', 'Where to watch the sunset', 'A shop she’ll love', 'A weekend trip'];

/** Friends' Milano tips. Each lands on her own list, signed with their name. */
export default function Tips({ tips: initial, name }: { tips: Wish[]; name: string }) {
  const [tips, setTips] = useState(initial);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const first = name.split(' ')[0];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const w = await api<Wish>('/api/tips', 'POST', { text });
      setTips((ts) => [w, ...ts]);
      sfx('sparkle');
      setText('');
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  async function remove(id: string) {
    try {
      if (await deleteMine('tips', id)) setTips((ts) => ts.filter((t) => t.id !== id));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <>
      <form className="w-card" onSubmit={add}>
        <img className="h-tape" src="/reveal/washi.webp" alt="" />
        <p className="whisper w-hint">A place, a dish, a plan. It goes straight onto her Milano list as “from {first}”, and she ticks it off when she’s been.</p>
        <label className="w-label" htmlFor="tip">
          Your tip
        </label>
        <input
          id="tip"
          className="h-input"
          maxLength={140}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Pistachio gelato at Gelateria della Musica"
        />
        <div className="h-chips w-ideas" aria-label="Ideas">
          {IDEAS.map((i) => (
            <button type="button" key={i} className="h-chip" onClick={() => setText(`${i}: `)}>
              {i}
            </button>
          ))}
        </div>
        {err && <p className="h-err">{err}</p>}
        <div className="w-send">
          <button className="cta" type="submit" disabled={busy || !text.trim()}>
            {busy ? 'Adding…' : 'Add to her list'}
          </button>
        </div>
      </form>

      <section className="w-mine" aria-label="Your tips">
        <h2 className="hand">{tips.length ? `Your tips (${tips.length})` : 'No tips yet'}</h2>
        <ul className="w-tips">
          <AnimatePresence initial={false}>
            {tips.map((t) => (
              <motion.li key={t.id} className={t.done ? 'done' : ''} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <span className="w-tip-mark" aria-hidden="true">
                  {t.done ? '🌷' : '📮'}
                </span>
                <span className="w-tip-text">
                  {t.text}
                  <small>{t.done ? 'She’s been!' : 'On her list'}</small>
                </span>
                <button onClick={() => remove(t.id)}>Delete</button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </>
  );
}
