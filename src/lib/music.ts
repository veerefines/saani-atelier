'use client';

import { audioPrefs, musicOut, whenUnlocked } from './sound';
import { radioOff, radioOn } from './radio';

/**
 * Background music for each corner of her desk, played live in the browser (no tracks to download
 * or license). Each theme is a little looping piece: an Italian café waltz with mandolin and
 * accordion for Milano, a music box for her letters, lo-fi keys for the studio, a lounge groove for
 * the lookbook, a marimba under the sea for Jelly's home. Themes cross-fade as she moves around.
 */

export type ThemeId = 'desk' | 'italia' | 'love' | 'studio' | 'runway' | 'play' | 'ocean';
export const THEME_NAMES: Record<ThemeId, string> = {
  desk: 'Mattina in atelier · soft harp',
  italia: 'Caffè in Brera · mandolin & accordion',
  love: 'Lettere d’amore · music box',
  studio: 'Studio lo-fi · keys & vinyl',
  runway: 'Passerella · runway lounge',
  play: 'Giochi in piazza · marimba',
  ocean: 'Sotto il mare · Jelly’s lullaby',
};

/** Which tune plays where (null: no music, e.g. where songs play or a book is printed). */
export function themeFor(path: string): ThemeId | null {
  if (/^\/home\/(songs|book)/.test(path)) return null;
  if (/^\/home\/(milano|passport)/.test(path)) return 'italia';
  if (/^\/home\/(letters|love|jar|scrapbook)/.test(path)) return 'love';
  if (/^\/home\/(corner|chapter|checklist)/.test(path)) return 'studio';
  if (/^\/home\/(lookbook|moments)/.test(path)) return 'runway';
  if (/^\/home\/bingo/.test(path)) return 'play';
  if (/^\/home\/jelly/.test(path)) return 'ocean';
  if (/^\/home\/?$/.test(path)) return 'desk';
  return 'desk';
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/* ---------- instruments ---------- */
type Kit = ReturnType<typeof instruments>;
function instruments(c: AudioContext, out: AudioNode) {
  const noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const env = (g: GainNode, t: number, peak: number, attack: number, decay: number) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  const osc = (type: OscillatorType, f: number, t: number, stop: number, dest: AudioNode, detune = 0) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(stop);
    return o;
  };
  const gain = (dest: AudioNode = out) => {
    const g = c.createGain();
    g.connect(dest);
    return g;
  };
  const noise = (t: number, dur: number, type: BiquadFilterType, freq: number, peak: number, q = 0.8, dest: AudioNode = out) => {
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = gain(dest);
    env(g, t, peak, 0.002, dur);
    s.connect(f).connect(g);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  };

  // plucked string (Karplus-Strong), one buffer per pitch and brightness, made once
  const plucks = new Map<string, AudioBuffer>();
  const pluckBuf = (midi: number, bright: number, decay: number) => {
    const key = `${midi}:${bright}:${decay}`;
    let b = plucks.get(key);
    if (b) return b;
    const sr = c.sampleRate;
    const n = Math.max(2, Math.round(sr / hz(midi)));
    const line = new Float32Array(n);
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = last * (1 - bright) + (Math.random() * 2 - 1) * bright;
      line[i] = last;
    }
    const len = Math.floor(sr * 1.8);
    b = c.createBuffer(1, len, sr);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const j = i % n;
      d[i] = line[j];
      line[j] = decay * 0.5 * (line[j] + line[(j + 1) % n]);
    }
    plucks.set(key, b);
    return b;
  };

  return {
    /** a plucked string: mandolin, harp, guitar, depending on brightness */
    pluck(midi: number, t: number, vol: number, { bright = 0.7, decay = 0.996, detune = 0 } = {}) {
      const s = c.createBufferSource();
      s.buffer = pluckBuf(midi, bright, decay);
      s.detune.value = detune;
      const g = gain();
      g.gain.value = vol;
      s.connect(g);
      s.start(t);
    },
    /** accordion: two reeds a hair apart, a gentle wobble, a soft attack */
    accordion(midis: number[], t: number, dur: number, vol: number) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2400;
      const g = gain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
      g.gain.setValueAtTime(vol, t + Math.max(0.05, dur - 0.08));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
      f.connect(g);
      const lfo = c.createOscillator();
      lfo.frequency.value = 5.2;
      const depth = c.createGain();
      depth.gain.value = 7;
      lfo.connect(depth);
      lfo.start(t);
      lfo.stop(t + dur + 0.2);
      for (const m of midis)
        for (const d of [-6, 6]) {
          const o = osc('sawtooth', hz(m), t, t + dur + 0.2, f, d);
          depth.connect(o.detune);
        }
    },
    /** electric piano (FM): a soft bell on top of a warm tone */
    rhodes(midi: number, t: number, dur: number, vol: number) {
      const g = gain();
      env(g, t, vol, 0.006, dur + 0.6);
      const mod = c.createGain();
      mod.gain.setValueAtTime(hz(midi) * 2.2, t);
      mod.gain.exponentialRampToValueAtTime(hz(midi) * 0.2, t + 0.7);
      const car = osc('sine', hz(midi), t, t + dur + 0.8, g);
      const m = osc('sine', hz(midi), t, t + dur + 0.8, mod);
      void m;
      mod.connect(car.frequency);
    },
    musicbox(midi: number, t: number, vol: number) {
      for (const [r, v, d] of [
        [1, 1, 1.4],
        [3, 0.22, 0.6],
        [5.4, 0.08, 0.3],
      ] as const) {
        const g = gain();
        env(g, t, vol * v, 0.002, d);
        osc('sine', hz(midi) * r, t, t + d + 0.1, g);
      }
    },
    marimba(midi: number, t: number, vol: number) {
      for (const [r, v, d] of [
        [1, 1, 0.55],
        [4, 0.3, 0.1],
      ] as const) {
        const g = gain();
        env(g, t, vol * v, 0.003, d);
        osc('sine', hz(midi) * r, t, t + d + 0.1, g);
      }
    },
    pad(midis: number[], t: number, dur: number, vol: number) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      const g = gain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.9, dur / 2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.9);
      f.connect(g);
      for (const m of midis) {
        osc('triangle', hz(m), t, t + dur + 1, f, -4);
        osc('sine', hz(m + 12), t, t + dur + 1, f, 5);
      }
    },
    bass(midi: number, t: number, dur: number, vol: number) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 520;
      const g = gain();
      env(g, t, vol, 0.01, dur);
      f.connect(g);
      osc('triangle', hz(midi), t, t + dur + 0.1, f);
    },
    kick(t: number, vol: number) {
      const g = gain();
      env(g, t, vol, 0.002, 0.28);
      const o = osc('sine', 120, t, t + 0.35, g);
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.16);
    },
    brush: (t: number, vol: number) => noise(t, 0.16, 'bandpass', 1900, vol, 0.7),
    hat: (t: number, vol: number) => noise(t, 0.04, 'highpass', 7500, vol, 0.7),
    clap(t: number, vol: number) {
      [0, 0.012, 0.024].forEach((d) => noise(t + d, 0.09, 'bandpass', 1300, vol, 1.2));
    },
    bubble(t: number, vol: number) {
      const g = gain();
      env(g, t, vol, 0.005, 0.12);
      const o = osc('sine', 320, t, t + 0.2, g);
      o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 500, t + 0.12);
    },
    /** vinyl crackle, for the lo-fi studio */
    crackle(t: number, dur: number, vol: number) {
      for (let i = 0; i < dur * 9; i++) if (Math.random() < 0.6) noise(t + Math.random() * dur, 0.006, 'highpass', 3000, vol * (0.3 + Math.random()), 0.5);
      noise(t, dur, 'bandpass', 4200, vol * 0.08, 0.3);
    },
  };
}

/* ---------- the pieces ---------- */
type Step = { t: number; bar: number; step: number; beat: number; sub: number; chord: number[]; spb: number; k: Kit };
type Theme = { bpm: number; beats: number; bars: number[][]; level: number; play: (s: Step) => void; swing?: number };

// a few chords (MIDI notes, around middle C)
const F = [53, 57, 60], Dm = [50, 53, 57], Gm = [55, 58, 62], C7 = [48, 52, 55, 58], Bb = [58, 62, 65];
const C = [60, 64, 67], G = [55, 59, 62], Am = [57, 60, 64], Fl = [53, 57, 60];
const Cmaj7 = [60, 64, 67, 71], Am7 = [57, 60, 64, 67], Fmaj7 = [53, 57, 60, 64], G6 = [55, 59, 62, 64];
const Em7 = [52, 55, 59, 62], Dm7 = [50, 53, 57, 60], G7 = [55, 59, 62, 65];
const Cadd9 = [60, 62, 64, 67], Gsus = [55, 60, 62, 67];
const lowest = (ch: number[]) => Math.min(...ch);

// Caffè in Brera: an Italian waltz, mandolin melody (tremolo) over an accordion oom-pah-pah
const ITALIA_MELODY = [
  [69, 72, 77], [76, 77, 81], [79, 77, 74], [77, 76, 74], [70, 74, 79], [76, 79, 82], [81, 79, 77], [76, 72, 0],
  [74, 77, 82], [81, 77, 74], [72, 77, 81], [79, 77, 72], [70, 74, 79], [82, 79, 76], [77, 81, 84], [77, 0, 0],
];
const LOVE_MELODY = [[76, 79, 84], [83, 79, 74], [84, 81, 76], [77, 81, 84], [79, 76, 72], [74, 79, 83], [81, 77, 72], [72, 0, 0]];

const THEMES: Record<ThemeId, Theme> = {
  italia: {
    bpm: 132,
    beats: 3,
    level: 1,
    bars: [F, F, Dm, Dm, Gm, C7, F, C7, Bb, Bb, F, F, Gm, C7, F, F],
    play: ({ t, bar, beat, sub, chord, spb, k }) => {
      const note = ITALIA_MELODY[bar % ITALIA_MELODY.length][beat];
      if (note) {
        // mandolin: a double string, picked quickly (tremolo), softer as the beat goes on
        k.pluck(note, t, 0.13 - sub * 0.015, { bright: 0.85, decay: 0.993 });
        k.pluck(note, t + 0.006, 0.08 - sub * 0.01, { bright: 0.8, decay: 0.993, detune: 4 });
      }
      if (sub !== 0) return;
      if (beat === 0) k.pluck(lowest(chord) - 12, t, 0.32, { bright: 0.4, decay: 0.997 });
      else k.accordion(chord, t, spb * 0.55, 0.035);
      if (beat === 0 && bar % 2 === 0) k.accordion(chord.map((n) => n + 12), t, spb * 5.6, 0.012);
    },
  },
  love: {
    bpm: 84,
    beats: 3,
    level: 1,
    bars: [C, G, Am, Fl, C, G, Fl, C],
    play: ({ t, bar, beat, sub, chord, spb, k }) => {
      if (sub === 0) {
        const note = LOVE_MELODY[bar % LOVE_MELODY.length][beat];
        if (note) k.musicbox(note, t, 0.16);
        k.musicbox(chord[beat % chord.length] - (beat === 0 ? 12 : 0), t, 0.07);
        if (beat === 0) k.pad(chord, t, spb * 3, 0.025);
      } else if (sub === 2 && Math.random() < 0.3) k.musicbox(chord[(beat + 1) % chord.length] + 12, t, 0.045);
    },
  },
  desk: {
    bpm: 76,
    beats: 4,
    level: 1,
    bars: [Cmaj7, Am7, Fmaj7, G6],
    play: ({ t, bar, beat, sub, chord, spb, k }) => {
      if (sub % 2 === 1) return;
      const i = beat * 2 + sub / 2; // eighth-note index in the bar
      const order = [0, 1, 2, 3, 2, 1, 2, 3];
      k.pluck(chord[order[i]] + (i >= 4 && i % 2 ? 12 : 0), t, 0.1, { bright: 0.55, decay: 0.997 });
      if (i === 0) {
        k.pluck(lowest(chord) - 12, t, 0.2, { bright: 0.35, decay: 0.998 });
        k.pad(chord, t, spb * 4, 0.022);
        if (bar % 2 === 1) k.musicbox(chord[3] + 12, t + spb * 2, 0.05);
      }
    },
  },
  studio: {
    bpm: 74,
    beats: 4,
    level: 1,
    swing: 0.18,
    bars: [Fmaj7, Em7, Dm7, Cmaj7].map((ch) => ch.map((n) => n + 12)),
    play: ({ t, bar, step, chord, spb, k }) => {
      if (step === 0) {
        chord.forEach((n, i) => k.rhodes(n, t + i * 0.012, spb * 1.6, 0.05));
        k.bass(lowest(chord) - 24, t, spb * 1.4, 0.22);
        k.crackle(t, spb * 4, 0.05);
      }
      if (step === 6) chord.slice(1).forEach((n) => k.rhodes(n, t, spb * 0.8, 0.035));
      if (step === 8) k.bass(lowest(chord) - 24 + 7, t, spb, 0.16);
      if (step === 0 || step === 10) k.kick(t, 0.3);
      if (step === 4 || step === 12) k.brush(t, 0.07);
      if (step % 2 === 0) k.hat(t, step % 4 === 0 ? 0.025 : 0.015);
      if (step === 14 && bar % 2 === 1) k.rhodes(chord[3] + 12, t, spb, 0.03);
    },
  },
  runway: {
    bpm: 108,
    beats: 4,
    level: 0.9,
    bars: [Am7, Dm7, G7, Cmaj7],
    play: ({ t, step, chord, spb, k }) => {
      if (step % 4 === 0) k.kick(t, 0.32);
      if (step % 4 === 2) k.hat(t, 0.03);
      else if (step % 2 === 1) k.hat(t, 0.012);
      if (step === 4 || step === 12) k.clap(t, 0.04);
      if (step % 2 === 0) k.bass(lowest(chord) - 12 + (step % 8 === 4 ? 12 : 0), t, spb * 0.4, 0.2);
      if (step === 6 || step === 14) chord.forEach((n) => k.rhodes(n, t, spb * 0.5, 0.04));
    },
  },
  play: {
    bpm: 116,
    beats: 4,
    level: 1,
    bars: [C, Fl, G, C],
    play: ({ t, bar, step, chord, k }) => {
      const pattern = [0, -1, 2, -1, 1, 2, -1, 0, 2, -1, 1, -1, 0, -1, 2, -1];
      const p = pattern[step];
      if (p >= 0) k.marimba(chord[p] + 12, t, 0.13);
      if (step === 0 || step === 8) k.marimba(lowest(chord) - 12, t, 0.2);
      if (step === 4 || step === 12) k.clap(t, 0.025);
      if (step === 14 && bar % 2 === 1) k.musicbox(chord[2] + 24, t, 0.05);
    },
  },
  ocean: {
    bpm: 66,
    beats: 4,
    level: 1,
    bars: [Cadd9, Am7, Fmaj7, Gsus],
    play: ({ t, step, chord, spb, k }) => {
      if (step === 0) {
        k.pad(chord, t, spb * 4, 0.03);
        k.bass(lowest(chord) - 12, t, spb * 3, 0.12);
      }
      const penta = [72, 74, 76, 79, 81, 84, 86, 88];
      if (step % 2 === 0 && Math.random() < 0.42) k.marimba(penta[Math.floor(Math.random() * penta.length)], t, 0.09);
      if (Math.random() < 0.05) k.bubble(t, 0.04);
    },
  },
};

/* ---------- the player ---------- */
let current: { id: ThemeId; bus: GainNode; step: number; next: number } | null = null;
let want: ThemeId | null = null;
let timer = 0;
let reverb: ConvolverNode | null = null;
let dry: GainNode | null = null;
let wet: GainNode | null = null;
const kits = new WeakMap<GainNode, Kit>();

function room(c: AudioContext, out: AudioNode) {
  if (reverb) return;
  reverb = c.createConvolver();
  const len = c.sampleRate * 2.4;
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  reverb.buffer = ir;
  wet = c.createGain();
  wet.gain.value = 0.35;
  dry = c.createGain();
  dry.gain.value = 0.8;
  reverb.connect(wet).connect(out);
  dry.connect(out);
}

function stopCurrent(c: AudioContext, fade = 1.2) {
  if (!current) return;
  const bus = current.bus;
  bus.gain.setTargetAtTime(0.0001, c.currentTime, fade / 4);
  setTimeout(() => bus.disconnect(), fade * 1000 + 400);
  current = null;
}

function tick() {
  const io = musicOut();
  if (!io || !current) return;
  const { ctx: c } = io;
  const th = THEMES[current.id];
  const spb = 60 / th.bpm;
  const stepDur = spb / 4; // sixteenth notes
  const stepsPerBar = th.beats * 4;
  const k = kits.get(current.bus)!;
  while (current.next < c.currentTime + 0.3) {
    const s = current.step;
    const step = s % stepsPerBar;
    const bar = Math.floor(s / stepsPerBar);
    const swing = th.swing && step % 2 === 1 ? stepDur * th.swing : 0;
    th.play({ t: current.next + swing, bar, step, beat: Math.floor(step / 4), sub: step % 4, chord: th.bars[bar % th.bars.length], spb, k });
    current.step++;
    current.next += stepDur;
  }
}

function start() {
  const io = musicOut();
  const p = audioPrefs();
  const c = io?.ctx;
  if (!io || !c) return;
  const allowed = p.on && p.music > 0 && !document.hidden && !external ? want : null;
  // Radio Italia plays across the whole desk; the corner tunes are the other choice
  if (p.style === 'radio' && allowed) radioOn(allowed === 'italia' ? 'italia' : allowed === 'desk' ? 'desk' : 'other');
  else radioOff();
  const id = p.style === 'radio' ? null : allowed;
  if (current?.id === id) return;
  stopCurrent(c);
  clearInterval(timer);
  if (!id) return;
  room(c, io.out);
  const bus = c.createGain();
  bus.gain.setValueAtTime(0.0001, c.currentTime);
  bus.gain.exponentialRampToValueAtTime(THEMES[id].level, c.currentTime + 1.5);
  bus.connect(dry!);
  bus.connect(reverb!);
  kits.set(bus, instruments(c, bus));
  current = { id, bus, step: 0, next: c.currentTime + 0.1 };
  timer = window.setInterval(tick, 60);
  tick();
}

/** Saani's radio (Spotify) is playing: everything else steps aside until it stops. */
let external = false;
export function setExternalMusic(on: boolean) {
  if (external === on) return;
  external = on;
  whenUnlocked(start);
}

/** Play this corner's tune (or none), cross-fading from the last one. */
export function playTheme(id: ThemeId | null) {
  want = id;
  whenUnlocked(start);
}
/** Which tune is playing now, if any. */
export const nowPlaying = () => current?.id ?? null;

if (typeof window !== 'undefined') {
  // stop when the page is hidden or sound is turned off; pick up again when it's back
  document.addEventListener('visibilitychange', () => whenUnlocked(start));
  window.addEventListener('jelly:audio', () => whenUnlocked(start));
}
