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

export const SEASON_KEYS = [
  'halloween', 'natale', 'diwali', 'holi', 'capodanno', 'gudi', 'pasqua', 'valentino', 'carnevale', 'graduation', 'study', 'inverno',
  'sankranti', 'pongal', 'shivratri', 'eid', 'rakhi', 'janmashtami', 'ganesh', 'onam', 'navratri', 'dussehra', 'karvachauth',
  'birthday',
] as const;
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
  sankranti: {
    key: 'sankranti', name: 'Makar Sankranti', emoji: '🪁', fall: 'confetti', tint: 'rgba(150, 200, 255, 0.16)', pearls: 20,
    hello: 'Happy Makar Sankranti, Saani! 🪁 Til gul ghya, god god bola. Jelly’s kite is the highest in the sky!', backdrop: 'kites',
    quest: { id: 'season-sankranti', tier: 3, icon: '🪁', title: 'Sankranti: send your people a sweet moment', metric: 'moments', n: 1, href: '/home/moments' },
  },
  pongal: {
    key: 'pongal', name: 'Pongal', emoji: '🍚', fall: 'petals', tint: 'rgba(255, 210, 120, 0.16)', pearls: 20,
    hello: 'Pongalo pongal! 🍚 May your pot overflow with happiness, Saani.', backdrop: 'gudi',
    quest: { id: 'season-pongal', tier: 3, icon: '🍚', title: 'Pongal: tick off a settling-in task (a fresh start!)', metric: 'checklist', n: 1, href: '/home/checklist' },
  },
  shivratri: {
    key: 'shivratri', name: 'Maha Shivaratri', emoji: '🔱', fall: 'sparks', tint: 'rgba(90, 80, 160, 0.16)', pearls: 20,
    hello: 'Har Har Mahadev! 🔱 A quiet, starry night for Maha Shivaratri. Jelly is keeping you company.', backdrop: 'moonlit',
    quest: { id: 'season-shivratri', tier: 3, icon: '🌙', title: 'Shivaratri: write a calm line in My chapter', metric: 'diaryDays', n: 1, href: '/home/chapter' },
  },
  eid: {
    key: 'eid', name: 'Eid', emoji: '🌙', fall: 'sparks', tint: 'rgba(90, 170, 130, 0.15)', pearls: 20,
    hello: 'Eid Mubarak, Saani! 🌙 Jelly lit her lantern. Sheer khurma for everyone!', backdrop: 'moonlit',
    quest: { id: 'season-eid', tier: 3, icon: '🏮', title: 'Eid: send Eid wishes to your people', metric: 'moments', n: 1, href: '/home/moments' },
  },
  rakhi: {
    key: 'rakhi', name: 'Raksha Bandhan', emoji: '🎁', fall: 'petals', tint: 'rgba(255, 180, 160, 0.16)', pearls: 25,
    hello: 'Happy Raksha Bandhan! 🎁 Jelly has a rakhi and a little present. Miss your people, cara?', backdrop: 'hearts',
    quest: { id: 'season-rakhi', tier: 3, icon: '🎀', title: 'Raksha Bandhan: share a moment with home', metric: 'moments', n: 1, href: '/home/moments' },
  },
  janmashtami: {
    key: 'janmashtami', name: 'Janmashtami', emoji: '🪈', fall: 'petals', tint: 'rgba(110, 150, 230, 0.16)', pearls: 20,
    hello: 'Happy Janmashtami! 🪈 Jelly found a flute and a peacock feather. Makhan, anyone?', backdrop: 'peacock',
    quest: { id: 'season-janmashtami', tier: 3, icon: '🪈', title: 'Janmashtami: give Jelly 20 pats', metric: 'pets', n: 20 },
  },
  ganesh: {
    key: 'ganesh', name: 'Ganesh Chaturthi', emoji: '🐘', fall: 'petals', tint: 'rgba(255, 170, 90, 0.16)', pearls: 25,
    hello: 'Ganpati Bappa Morya! 🐘 Jelly made modaks (well… she tried). Happy Ganesh Chaturthi!', backdrop: 'gudi',
    quest: { id: 'season-ganesh', tier: 3, icon: '🌺', title: 'Ganesh Chaturthi: put something new in Jelly’s home', metric: 'placed', n: 1, href: '/home/jelly' },
  },
  onam: {
    key: 'onam', name: 'Onam', emoji: '🌼', fall: 'petals', tint: 'rgba(250, 230, 160, 0.18)', pearls: 20,
    hello: 'Happy Onam, Saani! 🌼 Jelly made a pookalam and brought the sadya. Payasam first!', backdrop: 'gudi',
    quest: { id: 'season-onam', tier: 3, icon: '🍃', title: 'Onam: share a festive moment with home', metric: 'moments', n: 1, href: '/home/moments' },
  },
  navratri: {
    key: 'navratri', name: 'Navratri', emoji: '💃', fall: 'confetti', tint: 'rgba(255, 120, 140, 0.14)', pearls: 25,
    hello: 'Navratri is here! 💃 Jelly has her dandiya sticks ready. Garba tonight?', backdrop: 'garba',
    quest: { id: 'season-navratri', tier: 3, icon: '💃', title: 'Navratri: pin a festive outfit to your Lookbook', metric: 'looks', n: 1, href: '/home/lookbook' },
  },
  dussehra: {
    key: 'dussehra', name: 'Dussehra', emoji: '🏹', fall: 'sparks', tint: 'rgba(255, 190, 90, 0.16)', pearls: 20,
    hello: 'Happy Dussehra! 🏹 Good always wins, Saani. Jelly’s bow is ready.', backdrop: 'diwali',
    quest: { id: 'season-dussehra', tier: 3, icon: '🏹', title: 'Dussehra: tick off something you’ve been putting off', metric: 'checklist', n: 1, href: '/home/checklist' },
  },
  birthday: {
    key: 'birthday', name: 'Your birthday', emoji: '🎂', fall: 'confetti', tint: 'rgba(255, 214, 224, 0.22)', pearls: 50,
    hello: 'Tanti auguri a te, Saani! 🎂 Happy birthday! Jelly has a present (and a flower crown) just for you.', backdrop: 'birthday',
    quest: { id: 'season-birthday', tier: 3, icon: '🎂', title: 'Birthday: open a letter or a note from your people', metric: 'lettersOpened', n: 1, href: '/home/letters' },
  },
  karvachauth: {
    key: 'karvachauth', name: 'Karva Chauth', emoji: '🌕', fall: 'sparks', tint: 'rgba(200, 60, 80, 0.12)', pearls: 20,
    hello: 'Happy Karva Chauth! 🌕 Jelly has her chalni ready to spot the moon.', backdrop: 'moonlit',
    quest: { id: 'season-karvachauth', tier: 3, icon: '🌕', title: 'Karva Chauth: send a moment to your people tonight', metric: 'moments', n: 1, href: '/home/moments' },
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
  at('karvachauth', '2026-10-29', '2026-10-29'),
  at('diwali', '2026-11-05', '2026-11-11'),
  at('study', '2026-11-14', '2026-11-29'),
  at('natale', '2026-12-01', '2026-12-30'),
  at('capodanno', '2026-12-31', '2027-01-06'),
  at('inverno', '2027-01-07', '2027-01-29'),
  at('sankranti', '2027-01-13', '2027-01-14'),
  at('pongal', '2027-01-15', '2027-01-17'),
  at('carnevale', '2027-01-30', '2027-02-09'),
  at('valentino', '2027-02-10', '2027-02-15'),
  at('shivratri', '2027-03-06', '2027-03-06'),
  at('eid', '2027-03-09', '2027-03-11'),
  at('holi', '2027-03-20', '2027-03-23'),
  at('pasqua', '2027-03-25', '2027-03-29'),
  at('gudi', '2027-04-06', '2027-04-08'),
  at('rakhi', '2027-08-16', '2027-08-17'),
  at('janmashtami', '2027-08-24', '2027-08-25'),
  at('ganesh', '2027-09-04', '2027-09-08'),
  at('study', '2027-09-06', '2027-09-19'),
  at('onam', '2027-09-11', '2027-09-12'),
  at('navratri', '2027-09-30', '2027-10-08'),
  at('dussehra', '2027-10-09', '2027-10-09'),
  at('karvachauth', '2027-10-18', '2027-10-18'),
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
  { id: 'kites', name: 'Sky full of kites', sky: 'linear-gradient(45deg, transparent 46%, #f4a6c088 47% 53%, transparent 54%) 18% 22% / 34px 34px no-repeat, linear-gradient(45deg, transparent 46%, #e0a84b88 47% 53%, transparent 54%) 72% 14% / 26px 26px no-repeat, linear-gradient(45deg, transparent 46%, #7fb7b088 47% 53%, transparent 54%) 50% 32% / 22px 22px no-repeat, linear-gradient(180deg, #8fd0f5 0%, #c6e8fa 55%, #fff4dc 100%)', floor: '#e9cf9e' },
  { id: 'moonlit', name: 'Moonlit night', sky: 'radial-gradient(circle at 76% 20%, #fff6d0 0 20px, rgba(255, 246, 208, 0.25) 22px 38px, transparent 40px), radial-gradient(circle at 25% 30%, #fff 0 1.5px, transparent 2.5px), radial-gradient(circle at 55% 15%, #fff 0 1.5px, transparent 2.5px), linear-gradient(180deg, #1f2550 0%, #3d3a78 55%, #8a6fa8 100%)', floor: '#5d5486' },
  { id: 'peacock', name: 'Peacock blue', sky: 'radial-gradient(circle at 30% 30%, #2fb3a399 0 30px, transparent 60px), radial-gradient(circle at 70% 25%, #3f6fd199 0 34px, transparent 64px), linear-gradient(180deg, #2a4b8c 0%, #4f8fb8 55%, #cfe9e4 100%)', floor: '#8fb9a8' },
  { id: 'garba', name: 'Garba night', sky: 'radial-gradient(circle at 20% 25%, #ffcf5a 0 3px, transparent 4px), radial-gradient(circle at 50% 18%, #ff6f91 0 3px, transparent 4px), radial-gradient(circle at 80% 28%, #7fd0ff 0 3px, transparent 4px), linear-gradient(180deg, #5a1846 0%, #b2305f 55%, #ffb36b 100%)', floor: '#c9774f' },
  { id: 'birthday', name: 'Birthday balloons', sky: 'radial-gradient(circle at 18% 30%, #f4a6c0 0 12px, transparent 13px), radial-gradient(circle at 80% 24%, #cdb4f0 0 12px, transparent 13px), radial-gradient(circle at 62% 40%, #f7e3a1 0 10px, transparent 11px), linear-gradient(180deg, #ffe8f0 0%, #fff4e0 60%, #fffaf2 100%)', floor: '#f9e2c8' },
  { id: 'graduation', name: 'Gold confetti', sky: 'radial-gradient(circle at 18% 30%, #f2c84b 0 3px, transparent 4px), radial-gradient(circle at 70% 20%, #f2c84b 0 3px, transparent 4px), radial-gradient(circle at 45% 45%, #fff 0 2px, transparent 3px), linear-gradient(180deg, #2b2730 0%, #5a4a5e 55%, #e9d9b8 100%)', floor: '#d9c39a' },
];

/**
 * Special days added in admin that have their own festival: her birthday (an occasion with
 * "birthday" or "compleanno" in its title) and her graduation ("graduation", "laurea").
 */
export function occasionSeasons(occasions: { date: string; title: string }[]): Season[] {
  return occasions.flatMap((o) => {
    const key: SeasonKey | null = /birthday|b'?day|compleanno/i.test(o.title) ? 'birthday' : /graduat|laurea|convocation/i.test(o.title) ? 'graduation' : null;
    return key ? [{ ...T[key], id: `${key}-${o.date}`, start: o.date, end: o.date }] : [];
  });
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
