'use client';

import { sfx } from '@/lib/sound';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import type { JarNote, Mood } from '@/lib/data';
import { moods, calm } from '@/content/home';
import { places } from '@/content/milano';
import { api } from '@/lib/upload-client';

const HEARTS: [number, number, string, number][] = [
  [44, 116, '#f4a6c0', -15],
  [62, 120, '#f7e3a1', 10],
  [80, 114, '#cdb4f0', 25],
  [52, 100, '#ffd0dc', 30],
  [72, 98, '#bfe0d6', -20],
  [60, 84, '#f27ca2', 5],
  [46, 76, '#fff1f4', -30],
  [78, 80, '#f7c9a8', 15],
  [64, 66, '#f4a6c0', -8],
  [50, 58, '#e9c6f2', 22],
];
const NOTE_COLORS = ['#fff7d6', '#ffe1ea', '#e9f4ef', '#efe6f7', '#fde7d6', '#fffdf8'];

export default function Jar({ counts }: { counts: Record<string, number> }) {
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState<JarNote | null>(null);
  const [empty, setEmpty] = useState(false);
  const [busy, setBusy] = useState(false);
  const jar = useAnimationControls();

  useEffect(() => {
    api('/api/seen', 'POST', { area: 'jar' }).catch(() => {});
  }, []);

  async function shake() {
    if (!mood || busy) return;
    setBusy(true);
    sfx('rattle');
    setNote(null);
    setEmpty(false);
    const anim = jar.start({ rotate: [0, -12, 10, -8, 6, -3, 0], y: [0, -6, 0, -4, 0], transition: { duration: 0.9 } });
    try {
      const [{ note }] = await Promise.all([api<{ note: JarNote | null }>('/api/jar/draw', 'POST', { mood }), anim]);
      if (note) (setNote(note), sfx('chime'));
      else setEmpty(true);
    } catch {
      setEmpty(true);
    }
    setBusy(false);
  }

  return (
    <div className="jar-stage">
      <p className="hand" style={{ fontSize: 24, color: 'var(--burgundy)', margin: '0 0 10px' }}>
        I’m feeling…
      </p>
      <div className="h-chips" role="group" aria-label="How are you feeling?">
        {moods.map((m) => (
          <button
            key={m.id}
            className="h-chip"
            aria-pressed={mood === m.id}
            onClick={() => {
              setMood(m.id);
              setNote(null);
              setEmpty(false);
            }}
          >
            {m.emoji} {m.label}
            {counts[m.id] ? <small style={{ opacity: 0.6 }}> · {counts[m.id]}</small> : null}
          </button>
        ))}
      </div>

      <button className="jar-big" onClick={shake} disabled={!mood || busy} aria-label={mood ? 'Shake the jar for a note' : 'Pick a feeling first'}>
        <motion.svg viewBox="0 0 120 150" animate={jar} style={{ originY: 0.9 }}>
          <defs>
            <linearGradient id="glassB" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
              <stop offset="0.25" stopColor="#fff" stopOpacity="0.12" />
              <stop offset="0.8" stopColor="#fff" stopOpacity="0.06" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="146" rx="40" ry="5" fill="rgba(107,30,58,0.15)" />
          <rect x="34" y="8" width="52" height="18" rx="4" fill="#c99a68" />
          <rect x="34" y="8" width="52" height="6" rx="3" fill="#dcb385" />
          <path d="M40 26 q20 6 40 0" stroke="#d8b06a" strokeWidth="3" fill="none" />
          <path d="M30 28 h60 q6 0 6 8 v86 q0 16 -16 16 h-40 q-16 0 -16 -16 v-86 q0 -8 6 -8z" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
          {HEARTS.map(([x, y, c, r], k) => (
            <motion.g
              key={k}
              animate={busy ? { y: [0, -10 - (k % 3) * 6, 0], rotate: [0, k % 2 ? 20 : -20, 0] } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.9, delay: k * 0.02 }}
            >
              <g transform={`translate(${x} ${y}) rotate(${r}) scale(1.15)`}>
                <path d="M0 4 C -9 -3 -6 -11 0 -6 C 6 -11 9 -3 0 4 Z" fill={c} stroke="rgba(120,40,70,0.25)" strokeWidth="0.8" />
              </g>
            </motion.g>
          ))}
          <path d="M30 28 h60 q6 0 6 8 v86 q0 16 -16 16 h-40 q-16 0 -16 -16 v-86 q0 -8 6 -8z" fill="url(#glassB)" />
          <path d="M36 40 q-2 30 0 72" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.75" fill="none" />
        </motion.svg>
      </button>
      <p className="hand jar-hint">{mood ? (busy ? 'shaking…' : 'tap the jar') : 'pick a feeling first'}</p>

      <AnimatePresence mode="wait">
        {note && (
          <motion.div
            key={note.id}
            className="jar-note"
            style={{ background: NOTE_COLORS[note.color % NOTE_COLORS.length] }}
            initial={{ y: -120, scale: 0.2, rotate: -25, opacity: 0 }}
            animate={{ y: 0, scale: 1, rotate: -1.5, opacity: 1 }}
            exit={{ y: 40, opacity: 0, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 130, damping: 13 }}
          >
            {note.text}
            <span className="love-from">from {note.authorName}</span>
          </motion.div>
        )}
        {empty && (
          <motion.p key="empty" className="whisper" style={{ fontSize: 19, marginTop: 18 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            No notes for this feeling yet. Your people will add some.
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mood && calm[mood] && (note || empty) && !busy && (
          <motion.aside
            key={`calm-${mood}`}
            className="jar-calm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.9 } }}
            exit={{ opacity: 0 }}
            aria-label="Something calming"
          >
            <p className="hand jar-calm-title">something calming 🌼</p>
            <p className="jar-calm-line">{calm[mood]!.line}</p>
            <div className="jar-calm-places">
              {calm[mood]!.places.map((id) => {
                const p = places.find((x) => x.id === id);
                return p ? (
                  <a key={id} href={`/home/milano?place=${id}`}>
                    {p.name}
                    <small>{p.area}</small>
                  </a>
                ) : null;
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
