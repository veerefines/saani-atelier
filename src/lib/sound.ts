'use client';

import { useEffect, useState } from 'react';
import { cleanPrefs, DEFAULT_PREFS, type AudioPrefs } from './audio-prefs';
import manifest from '@/components/jelly/voice-manifest.json';
import { lineKey, speechText } from '@/components/jelly/lines';

/**
 * Every sound on Saani's desk, and Jelly's voice. Sounds are made right here with the Web Audio API
 * (no files to load or license); Jelly's everyday lines are recordings (public/corner/voice), and her
 * chat answers are spoken on request. One switch turns all of it off, on every device.
 *
 * Browsers only allow sound after a tap, so nothing plays until Saani's first one; anything due
 * before that is quietly skipped.
 */

const VOICES = manifest as Record<string, string>;
const STORE = 'jelly-audio';
const EVENT = 'jelly:audio';

let ctx: AudioContext | null = null;
let master: GainNode | null = null; // sound effects
let voiceGain: GainNode | null = null; // Jelly
let musicGain: GainNode | null = null; // background music
let unlocked = false;
let ducked = false;
let prefs: AudioPrefs = { ...DEFAULT_PREFS };
try {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORE);
    prefs = saved ? cleanPrefs(JSON.parse(saved)) : { ...DEFAULT_PREFS, on: localStorage.getItem('jelly-sound') !== 'off' };
  }
} catch {}
const unlockers: (() => void)[] = [];

function setup() {
  if (ctx || typeof window === 'undefined') return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  voiceGain = ctx.createGain();
  musicGain = ctx.createGain();
  master.connect(ctx.destination);
  voiceGain.connect(ctx.destination);
  musicGain.connect(ctx.destination);
  levels(true);
  return ctx;
}
/** Set every channel to its volume (lower while Jelly talks, silent when sound is off). */
function levels(now = false) {
  if (!ctx || !master || !voiceGain || !musicGain) return;
  const on = prefs.on ? 1 : 0;
  const at = (g: GainNode, v: number) => (now ? (g.gain.value = v) : g.gain.setTargetAtTime(v, ctx!.currentTime, 0.08));
  at(master, on * prefs.sfx * 0.7 * (ducked ? 0.4 : 1));
  at(voiceGain, on * prefs.voice);
  at(musicGain, on * prefs.music * 0.55 * (ducked ? 0.35 : 1) * (mediaPlaying ? 0 : 1));
}

if (typeof window !== 'undefined') {
  // on iPhone, respect the silent switch (Safari 17+)
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'ambient';
  } catch {}
  const unlock = () => {
    const c = setup();
    if (c && c.state === 'suspended') c.resume();
    if (!unlocked) {
      unlocked = true;
      unlockers.splice(0).forEach((f) => f());
    }
  };
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true });
}

const ready = () => prefs.on && unlocked && setup() !== null && ctx!.state !== 'closed';

/** For the music: the shared audio context and the music channel, once sound is allowed. */
export function musicOut(): { ctx: AudioContext; out: GainNode } | null {
  return unlocked && setup() ? { ctx: ctx!, out: musicGain! } : null;
}
/** Run once the browser allows sound (after her first tap), or now if it already does. */
export function whenUnlocked(f: () => void) {
  if (unlocked) f();
  else unlockers.push(f);
}

/* ---------- settings ---------- */
export const audioPrefs = () => prefs;
export const soundOn = () => prefs.on;
let saveAt = 0;
export function setPrefs(patch: Partial<AudioPrefs>, fromServer = false) {
  const next = cleanPrefs({ ...prefs, ...patch });
  if (JSON.stringify(next) === JSON.stringify(prefs)) return;
  prefs = next;
  try {
    localStorage.setItem(STORE, JSON.stringify(prefs));
  } catch {}
  if (!prefs.on || prefs.voice === 0) stopVoice();
  levels();
  applyMedia();
  window.dispatchEvent(new CustomEvent(EVENT, { detail: prefs }));
  if (!fromServer) {
    clearTimeout(saveAt);
    saveAt = window.setTimeout(() => {
      fetch('/api/jelly/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: prefs }) }).catch(() => {});
    }, 500);
  }
}
export const setSound = (on: boolean, fromServer = false) => setPrefs({ on }, fromServer);
/** [settings, change them], kept in step everywhere on the page. */
export function usePrefs(): [AudioPrefs, (p: Partial<AudioPrefs>) => void] {
  const [v, setV] = useState<AudioPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    setV(prefs);
    const h = (e: Event) => setV((e as CustomEvent<AudioPrefs>).detail);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return [v, setPrefs];
}
/** [is sound on, turn it on or off]. */
export function useSound(): [boolean, (v: boolean) => void] {
  const [p, set] = usePrefs();
  return [p.on, (on) => set({ on })];
}

/* ---------- buzzes ---------- */
export type Buzz = 'light' | 'medium' | 'heavy' | 'success';
const PATTERNS: Record<Buzz, number | number[]> = { light: 8, medium: 18, heavy: 35, success: [14, 50, 22, 50, 40] };
let tick: HTMLLabelElement | null = null;
/**
 * A little buzz. Android buzzes with the vibration API; iPhone Safari has none, but since iOS 18 it
 * gives a haptic tick when a "switch" checkbox is toggled, so we toggle a hidden one.
 */
export function haptic(kind: Buzz = 'light') {
  if (!prefs.on || !prefs.haptics || typeof window === 'undefined') return;
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(PATTERNS[kind]);
    return;
  }
  if (!tick) {
    const id = 'jelly-haptic';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.setAttribute('switch', '');
    tick = document.createElement('label');
    tick.htmlFor = id;
    for (const el of [input, tick]) {
      el.setAttribute('aria-hidden', 'true');
      el.tabIndex = -1;
      Object.assign(el.style, { position: 'fixed', left: '-100px', top: '0', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
      document.body.appendChild(el);
    }
  }
  const n = kind === 'success' ? 3 : kind === 'heavy' ? 2 : 1;
  for (let i = 0; i < n; i++) setTimeout(() => tick?.click(), i * 90);
}

/* ---------- voice notes and videos from her people ---------- */
let mediaPlaying = 0;
function applyMedia() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('audio, video').forEach((el) => {
    const m = el as HTMLMediaElement;
    if (m.dataset.radio || (m.muted && m.autoplay)) return; // the radio has its own volume; silent previews stay silent
    m.volume = prefs.on ? prefs.notes : 0;
  });
}
if (typeof window !== 'undefined') {
  // every voice note and video follows her volume, and the music hushes while one plays
  document.addEventListener(
    'play',
    (e) => {
      const m = e.target as HTMLMediaElement;
      if (!(m instanceof HTMLMediaElement) || m.dataset.radio || (m.muted && m.autoplay)) return;
      m.volume = prefs.on ? prefs.notes : 0;
      mediaPlaying++;
      levels();
      const done = () => {
        mediaPlaying = Math.max(0, mediaPlaying - 1);
        levels();
        m.removeEventListener('pause', done);
        m.removeEventListener('ended', done);
      };
      m.addEventListener('pause', done);
      m.addEventListener('ended', done);
    },
    true,
  );
  // a soft tap and a tiny buzz for buttons and links everywhere (things with their own sounds opt out)
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest?.('button, a[href], [role="button"], [role="tab"], [role="switch"], summary, input[type="checkbox"], input[type="radio"], select');
      if (!el || el.closest('[data-quiet]') || (el as HTMLButtonElement).disabled) return;
      sfx('tap');
      haptic('light');
    },
    true,
  );
}

/* ---------- little synth helpers ---------- */
type Wave = OscillatorType;
function tone(freq: number, at: number, dur: number, { type = 'sine' as Wave, gain = 0.3, to = 0, attack = 0.005 } = {}) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.05);
}
/** A bell: a few inharmonic partials that ring out. */
function bell(freq: number, at: number, dur = 1.2, gain = 0.22) {
  [1, 2.76, 5.4].forEach((r, i) => tone(freq * r, at, dur / (i + 1), { gain: gain / (i + 1.5) }));
}
function noise(at: number, dur: number, { from = 400, to = 2000, gain = 0.2, q = 1.2 } = {}) {
  const c = ctx!;
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, at);
  f.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(at);
}
const N = (semi: number) => 523.25 * Math.pow(2, semi / 12); // semitones from C5

/* ---------- the sounds ---------- */
export type Sfx = 'tap' | 'page' | 'rattle' | 'paper' | 'nope' | 'chime' | 'pop' | 'blip' | 'whoosh' | 'message' | 'send' | 'sparkle' | 'thunk' | 'clink' | 'harp' | 'stamp' | 'tick' | 'stitch' | 'line' | 'full';
let lastPop = 0;
const BUZZ: Partial<Record<Sfx, Buzz>> = { rattle: 'heavy', paper: 'medium', nope: 'medium', chime: 'light', pop: 'light', send: 'light', message: 'light', sparkle: 'medium', thunk: 'medium', stamp: 'heavy', tick: 'medium', stitch: 'medium', clink: 'success', harp: 'success', line: 'success', full: 'success' };
export function sfx(name: Sfx) {
  if (BUZZ[name]) haptic(BUZZ[name]);
  if (!ready()) return;
  const t = ctx!.currentTime + 0.01;
  switch (name) {
    case 'pop': {
      if (t - lastPop < 0.09) return; // a rub makes lots of pats; keep it gentle
      lastPop = t;
      tone(520 + Math.random() * 120, t, 0.1, { to: 1100, gain: 0.22 });
      break;
    }
    case 'tap':
      if (t - lastPop < 0.05) return;
      lastPop = t;
      tone(1400 + Math.random() * 200, t, 0.035, { gain: 0.05, to: 1900 });
      break;
    case 'page':
      noise(t, 0.28, { from: 2200, to: 500, gain: 0.05, q: 0.8 });
      tone(N(19), t + 0.05, 0.25, { gain: 0.035 });
      break;
    case 'rattle':
      // folded notes shaken in a glass jar
      for (let i = 0; i < 9; i++) {
        const d = i * 0.07 + Math.random() * 0.03;
        noise(t + d, 0.05, { from: 3200 + Math.random() * 1500, to: 2400, gain: 0.07, q: 3 });
        if (i % 3 === 0) bell(N(31 + (i % 2) * 5), t + d, 0.25, 0.03);
      }
      break;
    case 'paper':
      // an envelope opening and a letter unfolding
      noise(t, 0.18, { from: 4000, to: 1500, gain: 0.07, q: 0.6 });
      noise(t + 0.2, 0.3, { from: 2500, to: 900, gain: 0.06, q: 0.6 });
      [12, 16, 19].forEach((s2, i) => tone(N(s2), t + 0.35 + i * 0.08, 0.6, { gain: 0.06 }));
      break;
    case 'nope':
      tone(260, t, 0.12, { to: 200, gain: 0.12, type: 'triangle' });
      tone(220, t + 0.1, 0.14, { to: 170, gain: 0.1, type: 'triangle' });
      break;
    case 'chime':
      [19, 24, 28].forEach((s2, i) => bell(N(s2), t + i * 0.07, 0.8, 0.09));
      break;
    case 'blip':
      tone(880, t, 0.07, { to: 1400, gain: 0.12 });
      tone(1250, t + 0.07, 0.08, { to: 1800, gain: 0.1 });
      break;
    case 'whoosh':
      noise(t, 0.35, { from: 300, to: 2400, gain: 0.12 });
      break;
    case 'send':
      tone(N(7), t, 0.08, { type: 'triangle', gain: 0.12 });
      break;
    case 'message':
      tone(N(16), t, 0.18, { type: 'triangle', gain: 0.14 });
      tone(N(21), t + 0.1, 0.26, { type: 'triangle', gain: 0.12 });
      break;
    case 'sparkle':
      [24, 28, 31, 36, 40].forEach((s, i) => tone(N(s), t + i * 0.05, 0.3, { gain: 0.08 }));
      break;
    case 'thunk':
      tone(190, t, 0.14, { to: 90, gain: 0.3 });
      noise(t, 0.05, { from: 900, to: 400, gain: 0.08 });
      break;
    case 'clink':
      [0, 0.12, 0.26].forEach((d, i) => bell(N(24 + i * 4), t + d, 0.6, 0.14));
      break;
    case 'harp':
      [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(N(s), t + i * 0.06, 0.9, { type: 'triangle', gain: 0.09 }));
      break;
    case 'stamp':
      tone(130, t, 0.18, { to: 70, gain: 0.35 });
      noise(t, 0.09, { from: 1200, to: 300, gain: 0.16 });
      break;
    case 'tick':
      tone(N(19), t, 0.12, { type: 'triangle', gain: 0.14 });
      tone(N(24), t + 0.06, 0.16, { type: 'triangle', gain: 0.1 });
      break;
    case 'stitch':
      [0, 0.08, 0.16].forEach((d) => noise(t + d, 0.05, { from: 2500, to: 1500, gain: 0.08, q: 4 }));
      tone(N(12), t + 0.26, 0.3, { type: 'triangle', gain: 0.12 });
      break;
    case 'line':
      [0, 4, 7, 12].forEach((s, i) => tone(N(s), t + i * 0.09, 0.4, { type: 'triangle', gain: 0.14 }));
      break;
    case 'full':
      [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((s, i) => tone(N(s), t + i * 0.1, 0.5, { type: 'triangle', gain: 0.14 }));
      bell(N(24), t + 0.95, 1.6, 0.2);
      break;
  }
}

/** Each kind of achievement has its own little tune; big ones end with a flourish. */
const TUNES: Record<string, (t: number) => void> = {
  Jelly: (t) => [0, 4, 7, 12].forEach((s, i) => tone(N(s), t + i * 0.09, 0.25, { gain: 0.2 })), // bubbly marimba
  Milano: (t) => [0, 0.22].forEach((d) => bell(N(7), t + d, 1)), // tram-bell ding-ding
  'Settling in': (t) => [21, 26, 24, 28].forEach((s, i) => tone(N(s), t + i * 0.07, 0.25, { type: 'triangle', gain: 0.1 })), // keys jingling
  Bingo: (t) => [0, 4, 7, 12, 7, 12].forEach((s, i) => tone(N(s), t + i * 0.1, 0.32, { type: 'triangle', gain: 0.16 })), // party fanfare
  'Your story': (t) => [16, 19, 23, 28].forEach((s, i) => tone(N(s), t + i * 0.16, 0.8, { gain: 0.12 })), // music box
  'Your people': (t) => [5, 9, 12, 17].forEach((s, i) => tone(N(s - 12), t + i * 0.12, 1, { gain: 0.16, attack: 0.03 })), // warm heart chime
  'My Corner': (t) => {
    [0, 0.06, 0.12, 0.18].forEach((d) => noise(t + d, 0.04, { from: 3000, to: 1800, gain: 0.07, q: 5 })); // sewing ticks
    [24, 28, 31].forEach((s, i) => tone(N(s), t + 0.28 + i * 0.06, 0.35, { gain: 0.08 }));
  },
};
export function achievement(group: string, big = false) {
  haptic('success');
  if (!ready()) return;
  const t = ctx!.currentTime + 0.02;
  (TUNES[group] ?? TUNES.Jelly)(t);
  if (big) [24, 28, 31, 36].forEach((s, i) => tone(N(s), t + 0.7 + i * 0.07, 0.6, { gain: 0.07 }));
}

/* ---------- Jelly's voice ---------- */
let current: AudioBufferSourceNode | null = null;
let token = 0;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function load(url: string) {
  if (!buffers.has(url))
    buffers.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then((b) => ctx!.decodeAudioData(b))
        .catch(() => null),
    );
  return buffers.get(url)!;
}
/** While Jelly talks, the sound effects and music step back. */
function duck(yes: boolean) {
  ducked = yes;
  levels();
}
export function stopVoice() {
  token++;
  try {
    current?.stop();
  } catch {}
  current = null;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  duck(false);
}
function playBuffer(b: AudioBuffer, onEnd?: () => void) {
  const src = ctx!.createBufferSource();
  src.buffer = b;
  src.connect(voiceGain!);
  current = src;
  duck(true);
  src.onended = () => {
    if (current === src) current = null;
    duck(false);
    onEnd?.();
  };
  src.start();
}

/** Is there a recording of this line? */
export const hasVoice = (text: string) => Boolean(VOICES[lineKey(text)]);

/** Jelly says one of her everyday lines (if it's recorded). Returns whether she spoke. */
export function voice(text: string): boolean {
  const file = VOICES[lineKey(text)];
  if (!file || !ready() || prefs.voice === 0) return false;
  stopVoice();
  const my = token;
  load(`/corner/voice/${file}`).then((b) => b && my === token && prefs.on && prefs.voice > 0 && playBuffer(b));
  return true;
}

/* her backup voice, when the free one is used up for the day: the device's gentlest female voice */
function backupVoice() {
  const all = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : [];
  const en = all.filter((v) => v.lang.startsWith('en'));
  const prefer = ['Samantha', 'Ava', 'Allison', 'Serena', 'Karen', 'Moira', 'Tessa', 'Google UK English Female', 'Microsoft Aria', 'Microsoft Jenny', 'Zira'];
  return prefer.map((n) => en.find((v) => v.name.includes(n))).find(Boolean) ?? en.find((v) => /female/i.test(v.name)) ?? en[0];
}
function sayBackup(text: string, done: () => void) {
  if (typeof speechSynthesis === 'undefined') return done();
  const u = new SpeechSynthesisUtterance(text);
  const v = backupVoice();
  if (v) u.voice = v;
  u.rate = 0.98;
  u.pitch = 1.08; // a touch brighter, never squeaky
  u.volume = prefs.voice;
  u.onend = done;
  u.onerror = done;
  duck(true);
  speechSynthesis.speak(u);
}

export type Speaking = 'loading' | 'playing' | 'backup' | 'idle';
/**
 * Jelly reads a chat answer, a piece at a time (the next piece loads while one plays).
 * `onState` follows along so the ▶ button can show what's happening.
 */
export async function speakAnswer(chatId: string, turnId: string, text: string, onState: (s: Speaking) => void) {
  setup();
  if (!prefs.on || prefs.voice === 0) return;
  stopVoice();
  const my = token;
  const done = () => my === token && (duck(false), onState('idle'));
  onState('loading');
  type Part = { url?: string; parts?: number; fallback?: boolean };
  const get = (part: number) =>
    fetch(`/api/jelly/speak?chat=${encodeURIComponent(chatId)}&turn=${encodeURIComponent(turnId)}&part=${part}`)
      .then((r) => r.json() as Promise<Part>)
      .catch(() => ({ fallback: true }) as Part);
  let next = get(0);
  for (let i = 0; ; i++) {
    const p = await next;
    if (my !== token) return;
    if (p.fallback || !p.url) {
      onState('backup');
      return sayBackup(speechText(text), done);
    }
    if (p.parts && i + 1 < p.parts) next = get(i + 1);
    const b = await load(p.url);
    if (my !== token) return;
    if (!b) {
      onState('backup');
      return sayBackup(speechText(text), done);
    }
    onState('playing');
    await new Promise<void>((res) => playBuffer(b, res));
    if (my !== token) return;
    if (!p.parts || i + 1 >= p.parts) return done();
  }
}
