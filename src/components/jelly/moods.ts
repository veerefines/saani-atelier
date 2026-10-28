'use client';

import { useEffect, useRef } from 'react';
import { MOODS, type JellyMood } from '@/lib/jelly-mood';

/** Little things Jelly says when a mood comes over her (not every time). */
export const MOOD_LINES: Partial<Record<JellyMood, string[]>> = {
  joyful: ['La la la 🎶', 'Today feels like a good day!'],
  excited: ['Wheee! ✨', 'I can’t sit still today!'],
  wink: ['Psst… you’re doing great 😉', 'I saw that! 😉'],
  calm: ['Floating… so peaceful 🌸', 'Mmm, cosy vibes'],
  sad: ['I miss the big blue sea sometimes… 🥺', 'A pat would cheer me up 🥺'],
  grumpy: ['Hmph! Nobody’s patted me in ages 😤', 'Grr… I lost my favourite pearl 😤'],
  confused: ['Wait… what was I doing? ❓', 'Is it Tuesday? Jellyfish don’t do calendars ❓'],
  idea: ['Ooh! I just had an idea 💡', 'What if we planned a little adventure? 💡'],
  sleepy: ['*yawn* 💤', 'Just resting my tentacles…'],
  surprised: ['Whoa, was that a shooting star?!', 'Oh! You’re here!'],
  love: ['I really like it here with you 💗', 'You’re my favourite human 💗'],
  studious: ['Reading up on Milan Fashion Week 📖', 'Studying very important jellyfish things 📖'],
  curious: ['What are you up to? 🫧', 'Ooh, what’s on this page?'],
  shy: ['*hides behind a leaf* 🍃', 'Don’t look, I’m being shy 🍃'],
};

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
