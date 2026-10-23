'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Letter } from '@/lib/data';
import { api } from '@/lib/upload-client';

const PAPERS = [
  ['#f6ead8', '#ecd8bd'],
  ['#fde3ea', '#f8cfdb'],
  ['#ece3f6', '#ddd0ee'],
  ['#e5f2ec', '#d0e6dc'],
];

const locked = (l: Letter) => Boolean(l.unlockAt && new Date(l.unlockAt).getTime() > Date.now());
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Letters({ letters: initial }: { letters: Letter[] }) {
  const [letters, setLetters] = useState(() =>
    [...initial].sort((a, b) => Number(locked(a)) - Number(locked(b)) || Number(Boolean(a.openedAt)) - Number(Boolean(b.openedAt))),
  );
  const [open, setOpen] = useState<Letter | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);

  async function choose(l: Letter) {
    if (locked(l)) {
      setNudge(l.id);
      setTimeout(() => setNudge(null), 600);
      return;
    }
    setOpen(l);
    if (!l.openedAt) {
      try {
        const updated = await api<Letter>(`/api/letters/${l.id}`, 'POST');
        setLetters((ls) => ls.map((x) => (x.id === l.id ? updated : x)));
        // a letter that unlocked while the page was open arrives without its body
        setOpen((o) => (o?.id === l.id ? updated : o));
      } catch {}
    }
  }

  if (!letters.length)
    return (
      <div className="h-empty">
        <p className="hand">No letters yet</p>
        <p className="whisper">They’re being written.</p>
      </div>
    );

  return (
    <>
      <div className="letters">
        {letters.map((l, i) => {
          const isLocked = locked(l);
          const [paper, flap] = PAPERS[l.seal % PAPERS.length];
          return (
            <motion.button
              key={l.id}
              className="letter-btn"
              style={{ ['--tilt' as string]: `${i % 2 ? 1.5 : -1.5}deg` }}
              onClick={() => choose(l)}
              animate={nudge === l.id ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.45 }}
              aria-label={isLocked ? `${l.title}, sealed until ${fmt(l.unlockAt!)}` : l.title}
            >
              <div
                className={`letter-env${isLocked ? ' locked' : ''}${l.openedAt ? ' opened' : ''}`}
                style={{ ['--paper-c' as string]: paper, ['--flap-c' as string]: flap }}
              >
                <span className="wax" />
              </div>
              <div className="letter-title">{l.title}</div>
              <div className="letter-meta">
                {isLocked ? `opens ${fmt(l.unlockAt!)}` : l.openedAt ? `from ${l.authorName} · read` : `from ${l.authorName}`}
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="h-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <button className="h-modal-close" aria-label="Close letter" onClick={() => setOpen(null)}>
              ×
            </button>
            <motion.article
              className="letter-paper"
              role="dialog"
              aria-label={open.title}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 160, scale: 0.6, rotate: -8, opacity: 0 }}
              animate={{ y: 0, scale: 1, rotate: -1, opacity: 1 }}
              exit={{ y: 120, scale: 0.8, opacity: 0, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 120, damping: 15 }}
            >
              <h2>{open.title}</h2>
              <p>{open.body}</p>
              <p className="sign">{open.authorName}</p>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
