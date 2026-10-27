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

/* ---------- things for her home ---------- */
export type ItemKind = 'nature' | 'furniture' | 'treats' | 'fashion' | 'friends' | 'sky' | 'italia';
export const KINDS: { id: ItemKind; label: string }[] = [
  { id: 'nature', label: '🪴 Plants & sea' },
  { id: 'furniture', label: '🛋️ Furniture' },
  { id: 'treats', label: '🍰 Treats' },
  { id: 'fashion', label: '👒 Fashion' },
  { id: 'friends', label: '🐠 Sea friends' },
  { id: 'sky', label: '✨ Sparkle' },
  { id: 'italia', label: '🇮🇹 Italia' },
];

/** price: bought with pearls. Without a price it's a reward, unlocked by an achievement. */
export type Thing = { id: string; name: string; emoji: string; kind: ItemKind; price?: number };

export const ITEMS: Thing[] = [
  // plants & sea
  { id: 'seaweed', name: 'Seaweed', emoji: '🌿', kind: 'nature', price: 10 },
  { id: 'cactus', name: 'Little cactus', emoji: '🌵', kind: 'nature', price: 15 },
  { id: 'tulips', name: 'Tulips', emoji: '🌷', kind: 'nature', price: 15 },
  { id: 'sunflower', name: 'Sunflower', emoji: '🌻', kind: 'nature', price: 15 },
  { id: 'blossom', name: 'Cherry blossom', emoji: '🌸', kind: 'nature', price: 15 },
  { id: 'plant', name: 'Potted plant', emoji: '🪴', kind: 'nature', price: 20 },
  { id: 'coral', name: 'Coral', emoji: '🪸', kind: 'nature', price: 25 },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄', kind: 'nature', price: 30 },
  { id: 'shell', name: 'Seashell', emoji: '🐚', kind: 'nature' },
  { id: 'bouquet', name: 'Bouquet', emoji: '💐', kind: 'nature' },
  // furniture
  { id: 'chair', name: 'Chair', emoji: '🪑', kind: 'furniture', price: 30 },
  { id: 'books', name: 'Books', emoji: '📚', kind: 'furniture', price: 25 },
  { id: 'lantern', name: 'Lantern', emoji: '🏮', kind: 'furniture', price: 30 },
  { id: 'painting', name: 'Painting', emoji: '🖼️', kind: 'furniture', price: 35 },
  { id: 'clock', name: 'Clock', emoji: '🕰️', kind: 'furniture', price: 40 },
  { id: 'sofa', name: 'Sofa', emoji: '🛋️', kind: 'furniture', price: 60 },
  { id: 'bed', name: 'Cosy bed', emoji: '🛏️', kind: 'furniture', price: 70 },
  { id: 'bathtub', name: 'Bubble bath', emoji: '🛁', kind: 'furniture', price: 80 },
  { id: 'pillow', name: 'Heart pillow', emoji: '💗', kind: 'furniture' },
  { id: 'teddy', name: 'Teddy bear', emoji: '🧸', kind: 'furniture' },
  { id: 'lamp', name: 'Lamp', emoji: '💡', kind: 'furniture' },
  { id: 'mirror', name: 'Mirror', emoji: '🪞', kind: 'furniture' },
  { id: 'candle', name: 'Candle', emoji: '🕯️', kind: 'furniture' },
  { id: 'notebook', name: 'Notebook', emoji: '📓', kind: 'furniture' },
  { id: 'pen', name: 'Fountain pen', emoji: '🖋️', kind: 'furniture' },
  { id: 'camera', name: 'Camera', emoji: '📷', kind: 'furniture' },
  { id: 'film', name: 'Film reel', emoji: '🎞️', kind: 'furniture' },
  { id: 'headphones', name: 'Headphones', emoji: '🎧', kind: 'furniture' },
  { id: 'radio', name: 'Radio', emoji: '📻', kind: 'furniture' },
  { id: 'phone', name: 'Phone', emoji: '📱', kind: 'furniture' },
  { id: 'calendar', name: 'Calendar', emoji: '📅', kind: 'furniture' },
  { id: 'disco', name: 'Disco ball', emoji: '🪩', kind: 'furniture' },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', kind: 'furniture' },
  { id: 'suitcase', name: 'Suitcase', emoji: '🧳', kind: 'furniture' },
  { id: 'house', name: 'Little house', emoji: '🏡', kind: 'furniture' },
  // treats
  { id: 'bubbles', name: 'Bubble pack', emoji: '🫧', kind: 'treats', price: 5 },
  { id: 'donut', name: 'Donut', emoji: '🍩', kind: 'treats', price: 10 },
  { id: 'cupcake', name: 'Cupcake', emoji: '🧁', kind: 'treats', price: 10 },
  { id: 'coffee', name: 'Espresso', emoji: '☕', kind: 'treats', price: 10 },
  { id: 'cornetto', name: 'Cornetto', emoji: '🥐', kind: 'treats', price: 10 },
  { id: 'gelato', name: 'Gelato', emoji: '🍦', kind: 'treats', price: 12 },
  { id: 'cake', name: 'Cake', emoji: '🍰', kind: 'treats', price: 15 },
  { id: 'pasta', name: 'Pasta', emoji: '🍝', kind: 'treats', price: 15 },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', kind: 'treats', price: 15 },
  { id: 'bubbletea', name: 'Bubble tea', emoji: '🧋', kind: 'treats' },
  { id: 'spritz', name: 'Spritz', emoji: '🍹', kind: 'treats' },
  // fashion
  { id: 'bow', name: 'Bow', emoji: '🎀', kind: 'fashion', price: 12 },
  { id: 'needle', name: 'Needle', emoji: '🪡', kind: 'fashion', price: 15 },
  { id: 'hat', name: 'Sun hat', emoji: '👒', kind: 'fashion', price: 25 },
  { id: 'handbag', name: 'Handbag', emoji: '👜', kind: 'fashion', price: 45 },
  { id: 'ring', name: 'Ring', emoji: '💍', kind: 'fashion', price: 60 },
  { id: 'dress', name: 'Dress', emoji: '👗', kind: 'fashion' },
  { id: 'heels', name: 'Heels', emoji: '👠', kind: 'fashion' },
  { id: 'scissors', name: 'Scissors', emoji: '✂️', kind: 'fashion' },
  { id: 'thread', name: 'Thread', emoji: '🧵', kind: 'fashion' },
  { id: 'yarn', name: 'Yarn', emoji: '🧶', kind: 'fashion' },
  { id: 'palette', name: 'Paint palette', emoji: '🎨', kind: 'fashion' },
  { id: 'crown', name: 'Crown', emoji: '👑', kind: 'fashion' },
  { id: 'glasses', name: 'Reading glasses', emoji: '👓', kind: 'fashion' },
  // sea friends
  { id: 'fish', name: 'Fishy', emoji: '🐠', kind: 'friends', price: 30 },
  { id: 'crab', name: 'Crab', emoji: '🦀', kind: 'friends', price: 30 },
  { id: 'puffer', name: 'Pufferfish', emoji: '🐡', kind: 'friends', price: 35 },
  { id: 'octopus', name: 'Octopus', emoji: '🐙', kind: 'friends', price: 50 },
  { id: 'turtle', name: 'Turtle', emoji: '🐢', kind: 'friends', price: 55 },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', kind: 'friends', price: 90 },
  { id: 'whale', name: 'Whale', emoji: '🐳', kind: 'friends', price: 120 },
  { id: 'dolphin', name: 'Dolphin', emoji: '🐬', kind: 'friends' },
  // sparkle
  { id: 'sparkles', name: 'Sparkles', emoji: '✨', kind: 'sky', price: 8 },
  { id: 'star', name: 'Star', emoji: '⭐', kind: 'sky', price: 10 },
  { id: 'balloon', name: 'Balloon', emoji: '🎈', kind: 'sky', price: 10 },
  { id: 'moon', name: 'Moon', emoji: '🌙', kind: 'sky', price: 25 },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', kind: 'sky' },
  { id: 'shooting', name: 'Shooting star', emoji: '🌠', kind: 'sky' },
  { id: 'letter', name: 'Love letter', emoji: '💌', kind: 'sky' },
  { id: 'postbox', name: 'Post box', emoji: '📮', kind: 'sky' },
  { id: 'jar', name: 'Jar of notes', emoji: '🫙', kind: 'sky' },
  { id: 'hug', name: 'Big hug', emoji: '🤗', kind: 'sky' },
  // italia
  { id: 'lemon', name: 'Amalfi lemon', emoji: '🍋', kind: 'italia', price: 10 },
  { id: 'flag', name: 'Italian flag', emoji: '🇮🇹', kind: 'italia', price: 20 },
  { id: 'mask', name: 'Venetian mask', emoji: '🎭', kind: 'italia', price: 40 },
  { id: 'vespa', name: 'Vespa', emoji: '🛵', kind: 'italia', price: 70 },
  { id: 'postcard', name: 'Postcard', emoji: '🗺️', kind: 'italia' },
  { id: 'tram', name: 'Milano tram', emoji: '🚋', kind: 'italia' },
  { id: 'duomo', name: 'Duomo', emoji: '⛪', kind: 'italia' },
  { id: 'gondola', name: 'Gondola', emoji: '🛶', kind: 'italia' },
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
  { id: 'hello', group: 'Jelly', icon: '🪼', title: 'Nice to meet you', desc: 'Visit Jelly for the first time', metric: 'visits', goal: 1, pearls: 20, reward: 'shell' },
  { id: 'first-pat', group: 'Jelly', icon: '🫶', title: 'First pat', desc: 'Give Jelly a pat', metric: 'pets', goal: 1, pearls: 10, reward: 'pillow' },
  { id: 'pats-50', group: 'Jelly', icon: '💗', title: 'Professional patter', desc: 'Give Jelly 50 pats', metric: 'pets', goal: 50, pearls: 25, reward: 'teddy' },
  { id: 'pats-300', group: 'Jelly', icon: '👑', title: 'Jelly whisperer', desc: 'Give Jelly 300 pats', metric: 'pets', goal: 300, pearls: 60, reward: 'crown' },
  { id: 'chat-1', group: 'Jelly', icon: '💬', title: 'First chat', desc: 'Ask Jelly something', metric: 'jellyChats', goal: 1, pearls: 10, reward: 'bubbletea' },
  { id: 'chat-25', group: 'Jelly', icon: '📱', title: 'Chatterbox', desc: 'Have 25 chats with Jelly', metric: 'jellyChats', goal: 25, pearls: 50, reward: 'phone' },
  { id: 'level-3', group: 'Jelly', icon: '🤝', title: 'Best friends', desc: 'Reach friendship level 3', metric: 'level', goal: 3, pearls: 30, reward: 'dolphin' },
  { id: 'level-6', group: 'Jelly', icon: '🌈', title: 'Soulmates (aquatic)', desc: 'Reach friendship level 6', metric: 'level', goal: 6, pearls: 80, reward: 'rainbow', backdrop: 'rainbow' },
  { id: 'streak-3', group: 'Jelly', icon: '🔥', title: 'Three in a row', desc: 'Visit 3 days in a row', metric: 'streak', goal: 3, pearls: 20 },
  { id: 'streak-7', group: 'Jelly', icon: '📅', title: 'A whole week', desc: 'Visit 7 days in a row', metric: 'streak', goal: 7, pearls: 50, reward: 'calendar' },
  { id: 'visits-30', group: 'Jelly', icon: '🏅', title: 'A regular', desc: 'Visit on 30 different days', metric: 'visits', goal: 30, pearls: 80, reward: 'disco' },
  { id: 'shop-1', group: 'Jelly', icon: '🛍️', title: 'First purchase', desc: 'Buy something for Jelly’s home', metric: 'bought', goal: 1, pearls: 10 },
  { id: 'decor-5', group: 'Jelly', icon: '💡', title: 'Interior designer', desc: 'Put 5 things in Jelly’s home', metric: 'placed', goal: 5, pearls: 25, reward: 'lamp' },
  { id: 'decor-15', group: 'Jelly', icon: '🪩', title: 'Maximalist', desc: 'Put 15 things in Jelly’s home', metric: 'placed', goal: 15, pearls: 60, reward: 'mirror' },
  // Milano
  { id: 'stamp-1', group: 'Milano', icon: '🛂', title: 'First stamp', desc: 'Stamp your passport once', metric: 'stamps', goal: 1, pearls: 15, reward: 'postcard' },
  { id: 'stamp-10', group: 'Milano', icon: '🚋', title: 'Passport collector', desc: 'Collect 10 passport stamps', metric: 'stamps', goal: 10, pearls: 40, reward: 'tram' },
  { id: 'stamp-25', group: 'Milano', icon: '⛪', title: 'Milano local', desc: 'Collect 25 passport stamps', metric: 'stamps', goal: 25, pearls: 90, reward: 'duomo' },
  { id: 'stamp-50', group: 'Milano', icon: '🌃', title: 'City explorer', desc: 'Collect 50 passport stamps', metric: 'stamps', goal: 50, pearls: 150, reward: 'gondola', backdrop: 'milano' },
  { id: 'fashion-5', group: 'Milano', icon: '👠', title: 'Fashion pilgrim', desc: 'Stamp 5 fashion spots', metric: 'fashionStamps', goal: 5, pearls: 40, reward: 'heels' },
  { id: 'wish-1', group: 'Milano', icon: '🌠', title: 'Make a wish', desc: 'Add something to your wish list', metric: 'wishes', goal: 1, pearls: 10 },
  { id: 'wishes-5', group: 'Milano', icon: '🌠', title: 'Dreams come true', desc: 'Tick off 5 wishes', metric: 'wishesDone', goal: 5, pearls: 40, reward: 'shooting' },
  // settling in
  { id: 'check-1', group: 'Settling in', icon: '✅', title: 'First step', desc: 'Tick one settling-in task', metric: 'checklist', goal: 1, pearls: 10 },
  { id: 'check-5', group: 'Settling in', icon: '🧳', title: 'Halfway home', desc: 'Tick 5 settling-in tasks', metric: 'checklist', goal: 5, pearls: 40, reward: 'suitcase' },
  { id: 'check-all', group: 'Settling in', icon: '🏡', title: 'All settled in', desc: 'Finish the whole settling-in list', metric: 'checklist', goal: 'all', pearls: 100, reward: 'house', backdrop: 'flat' },
  // bingo
  { id: 'bingo-1', group: 'Bingo', icon: '🎯', title: 'First square', desc: 'Mark a bingo square', metric: 'bingo', goal: 1, pearls: 15 },
  { id: 'bingo-5', group: 'Bingo', icon: '🍹', title: 'On a roll', desc: 'Mark 5 bingo squares', metric: 'bingo', goal: 5, pearls: 40, reward: 'spritz' },
  { id: 'bingo-12', group: 'Bingo', icon: '🏆', title: 'Bingo champion', desc: 'Mark 12 bingo squares', metric: 'bingo', goal: 12, pearls: 80, reward: 'trophy' },
  { id: 'bingo-20', group: 'Bingo', icon: '🦄', title: 'Bingo legend', desc: 'Mark 20 bingo squares', metric: 'bingo', goal: 20, pearls: 150, reward: 'glasses' },
  // your story
  { id: 'diary-1', group: 'Your story', icon: '📓', title: 'Dear diary', desc: 'Write your first chapter day', metric: 'diaryDays', goal: 1, pearls: 10, reward: 'notebook' },
  { id: 'diary-7', group: 'Your story', icon: '🖋️', title: 'A week of words', desc: 'Write on 7 days', metric: 'diaryDays', goal: 7, pearls: 40, reward: 'pen' },
  { id: 'diary-30', group: 'Your story', icon: '🕯️', title: 'A month of memories', desc: 'Write on 30 days', metric: 'diaryDays', goal: 30, pearls: 100, reward: 'candle' },
  { id: 'moment-1', group: 'Your story', icon: '📷', title: 'Say cheese', desc: 'Share your first moment', metric: 'moments', goal: 1, pearls: 15, reward: 'camera' },
  { id: 'moment-10', group: 'Your story', icon: '🎞️', title: 'Little film-maker', desc: 'Share 10 moments', metric: 'moments', goal: 10, pearls: 50, reward: 'film' },
  { id: 'look-1', group: 'Your story', icon: '👗', title: 'First look', desc: 'Add to your lookbook', metric: 'looks', goal: 1, pearls: 10, reward: 'dress' },
  { id: 'look-15', group: 'Your story', icon: '🪞', title: 'Style icon', desc: 'Add 15 looks', metric: 'looks', goal: 15, pearls: 60, reward: 'bow' },
  // your people
  { id: 'letter-1', group: 'Your people', icon: '💌', title: 'Special delivery', desc: 'Open a letter', metric: 'lettersOpened', goal: 1, pearls: 10, reward: 'letter' },
  { id: 'letters-5', group: 'Your people', icon: '📮', title: 'Pen pals', desc: 'Open 5 letters', metric: 'lettersOpened', goal: 5, pearls: 40, reward: 'postbox' },
  { id: 'jar-1', group: 'Your people', icon: '🫙', title: 'Dip in the jar', desc: 'Draw a note from the jar', metric: 'jarDrawn', goal: 1, pearls: 10, reward: 'jar' },
  { id: 'nudge-1', group: 'Your people', icon: '🤗', title: 'Thinking of you too', desc: 'Answer a nudge from a friend', metric: 'nudgesAnswered', goal: 1, pearls: 10, reward: 'hug' },
  { id: 'songs-5', group: 'Your people', icon: '🎧', title: 'Mixtape', desc: 'Have 5 songs dedicated to you', metric: 'songs', goal: 5, pearls: 30, reward: 'headphones' },
  { id: 'songs-15', group: 'Your people', icon: '📻', title: 'On the radio', desc: 'Have 15 songs dedicated to you', metric: 'songs', goal: 15, pearls: 50, reward: 'radio' },
  { id: 'love-10', group: 'Your people', icon: '💐', title: 'So very loved', desc: 'Get 10 notes on your love wall', metric: 'lovePosts', goal: 10, pearls: 30, reward: 'bouquet' },
  { id: 'pages-1', group: 'Your people', icon: '📒', title: 'Scrapbook star', desc: 'Get a scrapbook page from your people', metric: 'pages', goal: 1, pearls: 15 },
  // my corner
  { id: 'project-1', group: 'My Corner', icon: '✂️', title: 'First project', desc: 'Start a project in My Corner', metric: 'projects', goal: 1, pearls: 15, reward: 'scissors' },
  { id: 'projects-5', group: 'My Corner', icon: '🧵', title: 'Busy studio', desc: 'Have 5 projects', metric: 'projects', goal: 5, pearls: 50, reward: 'thread' },
  { id: 'items-25', group: 'My Corner', icon: '🧶', title: 'Collector of ideas', desc: 'Add 25 things to your projects', metric: 'cornerItems', goal: 25, pearls: 40, reward: 'yarn' },
  { id: 'palette-1', group: 'My Corner', icon: '🎨', title: 'Colour story', desc: 'Save a colour palette', metric: 'palettes', goal: 1, pearls: 10, reward: 'palette' },
  { id: 'studio-1', group: 'My Corner', icon: '📖', title: 'Jelly got this', desc: 'Ask a studio question in a project', metric: 'studioChats', goal: 1, pearls: 10 },
];

export const goalOf = (a: Achievement, s: Stats) => (a.goal === 'all' ? s.checklistTotal : a.goal);
export const progressOf = (a: Achievement, s: Stats) => Math.min(1, s[a.metric] / Math.max(1, goalOf(a, s)));
/** Which reward an item came from, for the shop's "unlock by…" note. */
export const unlockedBy = (itemId: string) => ACHIEVEMENTS.find((a) => a.reward === itemId);
export const backdropUnlockedBy = (id: string) => ACHIEVEMENTS.find((a) => a.backdrop === id);

/* ---------- her home ---------- */
export type Placed = { uid: string; item: string; x: number; y: number; s: number; flip: boolean };
export const MAX_PLACED = 60;
