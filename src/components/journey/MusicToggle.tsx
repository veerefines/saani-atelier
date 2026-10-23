'use client';

import { useEffect, useRef, useState } from 'react';
import type { Music } from './types';

/** Floating music-box button. Off by default; fades in and out gently. */
export default function MusicToggle({ music }: { music: Music }) {
  const audio = useRef<HTMLAudioElement>(null);
  const fade = useRef<number>(0);
  const [on, setOn] = useState(false);

  useEffect(() => () => cancelAnimationFrame(fade.current), []);

  function ramp(to: number, done?: () => void) {
    const a = audio.current;
    if (!a) return;
    cancelAnimationFrame(fade.current);
    const step = () => {
      const v = a.volume + (to - a.volume) * 0.08;
      a.volume = Math.abs(v - to) < 0.01 ? to : v;
      if (a.volume !== to) fade.current = requestAnimationFrame(step);
      else done?.();
    };
    fade.current = requestAnimationFrame(step);
  }

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (on) {
      ramp(0, () => a.pause());
      setOn(false);
    } else {
      a.volume = 0;
      a.play().then(() => ramp(0.55)).catch(() => {});
      setOn(true);
    }
  }

  if (music.missing) return null;

  return (
    <>
      <button type="button" className={`j-music${on ? ' on' : ''}`} onClick={toggle} aria-pressed={on} aria-label={on ? 'Pause music' : music.label}>
        <span className="j-music-disc" aria-hidden="true" />
        <span className="j-music-label">{on ? 'Playing' : music.label}</span>
      </button>
      <audio ref={audio} src={music.src} loop preload="none" />
    </>
  );
}
