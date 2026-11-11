'use client';

import { useEffect, useState } from 'react';
import TRACKS from './radio-tracks.json';
import { milanHour } from './jelly-mood';
import { musicOut, onGesture } from './sound';

/**
 * Radio Italia: Saani's own Italian music (public/radio, cut into its tracks and sorted by mood),
 * playing across her whole desk like a little radio station. It keeps going as she moves between
 * pages, picks the mood that suits the hour and the corner (lively mornings, romantic afternoons,
 * soft evenings; softer on her desk), and now and then surprises her with a different one.
 * Two players take turns so each track cross-fades into the next.
 */
export type Mood = 'vivace' | 'romantico' | 'dolce';
type Track = { file: string; dur: number; mood: Mood };
const ALL = TRACKS as Track[];
export const MOOD_NAMES: Record<Mood, string> = { vivace: 'Vivace · bright & lively', romantico: 'Romantico · warm & dreamy', dolce: 'Dolce · soft & gentle' };
export type Place = 'desk' | 'italia' | 'other';

const FADE = 2.5; // seconds of cross-fade between tracks
let place: Place = 'other';
let playing = false; // she wants it on (and it's allowed)
let paused = false; // she pressed pause on the radio
let now: Track | null = null;
const played: string[] = [];

type Deck = { el: HTMLAudioElement; gain: GainNode };
let decks: Deck[] = [];
let live = 0;

function wiring() {
  if (decks.length) return true;
  const io = musicOut();
  if (!io) return false;
  decks = [0, 1].map(() => {
    const el = new Audio();
    el.dataset.radio = '1'; // the sound engine leaves these alone (it controls voice notes and videos)
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    const gain = io.ctx.createGain();
    gain.gain.value = 0;
    io.ctx.createMediaElementSource(el).connect(gain).connect(io.out);
    el.addEventListener('timeupdate', () => {
      if (el !== decks[live].el || !el.duration) return;
      if (el.duration - el.currentTime < FADE) next();
    });
    el.addEventListener('ended', () => el === decks[live].el && next());
    return { el, gain };
  });
  // iPhone only lets a player start by itself once it has played during a tap, so warm up the
  // second one now (silently: its volume is at zero) while we're still inside her first tap
  const spare = decks[0].el; // the first song plays on the other one
  spare.src = `/radio/${ALL[0].file}`;
  spare.play().then(() => spare.pause()).catch(() => {});
  return true;
}

/** The mood for now: by the hour in Milano, softer on her desk, sometimes a surprise. */
function moodNow(): Mood {
  const h = milanHour();
  let m: Mood = h >= 6 && h < 12 ? 'vivace' : h >= 12 && h < 18 ? 'romantico' : 'dolce';
  if (place === 'desk' && m === 'vivace') m = 'romantico';
  if (Math.random() < 0.3) {
    const others = (['vivace', 'romantico', 'dolce'] as Mood[]).filter((x) => x !== m && !(place === 'desk' && x === 'vivace' && h >= 18));
    m = others[Math.floor(Math.random() * others.length)];
  }
  return m;
}
// the last few songs heard, kept on her device, so a reload never starts with one she just heard
const RECENT_KEY = 'radio-recent';
const RECENT_KEEP = 8;
function recent(): string[] {
  try {
    const r = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(r) ? r.filter((f): f is string => typeof f === 'string') : [];
  } catch {
    return [];
  }
}
function remember(file: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([...recent().filter((f) => f !== file), file].slice(-RECENT_KEEP)));
  } catch {}
}

function pick(): Track {
  const mood = moodNow();
  const skip = [...played, ...recent()];
  let pool = ALL.filter((t) => t.mood === mood && !skip.includes(t.file));
  if (!pool.length) pool = ALL.filter((t) => !skip.includes(t.file));
  if (!pool.length) pool = ALL.filter((t) => !played.includes(t.file));
  if (!pool.length) {
    played.length = 0;
    pool = ALL.filter((t) => t.file !== now?.file);
  }
  const t = pool[Math.floor(Math.random() * pool.length)];
  played.push(t.file);
  remember(t.file);
  if (played.length > ALL.length - 3) played.shift();
  return t;
}

function fadeTo(d: Deck, v: number, secs: number) {
  const io = musicOut();
  if (!io) return;
  const g = d.gain.gain;
  g.cancelScheduledValues(io.ctx.currentTime);
  g.setValueAtTime(Math.max(0.0001, g.value), io.ctx.currentTime);
  g.exponentialRampToValueAtTime(Math.max(0.0001, v), io.ctx.currentTime + secs);
}

function next() {
  if (!wiring()) return;
  const old = decks[live];
  live = 1 - live;
  const d = decks[live];
  now = pick();
  d.el.src = `/radio/${now.file}`;
  // start somewhere in the middle now and then, so a long listen never feels the same
  if (Math.random() < 0.25) d.el.currentTime = Math.random() * Math.max(0, now.dur * 0.4);
  d.el.play().catch(() => {});
  fadeTo(d, 1, FADE);
  fadeTo(old, 0.0001, FADE);
  setTimeout(() => old.el !== decks[live].el && old.el.pause(), FADE * 1000 + 200);
  emit();
}

/** Start (or carry on) playing, for this part of her desk. */
export function radioOn(where: Place) {
  place = where;
  if (!wiring()) return;
  playing = true;
  if (paused) return emit();
  const d = decks[live];
  if (!now) return next();
  if (d.el.paused) {
    d.el.play().catch(() => {});
    fadeTo(d, 1, 1.2);
  }
  emit();
}
/** Stop for now (sound off, music style changed, a page without music, page hidden). */
export function radioOff() {
  playing = false;
  for (const d of decks) {
    fadeTo(d, 0.0001, 0.8);
    setTimeout(() => !playing && d.el.pause(), 900);
  }
  emit();
}
/** Her own pause and skip buttons. */
export function radioPause(p: boolean) {
  paused = p;
  if (p) for (const d of decks) (fadeTo(d, 0.0001, 0.5), setTimeout(() => paused && d.el.pause(), 600));
  else if (playing) {
    const d = decks[live];
    d.el.play().catch(() => {});
    fadeTo(d, 1, 1);
  }
  emit();
}
export const radioSkip = () => playing && (paused ? (paused = false, next()) : next());

/* ---------- what's on, for the little player and the settings ---------- */
export type RadioState = { on: boolean; paused: boolean; mood: Mood | null; track: number | null; of: number };
const state = (): RadioState => ({ on: playing, paused, mood: now?.mood ?? null, track: now ? ALL.indexOf(now) + 1 : null, of: ALL.length });
function emit() {
  window.dispatchEvent(new CustomEvent('jelly:radio', { detail: state() }));
}
export function useRadio(): RadioState {
  const [s, setS] = useState<RadioState>({ on: false, paused: false, mood: null, track: null, of: ALL.length });
  useEffect(() => {
    setS(state());
    const h = (e: Event) => setS((e as CustomEvent<RadioState>).detail);
    window.addEventListener('jelly:radio', h);
    return () => window.removeEventListener('jelly:radio', h);
  }, []);
  return s;
}

// if the browser blocked a song (it started before any tap), her next tap starts it
if (typeof window !== 'undefined')
  onGesture(() => {
    if (!playing || paused || !decks.length) return;
    const d = decks[live];
    if (d.el.paused && d.el.src) {
      d.el.play().catch(() => {});
      fadeTo(d, 1, 1);
    }
  });
