/**
 * Everything Jelly says on her own, and how her voice should sound saying it.
 * The recorded voice (scripts/jelly-voice.mts) and the app both read from here, so a line shown on
 * screen and the line she speaks are always the same words. No imports that need a browser or server.
 */
import type { JellyMood } from '@/lib/jelly-mood';

/**
 * Jelly's voice brief, from the prompt: a soft, warm, airy, sweet voice with a smile you can hear;
 * bubbly and playful, rising gently when curious, tender when comforting; a real friend, not an
 * assistant. Crisp and clear, with natural pauses and breaths. Never childish, squeaky, robotic or
 * vocal-fried. Recognisable across every emotion: the same voice and base direction every time, with
 * only the mood direction on top changing.
 */
export const VOICE = {
  model: 'canopylabs/orpheus-v1-english',
  /** chosen by ear from Groq's female voices (autumn, diana, hannah) */
  voice: 'hannah',
  base: '[warm] [breathy]',
  /** Orpheus takes at most 200 characters per request, directions included */
  maxChars: 200,
} as const;

/** The direction on top of the base, by how she feels. Gentle on purpose: no shouting, no singsong. */
export const DIRECTION: Record<JellyMood, string> = {
  content: '[gently smiling]',
  joyful: '[cheerful]',
  excited: '[cheerful]',
  wink: '[playful]',
  calm: '[soft]',
  sad: '[soft] [tender]',
  grumpy: '[pouting playfully]',
  confused: '[curious]',
  idea: '[cheerful]',
  sleepy: '[whisper]',
  surprised: '[surprised]',
  love: '[tender]',
  studious: '[thoughtful]',
  curious: '[curious]',
  shy: '[soft] [shy]',
};

/* ---------- her lines ---------- */
export const PETTED = ['Hehe, that tickles! 💗', 'Blub blub… more please 🫧', 'Mmm, best pats in all of Milano', 'I’m melting… in a good way 🪼', 'You’re my favourite human, you know?', 'Purr… wait, jellyfish don’t purr. Blub!'];
export const DIZZY = ['Okay okay, I’m getting dizzy! 😵‍💫', 'Too many pats! My tentacles are in a knot 😤', 'Hey! Gentle, I’m made of jelly!'];
export const STILL_LIKE = '…but I still like you 🍃';
export const SHY = ['…are you still there? 👀', '*peeks out* Just checking on you 🍃', 'I’ll be right here when you need me'];
export const WAKE = ['Huh?! Oh… I was dreaming of gelato 🍨', '*yawn* …oh, hi Saani! I wasn’t sleeping, promise', 'Mmh? Five more minutes… okay, I’m up!'];
export const SNORE = 'zzz… 💤';
export const BACK = 'You’re back! I kept the bubbles warm 🫧';
export const MISSED = 'But you’re here now 💗';
export const OUT_OF_PUFF = 'I’m all out of puff… give me a minute? 😮‍💨';
export const NEW_WATERS = 'Ooh, new waters!';
export const LEVEL_UP = 'We’re even closer friends now! 💗✨';

/** In her home. */
export const LOVES = ['Ooh, for me?! 💗', 'It’s perfect there!', 'My home is getting so pretty ✨', 'Grazie, tesoro! 🫧', 'I love it, I love it!'];
export const TAPS = ['That’s one of my favourites!', 'Careful, it’s fragile 🫧', 'Isn’t it the cutest?', 'I polish it every morning ✨'];
export const HOME_PATS = ['Home pats are the best 💗', 'Blub blub!', 'Stay a little longer?', 'Mmm, cosy…'];

export const HELLO: Partial<Record<JellyMood, string>> & { default: string } = {
  sleepy: '*yawn* It’s late in Milano… hi Saani 🌙',
  excited: 'Buongiorno! ☀️ I’m full of bubbles today!',
  joyful: 'Ciao, ciao! So happy you’re here 🫧',
  calm: 'Buonasera, Saani 🌸 Cosy studio time?',
  default: 'Hi you! Tap me to chat, or rub me for pats 💗',
};
export const hello = (m: JellyMood) => HELLO[m] ?? HELLO.default;

export const MEET = 'I’m Jelly, your new studio friend. Tap me to chat about any project, or rub me (or press and hold) for pats!';

/** Little things she says when a mood comes over her. */
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

/** Check-ins that don't depend on her projects. */
export const CHECKINS = {
  late: 'It’s really late in Milano! 🌙 Even the best designers need their beauty sleep, okay?',
  start: 'Not sure where to start today? I can look across all your projects and pick one with you.',
  empty: 'Your studio is all empty and sparkly ✨ Want to dream up a first project together?',
  water: 'Have you had some water today? Designers need hydration too 💧',
  proud: 'I’m really proud of you, you know? Moving to Milano to chase this is brave. 💗',
};

/** What she says when something is unlocked, by kind of achievement. */
export const CHEERS: Record<string, string> = {
  Jelly: 'Yay! Look what we unlocked together!',
  Milano: 'Brava! Another little Milano adventure!',
  'Settling in': 'One more thing sorted. I’m so proud of you!',
  Bingo: 'A bingo square! Ooh, that’s a good one.',
  'Your story': 'Another page of your story… I love it.',
  'Your people': 'Your people really love you, you know?',
  'My Corner': 'Look at you, designer! The studio is buzzing.',
  daily: 'Welcome back! I saved some pearls for you.',
};

/* ---------- how a line becomes speech ---------- */

/** The words she actually says: no emoji or markdown, actions turned into sounds, clean spacing. */
export function clean(text: string) {
  return text
    .replace(/\*(yawn|yawns)\*/gi, 'Yaaawn…')
    .replace(/\*([^*]+)\*/g, '') // stage directions like *peeks out*
    .replace(/[#*_`>]+/g, '')
    .replace(/\p{Extended_Pictographic}|‍|️|[\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/[“”]/g, '"')
    .replace(/€\s?(\d+)/g, '$1 euros')
    .replace(/\s+/g, ' ')
    .replace(/\s([,.!?…])/g, '$1')
    .trim();
}

/** A chat answer as something to say out loud: headings and bullets become plain sentences. */
export function speechText(answer: string) {
  return answer
    .split('\n')
    .map((l) => l.trim().replace(/^#{1,4}\s*/, '').replace(/^([-*•]|\d+[.)])\s+/, ''))
    .filter(Boolean)
    .map((l) => (/[.!?…:]$/.test(l) ? l : `${l}.`))
    .join(' ');
}

/** A short, stable key for a line, shared by the recorder and the player. */
export function lineKey(text: string) {
  const t = clean(text).toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

/**
 * Split speech into pieces Orpheus will take (with the directions in front), at sentence breaks,
 * then commas, so pauses fall where a person would breathe.
 */
export function pieces(text: string, dir: string) {
  const head = `${VOICE.base} ${dir}`.trim() + ' ';
  const room = VOICE.maxChars - head.length;
  const out: string[] = [];
  const sentences = clean(text).match(/[^.!?…]+[.!?…]*\s*/g) ?? [];
  let cur = '';
  const push = () => cur.trim() && out.push(head + cur.trim());
  for (const s of sentences) {
    if ((cur + s).length <= room) {
      cur += s;
      continue;
    }
    push();
    cur = '';
    if (s.length <= room) cur = s;
    else
      for (const part of s.split(/(?<=,)\s+/)) {
        if ((cur + ' ' + part).trim().length > room) push(), (cur = '');
        cur = (cur + ' ' + part).trim();
      }
  }
  push();
  return out;
}
