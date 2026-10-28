'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import type { Gain } from '@/lib/jelly';
import { ACHIEVEMENTS, backdropById, itemById, itemSrc } from '@/lib/jelly-catalog';
import { moodSrc } from '@/lib/jelly-mood';
import { achievement, sfx, voice } from '@/lib/sound';
import { CHEERS } from './lines';

const SHOW = 7000; // how long each one stays, unless she's hovering it
const COLORS = ['#f4a6c0', '#cdb4f0', '#f7e3a1', '#bfe6f5', '#ffd1dc', '#ffffff'];

/** A burst of pearls and confetti from where the card lands. */
function burst(big: boolean) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const base = { origin: { x: 0.5, y: 0.12 }, colors: COLORS, ticks: 240, gravity: 0.9, scalar: 0.9, zIndex: 90 };
  confetti({ ...base, particleCount: big ? 90 : 40, spread: big ? 100 : 70, startVelocity: big ? 38 : 28 });
  if (big) {
    confetti({ ...base, particleCount: 30, spread: 120, startVelocity: 24, shapes: ['circle'], scalar: 1.3 });
    setTimeout(() => confetti({ ...base, particleCount: 40, angle: 60, spread: 55, origin: { x: 0.2, y: 0.2 } }), 180);
    setTimeout(() => confetti({ ...base, particleCount: 40, angle: 120, spread: 55, origin: { x: 0.8, y: 0.2 } }), 320);
  }
}

/** Counts up to n, for a satisfying pearl tally. */
function useCount(n: number, key: string) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      setV(Math.round(n * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n, key]);
  return v;
}

/**
 * Jelly's celebrations: a card that drops in at the top of the screen for each achievement or day's
 * pearls, with confetti, the prize, and Jelly herself cheering. One at a time; she can tap through.
 */
export default function Celebration({ queue, onDone, atHome }: { queue: Gain[]; onDone: () => void; atHome: boolean }) {
  const g = queue[0];
  const key = g ? (g.kind === 'daily' ? `daily-${g.pearls}` : g.id) : '';
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const left = useRef(SHOW);
  const pearls = useCount(g?.pearls ?? 0, key);

  useEffect(() => {
    if (!g) return;
    setLeaving(false);
    left.current = SHOW;
    burst(g.kind === 'achievement');
    // its own little tune, then Jelly cheers
    const group = g.kind === 'achievement' ? (ACHIEVEMENTS.find((x) => x.id === g.id)?.group ?? 'Jelly') : 'daily';
    if (g.kind === 'achievement') achievement(group, g.pearls >= 100);
    else sfx('clink');
    const cheer = setTimeout(() => voice(CHEERS[group] ?? CHEERS.Jelly), g.kind === 'achievement' ? 900 : 500);
    // a little buzz on phones that support it
    navigator.vibrate?.(g.kind === 'achievement' ? [30, 40, 60] : 20);
    return () => clearTimeout(cheer);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    setLeaving(true);
    setTimeout(onDone, 260);
  };
  useEffect(() => {
    if (!g || paused || leaving) return;
    const t0 = Date.now();
    const id = setTimeout(close, left.current);
    return () => {
      clearTimeout(id);
      left.current -= Date.now() - t0;
    };
  }, [key, paused, leaving]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!g) return null;
  const a = g.kind === 'achievement' ? ACHIEVEMENTS.find((x) => x.id === g.id) : null;
  const thing = g.kind === 'achievement' && g.reward ? itemById(g.reward) : null;
  const bd = g.kind === 'achievement' && g.backdrop ? backdropById(g.backdrop) : null;

  return (
    <div className={`jc${leaving ? ' out' : ''}${g.kind === 'daily' ? ' daily' : ''}`} role="status" aria-live="polite" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <div className="jc-card" key={key}>
        <span className="jc-shine" aria-hidden="true" />
        <div className="jc-medal" aria-hidden="true">
          <span className="jc-rays" />
          {g.kind === 'daily' ? <img src="/corner/pearl.webp" alt="" width={44} height={44} /> : <b>{g.icon}</b>}
          <i className="jc-spark s1">✦</i>
          <i className="jc-spark s2">✧</i>
          <i className="jc-spark s3">✦</i>
        </div>
        <div className="jc-body">
          <small className="jc-eyebrow">{g.kind === 'daily' ? 'Daily pearls' : 'Achievement unlocked'}</small>
          <b className="jc-title">{g.kind === 'daily' ? `Welcome back!` : g.title}</b>
          <p className="jc-desc">{g.kind === 'daily' ? (g.streak > 1 ? `${g.streak}-day streak 🔥 Come back tomorrow for even more.` : 'Come back tomorrow to start a streak 🔥') : a?.desc}</p>
          <div className="jc-prizes">
            <span className="jc-prize pearls">
              <img src="/corner/pearl.webp" alt="" width={20} height={20} />+{pearls}
            </span>
            {thing && (
              <span className="jc-prize">
                <img src={itemSrc(thing.id)} alt="" width={22} height={22} />
                {thing.name}
              </span>
            )}
            {bd && <span className="jc-prize">🖼️ {bd.name}</span>}
          </div>
        </div>
        <img className="jc-jelly" src={moodSrc(g.kind === 'daily' ? 'excited' : 'joyful')} alt="" width={74} height={74} />
        <button type="button" className="jc-x" onClick={close} aria-label="Close">
          ×
        </button>
        <div className="jc-foot">
          {queue.length > 1 && (
            <span className="jc-more" aria-label={`${queue.length - 1} more`}>
              {queue.slice(0, 5).map((_, i) => (
                <i key={i} className={i === 0 ? 'on' : ''} />
              ))}
            </span>
          )}
          {!atHome && (
            <Link href={g.kind === 'daily' ? '/home/jelly' : '/home/jelly?tab=awards'} className="jc-go" onClick={close}>
              {g.kind === 'daily' ? 'Spend them →' : 'See it →'}
            </Link>
          )}
          {queue.length > 1 && (
            <button type="button" className="jc-next" onClick={close}>
              Next ({queue.length - 1})
            </button>
          )}
        </div>
        <span className="jc-timer" style={{ animationPlayState: paused ? 'paused' : 'running', animationDuration: `${SHOW}ms` }} aria-hidden="true" />
      </div>
    </div>
  );
}
