'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { sfx } from '@/lib/sound';
import type { Square } from '@/content/home';
import type { Dare } from '@/lib/data';
import { api, mediaUrl, uploadFile } from '@/lib/upload-client';

type Done = Record<string, { at: string; mediaId?: string }>;

const LINES: number[][] = [
  ...[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4].map((c) => r * 5 + c)),
  ...[0, 1, 2, 3, 4].map((c) => [0, 1, 2, 3, 4].map((r) => r * 5 + c)),
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];
const FLOWERS = ['🌷', '🌸', '💐', '🌼', '🪷'];
const LETTERS = ['B', 'I', 'N', 'G', 'O'];
const GROUPS: { id: Square['group']; label: string; icon: string }[] = [
  { id: 'Milano', label: 'Milano', icon: '🏙️' },
  { id: 'School', label: 'School', icon: '🎓' },
  { id: 'Italia', label: 'Italia', icon: '🇮🇹' },
  { id: 'You', label: 'Just you', icon: '💗' },
];
const COLORS = ['#f4a6c0', '#ffd0dc', '#fff4f6', '#f7e3a1', '#e48aae', '#cdb4f0'];

function burst(big = false) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const go = (x: number, d = 0) =>
    setTimeout(() => confetti({ particleCount: big ? 120 : 60, spread: big ? 100 : 70, startVelocity: big ? 48 : 36, origin: { x, y: 0.7 }, colors: COLORS, ticks: 260 }), d);
  go(0.3);
  go(0.7, 180);
  if (big) {
    go(0.5, 400);
    go(0.15, 700);
    go(0.85, 900);
  }
}

function Stitch() {
  return (
    <svg className="stitch" viewBox="0 0 100 100" aria-hidden="true">
      {[
        'M10 10 L90 90',
        'M90 10 L10 90',
      ].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="#b2305f"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="9 7"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: i * 0.4, ease: 'easeInOut' }}
        />
      ))}
    </svg>
  );
}

type RewardView = { sq: Square; line: boolean; full: boolean };

/** Dares and cheers her friends pinned to a square. */
function Dares({ list }: { list: Dare[] }) {
  if (!list.length) return null;
  return (
    <ul className="bingo-dares">
      {list.map((d) => (
        <li key={d.id}>
          {d.text}
          <span className="love-from">from {d.authorName}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Bingo({ squares, done: initial, dares = [] }: { squares: Square[]; done: Done; dares?: Dare[] }) {
  const [done, setDone] = useState<Done>(initial);
  const [active, setActive] = useState<Square | null>(null);
  const [reward, setReward] = useState<RewardView | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const count = Object.keys(done).length;
  const daresFor = (id: string) => dares.filter((d) => d.squareId === id);
  const doneIdx = useMemo(() => new Set(squares.map((s, i) => (done[s.id] ? i : -1)).filter((i) => i >= 0)), [squares, done]);
  const linesDone = (set: Set<number>) => LINES.filter((l) => l.every((i) => set.has(i))).length;
  // squares in a finished row, column or diagonal glow gold
  const inLine = useMemo(() => new Set(LINES.filter((l) => l.every((i) => doneIdx.has(i))).flat()), [doneIdx]);
  const lines = linesDone(doneIdx);

  async function complete(sq: Square, file?: File | null) {
    setBusy(true);
    setErr('');
    try {
      const mediaId = file ? await uploadFile(file) : undefined;
      await api('/api/bingo', 'POST', { squareId: sq.id, done: true, mediaId });
      const next = { ...done, [sq.id]: { at: new Date().toISOString(), mediaId } };
      const before = linesDone(doneIdx);
      const idx = new Set(doneIdx);
      idx.add(squares.findIndex((s) => s.id === sq.id));
      const after = linesDone(idx);
      setDone(next);
      setActive(null);
      sfx('stitch');
      const full = Object.keys(next).length === squares.length;
      setTimeout(() => {
        setReward({ sq, line: after > before, full });
        burst(full || after > before);
        if (full || after > before) sfx(full ? 'full' : 'line');
      }, 900);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  async function undo(sq: Square) {
    setBusy(true);
    try {
      await api('/api/bingo', 'POST', { squareId: sq.id, done: false });
      const next = { ...done };
      delete next[sq.id];
      setDone(next);
      setActive(null);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
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
        {lines > 0 && (
          <span className="bingo-lines">
            🎉 {lines} {lines === 1 ? 'line' : 'lines'}
          </span>
        )}
      </div>

      <div className="bingo-legend" aria-label="Kinds of squares">
        {GROUPS.map((g) => {
          const all = squares.filter((x) => x.group === g.id);
          return (
            <span key={g.id} className={`bingo-chip g-${g.id}`}>
              <span aria-hidden="true">{g.icon}</span> {g.label}
              <b>
                {all.filter((x) => done[x.id]).length}/{all.length}
              </b>
            </span>
          );
        })}
      </div>

      <div className="bingo-card">
        <i className="bingo-tape t1" aria-hidden="true" />
        <i className="bingo-tape t2" aria-hidden="true" />
        <span className="bingo-spark s1" aria-hidden="true">✦</span>
        <span className="bingo-spark s2" aria-hidden="true">✧</span>
        <span className="bingo-spark s3" aria-hidden="true">✦</span>
        <div className="bingo-letters" aria-hidden="true">
          {LETTERS.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
        <div className="bingo" role="grid" aria-label="Bingo board">
          {squares.map((s, i) => {
            const d = Boolean(done[s.id]);
            return (
              <button
                key={s.id}
                className={`sq g-${s.group}${d ? ' done' : ''}${s.id === 'free' ? ' free' : ''}${inLine.has(i) ? ' in-line' : ''}`}
                style={{ ['--tilt' as string]: `${((i * 7) % 5) - 2}` }}
                onClick={() => {
                  setErr('');
                  setActive(s);
                }}
                aria-label={`${s.label}${d ? ', done' : ''}`}
              >
                {s.id === 'free' && <span className="sq-start">start here</span>}
                <span className="sq-icon" aria-hidden="true">
                  {s.icon}
                </span>
                <span className="sq-label">{s.label}</span>
                {d && <Stitch />}
                {d && <span className="sq-flower">{FLOWERS[i % FLOWERS.length]}</span>}
                {daresFor(s.id).length > 0 && <span className="sq-dare">💌{daresFor(s.id).length > 1 ? daresFor(s.id).length : ''}</span>}
              </button>
            );
          })}
        </div>
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
              <p className="group">
                {active.icon} {active.group}
              </p>
              <h2>{active.label}</h2>
              {done[active.id]?.mediaId && <img className="proof" src={mediaUrl(done[active.id].mediaId)} alt="Your photo for this square" />}
              <Dares list={daresFor(active.id)} />
              {done[active.id] ? (
                <div className="sheet-actions">
                  <button className="cta" onClick={() => setReward({ sq: active, line: false, full: false })}>
                    See my reward again
                  </button>
                  <button className="ghost-btn" disabled={busy} onClick={() => undo(active)}>
                    Unstitch this square
                  </button>
                </div>
              ) : (
                <div className="sheet-actions">
                  <button className="cta" disabled={busy} onClick={() => complete(active)}>
                    {busy ? 'Stitching…' : 'I did it!'}
                  </button>
                  <button className="ghost-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
                    I did it, and here’s a photo
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) complete(active, f);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}
              {err && <p className="h-err">{err}</p>}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reward && (
          <motion.div className="h-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReward(null)}>
            <div className="reward" onClick={(e) => e.stopPropagation()}>
              {reward.full && (
                <motion.p className="cheer" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                  Tulip season! You finished the whole board.
                </motion.p>
              )}
              {!reward.full && reward.line && (
                <motion.p className="hand" style={{ color: '#fff', fontSize: 28, margin: '0 0 10px' }} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                  Bingo! A whole line!
                </motion.p>
              )}
              {reward.sq.reward.kind === 'bouquet' && (
                <>
                  <div className="reward-bouquet">
                    <motion.img
                      src="/reveal/tulips.webp"
                      alt=""
                      style={{ width: '62%' }}
                      initial={{ y: 200, rotate: -20, scale: 0.6 }}
                      animate={{ y: 0, rotate: -6, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 90, damping: 12 }}
                    />
                    {['carn-pink-2', 'carn-white-1', 'carn-pink-3'].map((c, k) => (
                      <motion.img
                        key={c}
                        src={`/reveal/${c}.webp`}
                        alt=""
                        style={{ width: '34%', bottom: 150 + (k % 2) * 30, marginLeft: `${(k - 1) * 30}%` }}
                        initial={{ scale: 0, rotate: -40 }}
                        animate={{ scale: 1, rotate: (k - 1) * 14 }}
                        transition={{ type: 'spring', stiffness: 120, damping: 10, delay: 0.4 + k * 0.15 }}
                      />
                    ))}
                  </div>
                  <p className="reward-line">{reward.sq.reward.line}</p>
                </>
              )}
              {reward.sq.reward.kind === 'certificate' && (
                <motion.div className="cert" initial={{ scale: 0.4, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: -2, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
                  <small>This certifies that Saanika is now an</small>
                  <h3>{reward.sq.reward.title}</h3>
                  <p>{reward.sq.reward.line}</p>
                  <span className="goldseal" aria-hidden="true">
                    🌷
                  </span>
                </motion.div>
              )}
              {reward.sq.reward.kind === 'cheer' && (
                <motion.p className="cheer" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 10 }}>
                  {reward.sq.reward.line}
                </motion.p>
              )}
              <Dares list={daresFor(reward.sq.id)} />
              <div className="reward-actions">
                <button className="cta" onClick={() => setReward(null)}>
                  Back to the board
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
