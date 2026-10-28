/**
 * Saani's sound settings: one switch for everything, then a volume for each kind of sound, and
 * whether her phone buzzes. Shared by the server (which remembers them) and the browser.
 */
export type AudioPrefs = {
  on: boolean;
  /** background music for each corner of her desk */
  music: number;
  /** taps, jingles, achievement tunes */
  sfx: number;
  /** Jelly talking (recorded lines, answers read aloud, her backup voice) */
  voice: number;
  /** voice notes and videos from her people, and her own moments */
  notes: number;
  /** little buzzes when she taps things (iPhone and Android) */
  haptics: boolean;
};
export const DEFAULT_PREFS: AudioPrefs = { on: true, music: 0.45, sfx: 0.7, voice: 0.9, notes: 1, haptics: true };

const vol = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, Math.round(v * 100) / 100)) : d);
/** Settings from anywhere (a request, storage), made safe; anything missing or odd keeps its default. */
export function cleanPrefs(raw: unknown, base: AudioPrefs = DEFAULT_PREFS): AudioPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    on: typeof r.on === 'boolean' ? r.on : base.on,
    music: vol(r.music, base.music),
    sfx: vol(r.sfx, base.sfx),
    voice: vol(r.voice, base.voice),
    notes: vol(r.notes, base.notes),
    haptics: typeof r.haptics === 'boolean' ? r.haptics : base.haptics,
  };
}
