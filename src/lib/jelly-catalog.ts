/**
 * Jelly's Corner: what she can have in her home, and the achievements that earn pearls and unlock things.
 * Shared by the server (which checks and awards) and the browser (which shows progress).
 * No database code here.
 */

/* ---------- what Saani has done across the whole Atelier ---------- */
export type Stats = {
  visits: number; // days she's come by
  streak: number; // days in a row, up to today
  pets: number;
  jellyChats: number;
  level: number;
  placed: number; // things in Jelly's home
  bought: number;
  bingo: number;
  checklist: number;
  checklistTotal: number;
  stamps: number;
  fashionStamps: number;
  wishes: number;
  wishesDone: number;
  diaryDays: number;
  moments: number;
  looks: number;
  lettersOpened: number;
  jarDrawn: number;
  nudgesAnswered: number;
  songs: number;
  lovePosts: number;
  pages: number;
  projects: number;
  cornerItems: number;
  palettes: number;
  studioChats: number;
};
export type Metric = keyof Stats;

/* ---------- things for her home (pictures in public/corner/home/items) ---------- */
export type ItemKind = 'furniture' | 'lights' | 'plants' | 'treasures' | 'decor' | 'friends' | 'treats';
export const KINDS: { id: ItemKind; label: string }[] = [
  { id: 'furniture', label: 'Furniture' },
  { id: 'lights', label: 'Lights' },
  { id: 'plants', label: 'Plants & coral' },
  { id: 'treasures', label: 'Treasures' },
  { id: 'decor', label: 'Decor' },
  { id: 'friends', label: 'Sea friends' },
  { id: 'treats', label: 'Treats' },
];

/**
 * price: bought with pearls. Without a price it's exclusive: only an achievement unlocks it.
 * w: how wide it stands in her room, as a % of the room's width (before she resizes it).
 */
export type Thing = { id: string; name: string; kind: ItemKind; w: number; price?: number };
export const itemSrc = (id: string) => `/corner/home/items/${id}.webp`;

export const ITEMS: Thing[] = [
  // furniture
  { id: 'cushions', name: 'Star cushions', kind: 'furniture', w: 15, price: 30 },
  { id: 'cloud-rug', name: 'Cloud rug', kind: 'furniture', w: 22, price: 35 },
  { id: 'coral-table', name: 'Coral side table', kind: 'furniture', w: 10, price: 40 },
  { id: 'nightstand', name: 'Nightstand', kind: 'furniture', w: 9, price: 50 },
  { id: 'orb-table', name: 'Pearl orb table', kind: 'furniture', w: 13, price: 55 },
  { id: 'bookshelf', name: 'Seashell bookshelf', kind: 'furniture', w: 15, price: 80 },
  { id: 'shell-sofa', name: 'Shell sofa', kind: 'furniture', w: 20, price: 90 },
  { id: 'vanity', name: 'Pearl vanity', kind: 'furniture', w: 15 },
  { id: 'mirror', name: 'Mermaid mirror', kind: 'furniture', w: 9 },
  { id: 'shell-bed', name: 'Shell canopy bed', kind: 'furniture', w: 25 },
  // lights
  { id: 'star-pendant', name: 'Star pendant', kind: 'lights', w: 4, price: 10 },
  { id: 'star-light', name: 'Star light', kind: 'lights', w: 4, price: 12 },
  { id: 'lantern-small', name: 'Little lantern', kind: 'lights', w: 4, price: 18 },
  { id: 'shell-lantern', name: 'Shell lantern', kind: 'lights', w: 4, price: 20 },
  { id: 'lantern', name: 'Golden lantern', kind: 'lights', w: 4.5, price: 25 },
  { id: 'moon', name: 'Moon lamp', kind: 'lights', w: 6, price: 25 },
  { id: 'bubble-lamp', name: 'Bubble lamp', kind: 'lights', w: 4, price: 25 },
  { id: 'pendant', name: 'Pearl pendant', kind: 'lights', w: 3.5, price: 30 },
  { id: 'moon-mobile', name: 'Moon mobile', kind: 'lights', w: 6, price: 30 },
  { id: 'star-garland', name: 'Pearl garland', kind: 'lights', w: 18, price: 35 },
  { id: 'jelly-lamp', name: 'Jellyfish lamp', kind: 'lights', w: 8 },
  { id: 'moon-garland', name: 'Moon & star garland', kind: 'lights', w: 12 },
  { id: 'shell-chime', name: 'Shell wind chime', kind: 'lights', w: 7 },
  { id: 'star-jar', name: 'Jar of stars', kind: 'lights', w: 5 },
  // plants & coral
  { id: 'kelp', name: 'Kelp', kind: 'plants', w: 4, price: 8 },
  { id: 'seaweed', name: 'Seaweed', kind: 'plants', w: 5, price: 10 },
  { id: 'leafy-plant', name: 'Leafy plant', kind: 'plants', w: 9, price: 20 },
  { id: 'coral-pot', name: 'Coral pot', kind: 'plants', w: 8, price: 20 },
  { id: 'vase', name: 'Flower vase', kind: 'plants', w: 6, price: 22 },
  { id: 'palm', name: 'Potted palm', kind: 'plants', w: 9, price: 25 },
  { id: 'hanging-plant', name: 'Hanging plant', kind: 'plants', w: 8, price: 30 },
  { id: 'coral-bouquet', name: 'Coral bouquet', kind: 'plants', w: 10 },
  // treasures
  { id: 'bubble', name: 'Big bubble', kind: 'treasures', w: 3.5, price: 5 },
  { id: 'shell', name: 'Scallop shell', kind: 'treasures', w: 4, price: 8 },
  { id: 'starfish', name: 'Starfish', kind: 'treasures', w: 6, price: 10 },
  { id: 'pink-shell', name: 'Pink shell', kind: 'treasures', w: 6, price: 10 },
  { id: 'conch', name: 'Conch', kind: 'treasures', w: 6, price: 12 },
  { id: 'crystal-small', name: 'Little crystal', kind: 'treasures', w: 6, price: 15 },
  { id: 'crystal', name: 'Crystal', kind: 'treasures', w: 6, price: 30 },
  { id: 'clam-pearl', name: 'Clam with a pearl', kind: 'treasures', w: 9 },
  { id: 'crystal-cluster', name: 'Crystal cluster', kind: 'treasures', w: 7 },
  { id: 'snow-globe', name: 'Jelly snow globe', kind: 'treasures', w: 7 },
  // decor
  { id: 'arrow-sign', name: 'Arrow sign', kind: 'decor', w: 8, price: 12 },
  { id: 'towels', name: 'Fluffy towels', kind: 'decor', w: 9, price: 15 },
  { id: 'sign', name: 'Flower sign', kind: 'decor', w: 10, price: 15 },
  { id: 'star-sign', name: 'Star sign', kind: 'decor', w: 9, price: 15 },
  { id: 'old-books', name: 'Storybooks', kind: 'decor', w: 8, price: 18 },
  { id: 'books', name: 'Book stack', kind: 'decor', w: 8, price: 20 },
  { id: 'curtains', name: 'Pearl curtains', kind: 'decor', w: 20, price: 45 },
  { id: 'porthole', name: 'Porthole window', kind: 'decor', w: 13, price: 70 },
  // friends
  { id: 'fish', name: 'Fishy friend', kind: 'friends', w: 6, price: 35 },
  { id: 'baby-jelly', name: 'Baby jelly', kind: 'friends', w: 6 },
  // treats
  { id: 'latte', name: 'Seashell latte', kind: 'treats', w: 4.5, price: 10 },
  { id: 'teacup', name: 'Teacup', kind: 'treats', w: 7, price: 12 },
];
export const itemById = (id: string) => ITEMS.find((x) => x.id === id);

/* ---------- her room's backdrop ---------- */
export type Backdrop = { id: string; name: string; price?: number; sky: string; floor: string };
export const BACKDROPS: Backdrop[] = [
  { id: 'lagoon', name: 'Blue lagoon', price: 0, sky: 'linear-gradient(180deg, #bfe6f5 0%, #d9ecfb 45%, #f3e6fb 100%)', floor: '#f6e2c4' },
  { id: 'sunset', name: 'Sunset pink', price: 40, sky: 'linear-gradient(180deg, #ffc9b5 0%, #fbd3e3 50%, #f6e0f4 100%)', floor: '#f9dccb' },
  { id: 'lavender', name: 'Lavender dream', price: 40, sky: 'linear-gradient(180deg, #d9c8f5 0%, #ead9fb 55%, #fbe7f2 100%)', floor: '#eadcf3' },
  { id: 'mint', name: 'Mint reef', price: 40, sky: 'linear-gradient(180deg, #bfeee0 0%, #d6f3ea 50%, #eaf6f2 100%)', floor: '#efe3c7' },
  { id: 'stars', name: 'Midnight stars', price: 60, sky: 'radial-gradient(circle at 20% 20%, #fff8 0 1px, transparent 2px), radial-gradient(circle at 70% 35%, #fff9 0 1px, transparent 2px), radial-gradient(circle at 45% 10%, #fff7 0 1px, transparent 2px), linear-gradient(180deg, #2a2456 0%, #4a3a7a 55%, #8a5f9e 100%)', floor: '#6b5a8a' },
  { id: 'milano', name: 'Milano by night', sky: 'linear-gradient(180deg, #1e2a4a 0%, #4b3d6e 50%, #e2a0a8 100%)', floor: '#c9a98a' },
  { id: 'flat', name: 'Cosy Milan flat', sky: 'repeating-linear-gradient(90deg, #fbe9df 0 26px, #f7dfd3 26px 52px)', floor: '#d9b08c' },
  { id: 'rainbow', name: 'Rainbow reef', sky: 'linear-gradient(180deg, #ffd6e0 0%, #ffe8c7 25%, #fff6c4 45%, #d4f5dc 65%, #cfe8fb 85%, #e3d6fb 100%)', floor: '#f6e2c4' },
];
export const backdropById = (id: string) => BACKDROPS.find((b) => b.id === id) ?? BACKDROPS[0];

/* ---------- achievements, across the whole Atelier ---------- */
export type AchGroup = 'Jelly' | 'Milano' | 'Settling in' | 'Bingo' | 'Your story' | 'Your people' | 'My Corner';
export type Achievement = { id: string; group: AchGroup; icon: string; title: string; desc: string; metric: Metric; goal: number | 'all'; pearls: number; reward?: string; backdrop?: string };

export const ACHIEVEMENTS: Achievement[] = [
  // Jelly herself
  { id: 'hello', group: 'Jelly', icon: '🪼', title: 'Nice to meet you', desc: 'Visit Jelly for the first time', metric: 'visits', goal: 1, pearls: 20, reward: 'starfish' },
  { id: 'first-pat', group: 'Jelly', icon: '🫶', title: 'First pat', desc: 'Give Jelly a pat', metric: 'pets', goal: 1, pearls: 10, reward: 'pink-shell' },
  { id: 'pats-50', group: 'Jelly', icon: '💗', title: 'Professional patter', desc: 'Give Jelly 50 pats', metric: 'pets', goal: 50, pearls: 25, reward: 'clam-pearl' },
  { id: 'pats-300', group: 'Jelly', icon: '👑', title: 'Jelly whisperer', desc: 'Give Jelly 300 pats', metric: 'pets', goal: 300, pearls: 60, reward: 'snow-globe' },
  { id: 'chat-1', group: 'Jelly', icon: '💬', title: 'First chat', desc: 'Ask Jelly something', metric: 'jellyChats', goal: 1, pearls: 10, reward: 'teacup' },
  { id: 'chat-25', group: 'Jelly', icon: '📱', title: 'Chatterbox', desc: 'Have 25 chats with Jelly', metric: 'jellyChats', goal: 25, pearls: 50, reward: 'star-jar' },
  { id: 'level-3', group: 'Jelly', icon: '🤝', title: 'Best friends', desc: 'Reach friendship level 3', metric: 'level', goal: 3, pearls: 30, reward: 'baby-jelly' },
  { id: 'level-6', group: 'Jelly', icon: '🌈', title: 'Soulmates (aquatic)', desc: 'Reach friendship level 6', metric: 'level', goal: 6, pearls: 80, reward: 'jelly-lamp', backdrop: 'rainbow' },
  { id: 'streak-3', group: 'Jelly', icon: '🔥', title: 'Three in a row', desc: 'Visit 3 days in a row', metric: 'streak', goal: 3, pearls: 20 },
  { id: 'streak-7', group: 'Jelly', icon: '📅', title: 'A whole week', desc: 'Visit 7 days in a row', metric: 'streak', goal: 7, pearls: 50, reward: 'moon-garland' },
  { id: 'visits-30', group: 'Jelly', icon: '🏅', title: 'A regular', desc: 'Visit on 30 different days', metric: 'visits', goal: 30, pearls: 80, reward: 'crystal-cluster' },
  { id: 'shop-1', group: 'Jelly', icon: '🛍️', title: 'First purchase', desc: 'Buy something for Jelly’s home', metric: 'bought', goal: 1, pearls: 10 },
  { id: 'decor-5', group: 'Jelly', icon: '💡', title: 'Interior designer', desc: 'Put 5 things in Jelly’s home', metric: 'placed', goal: 5, pearls: 25, reward: 'star-pendant' },
  { id: 'decor-15', group: 'Jelly', icon: '🪩', title: 'Maximalist', desc: 'Put 15 things in Jelly’s home', metric: 'placed', goal: 15, pearls: 60, reward: 'star-garland' },
  // Milano
  { id: 'stamp-1', group: 'Milano', icon: '🛂', title: 'First stamp', desc: 'Stamp your passport once', metric: 'stamps', goal: 1, pearls: 15, reward: 'arrow-sign' },
  { id: 'stamp-10', group: 'Milano', icon: '🚋', title: 'Passport collector', desc: 'Collect 10 passport stamps', metric: 'stamps', goal: 10, pearls: 40, reward: 'sign' },
  { id: 'stamp-25', group: 'Milano', icon: '⛪', title: 'Milano local', desc: 'Collect 25 passport stamps', metric: 'stamps', goal: 25, pearls: 90, reward: 'coral-bouquet' },
  { id: 'stamp-50', group: 'Milano', icon: '🌃', title: 'City explorer', desc: 'Collect 50 passport stamps', metric: 'stamps', goal: 50, pearls: 150, reward: 'shell-chime', backdrop: 'milano' },
  { id: 'fashion-5', group: 'Milano', icon: '👠', title: 'Fashion pilgrim', desc: 'Stamp 5 fashion spots', metric: 'fashionStamps', goal: 5, pearls: 40, reward: 'vanity' },
  { id: 'wish-1', group: 'Milano', icon: '🌠', title: 'Make a wish', desc: 'Add something to your wish list', metric: 'wishes', goal: 1, pearls: 10, reward: 'star-light' },
  { id: 'wishes-5', group: 'Milano', icon: '🌠', title: 'Dreams come true', desc: 'Tick off 5 wishes', metric: 'wishesDone', goal: 5, pearls: 40, reward: 'moon-mobile' },
  // settling in
  { id: 'check-1', group: 'Settling in', icon: '✅', title: 'First step', desc: 'Tick one settling-in task', metric: 'checklist', goal: 1, pearls: 10, reward: 'latte' },
  { id: 'check-5', group: 'Settling in', icon: '🧳', title: 'Halfway home', desc: 'Tick 5 settling-in tasks', metric: 'checklist', goal: 5, pearls: 40, reward: 'towels' },
  { id: 'check-all', group: 'Settling in', icon: '🏡', title: 'All settled in', desc: 'Finish the whole settling-in list', metric: 'checklist', goal: 'all', pearls: 100, reward: 'shell-bed', backdrop: 'flat' },
  // bingo
  { id: 'bingo-1', group: 'Bingo', icon: '🎯', title: 'First square', desc: 'Mark a bingo square', metric: 'bingo', goal: 1, pearls: 15, reward: 'conch' },
  { id: 'bingo-5', group: 'Bingo', icon: '🍹', title: 'On a roll', desc: 'Mark 5 bingo squares', metric: 'bingo', goal: 5, pearls: 40, reward: 'crystal' },
  { id: 'bingo-12', group: 'Bingo', icon: '🏆', title: 'Bingo champion', desc: 'Mark 12 bingo squares', metric: 'bingo', goal: 12, pearls: 80, reward: 'orb-table' },
  { id: 'bingo-20', group: 'Bingo', icon: '🦄', title: 'Bingo legend', desc: 'Mark 20 bingo squares', metric: 'bingo', goal: 20, pearls: 150, reward: 'bubble-lamp' },
  // your story
  { id: 'diary-1', group: 'Your story', icon: '📓', title: 'Dear diary', desc: 'Write your first chapter day', metric: 'diaryDays', goal: 1, pearls: 10, reward: 'old-books' },
  { id: 'diary-7', group: 'Your story', icon: '🖋️', title: 'A week of words', desc: 'Write on 7 days', metric: 'diaryDays', goal: 7, pearls: 40, reward: 'books' },
  { id: 'diary-30', group: 'Your story', icon: '🕯️', title: 'A month of memories', desc: 'Write on 30 days', metric: 'diaryDays', goal: 30, pearls: 100, reward: 'bookshelf' },
  { id: 'moment-1', group: 'Your story', icon: '📷', title: 'Say cheese', desc: 'Share your first moment', metric: 'moments', goal: 1, pearls: 15, reward: 'bubble' },
  { id: 'moment-10', group: 'Your story', icon: '🎞️', title: 'Little film-maker', desc: 'Share 10 moments', metric: 'moments', goal: 10, pearls: 50, reward: 'fish' },
  { id: 'look-1', group: 'Your story', icon: '👗', title: 'First look', desc: 'Add to your lookbook', metric: 'looks', goal: 1, pearls: 10, reward: 'cushions' },
  { id: 'look-15', group: 'Your story', icon: '🪞', title: 'Style icon', desc: 'Add 15 looks', metric: 'looks', goal: 15, pearls: 60, reward: 'mirror' },
  // your people
  { id: 'letter-1', group: 'Your people', icon: '💌', title: 'Special delivery', desc: 'Open a letter', metric: 'lettersOpened', goal: 1, pearls: 10, reward: 'star-sign' },
  { id: 'letters-5', group: 'Your people', icon: '📮', title: 'Pen pals', desc: 'Open 5 letters', metric: 'lettersOpened', goal: 5, pearls: 40, reward: 'shell-lantern' },
  { id: 'jar-1', group: 'Your people', icon: '🫙', title: 'Dip in the jar', desc: 'Draw a note from the jar', metric: 'jarDrawn', goal: 1, pearls: 10, reward: 'vase' },
  { id: 'nudge-1', group: 'Your people', icon: '🤗', title: 'Thinking of you too', desc: 'Answer a nudge from a friend', metric: 'nudgesAnswered', goal: 1, pearls: 10, reward: 'leafy-plant' },
  { id: 'songs-5', group: 'Your people', icon: '🎧', title: 'Mixtape', desc: 'Have 5 songs dedicated to you', metric: 'songs', goal: 5, pearls: 30, reward: 'moon' },
  { id: 'songs-15', group: 'Your people', icon: '📻', title: 'On the radio', desc: 'Have 15 songs dedicated to you', metric: 'songs', goal: 15, pearls: 50, reward: 'nightstand' },
  { id: 'love-10', group: 'Your people', icon: '💐', title: 'So very loved', desc: 'Get 10 notes on your love wall', metric: 'lovePosts', goal: 10, pearls: 30, reward: 'hanging-plant' },
  { id: 'pages-1', group: 'Your people', icon: '📒', title: 'Scrapbook star', desc: 'Get a scrapbook page from your people', metric: 'pages', goal: 1, pearls: 15, reward: 'curtains' },
  // my corner
  { id: 'project-1', group: 'My Corner', icon: '✂️', title: 'First project', desc: 'Start a project in My Corner', metric: 'projects', goal: 1, pearls: 15, reward: 'coral-table' },
  { id: 'projects-5', group: 'My Corner', icon: '🧵', title: 'Busy studio', desc: 'Have 5 projects', metric: 'projects', goal: 5, pearls: 50, reward: 'cloud-rug' },
  { id: 'items-25', group: 'My Corner', icon: '🧶', title: 'Collector of ideas', desc: 'Add 25 things to your projects', metric: 'cornerItems', goal: 25, pearls: 40, reward: 'palm' },
  { id: 'palette-1', group: 'My Corner', icon: '🎨', title: 'Colour story', desc: 'Save a colour palette', metric: 'palettes', goal: 1, pearls: 10, reward: 'coral-pot' },
  { id: 'studio-1', group: 'My Corner', icon: '📖', title: 'Jelly got this', desc: 'Ask a studio question in a project', metric: 'studioChats', goal: 1, pearls: 10, reward: 'kelp' },
];

export const goalOf = (a: Achievement, s: Stats) => (a.goal === 'all' ? s.checklistTotal : a.goal);
export const progressOf = (a: Achievement, s: Stats) => Math.min(1, s[a.metric] / Math.max(1, goalOf(a, s)));
/** Which reward an item came from, for the shop's "unlock by…" note. */
export const unlockedBy = (itemId: string) => ACHIEVEMENTS.find((a) => a.reward === itemId);
export const backdropUnlockedBy = (id: string) => ACHIEVEMENTS.find((a) => a.backdrop === id);

/* ---------- her home ---------- */
export type Placed = { uid: string; item: string; x: number; y: number; s: number; flip: boolean };
export const MAX_PLACED = 60;
