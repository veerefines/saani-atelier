import * as db from './db';
import type { Media } from './data';
import type { Chat } from './corner-model';
import { ANSWER_DIRECTION, VOICE, pieces, speechText } from '@/components/jelly/lines';
import { lift } from './voice-lift';

/**
 * Jelly reading her chat answers aloud, with Groq's free Orpheus voice. Each answer is split into
 * pieces Orpheus will take, and each piece is recorded once and kept, so replaying is free. The free
 * tier is small (100 requests and about 3,600 tokens a day), so we count, and when it's used up the
 * browser reads with its own voice until tomorrow.
 */
const DAY_REQUESTS = 95;
const DAY_TOKENS = 3400;
const BASE = () => (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
const day = () => new Date().toISOString().slice(0, 10);

type Usage = db.Doc & { day: string; requests: number; tokens: number; pausedUntil?: number };
type Spoken = db.Doc & { parts: number; media: (string | null)[] };
const USAGE = 'groq-usage';
const VOICED = 'jellyVoice';

export const voiceReady = () => Boolean(process.env.GROQ_API_KEY) && process.env.GROQ_API_KEY !== 'off';

async function allowance(cost: number) {
  const u = (await db.get<Usage>(USAGE, 'tts')) ?? { id: 'tts', createdAt: new Date().toISOString(), day: day(), requests: 0, tokens: 0 };
  const today = u.day === day() ? u : { ...u, day: day(), requests: 0, tokens: 0, pausedUntil: 0 };
  if ((today.pausedUntil ?? 0) > Date.now() || today.requests >= DAY_REQUESTS || today.tokens + cost > DAY_TOKENS) return null;
  return today;
}

/** WAV pieces from Orpheus, joined into one (same format, so the sound data just follows on). */
function wavData(b: Buffer) {
  let i = 12;
  let fmt: Buffer | null = null;
  while (i + 8 <= b.length) {
    const id = b.toString('ascii', i, i + 4);
    const size = b.readUInt32LE(i + 4);
    if (id === 'fmt ') fmt = b.subarray(i + 8, i + 8 + size);
    if (id === 'data') return { fmt, data: b.subarray(i + 8, Math.min(b.length, i + 8 + size)) };
    i += 8 + size + (size % 2);
  }
  return { fmt, data: Buffer.alloc(0) };
}
function wav(fmt: Buffer, data: Buffer) {
  const h = Buffer.alloc(12);
  h.write('RIFF', 0);
  h.writeUInt32LE(4 + 8 + fmt.length + 8 + data.length, 4);
  h.write('WAVE', 8);
  const f = Buffer.alloc(8);
  f.write('fmt ', 0);
  f.writeUInt32LE(fmt.length, 4);
  const d = Buffer.alloc(8);
  d.write('data', 0);
  d.writeUInt32LE(data.length, 4);
  return Buffer.concat([h, f, fmt, d, data]);
}

export type SpeakResult = { url: string; parts: number } | { fallback: true; why: string };

/** One piece of an answer, ready to play: from the cache, or recorded now if today's allowance has room. */
export async function speakPart(chat: Chat, turnId: string, part: number, owner: string): Promise<SpeakResult> {
  const turn = chat.turns.find((t) => t.id === turnId);
  if (!turn) return { fallback: true, why: 'missing' };
  return speakPiece(`${chat.id}_${turnId}`, pieces(speechText(turn.a), ANSWER_DIRECTION), part, owner);
}

/** One piece of any text she reads (an answer, the morning brief), recorded once under `id`. */
export async function speakPiece(id: string, list: string[], part: number, owner: string): Promise<SpeakResult> {
  if (!list.length || part >= list.length) return { fallback: true, why: 'empty' };
  const saved = (await db.get<Spoken>(VOICED, id)) ?? { id, createdAt: new Date().toISOString(), parts: list.length, media: list.map(() => null) };
  const have = saved.media[part];
  if (have) return { url: `/api/media/${have}`, parts: list.length };
  if (!voiceReady()) return { fallback: true, why: 'off' };

  const cost = Math.ceil(list[part].length / 3.5);
  const u = await allowance(cost);
  if (!u) return { fallback: true, why: 'allowance' };
  const res = await fetch(`${BASE()}/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: VOICE.model, voice: VOICE.voice, input: list[part], response_format: 'wav' }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  await db.put<Usage>(USAGE, { ...u, requests: u.requests + 1, tokens: u.tokens + cost, ...(res?.status === 429 ? { pausedUntil: Date.now() + 15 * 60_000 } : {}) });
  if (!res || !res.ok) return { fallback: true, why: res?.status === 429 ? 'allowance' : 'failed' };
  const raw = Buffer.from(await res.arrayBuffer());
  const { fmt, data } = wavData(raw);
  // Jelly's lift (the same as her recorded lines), on 16-bit mono sound
  let body = raw;
  if (fmt && fmt.readUInt16LE(0) === 1 && fmt.readUInt16LE(2) === 1 && fmt.readUInt16LE(14) === 16) {
    const pcm = new Int16Array(data.buffer.slice(data.byteOffset, data.byteOffset + (data.length & ~1)));
    const up = lift(pcm, VOICE.semitones, VOICE.speed);
    body = wav(fmt, Buffer.from(up.buffer, up.byteOffset, up.byteLength));
  } else if (fmt) body = wav(fmt, data);

  const mediaId = db.newId('v_');
  await db.storeMedia(mediaId, body, 'audio/wav');
  await db.put<Media>('media', { id: mediaId, createdAt: new Date().toISOString(), ownerId: owner, mime: 'audio/wav', size: body.length, ready: true, private: true });
  const fresh = (await db.get<Spoken>(VOICED, id)) ?? saved;
  fresh.media[part] = mediaId;
  await db.put<Spoken>(VOICED, { ...fresh, parts: list.length });
  return { url: `/api/media/${mediaId}`, parts: list.length };
}
