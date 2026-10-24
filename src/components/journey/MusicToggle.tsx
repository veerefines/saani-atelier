'use client';

import { useEffect, useRef, useState } from 'react';
import type { Music } from './types';

/** Floating record in the corner. Off by default; spins while the music plays, fades in and out gently. */
export default function MusicToggle({ music }: { music: Music }) {
  const audio = useRef<HTMLAudioElement>(null);
  const fade = useRef<number>(0);
  const [on, setOn] = useState(false);

  useEffect(() => () => cancelAnimationFrame(fade.current), []);

  // keep the record in step if the phone pauses or resumes the music itself (a call, another app)
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const play = () => setOn(true);
    const pause = () => setOn(false);
    a.addEventListener('play', play);
    a.addEventListener('pause', pause);
    return () => {
      a.removeEventListener('play', play);
      a.removeEventListener('pause', pause);
    };
  }, []);

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
      setOn(false);
      ramp(0, () => a.pause());
    } else {
      a.volume = 0;
      setOn(true);
      a.play().then(() => ramp(0.55)).catch(() => setOn(false));
    }
  }

  if (music.missing) return null;

  return (
    <>
      <button type="button" className={`j-music${on ? ' on' : ''}`} onClick={toggle} aria-pressed={on} aria-label={on ? 'Pause music' : music.label}>
        <img className="j-music-record" src="/journey/record.webp" alt="" width={46} height={46} />
        <span className="j-music-label">
          {on ? 'Now playing' : music.label}
          {on && music.title && <small>{music.title}</small>}
        </span>
      </button>
      <audio ref={audio} src={music.src} loop preload="none" />
    </>
  );
}
