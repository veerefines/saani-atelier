import type { Quest } from './quests';

/**
 * Jelly's seasons: festivals from home and from Milano across Saani's first year. While one is on,
 * Jelly wears something for it, her home gets a tint and things falling, she says it her way, a few
 * themed things are 30% off in her shop, and Saani's first visit brings a backdrop and pearls.
 * Dates are Milano days; festivals that move each year are listed per year (checked Oct 2026).
 * Shared by the server and her screen. No database code here.
 */

export type Look = 'pumpkin' | 'diya' | 'beret' | 'santa' | 'party' | 'heart' | 'mask' | 'colours' | 'shades' | 'crown';
export type Fall = 'leaves' | 'sparks' | 'confetti' | 'snow' | 'hearts' | 'colours' | 'petals';

export type Season = {
  /** unique per year, e.g. natale-2026 */
  id: string;
  key: string;
  name: string;
  emoji: string;
  start: string;
  end: string;
  look: Look;
  fall: Fall;
  /** a wash over her home's backdrop */
  tint: string;
  hello: string;
  /** themed things from the shop, 30% off while it's on */
  featured: string[];
  /** the backdrop her first visit brings (see SEASON_BACKDROPS) */
  backdrop?: string;
  pearls: number;
  quest?: Quest;
};

type Template = Omit<Season, 'id' | 'start' | 'end'>;

const T: Record<string, Template> = {
  halloween: {
    key: 'halloween', name: 'Halloween', emoji: '🎃', look: 'pumpkin', fall: 'leaves', tint: 'rgba(255, 150, 60, 0.16)', pearls: 15,
    hello: 'Boo! 🎃 Jelly’s in her pumpkin hat. Trick or treat, cara?',
    featured: ['candle-jar', 'lantern', 'potion-bottles', 'crystal-cluster', 'hourglass'], backdrop: 'spooky',
    quest: { id: 'season-halloween', tier: 3, icon: '🎃', title: 'Halloween: put a lantern or candle in Jelly’s home', metric: 'placed', n: 1, href: '/home/jelly?tab=shop' },
  },
  diwali: {
    key: 'diwali', name: 'Diwali', emoji: '🪔', look: 'diya', fall: 'sparks', tint: 'rgba(255, 190, 70, 0.18)', pearls: 25,
    hello: 'Happy Diwali, Saani! 🪔 Jelly lit a diya for you and your family back home.',
    featured: ['candle-jar', 'lantern', 'lantern-small', 'amber-pendant', 'sun-lamp', 'flower-bowl'], backdrop: 'diwali',
    quest: { id: 'season-diwali', tier: 3, icon: '🪔', title: 'Diwali: send your people a moment (or a mood!)', metric: 'moments', n: 1, href: '/home/moments' },
  },
  arrival: {
    key: 'arrival', name: 'Benvenuta a Milano', emoji: '✈️', look: 'beret', fall: 'confetti', tint: 'rgba(244, 166, 192, 0.16)', pearls: 40,
    hello: 'Benvenuta a Milano, Saani! ✈️ We made it! Jelly’s wearing her very best beret.',
    featured: ['camera', 'message-bottle', 'telescope', 'porthole', 'books'], backdrop: 'duomo',
    quest: { id: 'season-arrival', tier: 3, icon: '🛂', title: 'Welcome to Milano: stamp your very first place', metric: 'stamps', n: 1, href: '/home/passport' },
  },
  natale: {
    key: 'natale', name: 'Natale', emoji: '🎄', look: 'santa', fall: 'snow', tint: 'rgba(190, 225, 255, 0.2)', pearls: 30,
    hello: 'Buon Natale, tesoro! 🎄 Panettone for breakfast is allowed, Jelly checked.',
    featured: ['gift-box', 'wrapped-gift', 'bow-present', 'pink-gift', 'star-light', 'star-glow', 'blanket', 'candle-jar'], backdrop: 'winter',
    quest: { id: 'season-natale', tier: 3, icon: '🎁', title: 'Natale: wrap a gift for Jelly’s home', metric: 'bought', n: 1, href: '/home/jelly?tab=shop' },
  },
  capodanno: {
    key: 'capodanno', name: 'Capodanno', emoji: '🎆', look: 'party', fall: 'confetti', tint: 'rgba(205, 180, 240, 0.2)', pearls: 20,
    hello: 'Buon anno, Saani! 🎆 A whole new year in Milano. Jelly has a party hat on!',
    featured: ['star-light', 'star-glow', 'crystal-bloom', 'wish-bottle', 'star-bottle'], backdrop: 'fireworks',
    quest: { id: 'season-capodanno', tier: 3, icon: '🌠', title: 'Capodanno: add a wish for the new year', metric: 'wishes', n: 1, href: '/home/milano' },
  },
  valentino: {
    key: 'valentino', name: 'San Valentino', emoji: '💗', look: 'heart', fall: 'hearts', tint: 'rgba(255, 170, 200, 0.2)', pearls: 20,
    hello: 'Happy San Valentino! 💗 Jelly loves you more than pearls (and that’s a lot).',
    featured: ['heart-cushion', 'heart-locket', 'rose-crystal', 'pink-orb-lamp', 'letter', 'loveseat'], backdrop: 'hearts',
    quest: { id: 'season-valentino', tier: 3, icon: '💌', title: 'San Valentino: give Jelly 25 pats of love', metric: 'pets', n: 25 },
  },
  carnevale: {
    key: 'carnevale', name: 'Carnevale Ambrosiano', emoji: '🎭', look: 'mask', fall: 'confetti', tint: 'rgba(247, 227, 161, 0.2)', pearls: 20,
    hello: 'Carnevale! 🎭 Milano’s lasts a few days longer than everyone else’s. Chiacchiere, anyone?',
    featured: ['hatbox', 'hanging-mirror', 'octopus-plush', 'fish-plush', 'lilac-bow'], backdrop: 'carnevale',
    quest: { id: 'season-carnevale', tier: 3, icon: '🎭', title: 'Carnevale: pin a costume idea to your Lookbook', metric: 'looks', n: 1, href: '/home/lookbook' },
  },
  mfw: {
    key: 'mfw', name: 'Milano Fashion Week', emoji: '🕶️', look: 'shades', fall: 'petals', tint: 'rgba(30, 27, 36, 0.08)', pearls: 25,
    hello: 'It’s Fashion Week, darling! 🕶️ Jelly’s in her shades. Who are we seeing today?',
    featured: ['vanity', 'hanging-mirror', 'hatbox', 'camera', 'dresser', 'jewel-box'], backdrop: 'runway',
    quest: { id: 'season-mfw', tier: 3, icon: '📸', title: 'Fashion Week: pin a look you loved', metric: 'looks', n: 1, href: '/home/lookbook' },
  },
  holi: {
    key: 'holi', name: 'Holi', emoji: '🌈', look: 'colours', fall: 'colours', tint: 'rgba(255, 200, 230, 0.18)', pearls: 25,
    hello: 'Happy Holi, Saani! 🌈 Jelly’s covered in gulal. Bura na mano, Holi hai!',
    featured: ['coral-garden', 'flower-bowl', 'vase', 'reef', 'crystal-bloom'], backdrop: 'holi',
    quest: { id: 'season-holi', tier: 3, icon: '🎨', title: 'Holi: save a colour palette in My Corner', metric: 'palettes', n: 1, href: '/home/corner' },
  },
  primavera: {
    key: 'primavera', name: 'Primavera', emoji: '🌸', look: 'crown', fall: 'petals', tint: 'rgba(212, 245, 220, 0.2)', pearls: 15,
    hello: 'Primavera! 🌸 The Navigli are blooming. Jelly made herself a flower crown.',
    featured: ['lavender-pot', 'flower-bowl', 'vase', 'bud-vase', 'hanging-basket', 'fern-pot'], backdrop: 'spring',
  },
  birthday: {
    key: 'birthday', name: 'Your birthday', emoji: '🎂', look: 'crown', fall: 'confetti', tint: 'rgba(255, 214, 224, 0.22)', pearls: 50,
    hello: 'Tanti auguri a te, Saani! 🎂 It’s your day, and Jelly has a crown on just for you.',
    featured: ['gift-box', 'bow-present', 'wrapped-gift', 'crystal-bloom', 'glow-lamp'], backdrop: 'birthday',
  },
};

const at = (key: string, start: string, end: string): Season => ({ ...T[key], id: `${key}-${start.slice(0, 4)}`, start, end });

/** Her first year, and on (fixed-date festivals repeat; the moving ones are listed by year). */
export const SEASONS: Season[] = [
  at('halloween', '2026-10-25', '2026-11-01'),
  at('diwali', '2026-11-06', '2026-11-09'),
  at('arrival', '2026-11-10', '2026-11-13'),
  at('natale', '2026-12-01', '2027-01-06'),
  at('capodanno', '2026-12-31', '2027-01-06'),
  at('valentino', '2027-02-07', '2027-02-15'),
  at('carnevale', '2027-02-08', '2027-02-13'),
  at('holi', '2027-03-20', '2027-03-23'),
  at('mfw', '2027-02-23', '2027-03-01'),
  at('primavera', '2027-03-24', '2027-04-30'),
  at('mfw', '2027-09-21', '2027-09-27'),
  at('halloween', '2027-10-25', '2027-11-01'),
  at('diwali', '2027-10-27', '2027-10-30'),
  at('natale', '2027-12-01', '2028-01-06'),
];

/** Seasonal backdrops for her home: brought by a season's first visit. */
export const SEASON_BACKDROPS = [
  { id: 'spooky', name: 'Pumpkin night', sky: 'radial-gradient(circle at 78% 18%, #ffe9b0 0 22px, transparent 24px), linear-gradient(180deg, #3b2a55 0%, #7a4a6e 55%, #e89a5a 100%)', floor: '#b8865a' },
  { id: 'diwali', name: 'Festival of lights', sky: 'radial-gradient(circle at 15% 30%, #ffd77a88 0 3px, transparent 5px), radial-gradient(circle at 60% 20%, #ffd77a88 0 3px, transparent 5px), radial-gradient(circle at 85% 40%, #ffd77a88 0 3px, transparent 5px), linear-gradient(180deg, #3a1f4a 0%, #8a3b5c 50%, #f2a65a 100%)', floor: '#d9a066' },
  { id: 'duomo', name: 'Piazza del Duomo', sky: 'linear-gradient(180deg, #bcd8f2 0%, #f3e3ee 55%, #fbe9d6 100%)', floor: '#e7d7c2' },
  { id: 'winter', name: 'Snowy Natale', sky: 'radial-gradient(circle at 20% 25%, #fff 0 2px, transparent 3px), radial-gradient(circle at 70% 15%, #fff 0 2px, transparent 3px), radial-gradient(circle at 45% 40%, #fff 0 2px, transparent 3px), linear-gradient(180deg, #a9c7e8 0%, #d8e6f5 55%, #f4f0fa 100%)', floor: '#f4f6fb' },
  { id: 'fireworks', name: 'Capodanno sky', sky: 'radial-gradient(circle at 25% 25%, #f4a6c0aa 0 10px, transparent 26px), radial-gradient(circle at 72% 20%, #cdb4f0aa 0 8px, transparent 22px), radial-gradient(circle at 50% 38%, #f7e3a1aa 0 6px, transparent 18px), linear-gradient(180deg, #1c1840 0%, #3b2f6e 60%, #7a5a9e 100%)', floor: '#5a4a7a' },
  { id: 'hearts', name: 'Pink hearts', sky: 'radial-gradient(circle at 20% 30%, #ffb6cc 0 6px, transparent 8px), radial-gradient(circle at 75% 22%, #ffb6cc 0 5px, transparent 7px), linear-gradient(180deg, #ffd6e4 0%, #ffe6ef 55%, #fff1f5 100%)', floor: '#f8d3dd' },
  { id: 'carnevale', name: 'Coriandoli', sky: 'radial-gradient(circle at 15% 20%, #f4a6c0 0 3px, transparent 4px), radial-gradient(circle at 40% 35%, #7fb7b0 0 3px, transparent 4px), radial-gradient(circle at 70% 15%, #e0a84b 0 3px, transparent 4px), radial-gradient(circle at 85% 40%, #cdb4f0 0 3px, transparent 4px), linear-gradient(180deg, #fff3d6 0%, #fde4ee 60%, #efe6fc 100%)', floor: '#f2d9b8' },
  { id: 'runway', name: 'Front row', sky: 'linear-gradient(90deg, transparent 47%, #ffffff55 49%, #ffffff55 51%, transparent 53%), linear-gradient(180deg, #2b2730 0%, #4a4150 55%, #b9a6b6 100%)', floor: '#e8e2dc' },
  { id: 'holi', name: 'Gulal', sky: 'radial-gradient(circle at 20% 30%, #ff8fc4aa 0 30px, transparent 60px), radial-gradient(circle at 75% 25%, #8fd3ffaa 0 30px, transparent 60px), radial-gradient(circle at 50% 50%, #ffe27aaa 0 30px, transparent 60px), linear-gradient(180deg, #fff2f8 0%, #f2fbff 100%)', floor: '#f6e2c4' },
  { id: 'spring', name: 'Navigli in bloom', sky: 'linear-gradient(180deg, #cfeefa 0%, #e9f7e4 55%, #fde9f1 100%)', floor: '#e3ecc9' },
  { id: 'birthday', name: 'Birthday balloons', sky: 'radial-gradient(circle at 18% 30%, #f4a6c0 0 12px, transparent 13px), radial-gradient(circle at 80% 24%, #cdb4f0 0 12px, transparent 13px), radial-gradient(circle at 62% 40%, #f7e3a1 0 10px, transparent 11px), linear-gradient(180deg, #ffe8f0 0%, #fff4e0 60%, #fffaf2 100%)', floor: '#f9e2c8' },
];

export const FEATURED_OFF = 0.3;

/** Her birthday, from the occasions her people set up (an occasion with "birthday" in its title). */
export function birthdaySeasons(occasions: { date: string; title: string }[]): Season[] {
  return occasions
    .filter((o) => /birthday|compleanno/i.test(o.title))
    .map((o) => ({ ...T.birthday, id: `birthday-${o.date}`, start: o.date, end: o.date }));
}

/** What's on today: the shortest (most special) of anything running. */
export function seasonOn(day: string, extra: Season[] = []): Season | null {
  const on = [...extra, ...SEASONS].filter((s) => s.start <= day && day <= s.end);
  if (!on.length) return null;
  const len = (s: Season) => Date.parse(s.end) - Date.parse(s.start);
  return on.sort((a, b) => len(a) - len(b))[0];
}

/** A season as her screen needs it (no quest internals). */
export const seasonView = (s: Season | null) => (s ? { id: s.id, key: s.key, name: s.name, emoji: s.emoji, look: s.look, fall: s.fall, tint: s.tint, hello: s.hello, featured: s.featured, end: s.end } : null);
export type SeasonView = NonNullable<ReturnType<typeof seasonView>>;
