'use client';

import { useEffect, useState } from 'react';
import { MOOD_NAMES, radioPause, radioSkip, useRadio } from '@/lib/radio';

/** The little Radio Italia player in the corner: what's on, pause, skip, and it folds away. */
export default function RadioChip() {
  const r = useRadio();
  const [small, setSmall] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('radio-small');
      // folded to a little dial on phones, unless she's opened it before
      setSmall(saved ? saved === '1' : window.innerWidth < 480);
    } catch {}
  }, []);
  const fold = (v: boolean) => {
    setSmall(v);
    try {
      localStorage.setItem('radio-small', v ? '1' : '0');
    } catch {}
  };
  if (!r.on) return null;
  const mood = r.mood ? MOOD_NAMES[r.mood].split(' · ') : ['', ''];
  return (
    <div className={`radio${small ? ' small' : ''}${r.paused ? ' paused' : ''}`} role="region" aria-label="Radio Italia">
      <button type="button" className="radio-dial" onClick={() => fold(!small)} aria-label={small ? 'Show Radio Italia' : 'Fold Radio Italia away'} aria-expanded={!small}>
        <span aria-hidden="true">📻</span>
        <span className="radio-eq" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>
      {!small && (
        <>
          <span className="radio-text">
            <b>Radio Italia</b>
            <small>
              {mood[0]} · {mood[1]}
            </small>
          </span>
          <button type="button" className="radio-btn" onClick={() => radioPause(!r.paused)} aria-label={r.paused ? 'Play' : 'Pause'}>
            {r.paused ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
              </svg>
            )}
          </button>
          <button type="button" className="radio-btn" onClick={radioSkip} aria-label="Next song">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5.5v13l9-6.5zM15 5h3v14h-3z" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
