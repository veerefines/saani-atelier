/**
 * Records Jelly's voice with Groq's free Orpheus text-to-speech, following the voice brief in
 * src/components/jelly/lines.ts. Run it on a Mac (it uses ffmpeg to tidy and compress the audio).
 *
 *   node --experimental-strip-types scripts/jelly-voice.mts samples   # same 3 lines in each female voice
 *   node --experimental-strip-types scripts/jelly-voice.mts record    # every line, in VOICE.voice
 *
 * Recording can be re-run: lines already recorded are skipped. The free tier allows 10 requests a
 * minute and 100 a day, so a full recording may take two days; it stops cleanly when the day is used.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { VOICE, DIRECTION, PETTED, DIZZY, STILL_LIKE, SHY, WAKE, SNORE, BACK, MISSED, OUT_OF_PUFF, NEW_WATERS, LEVEL_UP, HELLO, LOVES, TAPS, HOME_PATS, MEET, MOOD_LINES, CHECKINS, CHEERS, lineKey, pieces } from '../src/components/jelly/lines.ts';
import { FACTS } from '../src/components/jelly/facts.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/corner/voice');
const MANIFEST = path.join(ROOT, 'src/components/jelly/voice-manifest.json');

function key() {
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'off') return process.env.GROQ_API_KEY;
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const m = env.match(/^GROQ_API_KEY=(.+)$/m);
  if (!m) throw new Error('No GROQ_API_KEY in the environment or .env.local');
  return m[1].trim();
}
const KEY = key();
const LIFT = Math.pow(2, VOICE.semitones / 12); // Orpheus sends 24 kHz WAV
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let last = 0;

/** One request to Orpheus (at most 10 a minute). Returns WAV bytes. */
async function tts(input: string, voice: string): Promise<Buffer> {
  const wait = last + 6500 - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: VOICE.model, voice, input, response_format: 'wav' }),
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Groq ${res.status}: ${body.slice(0, 300)}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Join the pieces, give them Jelly's lift (VOICE.semitones higher, VOICE.speed quicker), even out loudness, trim silence at the ends, and save a small .m4a. */
function finish(wavs: Buffer[], file: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jelly-'));
  const list = wavs.map((w, i) => {
    const f = path.join(dir, `${i}.wav`);
    fs.writeFileSync(f, w);
    return `file '${f}'`;
  });
  fs.writeFileSync(path.join(dir, 'list.txt'), list.join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'),
    '-af', `asetrate=24000*${LIFT},aresample=44100,atempo=${(VOICE.speed / LIFT).toFixed(4)},silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-18:TP=-2:LRA=9`,
    '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', file]);
  fs.rmSync(dir, { recursive: true, force: true });
}

async function say(text: string, dir: string, voice: string, file: string) {
  const wavs: Buffer[] = [];
  for (const p of pieces(text, dir)) wavs.push(await tts(p, voice));
  finish(wavs, file);
}

/** Every line she says on her own, with the direction that fits it. */
function allLines(): { text: string; dir: string }[] {
  const L: { text: string; dir: string }[] = [];
  const add = (texts: string[], dir: string) => texts.forEach((text) => L.push({ text, dir }));
  add(PETTED, '[giggling]');
  add(DIZZY, '[playfully flustered]');
  add([STILL_LIKE], DIRECTION.shy);
  add(SHY, DIRECTION.shy);
  add(WAKE, '[sleepy]');
  add([SNORE], DIRECTION.sleepy);
  add([BACK, MISSED], DIRECTION.love);
  add([OUT_OF_PUFF], DIRECTION.sleepy);
  add([NEW_WATERS], DIRECTION.wink);
  add([LEVEL_UP], DIRECTION.joyful);
  add(LOVES, DIRECTION.joyful);
  add(TAPS, DIRECTION.wink);
  add(HOME_PATS, '[giggling]');
  add([MEET], DIRECTION.content);
  for (const [m, t] of Object.entries(HELLO)) add([t!], m === 'default' ? DIRECTION.content : DIRECTION[m as keyof typeof DIRECTION]);
  for (const [m, list] of Object.entries(MOOD_LINES)) add(list!, DIRECTION[m as keyof typeof DIRECTION]);
  add([CHECKINS.late], DIRECTION.sleepy);
  add([CHECKINS.start, CHECKINS.empty], DIRECTION.idea);
  add([CHECKINS.water], DIRECTION.wink);
  add([CHECKINS.proud], DIRECTION.love);
  for (const t of Object.values(CHEERS)) add([t], DIRECTION.joyful);
  for (const f of FACTS) add([`Did you know? ${f.text}`], DIRECTION.content);
  return L;
}

const mode = process.argv[2];
if (mode === 'samples') {
  const dest = process.argv[3] ?? path.join(os.tmpdir(), 'jelly-samples');
  fs.mkdirSync(dest, { recursive: true });
  const lines = [
    { text: 'Ciao, ciao! I’m so happy you’re here.', dir: DIRECTION.joyful },
    { text: 'Ooh, what are you working on today? Can I see?', dir: DIRECTION.curious },
    { text: 'Hey… it’s okay to miss home sometimes. I’m right here with you, cara.', dir: DIRECTION.sad },
  ];
  for (const voice of ['autumn', 'diana', 'hannah']) {
    const wavs: Buffer[] = [];
    for (const l of lines) for (const p of pieces(l.text, l.dir)) wavs.push(await tts(p, voice));
    const file = path.join(dest, `${voice}.m4a`);
    finish(wavs, file);
    console.log(file);
  }
} else if (mode === 'record') {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest: Record<string, string> = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  const lines = allLines();
  let made = 0;
  for (const l of lines) {
    const k = lineKey(l.text);
    if (manifest[k] && fs.existsSync(path.join(OUT, manifest[k]))) continue;
    try {
      await say(l.text, l.dir, VOICE.voice, path.join(OUT, `${k}.m4a`));
    } catch (e) {
      if ((e as { status?: number }).status === 429) {
        console.log(`Free allowance used for now (${made} new lines). Run again later to carry on.`);
        break;
      }
      throw e;
    }
    manifest[k] = `${k}.m4a`;
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
    made++;
    process.stdout.write(`${made} `);
  }
  const left = lines.filter((l) => !manifest[lineKey(l.text)]).length;
  console.log(`\nrecorded ${made} new, ${left} still to go, ${lines.length} in all`);
} else {
  console.log('usage: jelly-voice.mts samples [folder] | record');
}
