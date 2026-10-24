'use client';

import { useEffect, useRef, useState } from 'react';
import type { Music } from './types';

/**
 * Floating record in the corner. The music starts on its own when the journey opens (or, where the
 * browser insists on a tap first, on her first tap anywhere); tapping the record pauses or resumes it.
 */
export default function MusicToggle({ music }: { music: Music }) {
  const audio = useRef<HTMLAudioElement>(null);
  const fade = useRef<number>(0);
  const [on, setOn] = useState(false);
  /** she has tapped the record herself: from then on it's her call, no more auto-start */
  const chose = useRef(false);
  const disarm = useRef<() => void>(() => {});

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

  // play as the journey opens; if the browser blocks sound until a tap, start on the first tap
  useEffect(() => {
    const a = audio.current;
    if (!a || music.missing) return;
    const start = () => {
      if (chose.current || !a.paused) return Promise.resolve();
      a.volume = 0;
      return a.play().then(() => ramp(0.55));
    };
    const onGesture = (e: Event) => {
      // a tap on the record is handled by the record itself
      if ((e.target as Element | null)?.closest?.('.j-music')) return;
      disarm.current();
      start().catch(() => {});
    };
    const events = ['pointerdown', 'touchend', 'keydown'] as const;
    disarm.current = () => events.forEach((t) => window.removeEventListener(t, onGesture, true));
    start().catch(() => events.forEach((t) => window.addEventListener(t, onGesture, true)));
    return () => disarm.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.missing]);

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
    chose.current = true;
    disarm.current();
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
      <audio ref={audio} src={music.src} loop preload="auto" />
    </>
  );
}
