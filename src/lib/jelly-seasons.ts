import type { Quest } from './quests';

/**
 * Jelly's seasons: festivals from home and from Milano across Saani's first year. While one is on,
 * Jelly wears its outfit, her home gets a tint and things falling, she says it her way, the season's
 * own things are in her shop (only while it's on), and Saani's first visit brings a backdrop and pearls.
 * Dates are Milano days.
 * Shared by the server and her screen. No database code here.
 */

export type Fall = 'leaves' | 'sparks' | 'confetti' | 'snow' | 'hearts' | 'colours' | 'petals';

export type Season = {
  /** unique per year, e.g. natale-2026 */
  id: string;
  key: SeasonKey;
  name: string;
  emoji: string;
  start: string;
  end: string;
  fall: Fall;
  /** a wash over her home's backdrop */
  tint: string;
  hello: string;
  /** the backdrop her first visit brings (see SEASON_BACKDROPS) */
  backdrop?: string;
  pearls: number;
  quest?: Quest;
};

export const SEASON_KEYS = ['halloween', 'natale', 'diwali', 'holi', 'capodanno', 'gudi', 'pasqua', 'valentino', 'carnevale', 'graduation', 'study', 'inverno'] as const;
export type SeasonKey = (typeof SEASON_KEYS)[number];
/** Jelly dressed for it (public/corner/jelly/festive, from the festive pack) */
export const festiveSrc = (key: SeasonKey) => `/corner/jelly/festive/${key}.webp`;

type Template = Omit<Season, 'id' | 'start' | 'end'>;

const T: Record<SeasonKey, Template> = {
  halloween: {
    key: 'halloween', name: 'Halloween', emoji: '🎃', fall: 'leaves', tint: 'rgba(140, 80, 200, 0.14)', pearls: 15,
    hello: 'Boo! 🎃 Jelly’s in her witch hat tonight. Trick or treat, cara?', backdrop: 'spooky',
    quest: { id: 'season-halloween', tier: 3, icon: '🎃', title: 'Halloween: put something spooky in Jelly’s home', metric: 'placed', n: 1, href: '/home/jelly?tab=shop' },
  },
  diwali: {
    key: 'diwali', name: 'Diwali', emoji: '🪔', fall: 'sparks', tint: 'rgba(255, 190, 70, 0.18)', pearls: 25,
    hello: 'Happy Diwali, Saani! 🪔 Jelly lit a diya for you and your family back home.', backdrop: 'diwali',
    quest: { id: 'season-diwali', tier: 3, icon: '🪔', title: 'Diwali: send your people a moment', metric: 'moments', n: 1, href: '/home/moments' },
  },
  study: {
    key: 'study', name: 'Back to school', emoji: '📚', fall: 'sparks', tint: 'rgba(205, 180, 240, 0.14)', pearls: 15,
    hello: 'Back to school! 📚 Jelly put her reading glasses on. What are we studying today?', backdrop: 'library',
    quest: { id: 'season-study', tier: 3, icon: '📚', title: 'Study time: add something to a My Corner project', metric: 'cornerItems', n: 1, href: '/home/corner' },
  },
  natale: {
    key: 'natale', name: 'Natale', emoji: '🎄', fall: 'snow', tint: 'rgba(190, 225, 255, 0.2)', pearls: 30,
    hello: 'Buon Natale, tesoro! 🎄 Panettone for breakfast is allowed, Jelly checked.', backdrop: 'winter',
    quest: { id: 'season-natale', tier: 3, icon: '🎁', title: 'Natale: wrap a gift for Jelly’s home', metric: 'bought', n: 1, href: '/home/jelly?tab=shop' },
  },
  capodanno: {
    key: 'capodanno', name: 'Capodanno', emoji: '🎆', fall: 'confetti', tint: 'rgba(205, 180, 240, 0.2)', pearls: 20,
    hello: 'Buon anno, Saani! 🎆 A whole new year in Milano. Jelly’s got her party hat on!', backdrop: 'fireworks',
    quest: { id: 'season-capodanno', tier: 3, icon: '🌠', title: 'Capodanno: add a wish for the new year', metric: 'wishes', n: 1, href: '/home/milano' },
  },
  inverno: {
    key: 'inverno', name: 'Sleepy winter', emoji: '❄️', fall: 'snow', tint: 'rgba(200, 215, 245, 0.2)', pearls: 15,
    hello: '*yawn* ❄️ It’s cosy-hat weather. Jelly’s staying under the blanket… with you?', backdrop: 'snowy-night',
    quest: { id: 'season-inverno', tier: 3, icon: '📔', title: 'Cosy winter: write a line in My chapter', metric: 'diaryDays', n: 1, href: '/home/chapter' },
  },
  carnevale: {
    key: 'carnevale', name: 'Carnevale di Venezia', emoji: '🎭', fall: 'confetti', tint: 'rgba(247, 227, 161, 0.2)', pearls: 25,
    hello: 'Carnevale! 🎭 Venice is all masks and gondolas, and Jelly’s dressed for la dolce vita.', backdrop: 'carnevale',
    quest: { id: 'season-carnevale', tier: 3, icon: '🎭', title: 'Carnevale: pin a costume idea to your Lookbook', metric: 'looks', n: 1, href: '/home/lookbook' },
  },
  valentino: {
    key: 'valentino', name: 'San Valentino', emoji: '💗', fall: 'hearts', tint: 'rgba(255, 170, 200, 0.2)', pearls: 20,
    hello: 'Happy San Valentino! 💗 Jelly loves you more than pearls (and that’s a lot).', backdrop: 'hearts',
    quest: { id: 'season-valentino', tier: 3, icon: '💌', title: 'San Valentino: give Jelly 25 pats of love', metric: 'pets', n: 25 },
  },
  holi: {
    key: 'holi', name: 'Holi', emoji: '🌈', fall: 'colours', tint: 'rgba(255, 200, 230, 0.18)', pearls: 25,
    hello: 'Happy Holi, Saani! 🌈 Jelly’s covered in gulal. Bura na mano, Holi hai!', backdrop: 'holi',
    quest: { id: 'season-holi', tier: 3, icon: '🎨', title: 'Holi: save a colour palette in My Corner', metric: 'palettes', n: 1, href: '/home/corner' },
  },
  pasqua: {
    key: 'pasqua', name: 'Pasqua', emoji: '🐣', fall: 'petals', tint: 'rgba(212, 245, 220, 0.2)', pearls: 20,
    hello: 'Buona Pasqua! 🐣 Jelly found her bunny ears. Colomba for everyone!', backdrop: 'spring',
    quest: { id: 'season-pasqua', tier: 3, icon: '🌷', title: 'Pasqua: add a spring wish to your Milano list', metric: 'wishes', n: 1, href: '/home/milano' },
  },
  gudi: {
    key: 'gudi', name: 'Gudi Padwa', emoji: '🌼', fall: 'petals', tint: 'rgba(255, 180, 90, 0.16)', pearls: 25,
    hello: 'Gudi Padwachya hardik shubhechha, Saani! 🌼 A new year, and Jelly’s in her nauvari.', backdrop: 'gudi',
    quest: { id: 'season-gudi', tier: 3, icon: '🌼', title: 'Gudi Padwa: share a festive moment with home', metric: 'moments', n: 1, href: '/home/moments' },
  },
  graduation: {
    key: 'graduation', name: 'Graduation', emoji: '🎓', fall: 'confetti', tint: 'rgba(247, 227, 161, 0.22)', pearls: 60,
    hello: 'Congratulations, graduate! 🎓 Jelly is SO proud of you, Saani. You did it!', backdrop: 'graduation',
  },
};
export const SEASON_NAMES = Object.fromEntries(SEASON_KEYS.map((k) => [k, T[k].name])) as Record<SeasonKey, string>;

const at = (key: SeasonKey, start: string, end: string): Season => ({ ...T[key], id: `${key}-${start.slice(0, 4)}`, start, end });

/**
 * Her first year in Milano, and on. Fixed-date ones repeat; the moving ones are listed by year
 * (checked Oct 2026). Back to school marks her first weeks of classes; graduation comes from an
 * occasion her people set up.
 */
export const SEASONS: Season[] = [
  at('halloween', '2026-10-25', '2026-11-01'),
  at('diwali', '2026-11-05', '2026-11-11'),
  at('study', '2026-11-14', '2026-11-29'),
  at('natale', '2026-12-01', '2026-12-30'),
  at('capodanno', '2026-12-31', '2027-01-06'),
  at('inverno', '2027-01-07', '2027-01-29'),
  at('carnevale', '2027-01-30', '2027-02-09'),
  at('valentino', '2027-02-10', '2027-02-15'),
  at('holi', '2027-03-20', '2027-03-23'),
  at('pasqua', '2027-03-25', '2027-03-29'),
  at('gudi', '2027-04-06', '2027-04-08'),
  at('study', '2027-09-06', '2027-09-19'),
  at('halloween', '2027-10-23', '2027-10-26'),
  at('diwali', '2027-10-27', '2027-11-02'),
  at('natale', '2027-12-01', '2027-12-30'),
  at('capodanno', '2027-12-31', '2028-01-06'),
];

/** Seasonal backdrops for her home: brought by a season's first visit. */
export const SEASON_BACKDROPS = [
  { id: 'spooky', name: 'Pumpkin night', sky: 'radial-gradient(circle at 78% 18%, #ffe9b0 0 22px, transparent 24px), linear-gradient(180deg, #3b2a55 0%, #7a4a6e 55%, #e89a5a 100%)', floor: '#b8865a' },
  { id: 'diwali', name: 'Festival of lights', sky: 'radial-gradient(circle at 15% 30%, #ffd77a88 0 3px, transparent 5px), radial-gradient(circle at 60% 20%, #ffd77a88 0 3px, transparent 5px), radial-gradient(circle at 85% 40%, #ffd77a88 0 3px, transparent 5px), linear-gradient(180deg, #3a1f4a 0%, #8a3b5c 50%, #f2a65a 100%)', floor: '#d9a066' },
  { id: 'library', name: 'Cosy library', sky: 'repeating-linear-gradient(90deg, #e9d9f2 0 34px, #e2cfee 34px 36px), linear-gradient(180deg, #efe3f6, #f8ecf2)', floor: '#c9a27e' },
  { id: 'winter', name: 'Snowy Natale', sky: 'radial-gradient(circle at 20% 25%, #fff 0 2px, transparent 3px), radial-gradient(circle at 70% 15%, #fff 0 2px, transparent 3px), radial-gradient(circle at 45% 40%, #fff 0 2px, transparent 3px), linear-gradient(180deg, #a9c7e8 0%, #d8e6f5 55%, #f4f0fa 100%)', floor: '#f4f6fb' },
  { id: 'fireworks', name: 'Capodanno sky', sky: 'radial-gradient(circle at 25% 25%, #f4a6c0aa 0 10px, transparent 26px), radial-gradient(circle at 72% 20%, #cdb4f0aa 0 8px, transparent 22px), radial-gradient(circle at 50% 38%, #f7e3a1aa 0 6px, transparent 18px), linear-gradient(180deg, #1c1840 0%, #3b2f6e 60%, #7a5a9e 100%)', floor: '#5a4a7a' },
  { id: 'snowy-night', name: 'Sleepy snowfall', sky: 'radial-gradient(circle at 80% 18%, #fff7d6 0 16px, transparent 18px), radial-gradient(circle at 30% 30%, #fff 0 1.5px, transparent 2.5px), radial-gradient(circle at 60% 45%, #fff 0 1.5px, transparent 2.5px), linear-gradient(180deg, #4a4f86 0%, #8b8fc4 55%, #e7e3f5 100%)', floor: '#eef0f8' },
  { id: 'carnevale', name: 'Venetian night', sky: 'radial-gradient(circle at 15% 20%, #f4a6c0 0 3px, transparent 4px), radial-gradient(circle at 40% 35%, #7fb7b0 0 3px, transparent 4px), radial-gradient(circle at 70% 15%, #e0a84b 0 3px, transparent 4px), radial-gradient(circle at 85% 40%, #cdb4f0 0 3px, transparent 4px), linear-gradient(180deg, #2b3a6b 0%, #6a5a9a 50%, #f2c9a0 100%)', floor: '#7fa9c2' },
  { id: 'hearts', name: 'Pink hearts', sky: 'radial-gradient(circle at 20% 30%, #ffb6cc 0 6px, transparent 8px), radial-gradient(circle at 75% 22%, #ffb6cc 0 5px, transparent 7px), linear-gradient(180deg, #ffd6e4 0%, #ffe6ef 55%, #fff1f5 100%)', floor: '#f8d3dd' },
  { id: 'holi', name: 'Gulal', sky: 'radial-gradient(circle at 20% 30%, #ff8fc4aa 0 30px, transparent 60px), radial-gradient(circle at 75% 25%, #8fd3ffaa 0 30px, transparent 60px), radial-gradient(circle at 50% 50%, #ffe27aaa 0 30px, transparent 60px), linear-gradient(180deg, #fff2f8 0%, #f2fbff 100%)', floor: '#f6e2c4' },
  { id: 'spring', name: 'Easter garden', sky: 'linear-gradient(180deg, #cfeefa 0%, #e9f7e4 55%, #fde9f1 100%)', floor: '#e3ecc9' },
  { id: 'gudi', name: 'Marigold morning', sky: 'radial-gradient(circle at 50% 100%, #ffd27a 0 18%, transparent 45%), linear-gradient(180deg, #ffd9b0 0%, #ffe9c9 55%, #fff6e6 100%)', floor: '#e8b07a' },
  { id: 'graduation', name: 'Gold confetti', sky: 'radial-gradient(circle at 18% 30%, #f2c84b 0 3px, transparent 4px), radial-gradient(circle at 70% 20%, #f2c84b 0 3px, transparent 4px), radial-gradient(circle at 45% 45%, #fff 0 2px, transparent 3px), linear-gradient(180deg, #2b2730 0%, #5a4a5e 55%, #e9d9b8 100%)', floor: '#d9c39a' },
];

/** Her graduation, from the occasions her people set up (one with "graduation" or "laurea" in its title). */
export function occasionSeasons(occasions: { date: string; title: string }[]): Season[] {
  return occasions
    .filter((o) => /graduat|laurea|convocation/i.test(o.title))
    .map((o) => ({ ...T.graduation, id: `graduation-${o.date}`, start: o.date, end: o.date }));
}

/** What's on today: the shortest (most special) of anything running. */
export function seasonOn(day: string, extra: Season[] = []): Season | null {
  const on = [...extra, ...SEASONS].filter((s) => s.start <= day && day <= s.end);
  if (!on.length) return null;
  const len = (s: Season) => Date.parse(s.end) - Date.parse(s.start);
  return on.sort((a, b) => len(a) - len(b))[0];
}

/** A season as her screen needs it (no quest internals). */
export const seasonView = (s: Season | null) => (s ? { id: s.id, key: s.key, name: s.name, emoji: s.emoji, jelly: festiveSrc(s.key), fall: s.fall, tint: s.tint, hello: s.hello, end: s.end } : null);
export type SeasonView = NonNullable<ReturnType<typeof seasonView>>;
