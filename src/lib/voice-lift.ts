/**
 * Jelly's lift, in plain code, for audio made on the server (where there's no ffmpeg): the same as
 * the recorder's `asetrate + atempo`. Speeding the sound up raises its pitch; a WSOLA time-stretch
 * then gives back the time, so she sounds higher without sounding sped up.
 */

/** 16-bit mono PCM in, 16-bit mono PCM out (same sample rate). */
export function lift(pcm: Int16Array, semitones: number, speed: number): Int16Array {
  const k = Math.pow(2, semitones / 12);
  // 1. play it k times faster: pitch up by k, k times shorter
  const n = Math.floor(pcm.length / k);
  const fast = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * k;
    const j = Math.floor(x);
    const f = x - j;
    const a = pcm[j] ?? 0;
    const b = pcm[j + 1] ?? a;
    fast[i] = (a + (b - a) * f) / 32768;
  }
  // 2. stretch it back out, to `speed` times the original pace
  const out = wsola(fast, k / speed);
  const res = new Int16Array(out.length);
  for (let i = 0; i < out.length; i++) res[i] = Math.max(-32768, Math.min(32767, Math.round(out[i] * 32767)));
  return res;
}

/** Waveform-similarity overlap-add: stretch time by `stretch` without changing pitch. */
function wsola(x: Float32Array, stretch: number): Float32Array {
  const N = 768; // ~30 ms frames at 24 kHz
  const H = N / 2; // output hop
  const tol = 160; // how far to look for the best-matching frame
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const len = Math.floor(x.length * stretch);
  const out = new Float32Array(len + N);
  const norm = new Float32Array(len + N);
  let prev = 0;
  for (let m = 0; ; m++) {
    const at = m * H;
    const ideal = Math.round(at / stretch);
    if (ideal + N >= x.length || at >= len) break;
    let best = ideal;
    if (m > 0) {
      // pick the frame that best continues the sound we just laid down
      const target = prev + H;
      let bestC = -Infinity;
      for (let d = -tol; d <= tol; d += 2) {
        const c0 = ideal + d;
        if (c0 < 0 || c0 + N >= x.length || target + H >= x.length) continue;
        let c = 0;
        for (let i = 0; i < H; i += 2) c += x[c0 + i] * x[target + i];
        if (c > bestC) (bestC = c), (best = c0);
      }
    }
    for (let i = 0; i < N; i++) {
      out[at + i] += x[best + i] * win[i];
      norm[at + i] += win[i];
    }
    prev = best;
  }
  for (let i = 0; i < out.length; i++) if (norm[i] > 1e-3) out[i] /= norm[i];
  return out.subarray(0, len);
}
