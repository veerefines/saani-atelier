/**
 * Everything Jelly says on her own, and how her voice should sound saying it.
 * The recorded voice (scripts/jelly-voice.mts) and the app both read from here, so a line shown on
 * screen and the line she speaks are always the same words. No imports that need a browser or server.
 */
import type { JellyMood } from '@/lib/jelly-mood';

/**
 * Jelly's voice: a bright, bouncy, expressive little fairy companion. Quick and full of energy,
 * big reactions (a dramatic huff when she's ignored, squeals when she's excited), yet soft and warm
 * when Saani needs comfort, and always clear enough to follow. She sometimes calls herself "Jelly".
 * Chosen by ear (27 Oct 2026): Groq's Orpheus "autumn" voice, lifted 3 semitones and 5% quicker, the
 * same lift on every line so she's recognisable in every mood; only the mood direction changes.
 */
export const VOICE = {
  model: 'canopylabs/orpheus-v1-english',
  voice: 'autumn',
  base: '',
  /** the lift that makes her Jelly: higher by this many semitones, this much quicker, same timing feel */
  semitones: 3,
  speed: 1.05,
  /** Orpheus takes at most 200 characters per request, directions included */
  maxChars: 200,
} as const;

/** The direction for each mood, as in the sample that was chosen. */
export const DIRECTION: Record<JellyMood, string> = {
  content: '[cheerful]',
  joyful: '[excited]',
  excited: '[excited] [fast paced]',
  wink: '[playful]',
  calm: '[soft] [warm]',
  sad: '[soft] [warm]',
  grumpy: '[pouting]',
  confused: '[curious]',
  idea: '[excited]',
  sleepy: '[sleepy] [soft]',
  surprised: '[surprised] [excited]',
  love: '[warm]',
  studious: '[thoughtful]',
  curious: '[excited] [curious]',
  shy: '[soft] [shy]',
};
/** How she reads her chat answers: lively, but steady enough to follow a long answer. */
export const ANSWER_DIRECTION = '[cheerful]';

/* ---------- her lines ---------- */
export const PETTED = ['Hehe, that tickles! 💗', 'Blub blub… more please 🫧', 'Mmm, best pats in all of Milano', 'I’m melting… in a good way 🪼', 'You’re my favourite human, you know?', 'Purr… wait, jellyfish don’t purr. Blub!', 'Jelly loves pats! Jelly could do this all day!', 'Ooh, right behind the bell, yes, there! 🫧', 'You have the gentlest hands, Saani 💗', 'Hehehe, stop, no, don’t stop!', 'My tentacles are all wiggly now ✨'];
export const DIZZY = ['Okay okay, I’m getting dizzy! 😵‍💫', 'Hmph! Too many pats! Jelly’s tentacles are in a knot 😤', 'Hey! Gentle, I’m made of jelly!', 'Whoa, the whole sea is spinning! 🌀', 'Okay, okay, Jelly needs a tiny float break!'];
export const STILL_LIKE = ['…but I still like you 🍃', '…okay, I’m not really cross. Pats are nice 🍃', '…fine, you’re forgiven 🍃'];
export const SHY = ['…are you still there? 👀', '*peeks out* Just checking on you 🍃', 'I’ll be right here when you need me', 'Psst… I’m here if you want to chat 🫧', '*waves a tentacle* Still floating over here!', 'Are you busy designing? I’ll be quiet. Mostly 🤫'];
export const WAKE = ['Huh?! Oh… I was dreaming of gelato 🍨', '*yawn* …oh, hi Saani! I wasn’t sleeping, promise', 'Mmh? Five more minutes… okay, I’m up!', 'Oh! Was I snoring? Don’t answer that 😳', 'Blub?! I’m awake, I’m awake!'];
export const SNORE = ['zzz… 💤', 'Mmm… gelato… zzz 🍨', 'zzz… blub… zzz 💤'];
export const BACK = ['You’re back! I kept the bubbles warm 🫧', 'Oh good, you’re back! I was starting to wonder 🫧', 'There you are! I kept your spot warm 💗', 'Welcome back, Saani! Did I miss anything?'];
export const MISSED = ['But you’re here now 💗', 'The bubbles just weren’t the same without you 🫧', 'Don’t go away so long again, okay? 💗'];
export const OUT_OF_PUFF = ['I’m all out of puff… give me a minute? 😮‍💨', 'Phew, I need a little rest before we chat more 😮‍💨', 'My bubbles ran out! Try me again in a bit? 🫧'];
export const NEW_WATERS = ['Ooh, new waters!', 'A change of scenery, I love it! ✨', 'Look at that view! 🫧', 'Fancy! Jelly approves 💗'];
export const LEVEL_UP = ['We’re even closer friends now! 💗✨', 'Yay! Our friendship just grew! 💗', 'Ooh, did you feel that? We levelled up together! ✨'];

/** In her home. */
export const LOVES = ['Ooh, for me?! 💗', 'It’s perfect there!', 'My home is getting so pretty ✨', 'Grazie, tesoro! 🫧', 'I love it, I love it!', 'You spoil me, tesoro! 💗', 'Ooh, it sparkles! 🫧'];
export const TAPS = ['That’s one of my favourites!', 'Careful, it’s fragile 🫧', 'Isn’t it the cutest?', 'I polish it every morning ✨', 'Ooh, you found my secret favourite!', 'Ssh, it’s a little shy 🫧'];
export const HOME_PATS = ['Home pats are the best 💗', 'Blub blub!', 'Stay a little longer?', 'Mmm, cosy…', 'You’re staying? Yay! 🫧', 'This is my happy place 💗'];

export const HELLO: Partial<Record<JellyMood, string>> & { default: string } = {
  sleepy: '*yawn* It’s late in Milano… hi Saani 🌙',
  excited: 'Buongiorno! ☀️ I’m full of bubbles today!',
  joyful: 'Ciao, ciao! So happy you’re here 🫧',
  calm: 'Buonasera, Saani 🌸 Cosy studio time?',
  default: 'Hi you! Tap me to chat, or rub me for pats 💗',
};
export const hello = (m: JellyMood) => HELLO[m] ?? HELLO.default;

/** Hello by the time of day in Milano, for a return after 20+ minutes. */
export const TIME_HELLO: Record<'morning' | 'afternoon' | 'evening' | 'night', string[]> = {
  morning: ['Buongiorno, Saani! ☀️ Coffee first, then design?', 'Good morning! The light in Milano is lovely today ☀️', 'Morning, tesoro! Ready for a good day? 🫧'],
  afternoon: ['Buon pomeriggio! 🌤️ How is the day treating you?', 'Hi you! Time for a little afternoon float? 🫧', 'Ciao! Did you remember lunch? 🍝'],
  evening: ['Buonasera, Saani 🌆 Cosy studio time?', 'Good evening! Did you do something fun today? 🫧', 'Evening, tesoro! Aperitivo hour 🍹'],
  night: ['It’s late in Milano… hi Saani 🌙', 'Hello, night owl! 🦉 Don’t stay up too late', 'Shh, the whole city is sleeping 🌙 Hi, you.'],
};
export const hourHello = (h: number) => TIME_HELLO[h >= 5 && h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night'];

/** A short pop-back, for a return after 5-20 minutes. */
export const QUICK_BACK = ['Oh, hi again! 🫧', 'Back already? Yay!', 'Welcome back! 💗', 'There you are, I was just thinking of you 🫧', 'Ciao again! 🪼'];

export const MEET = 'I’m Jelly, your new studio friend. Tap me to chat about any project, or rub me (or press and hold) for pats!';

/** Little things she says when a mood comes over her. */
export const MOOD_LINES: Partial<Record<JellyMood, string[]>> = {
  joyful: ['La la la 🎶', 'Today feels like a good day!', 'Bubbles, bubbles, everywhere! 🫧'],
  excited: ['Wheee! ✨', 'Jelly can’t sit still today!', 'Is it adventure o’clock yet?! ✨'],
  wink: ['Psst… you’re doing great 😉', 'I saw that! 😉', 'Between us? Your work is lovely 😉'],
  calm: ['Floating… so peaceful 🌸', 'Mmm, cosy vibes', 'Breathing in… bubbles out 🫧'],
  sad: ['I miss the big blue sea sometimes… 🥺', 'A pat would cheer me up 🥺', 'Just a tiny sad wave. It’ll pass 🥺'],
  grumpy: ['Hmph! Nobody has patted Jelly in ages! 😤', 'Grr… Jelly lost her favourite pearl! 😤', 'Hmph! My bubble popped on its own 😤'],
  confused: ['Wait… what was I doing? ❓', 'Is it Tuesday? Jellyfish don’t do calendars ❓', 'Hmm, where did I put my thoughts? ❓'],
  idea: ['Ooh! I just had an idea 💡', 'What if we planned a little adventure? 💡', 'Ooh, what if we added a little sparkle? 💡'],
  sleepy: ['*yawn* 💤', 'Just resting my tentacles…', 'Counting sleepy sheep… I mean jellyfish…'],
  surprised: ['Whoa, was that a shooting star?!', 'Oh! You’re here!', 'Whoa! Did something just move?!'],
  love: ['I really like it here with you 💗', 'You’re my favourite human 💗', 'Everything feels cosy with you here 💗'],
  studious: ['Reading up on Milan Fashion Week 📖', 'Studying very important jellyfish things 📖', 'Ooh, the history of Italian silk 📖'],
  curious: ['Ooh, ooh, what are you up to? 🫧', 'What’s on this page? Show Jelly!', 'Hmm, what’s that over there? 🫧'],
  shy: ['*hides behind a leaf* 🍃', 'Don’t look, I’m being shy 🍃', '*peeks out* Hi… 🍃'],
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
  Jelly: 'Yay! Look what we unlocked together! Jelly is so proud!',
  Milano: 'Brava! Another little Milano adventure!',
  'Settling in': 'One more thing sorted. I’m so proud of you!',
  Bingo: 'A bingo square! Ooh, that’s a good one.',
  'Your story': 'Another page of your story… I love it.',
  'Your people': 'Your people really love you, you know?',
  'My Corner': 'Look at you, designer! The studio is buzzing.',
  daily: 'Welcome back! I saved some pearls for you.',
  'Every day': 'Look at you, doing a little something every day!',
  Soldi: 'Every cent counted. Jelly is impressed!',
  quest: 'Quest complete! Brava, Saani!',
  season: 'It’s a special day! Jelly dressed up for it.',
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
