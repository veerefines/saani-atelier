/**
 * How Jelly feels. Shared by the server (her answers carry a mood) and the browser (her face).
 * Each mood is one of the pictures in public/corner/jelly/.
 */
export const MOODS = {
  content: { feeling: 'content', emoji: '🙂' },
  joyful: { feeling: 'happy', emoji: '😄' },
  excited: { feeling: 'full of energy', emoji: '✨' },
  wink: { feeling: 'playful', emoji: '😉' },
  calm: { feeling: 'cosy', emoji: '🌸' },
  sad: { feeling: 'a little sad', emoji: '🥺' },
  grumpy: { feeling: 'grumpy', emoji: '😤' },
  confused: { feeling: 'puzzled', emoji: '❓' },
  idea: { feeling: 'inspired', emoji: '💡' },
  sleepy: { feeling: 'sleepy', emoji: '😴' },
  surprised: { feeling: 'surprised', emoji: '‼️' },
  love: { feeling: 'loved', emoji: '💗' },
  studious: { feeling: 'focused', emoji: '📖' },
  curious: { feeling: 'curious', emoji: '🫧' },
  shy: { feeling: 'shy', emoji: '🍃' },
} as const;
export type JellyMood = keyof typeof MOODS;
export const isMood = (m: unknown): m is JellyMood => typeof m === 'string' && m in MOODS;
export const moodSrc = (m: JellyMood) => `/corner/jelly/${m}.webp`;
/** Bigger, sharper faces for her home, where she's shown large. */
export const moodHd = (m: JellyMood) => `/corner/jelly/hd/${m}.webp`;

/** The hour in Milano (0–23), wherever she is. */
export function milanHour(at = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(at));
}

/** Her mood from the time of day in Milano: bubbly in the morning, sleepy at night. */
export function timeMood(at = new Date()): JellyMood {
  const h = milanHour(at);
  if (h >= 23 || h < 6) return 'sleepy';
  if (h < 10) return 'excited';
  if (h < 14) return 'joyful';
  if (h < 18) return 'content';
  return 'calm';
}

/** Friendship grows with pats and chats: level 1, 2, 3… and how far into the next one (0–1). */
export function friendship(pets: number, chats: number) {
  const points = pets + chats * 5;
  const level = 1 + Math.floor(Math.sqrt(points / 10));
  const from = (level - 1) ** 2 * 10;
  const to = level ** 2 * 10;
  return { level, progress: Math.min(1, (points - from) / (to - from)) };
}
