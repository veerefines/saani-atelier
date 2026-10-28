'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/upload-client';
import { haptic, note, sfx } from '@/lib/sound';
import { moodSrc } from '@/lib/jelly-mood';
import type { GameId, JellyView } from '@/lib/jelly';

type Result = { score: number; pearls: number; best: boolean; home: JellyView; gains: unknown[] };
type Done = (game: GameId, score: number, ms: number) => Promise<Result | null>;

const GAMES: { id: GameId; icon: string; name: string; how: string; quest: string }[] = [
  { id: 'catch', icon: '🫧', name: 'Pearl Catch', how: 'Slide Jelly to catch falling pearls. Golden ones are worth 3, and dodge the sea urchins!', quest: '20 for a quest' },
  { id: 'pop', icon: '🎈', name: 'Bubble Pop', how: 'Pop the bubbles before they float away. Pop quickly in a row for combos, and catch the golden ones!', quest: '30 for a quest' },
  { id: 'says', icon: '🎵', name: 'Jelly Says', how: 'Watch the shells light up and sing, then tap them back in the same order. One more each round!', quest: 'round 5 for a quest' },
];

/** Little games in Jelly's Corner: a few pearls each (up to 15 a day), best scores, and quests. */
export default function Games({ home, onResult }: { home: JellyView; onResult: (r: Result) => void }) {
  const [game, setGame] = useState<GameId | null>(null);
  const [last, setLast] = useState<{ game: GameId; r: Result } | null>(null);
  const left = Math.max(0, 15 - home.games.pearlsToday);

  const done: Done = useCallback(
    async (g, score, ms) => {
      try {
        const r = await api<Result>('/api/jelly/game', 'POST', { game: g, score, ms });
        setLast({ game: g, r });
        if (r.best) sfx('harp');
        onResult(r);
        return r;
      } catch {
        return null;
      }
    },
    [onResult],
  );

  if (game) {
    const meta = GAMES.find((x) => x.id === game)!;
    const Game = game === 'catch' ? PearlCatch : game === 'pop' ? BubblePop : JellySays;
    return (
      <section className="jg" aria-label={meta.name}>
        <div className="jg-top">
          <button type="button" className="jg-back" onClick={() => setGame(null)}>
            ‹ All games
          </button>
          <b>
            {meta.icon} {meta.name}
          </b>
          <span className="jg-best">best {home.games.best[game] ?? 0}</span>
        </div>
        <Game done={done} best={home.games.best[game] ?? 0} key={game} />
      </section>
    );
  }

  return (
    <section className="jg" aria-label="Games">
      <p className="jg-intro">
        Play with Jelly for pearls: <b>{left ? `${left} more game pearls today` : 'all of today’s game pearls won'}</b> {left ? '🫧' : '(you can still play for fun and best scores!)'}
      </p>
      {last && (
        <p className="jh-toast">
          {last.r.best ? '🏆 New best! ' : ''}
          {GAMES.find((g) => g.id === last.game)?.name}: {last.r.score} points{last.r.pearls ? `, +${last.r.pearls} pearls` : ''}
        </p>
      )}
      <div className="jg-list">
        {GAMES.map((g) => (
          <button key={g.id} type="button" className={`jg-card g-${g.id}`} onClick={() => (sfx('go'), setGame(g.id))}>
            <span className="jg-icon" aria-hidden="true">
              {g.icon}
            </span>
            <b>{g.name}</b>
            <small>{g.how}</small>
            <span className="jg-meta">
              <span>🏆 {home.games.best[g.id] ?? 0}</span>
              <span>{g.quest}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="jg-played">{home.games.played} games played together</p>
    </section>
  );
}

/* ---------- a shared start / end screen ---------- */
function Overlay({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="jg-over">
      <b>{title}</b>
      {children}
    </div>
  );
}
function EndCard({ score, best, r, again }: { score: number; best: number; r: Result | null | undefined; again: () => void }) {
  return (
    <Overlay title={r?.best || score > best ? 'New best! 🏆' : score ? 'Brava! ✨' : 'Ooh, so close!'}>
      <p className="jg-score">{score}</p>
      {r === undefined ? <small>Saving…</small> : r ? <small>{r.pearls ? `+${r.pearls} pearls for Jelly’s purse` : 'No pearls left from games today, but what a score!'}</small> : <small>Couldn’t save that one.</small>}
      <button type="button" className="jg-go" onClick={again}>
        Play again
      </button>
    </Overlay>
  );
}

/** A canvas that matches its box and the screen's sharpness. */
function useCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 400, h: 300, dpr: 1 });
  useEffect(() => {
    const c = ref.current!;
    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      size.current = { w: r.width, h: r.height, dpr };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}
const img = (src: string) => {
  const i = new Image();
  i.src = src;
  return i;
};
function urchin(g: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  g.save();
  g.translate(x, y);
  g.rotate(t / 600);
  g.fillStyle = '#5b3d74';
  g.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = i % 2 ? r * 0.62 : r * 1.15;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.fill();
  g.fillStyle = '#8b63a8';
  g.beginPath();
  g.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/* ---------- Pearl Catch ---------- */
const CATCH_MS = 45_000;
function PearlCatch({ done, best }: { done: Done; best: number }) {
  const { ref, size } = useCanvas();
  const [phase, setPhase] = useState<'ready' | 'play' | 'end'>('ready');
  const [hud, setHud] = useState({ score: 0, left: 45 });
  const [res, setRes] = useState<Result | null | undefined>(undefined);
  const jellyX = useRef(0.5);
  const keys = useRef({ l: false, r: false });

  useEffect(() => {
    if (phase !== 'play') return;
    const g = ref.current!.getContext('2d')!;
    const jelly = img(moodSrc('joyful'));
    const pearl = img('/corner/pearl.webp');
    type Drop = { x: number; y: number; v: number; kind: 'pearl' | 'gold' | 'urchin' };
    let drops: Drop[] = [];
    let score = 0;
    let hit = 0;
    let spawn = 0;
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const pops: { x: number; y: number; t: number; txt: string }[] = [];
    const frame = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      const el = now - t0;
      const { w, h, dpr } = size.current;
      const speed = 1 + el / 30_000; // faster as it goes
      if (keys.current.l) jellyX.current = Math.max(0.06, jellyX.current - dt * 0.9);
      if (keys.current.r) jellyX.current = Math.min(0.94, jellyX.current + dt * 0.9);
      spawn -= dt;
      if (spawn <= 0) {
        spawn = (0.75 + Math.random() * 0.5) / speed;
        const r = Math.random();
        drops.push({ x: 0.06 + Math.random() * 0.88, y: -0.05, v: (0.22 + Math.random() * 0.12) * speed, kind: r < 0.1 ? 'gold' : r < 0.32 ? 'urchin' : 'pearl' });
      }
      const jx = jellyX.current * w;
      const jy = h - h * 0.13;
      const jr = Math.min(w, h) * 0.09;
      drops = drops.filter((d) => {
        d.y += d.v * dt;
        const px = d.x * w;
        const py = d.y * h;
        if (Math.hypot(px - jx, py - jy) < jr + 14) {
          if (d.kind === 'urchin') {
            score = Math.max(0, score - 3);
            hit = now;
            sfx('nope');
            pops.push({ x: px, y: py, t: now, txt: '−3' });
          } else {
            const p = d.kind === 'gold' ? 3 : 1;
            score += p;
            if (d.kind === 'gold') sfx('sparkle');
            else note(12 + (score % 8) * 2, 0.18);
            pops.push({ x: px, y: py, t: now, txt: `+${p}` });
          }
          setHud((s) => ({ ...s, score }));
          return false;
        }
        return d.y < 1.08;
      });

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      for (const d of drops) {
        const px = d.x * w;
        const py = d.y * h;
        const r = Math.min(w, h) * (d.kind === 'gold' ? 0.04 : 0.032);
        if (d.kind === 'urchin') urchin(g, px, py, r, now);
        else {
          if (d.kind === 'gold') {
            g.fillStyle = 'rgba(255, 214, 90, 0.55)';
            g.beginPath();
            g.arc(px, py, r * 1.5, 0, Math.PI * 2);
            g.fill();
          }
          if (pearl.complete) g.drawImage(pearl, px - r, py - r, r * 2, r * 2);
        }
      }
      const shake = now - hit < 300 ? Math.sin(now / 20) * 6 : 0;
      if (jelly.complete) g.drawImage(jelly, jx - jr * 1.4 + shake, jy - jr * 1.4, jr * 2.8, jr * 2.8);
      g.font = '700 18px Figtree Variable, system-ui';
      g.textAlign = 'center';
      for (const p of pops) {
        const a = (now - p.t) / 700;
        if (a > 1) continue;
        g.fillStyle = p.txt.startsWith('−') ? `rgba(178, 48, 95, ${1 - a})` : `rgba(107, 30, 58, ${1 - a})`;
        g.fillText(p.txt, p.x, p.y - a * 30);
      }
      const left = Math.max(0, Math.ceil((CATCH_MS - el) / 1000));
      setHud((s) => (s.left === left ? s : { ...s, left }));
      if (el >= CATCH_MS) {
        sfx('full');
        setPhase('end');
        setRes(undefined);
        done('catch', score, el).then(setRes);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') (keys.current.l = true), e.preventDefault();
      if (e.key === 'ArrowRight') (keys.current.r = true), e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.current.l = false;
      if (e.key === 'ArrowRight') keys.current.r = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [phase, done, ref, size]);

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    jellyX.current = Math.max(0.06, Math.min(0.94, (e.clientX - r.left) / r.width));
  };
  const start = () => {
    sfx('go');
    setHud({ score: 0, left: 45 });
    jellyX.current = 0.5;
    setPhase('play');
  };

  return (
    <div className="jg-stage catch">
      <div className="jg-hud">
        <span>🫧 {hud.score}</span>
        <span>⏱ {hud.left}s</span>
      </div>
      <canvas ref={ref} className="jg-canvas" onPointerMove={move} onPointerDown={move} aria-label="Pearl Catch: move Jelly with your finger, mouse or arrow keys" />
      {phase === 'ready' && (
        <Overlay title="Pearl Catch">
          <small>Slide (or use ← →) to catch pearls. Golden = 3. Urchins = −3!</small>
          <button type="button" className="jg-go" onClick={start}>
            Start
          </button>
        </Overlay>
      )}
      {phase === 'end' && <EndCard score={hud.score} best={best} r={res} again={start} />}
    </div>
  );
}

/* ---------- Bubble Pop ---------- */
const POP_MS = 40_000;
function BubblePop({ done, best }: { done: Done; best: number }) {
  const { ref, size } = useCanvas();
  const [phase, setPhase] = useState<'ready' | 'play' | 'end'>('ready');
  const [hud, setHud] = useState({ score: 0, left: 40, combo: 0 });
  const [res, setRes] = useState<Result | null | undefined>(undefined);
  const tap = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (phase !== 'play') return;
    const g = ref.current!.getContext('2d')!;
    type B = { x: number; y: number; r: number; v: number; wob: number; gold: boolean };
    let bubbles: B[] = [];
    const bursts: { x: number; y: number; r: number; t: number; txt: string }[] = [];
    let score = 0;
    let combo = 0;
    let lastPop = 0;
    let spawn = 0;
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      const el = now - t0;
      const { w, h, dpr } = size.current;
      const speed = 1 + el / 40_000;
      spawn -= dt;
      if (spawn <= 0) {
        spawn = (0.45 + Math.random() * 0.4) / speed;
        const small = Math.random() < 0.3;
        bubbles.push({ x: 0.08 + Math.random() * 0.84, y: 1.1, r: small ? 0.035 : 0.05 + Math.random() * 0.03, v: (0.13 + Math.random() * 0.1) * speed, wob: Math.random() * 6, gold: Math.random() < 0.07 });
      }
      // a tap: pop the bubble under it
      const t = tap.current;
      tap.current = null;
      if (t) {
        const m = Math.min(w, h);
        const hitB = bubbles.find((b) => Math.hypot(b.x * w + Math.sin(now / 500 + b.wob) * 8 - t.x, b.y * h - t.y) < b.r * m + 10);
        if (hitB) {
          bubbles = bubbles.filter((b) => b !== hitB);
          combo = now - lastPop < 700 ? Math.min(3, combo + 1) : 0;
          lastPop = now;
          const p = (hitB.gold ? 5 : hitB.r < 0.04 ? 2 : 1) + combo;
          score += p;
          if (hitB.gold) sfx('sparkle');
          else note(7 + combo * 4 + Math.round(Math.random() * 2), 0.15);
          haptic('light');
          bursts.push({ x: t.x, y: t.y, r: hitB.r * m, t: now, txt: `+${p}` });
          setHud((s) => ({ ...s, score, combo }));
        }
      }
      bubbles = bubbles.filter((b) => {
        b.y -= b.v * dt;
        return b.y > -0.15;
      });

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const m = Math.min(w, h);
      for (const b of bubbles) {
        const x = b.x * w + Math.sin(now / 500 + b.wob) * 8;
        const y = b.y * h;
        const r = b.r * m;
        const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
        grd.addColorStop(0, 'rgba(255,255,255,0.95)');
        grd.addColorStop(0.45, b.gold ? 'rgba(255, 220, 120, 0.55)' : 'rgba(205, 180, 240, 0.35)');
        grd.addColorStop(1, b.gold ? 'rgba(230, 170, 40, 0.75)' : 'rgba(150, 190, 240, 0.5)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.8)';
        g.lineWidth = 1.5;
        g.stroke();
      }
      g.textAlign = 'center';
      g.font = '700 17px Figtree Variable, system-ui';
      for (const p of bursts) {
        const a = (now - p.t) / 500;
        if (a > 1) continue;
        g.strokeStyle = `rgba(244, 166, 192, ${1 - a})`;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(p.x, p.y, p.r * (1 + a * 0.8), 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = `rgba(107, 30, 58, ${1 - a})`;
        g.fillText(p.txt, p.x, p.y - a * 26);
      }
      const left = Math.max(0, Math.ceil((POP_MS - el) / 1000));
      setHud((s) => (s.left === left ? s : { ...s, left }));
      if (el >= POP_MS) {
        sfx('full');
        setPhase('end');
        setRes(undefined);
        done('pop', score, el).then(setRes);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, done, ref, size]);

  const start = () => {
    sfx('go');
    setHud({ score: 0, left: 40, combo: 0 });
    setPhase('play');
  };

  return (
    <div className="jg-stage pop">
      <div className="jg-hud">
        <span>🎈 {hud.score}</span>
        {hud.combo > 0 && <span className="jg-combo">combo ×{hud.combo + 1}</span>}
        <span>⏱ {hud.left}s</span>
      </div>
      <canvas
        ref={ref}
        className="jg-canvas"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          tap.current = { x: e.clientX - r.left, y: e.clientY - r.top };
        }}
        aria-label="Bubble Pop: tap the bubbles"
      />
      {phase === 'ready' && (
        <Overlay title="Bubble Pop">
          <small>Tap bubbles before they float away. Small = 2, golden = 5, quick pops build combos!</small>
          <button type="button" className="jg-go" onClick={start}>
            Start
          </button>
        </Overlay>
      )}
      {phase === 'end' && <EndCard score={hud.score} best={best} r={res} again={start} />}
    </div>
  );
}

/* ---------- Jelly Says ---------- */
const SHELLS = [
  { color: '#f4a6c0', step: 0, label: 'pink' },
  { color: '#cdb4f0', step: 4, label: 'lilac' },
  { color: '#9fd8ef', step: 7, label: 'blue' },
  { color: '#f7d77a', step: 12, label: 'gold' },
];
function JellySays({ done, best }: { done: Done; best: number }) {
  const [phase, setPhase] = useState<'ready' | 'show' | 'you' | 'end'>('ready');
  const [seq, setSeq] = useState<number[]>([]);
  const [at, setAt] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [res, setRes] = useState<Result | null | undefined>(undefined);
  const t0 = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const flash = (i: number, ms = 380) => {
    setLit(i);
    note(SHELLS[i].step, ms / 1000);
    timers.current.push(window.setTimeout(() => setLit(null), ms));
  };
  const play = (s: number[]) => {
    setPhase('show');
    const gap = Math.max(320, 620 - s.length * 25);
    s.forEach((i, k) => timers.current.push(window.setTimeout(() => flash(i, gap * 0.7), 600 + k * gap)));
    timers.current.push(
      window.setTimeout(() => {
        setPhase('you');
        setAt(0);
      }, 600 + s.length * gap),
    );
  };
  const start = () => {
    sfx('go');
    t0.current = performance.now();
    const s = [Math.floor(Math.random() * 4)];
    setSeq(s);
    play(s);
  };
  const press = (i: number) => {
    if (phase !== 'you') return;
    flash(i, 260);
    if (seq[at] !== i) {
      sfx('nope');
      const score = seq.length - 1;
      setPhase('end');
      setRes(undefined);
      done('says', score, performance.now() - t0.current).then(setRes);
      return;
    }
    if (at + 1 < seq.length) return setAt(at + 1);
    // a round done: one more
    sfx('chime');
    const s = [...seq, Math.floor(Math.random() * 4)];
    setSeq(s);
    timers.current.push(window.setTimeout(() => play(s), 500));
  };

  const round = phase === 'end' ? seq.length - 1 : seq.length;
  return (
    <div className="jg-stage says">
      <div className="jg-hud">
        <span>🎵 round {Math.max(1, round)}</span>
        <span>{phase === 'show' ? 'watch…' : phase === 'you' ? 'your turn!' : ''}</span>
      </div>
      <div className="jg-says">
        <img src={moodSrc(phase === 'you' ? 'curious' : phase === 'end' ? 'shy' : 'excited')} alt="" className="jg-says-jelly" />
        {SHELLS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            className={`jg-shell s${i}${lit === i ? ' lit' : ''}`}
            style={{ ['--c' as string]: s.color }}
            onPointerDown={(e) => (e.preventDefault(), press(i))}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), press(i))}
            disabled={phase !== 'you'}
            aria-label={`${s.label} shell`}
            data-quiet
          />
        ))}
      </div>
      {phase === 'ready' && (
        <Overlay title="Jelly Says">
          <small>Watch the shells, then tap them back in order.</small>
          <button type="button" className="jg-go" onClick={start}>
            Start
          </button>
        </Overlay>
      )}
      {phase === 'end' && <EndCard score={Math.max(0, seq.length - 1)} best={best} r={res} again={start} />}
    </div>
  );
}
