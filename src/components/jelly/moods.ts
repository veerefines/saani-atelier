'use client';

import { useEffect, useRef } from 'react';
import { MOODS, type JellyMood } from '@/lib/jelly-mood';
import { MOOD_LINES } from './lines';

export { MOOD_LINES };

const ALL = Object.keys(MOODS) as JellyMood[];
const shuffle = <T,>(l: T[]) => {
  const a = [...l];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Jelly drifts through every one of her moods while she's left alone: a shuffled deck, so each mood
 * comes round before any repeats. Each lasts a few seconds, then she's back to her mood for the time
 * of day. Paused while something else is going on (she's reacting, thinking, or being talked to).
 */
export function useMoodCycle(feel: (m: JellyMood, ms: number, text?: string) => void, busy: boolean) {
  const deck = useRef<JellyMood[]>([]);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    let id = 0;
    const next = () => {
      id = window.setTimeout(
        () => {
          if (!document.hidden && !busyRef.current) {
            if (!deck.current.length) deck.current = shuffle(ALL);
            const m = deck.current.shift()!;
            const lines = MOOD_LINES[m];
            const talk = lines && Math.random() < 0.4;
            feel(m, 7000, talk ? lines[Math.floor(Math.random() * lines.length)] : undefined);
          }
          next();
        },
        14_000 + Math.random() * 14_000,
      );
    };
    next();
    return () => clearTimeout(id);
  }, [feel]);
}
