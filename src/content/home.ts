/**
 * Content for Saanika's dashboard. All placeholder: edit freely.
 */
import type { Mood } from '@/lib/data';

export const milano = {
  /** The day she flies Mumbai → Milano (and lands the same day). Before it: a countdown. From it: "Day N in Milano". */
  arrival: '2026-11-10',
  homeCity: 'Mumbai',
  homeZone: 'Asia/Kolkata',
  milanZone: 'Europe/Rome',
  /** where Varun is: a third clock on her desk */
  laCity: 'Los Angeles',
  laZone: 'America/Los_Angeles',
};

/* ---------- Bingo ---------- */

export type Reward =
  | { kind: 'bouquet'; line: string }
  | { kind: 'certificate'; title: string; line: string }
  | { kind: 'cheer'; line: string };

export type Square = { id: string; label: string; icon: string; group: 'Milano' | 'School' | 'Italia' | 'You'; reward: Reward };

export const bingo: Square[] = [
  { id: 'aperitivo', label: 'Aperitivo on the Navigli at sunset', icon: '🍹', group: 'Milano', reward: { kind: 'certificate', title: 'Official Aperitivo Expert', line: 'Spritz in one hand, crisps in the other. Very Milanese of you.' } },
  { id: 'duomo-roof', label: 'Walk on the Duomo rooftop', icon: '⛪', group: 'Milano', reward: { kind: 'bouquet', line: 'Top of the city, top of the world.' } },
  { id: 'first-crit', label: 'Survive your first critique', icon: '📝', group: 'School', reward: { kind: 'certificate', title: 'Critique Survivor, First Class', line: 'They poked holes. You patched them beautifully.' } },
  { id: 'vintage', label: 'Find a vintage treasure at a flea market', icon: '🧥', group: 'Milano', reward: { kind: 'cheer', line: 'One person’s old coat is a fashion designer’s whole personality.' } },
  { id: 'gelato-midnight', label: 'Gelato after midnight', icon: '🍨', group: 'You', reward: { kind: 'certificate', title: 'Midnight Gelato Society', line: 'Membership is lifelong. Pistachio is mandatory.' } },

  { id: 'fashion-week', label: 'Sneak a peek at Fashion Week', icon: '👠', group: 'Milano', reward: { kind: 'bouquet', line: 'Front row energy, always.' } },
  { id: 'italian-order', label: 'Order a whole meal in Italian', icon: '🍝', group: 'You', reward: { kind: 'certificate', title: 'Honorary Italian (Probationary)', line: 'The waiter only switched to English once. Progress.' } },
  { id: 'como', label: 'Day trip to Lake Como', icon: '⛵', group: 'Italia', reward: { kind: 'bouquet', line: 'You deserve that view.' } },
  { id: 'new-friend', label: 'Make a friend from another country', icon: '🌍', group: 'School', reward: { kind: 'cheer', line: 'Your people, now in more time zones.' } },
  { id: 'call-home', label: 'Video call home on a Sunday', icon: '📱', group: 'You', reward: { kind: 'cheer', line: 'Somewhere in Mumbai, someone just smiled very big.' } },

  { id: 'brera', label: 'Get lost in Brera', icon: '🎨', group: 'Milano', reward: { kind: 'bouquet', line: 'The best streets are the ones you didn’t plan.' } },
  { id: 'sketch-cafe', label: 'Sketch in a café for an hour', icon: '☕', group: 'You', reward: { kind: 'cheer', line: 'Very main character. Very correct.' } },
  { id: 'free', label: 'Land in Milano', icon: '✈️', group: 'You', reward: { kind: 'bouquet', line: 'You did it. Everything from here is a bonus.' } },
  { id: 'showroom', label: 'Visit a designer showroom', icon: '👗', group: 'School', reward: { kind: 'certificate', title: 'Certified Showroom Lurker', line: 'Touched nothing. Remembered everything.' } },
  { id: 'florence', label: 'A weekend in Florence', icon: '🏛️', group: 'Italia', reward: { kind: 'bouquet', line: 'Renaissance girl.' } },

  { id: 'pasta', label: 'Cook pasta for your flatmates', icon: '🧑‍🍳', group: 'You', reward: { kind: 'certificate', title: 'Nonna-Approved (Pending Review)', line: 'Did you salt the water like the sea? Good.' } },
  { id: 'tram', label: 'Ride the old orange tram', icon: '🚋', group: 'Milano', reward: { kind: 'cheer', line: 'Rattly, slow, perfect.' } },
  { id: 'all-nighter', label: 'Pull one studio all-nighter (only one)', icon: '🌙', group: 'School', reward: { kind: 'certificate', title: 'Order of the 3 AM Hem', line: 'Now sleep. That’s an order.' } },
  { id: 'venice', label: 'Get lost in Venice', icon: '🛶', group: 'Italia', reward: { kind: 'bouquet', line: 'Every wrong turn was the right one.' } },
  { id: 'outfit', label: 'Wear the boldest outfit you own to class', icon: '💃', group: 'You', reward: { kind: 'cheer', line: 'Milan has been notified.' } },

  { id: 'opera', label: 'A night at La Scala (or its steps)', icon: '🎭', group: 'Milano', reward: { kind: 'bouquet', line: 'Bravissima.' } },
  { id: 'present', label: 'Present a project you’re proud of', icon: '🏆', group: 'School', reward: { kind: 'certificate', title: 'Standing Ovation (Imagined, But Deserved)', line: 'We’re clapping from here.' } },
  { id: 'snow', label: 'See snow in the Alps', icon: '🏔️', group: 'Italia', reward: { kind: 'bouquet', line: 'Snow angel, fashion angel.' } },
  { id: 'cry-laugh', label: 'Laugh until you cry with new friends', icon: '😂', group: 'You', reward: { kind: 'cheer', line: 'This is the stuff you’ll remember most.' } },
  { id: 'letter-home', label: 'Send a postcard home', icon: '💌', group: 'You', reward: { kind: 'cheer', line: 'It’ll arrive in three weeks. Worth it.' } },
];

export const moods: { id: Mood; label: string; emoji: string }[] = [
  { id: 'happy', label: 'happy', emoji: '🌷' },
  { id: 'sad', label: 'a little sad', emoji: '🌧️' },
  { id: 'homesick', label: 'homesick', emoji: '🏡' },
  { id: 'unmotivated', label: 'unmotivated', emoji: '🐌' },
  { id: 'anxious', label: 'anxious', emoji: '🫧' },
  { id: 'proud', label: 'proud', emoji: '✨' },
];

export const reactions = ['🌷', '🌸', '🪡', '✂️', '💗'];

export const letterTitles = [
  'Open when you miss home',
  'Open when you need a laugh',
  'Open when you feel like giving up',
  'Open when you can’t sleep',
  'Open when you had a great day',
  'Open on your birthday',
];

/* ---------- Something calming ---------- */

/**
 * After a note for a heavier feeling, the jar offers a small, kind next step:
 * a chamomile ritual, and a few gentle places from the Milano guide (ids in content/milano.ts).
 */
export const calm: Partial<Record<Mood, { line: string; places: string[] }>> = {
  anxious: {
    line: 'Make a cup of chamomile. Breathe in for four, out for six, while it steeps. Then, if you like, somewhere quiet:',
    places: ['ortobotanico', 'saryo', 'villareale'],
  },
  sad: {
    line: 'Chamomile, a blanket, and something sweet. Later, a soft walk somewhere green:',
    places: ['ortobotanico', 'alberi', 'cioccolati'],
  },
  homesick: {
    line: 'Put the kettle on and make it chamomile, or chai. When you’re ready, a little taste of home:',
    places: ['krishnabazar', 'shiva', 'dhaba'],
  },
  unmotivated: {
    line: 'A slow chamomile first. Then a small change of scene, and one tiny thing done:',
    places: ['barluce', 'mokos', 'orsonero'],
  },
};
