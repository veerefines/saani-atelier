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
export type ItemKind = 'furniture' | 'lights' | 'plants' | 'treasures' | 'decor' | 'friends';
export const KINDS: { id: ItemKind; label: string }[] = [
  { id: 'furniture', label: 'Furniture' },
  { id: 'lights', label: 'Lights' },
  { id: 'plants', label: 'Plants & coral' },
  { id: 'treasures', label: 'Treasures' },
  { id: 'decor', label: 'Decor' },
  { id: 'friends', label: 'Sea friends' },
];

/**
 * price: bought with pearls. Without a price it's exclusive: only an achievement unlocks it.
 * w: how wide it stands in her room, as a % of the room's width (before she resizes it).
 */
export type Thing = { id: string; name: string; kind: ItemKind; w: number; price?: number };
export const itemSrc = (id: string) => `/corner/home/items/${id}.webp`;

export const ITEMS: Thing[] = [
  { id: 'shell-bed', name: 'Canopy shell bed', kind: 'furniture', w: 26.0 },
  { id: 'reading-nook', name: 'Seashell reading nook', kind: 'furniture', w: 21.9 },
  { id: 'study-desk', name: 'Study nook', kind: 'furniture', w: 17.7, price: 110 },
  { id: 'shell-sofa', name: 'Shell sofa', kind: 'furniture', w: 16.4, price: 90 },
  { id: 'loveseat', name: 'Shell loveseat', kind: 'furniture', w: 12.9, price: 70 },
  { id: 'dresser', name: 'Pearl dresser', kind: 'furniture', w: 9.0, price: 60 },
  { id: 'vanity', name: 'Pearl vanity', kind: 'furniture', w: 10.9 },
  { id: 'orb-table', name: 'Pearl orb table', kind: 'furniture', w: 10.7, price: 55 },
  { id: 'nightstand', name: 'Nightstand', kind: 'furniture', w: 7.5, price: 50 },
  { id: 'tea-table', name: 'Book table', kind: 'furniture', w: 10.1, price: 45 },
  { id: 'ottoman', name: 'Velvet ottoman', kind: 'furniture', w: 8.3, price: 40 },
  { id: 'cloud-rug', name: 'Cloud rug', kind: 'furniture', w: 17.3, price: 35 },
  { id: 'cushions', name: 'Star cushions', kind: 'furniture', w: 13.4, price: 30 },
  { id: 'pillow-pile', name: 'Pillow pile', kind: 'furniture', w: 22.5, price: 30 },
  { id: 'blanket', name: 'Cosy blanket', kind: 'furniture', w: 19.1, price: 25 },
  { id: 'long-cushion', name: 'Cloud bolster', kind: 'furniture', w: 8.3, price: 20 },
  { id: 'blanket-roll', name: 'Rolled quilt', kind: 'furniture', w: 6.5, price: 15 },
  { id: 'lilac-cushion', name: 'Lilac cushion', kind: 'furniture', w: 5.3, price: 15 },
  { id: 'moon-cushion', name: 'Moon cushion', kind: 'furniture', w: 5.2, price: 15 },
  { id: 'heart-cushion', name: 'Heart cushion', kind: 'furniture', w: 6.2, price: 15 },
  { id: 'cloud-pillow', name: 'Cloud pillow', kind: 'furniture', w: 6.6, price: 15 },
  { id: 'star-pillow', name: 'Star pillow', kind: 'furniture', w: 5.1, price: 12 },
  { id: 'cloud-cushion', name: 'Puffy cushion', kind: 'furniture', w: 4.4, price: 12 },
  { id: 'star-light', name: 'Star light', kind: 'lights', w: 3.1, price: 12 },
  { id: 'star-glow', name: 'Star glow', kind: 'lights', w: 4.1, price: 15 },
  { id: 'candle-jar', name: 'Candle jar', kind: 'lights', w: 3.7, price: 18 },
  { id: 'lantern-small', name: 'Little lantern', kind: 'lights', w: 3.7, price: 18 },
  { id: 'glow-lamp', name: 'Glow pendant', kind: 'lights', w: 3.9, price: 20 },
  { id: 'lilac-pendant', name: 'Lilac pendant', kind: 'lights', w: 3.9, price: 20 },
  { id: 'amber-pendant', name: 'Amber pendant', kind: 'lights', w: 4.7, price: 22 },
  { id: 'lantern', name: 'Golden lantern', kind: 'lights', w: 3.3, price: 25 },
  { id: 'pink-orb-lamp', name: 'Pink orb lamp', kind: 'lights', w: 3.9, price: 25 },
  { id: 'bubble-lamp', name: 'Bubble lamp', kind: 'lights', w: 4.3, price: 25 },
  { id: 'pendant', name: 'Pearl pendant', kind: 'lights', w: 3.3, price: 30 },
  { id: 'sun-lamp', name: 'Sunny orb lamp', kind: 'lights', w: 5.5, price: 30 },
  { id: 'jelly-pendant', name: 'Jellyfish pendant', kind: 'lights', w: 6.8, price: 35 },
  { id: 'glow-jelly-lamp', name: 'Golden jellyfish lamp', kind: 'lights', w: 8.7, price: 60 },
  { id: 'jelly-lamp', name: 'Jellyfish lamp', kind: 'lights', w: 5.3 },
  { id: 'kelp', name: 'Kelp', kind: 'plants', w: 6.6, price: 8 },
  { id: 'tall-kelp', name: 'Tall kelp', kind: 'plants', w: 4.7, price: 10 },
  { id: 'seaweed', name: 'Seaweed', kind: 'plants', w: 6.1, price: 10 },
  { id: 'sea-grass', name: 'Sea grass & pearl', kind: 'plants', w: 5.3, price: 12 },
  { id: 'bud-vase', name: 'Bud vase', kind: 'plants', w: 3.9, price: 12 },
  { id: 'coral', name: 'Pink coral', kind: 'plants', w: 7.9, price: 15 },
  { id: 'lilac-coral', name: 'Lilac coral', kind: 'plants', w: 4.3, price: 15 },
  { id: 'violet-coral', name: 'Violet coral', kind: 'plants', w: 4.8, price: 15 },
  { id: 'moss-bowl', name: 'Moss bowl', kind: 'plants', w: 5.5, price: 18 },
  { id: 'leafy-plant', name: 'Leafy plant', kind: 'plants', w: 8.8, price: 20 },
  { id: 'fern-pot', name: 'Fern pot', kind: 'plants', w: 7.3, price: 20 },
  { id: 'coral-shell', name: 'Coral in a shell', kind: 'plants', w: 8.3, price: 20 },
  { id: 'flower-bowl', name: 'Flower shell bowl', kind: 'plants', w: 7.3, price: 22 },
  { id: 'shell-planter', name: 'Shell planter', kind: 'plants', w: 7.9, price: 22 },
  { id: 'vase', name: 'Flower vase', kind: 'plants', w: 6.1, price: 22 },
  { id: 'lavender-pot', name: 'Lavender pot', kind: 'plants', w: 6.1, price: 22 },
  { id: 'palm', name: 'Potted palm', kind: 'plants', w: 4.3, price: 25 },
  { id: 'coral-garden', name: 'Coral garden', kind: 'plants', w: 6.9, price: 25 },
  { id: 'coral-rock', name: 'Coral rock', kind: 'plants', w: 9.5, price: 25 },
  { id: 'reef', name: 'Little reef', kind: 'plants', w: 7.3, price: 25 },
  { id: 'hanging-basket', name: 'Hanging basket', kind: 'plants', w: 6.7, price: 28 },
  { id: 'hanging-plant', name: 'Hanging plant', kind: 'plants', w: 9.5, price: 30 },
  { id: 'reef-row', name: 'Reef row', kind: 'plants', w: 11.6, price: 30 },
  { id: 'reef-bed', name: 'Reef bed', kind: 'plants', w: 7.3, price: 30 },
  { id: 'bubble', name: 'Big bubble', kind: 'treasures', w: 5.8, price: 5 },
  { id: 'blue-bubble', name: 'Blue bubble', kind: 'treasures', w: 4.4, price: 5 },
  { id: 'pearl-drop', name: 'Pearl', kind: 'treasures', w: 3.4, price: 8 },
  { id: 'shell', name: 'Scallop shell', kind: 'treasures', w: 6.9, price: 8 },
  { id: 'starfish', name: 'Starfish', kind: 'treasures', w: 4.2, price: 10 },
  { id: 'pink-shell', name: 'Pink shell', kind: 'treasures', w: 6.7, price: 10 },
  { id: 'spiral', name: 'Spiral shell', kind: 'treasures', w: 5.5, price: 10 },
  { id: 'cone-shell', name: 'Cone shell', kind: 'treasures', w: 4.5, price: 10 },
  { id: 'whelk', name: 'Whelk', kind: 'treasures', w: 6.1, price: 10 },
  { id: 'wish-bottle', name: 'Wish bottle', kind: 'treasures', w: 2.9, price: 10 },
  { id: 'conch', name: 'Conch', kind: 'treasures', w: 4.8, price: 12 },
  { id: 'opal-shell', name: 'Opal shell', kind: 'treasures', w: 4.7, price: 12 },
  { id: 'twin-conch', name: 'Twin conch', kind: 'treasures', w: 9.3, price: 12 },
  { id: 'opal', name: 'Opal', kind: 'treasures', w: 2.9, price: 12 },
  { id: 'star-bottle', name: 'Star bottle', kind: 'treasures', w: 3.4, price: 12 },
  { id: 'conch-pearl', name: 'Conch & pearl', kind: 'treasures', w: 8.4, price: 15 },
  { id: 'pearl-scallop', name: 'Pearl scallop', kind: 'treasures', w: 5.2, price: 15 },
  { id: 'pink-shells', name: 'Pink shells', kind: 'treasures', w: 5.7, price: 15 },
  { id: 'crystal-small', name: 'Little crystal', kind: 'treasures', w: 2.7, price: 15 },
  { id: 'moonstone', name: 'Moonstone', kind: 'treasures', w: 4.6, price: 15 },
  { id: 'potion-bottles', name: 'Potion bottles', kind: 'treasures', w: 5.3, price: 18 },
  { id: 'rose-crystal', name: 'Rose crystal', kind: 'treasures', w: 4.7, price: 20 },
  { id: 'pearl-dish', name: 'Pearl dish', kind: 'treasures', w: 5.2, price: 20 },
  { id: 'shell-trio', name: 'Shells & pearls', kind: 'treasures', w: 8.1, price: 25 },
  { id: 'message-bottle', name: 'Message in a bottle', kind: 'treasures', w: 7.3, price: 25 },
  { id: 'crystal', name: 'Crystal', kind: 'treasures', w: 3.6, price: 30 },
  { id: 'crystal-bloom', name: 'Crystal bloom', kind: 'treasures', w: 5.3, price: 30 },
  { id: 'jewel-box', name: 'Jewel box', kind: 'treasures', w: 4.3, price: 30 },
  { id: 'heart-locket', name: 'Heart locket', kind: 'treasures', w: 5.4, price: 30 },
  { id: 'anchor', name: 'Golden anchor', kind: 'treasures', w: 4.3, price: 30 },
  { id: 'helm', name: 'Ship’s wheel', kind: 'treasures', w: 6.5, price: 35 },
  { id: 'aquarium-globe', name: 'Aquarium globe', kind: 'treasures', w: 6.5, price: 45 },
  { id: 'clam', name: 'Clam with a pearl', kind: 'treasures', w: 7.5, price: 30 },
  { id: 'crystal-cluster', name: 'Crystal cluster', kind: 'treasures', w: 5.0, price: 40 },
  { id: 'snow-globe', name: 'Jelly snow globe', kind: 'treasures', w: 5.8 },
  { id: 'treasure', name: 'Treasure chest', kind: 'treasures', w: 10.4 },
  { id: 'letter', name: 'Sealed letter', kind: 'decor', w: 5.3, price: 10 },
  { id: 'lilac-bow', name: 'Lilac bow', kind: 'decor', w: 5.7, price: 12 },
  { id: 'blue-bow', name: 'Blue bow', kind: 'decor', w: 4.7, price: 12 },
  { id: 'sky-bow', name: 'Sky bow', kind: 'decor', w: 5.2, price: 12 },
  { id: 'pink-gift', name: 'Pink gift', kind: 'decor', w: 3.3, price: 12 },
  { id: 'teacup', name: 'Teacup', kind: 'decor', w: 4.9, price: 12 },
  { id: 'wrapped-gift', name: 'Wrapped gift', kind: 'decor', w: 4.9, price: 15 },
  { id: 'gift-box', name: 'Gift box', kind: 'decor', w: 5.7, price: 15 },
  { id: 'quill', name: 'Quill & ink', kind: 'decor', w: 3.2, price: 15 },
  { id: 'bell-jar', name: 'Bell jar', kind: 'decor', w: 3.1, price: 15 },
  { id: 'coral-books', name: 'Coral on books', kind: 'decor', w: 6.3, price: 18 },
  { id: 'magnifier', name: 'Magnifying glass', kind: 'decor', w: 5.0, price: 18 },
  { id: 'books', name: 'Book stack', kind: 'decor', w: 7.5, price: 20 },
  { id: 'hatbox', name: 'Hat box', kind: 'decor', w: 5.2, price: 20 },
  { id: 'bow-present', name: 'Bow present', kind: 'decor', w: 6.1, price: 20 },
  { id: 'shell-bowl', name: 'Shell basin', kind: 'decor', w: 9.1, price: 25 },
  { id: 'hourglass', name: 'Hourglass', kind: 'decor', w: 4.0, price: 25 },
  { id: 'fish-plush', name: 'Fish plushie', kind: 'decor', w: 4.6, price: 25 },
  { id: 'octopus-plush', name: 'Octopus plushie', kind: 'decor', w: 8.0, price: 35 },
  { id: 'camera', name: 'Camera', kind: 'decor', w: 6.1, price: 40 },
  { id: 'aquarium', name: 'Little aquarium', kind: 'decor', w: 6.4, price: 50 },
  { id: 'hanging-mirror', name: 'Hanging mirror', kind: 'decor', w: 12.1, price: 55 },
  { id: 'telescope', name: 'Telescope', kind: 'decor', w: 6.7, price: 60 },
  { id: 'porthole', name: 'Porthole window', kind: 'decor', w: 18.3, price: 70 },
  { id: 'mirror', name: 'Mermaid mirror', kind: 'decor', w: 9.2 },
  { id: 'tiny-fish', name: 'Tiny reef fish', kind: 'friends', w: 4.9, price: 15 },
  { id: 'blue-fish', name: 'Blue fish', kind: 'friends', w: 5.9, price: 15 },
  { id: 'lilac-fish', name: 'Lilac fish', kind: 'friends', w: 8.1, price: 15 },
  { id: 'pink-fish', name: 'Pink fish', kind: 'friends', w: 5.8, price: 15 },
  { id: 'sun-fish', name: 'Sunny fish', kind: 'friends', w: 5.1, price: 15 },
  { id: 'coral-fish', name: 'Coral fish', kind: 'friends', w: 4.9, price: 15 },
  { id: 'gold-fish', name: 'Golden fish', kind: 'friends', w: 5.2, price: 15 },
  { id: 'stellina', name: 'Stellina the starfish', kind: 'friends', w: 7.1, price: 25 },
  { id: 'stripes', name: 'Stripes', kind: 'friends', w: 8.2, price: 30 },
  { id: 'azzurra', name: 'Azzurra the tang', kind: 'friends', w: 5.9, price: 30 },
  { id: 'snail', name: 'Lumachina the snail', kind: 'friends', w: 6.7, price: 30 },
  { id: 'shell-friend', name: 'Conchiglia', kind: 'friends', w: 7.5, price: 30 },
  { id: 'scallop-friend', name: 'Capasanta', kind: 'friends', w: 9.0, price: 30 },
  { id: 'angelfish', name: 'Angelo the angelfish', kind: 'friends', w: 8.4, price: 35 },
  { id: 'clownfish', name: 'Pagliaccio the clownfish', kind: 'friends', w: 9.2, price: 35 },
  { id: 'crab', name: 'Granchio the crab', kind: 'friends', w: 8.9, price: 35 },
  { id: 'shy-clam', name: 'Timida the clam', kind: 'friends', w: 6.9, price: 35 },
  { id: 'goldie', name: 'Goldie', kind: 'friends', w: 10.9, price: 40 },
  { id: 'puffer', name: 'Palla the puffer', kind: 'friends', w: 8.3, price: 40 },
  { id: 'blue-puffer', name: 'Blu the puffer', kind: 'friends', w: 7.7, price: 40 },
  { id: 'hermit', name: 'Casetta the hermit crab', kind: 'friends', w: 6.8, price: 40 },
  { id: 'squid', name: 'Calamaretto', kind: 'friends', w: 5.9, price: 40 },
  { id: 'pesca', name: 'Pesca the octopus', kind: 'friends', w: 11.9, price: 45 },
  { id: 'polpo', name: 'Polpo', kind: 'friends', w: 12.3, price: 50 },
  { id: 'viola', name: 'Viola', kind: 'friends', w: 12.5, price: 50 },
  { id: 'mare', name: 'Mare', kind: 'friends', w: 11.1, price: 50 },
  { id: 'gemma', name: 'Gemma', kind: 'friends', w: 11.9, price: 50 },
  { id: 'fiore', name: 'Fiore', kind: 'friends', w: 10.0, price: 50 },
  { id: 'perla', name: 'Perla the jelly', kind: 'friends', w: 12.1, price: 55 },
  { id: 'rosa', name: 'Rosa the jelly', kind: 'friends', w: 12.3, price: 55 },
  { id: 'sogno', name: 'Sogno the jelly', kind: 'friends', w: 13.0, price: 55 },
  { id: 'bolla', name: 'Bolla the jelly', kind: 'friends', w: 11.2, price: 55 },
  { id: 'seahorse', name: 'Cavallino the seahorse', kind: 'friends', w: 6.8, price: 55 },
  { id: 'luna', name: 'Luna the jelly', kind: 'friends', w: 11.4, price: 60 },
  { id: 'stella', name: 'Stella the jelly', kind: 'friends', w: 11.7, price: 60 },
  { id: 'ray', name: 'Manta', kind: 'friends', w: 11.1, price: 60 },
  { id: 'notte', name: 'Notte the ray', kind: 'friends', w: 11.7, price: 60 },
  { id: 'baby-dolphin', name: 'Delfino', kind: 'friends', w: 7.7, price: 60 },
  { id: 'dolphin', name: 'Delfi the dolphin', kind: 'friends', w: 9.1, price: 70 },
  { id: 'cielo', name: 'Cielo the ray', kind: 'friends', w: 11.1, price: 70 },
  { id: 'turtle', name: 'Tarta the turtle', kind: 'friends', w: 15.5, price: 80 },
  { id: 'whale', name: 'Balena the whale', kind: 'friends', w: 10.0, price: 120 },
  { id: 'nuvola', name: 'Nuvola the dreamy jelly', kind: 'friends', w: 12.6 },
  { id: 'libro', name: 'Libro the bookworm jelly', kind: 'friends', w: 12.9 },
  { id: 'capitano', name: 'Capitano the octopus', kind: 'friends', w: 12.0 },
  { id: 'amici', name: 'Octopus besties', kind: 'friends', w: 18.9 },
  { id: 'narwhal', name: 'Uni the narwhal', kind: 'friends', w: 11.1 },
  { id: 'seal', name: 'Foca the seal', kind: 'friends', w: 10.3 },
  { id: 'whale-shark', name: 'Squalo the whale shark', kind: 'friends', w: 10.7 },
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
  { id: 'hello', group: 'Jelly', icon: '🪼', title: 'Nice to meet you', desc: 'Visit Jelly for the first time', metric: 'visits', goal: 1, pearls: 20, reward: 'stellina' },
  { id: 'first-pat', group: 'Jelly', icon: '🫶', title: 'First pat', desc: 'Give Jelly a pat', metric: 'pets', goal: 1, pearls: 10, reward: 'heart-cushion' },
  { id: 'pats-50', group: 'Jelly', icon: '💗', title: 'Professional patter', desc: 'Give Jelly 50 pats', metric: 'pets', goal: 50, pearls: 25, reward: 'clam' },
  { id: 'pats-300', group: 'Jelly', icon: '👑', title: 'Jelly whisperer', desc: 'Give Jelly 300 pats', metric: 'pets', goal: 300, pearls: 60, reward: 'snow-globe' },
  { id: 'chat-1', group: 'Jelly', icon: '💬', title: 'First chat', desc: 'Ask Jelly something', metric: 'jellyChats', goal: 1, pearls: 10, reward: 'teacup' },
  { id: 'chat-25', group: 'Jelly', icon: '📱', title: 'Chatterbox', desc: 'Have 25 chats with Jelly', metric: 'jellyChats', goal: 25, pearls: 50, reward: 'perla' },
  { id: 'level-3', group: 'Jelly', icon: '🤝', title: 'Best friends', desc: 'Reach friendship level 3', metric: 'level', goal: 3, pearls: 30, reward: 'amici' },
  { id: 'level-6', group: 'Jelly', icon: '🌈', title: 'Soulmates (aquatic)', desc: 'Reach friendship level 6', metric: 'level', goal: 6, pearls: 80, reward: 'jelly-lamp', backdrop: 'rainbow' },
  { id: 'streak-3', group: 'Jelly', icon: '🔥', title: 'Three in a row', desc: 'Visit 3 days in a row', metric: 'streak', goal: 3, pearls: 20, reward: 'tiny-fish' },
  { id: 'streak-7', group: 'Jelly', icon: '📅', title: 'A whole week', desc: 'Visit 7 days in a row', metric: 'streak', goal: 7, pearls: 50, reward: 'nuvola' },
  { id: 'visits-30', group: 'Jelly', icon: '🏅', title: 'A regular', desc: 'Visit on 30 different days', metric: 'visits', goal: 30, pearls: 80, reward: 'narwhal' },
  { id: 'shop-1', group: 'Jelly', icon: '🛍️', title: 'First purchase', desc: 'Buy something for Jelly’s home', metric: 'bought', goal: 1, pearls: 10 },
  { id: 'decor-5', group: 'Jelly', icon: '💡', title: 'Interior designer', desc: 'Put 5 things in Jelly’s home', metric: 'placed', goal: 5, pearls: 25, reward: 'star-light' },
  { id: 'decor-15', group: 'Jelly', icon: '🪩', title: 'Maximalist', desc: 'Put 15 things in Jelly’s home', metric: 'placed', goal: 15, pearls: 60, reward: 'capitano' },
  // Milano
  { id: 'stamp-1', group: 'Milano', icon: '🛂', title: 'First stamp', desc: 'Stamp your passport once', metric: 'stamps', goal: 1, pearls: 15, reward: 'message-bottle' },
  { id: 'stamp-10', group: 'Milano', icon: '🚋', title: 'Passport collector', desc: 'Collect 10 passport stamps', metric: 'stamps', goal: 10, pearls: 40, reward: 'anchor' },
  { id: 'stamp-25', group: 'Milano', icon: '⛪', title: 'Milano local', desc: 'Collect 25 passport stamps', metric: 'stamps', goal: 25, pearls: 90, reward: 'helm' },
  { id: 'stamp-50', group: 'Milano', icon: '🌃', title: 'City explorer', desc: 'Collect 50 passport stamps', metric: 'stamps', goal: 50, pearls: 150, reward: 'treasure', backdrop: 'milano' },
  { id: 'fashion-5', group: 'Milano', icon: '👠', title: 'Fashion pilgrim', desc: 'Stamp 5 fashion spots', metric: 'fashionStamps', goal: 5, pearls: 40, reward: 'vanity' },
  { id: 'wish-1', group: 'Milano', icon: '🌠', title: 'Make a wish', desc: 'Add something to your wish list', metric: 'wishes', goal: 1, pearls: 10, reward: 'star-glow' },
  { id: 'wishes-5', group: 'Milano', icon: '🌠', title: 'Dreams come true', desc: 'Tick off 5 wishes', metric: 'wishesDone', goal: 5, pearls: 40, reward: 'seal' },
  // settling in
  { id: 'check-1', group: 'Settling in', icon: '✅', title: 'First step', desc: 'Tick one settling-in task', metric: 'checklist', goal: 1, pearls: 10, reward: 'cloud-cushion' },
  { id: 'check-5', group: 'Settling in', icon: '🧳', title: 'Halfway home', desc: 'Tick 5 settling-in tasks', metric: 'checklist', goal: 5, pearls: 40, reward: 'blanket-roll' },
  { id: 'check-all', group: 'Settling in', icon: '🏡', title: 'All settled in', desc: 'Finish the whole settling-in list', metric: 'checklist', goal: 'all', pearls: 100, reward: 'shell-bed', backdrop: 'flat' },
  // bingo
  { id: 'bingo-1', group: 'Bingo', icon: '🎯', title: 'First square', desc: 'Mark a bingo square', metric: 'bingo', goal: 1, pearls: 15, reward: 'conch' },
  { id: 'bingo-5', group: 'Bingo', icon: '🍹', title: 'On a roll', desc: 'Mark 5 bingo squares', metric: 'bingo', goal: 5, pearls: 40, reward: 'crystal' },
  { id: 'bingo-12', group: 'Bingo', icon: '🏆', title: 'Bingo champion', desc: 'Mark 12 bingo squares', metric: 'bingo', goal: 12, pearls: 80, reward: 'dolphin' },
  { id: 'bingo-20', group: 'Bingo', icon: '🦄', title: 'Bingo legend', desc: 'Mark 20 bingo squares', metric: 'bingo', goal: 20, pearls: 150, reward: 'whale-shark' },
  // your story
  { id: 'diary-1', group: 'Your story', icon: '📓', title: 'Dear diary', desc: 'Write your first chapter day', metric: 'diaryDays', goal: 1, pearls: 10, reward: 'quill' },
  { id: 'diary-7', group: 'Your story', icon: '🖋️', title: 'A week of words', desc: 'Write on 7 days', metric: 'diaryDays', goal: 7, pearls: 40, reward: 'libro' },
  { id: 'diary-30', group: 'Your story', icon: '🕯️', title: 'A month of memories', desc: 'Write on 30 days', metric: 'diaryDays', goal: 30, pearls: 100, reward: 'reading-nook' },
  { id: 'moment-1', group: 'Your story', icon: '📷', title: 'Say cheese', desc: 'Share your first moment', metric: 'moments', goal: 1, pearls: 15, reward: 'camera' },
  { id: 'moment-10', group: 'Your story', icon: '🎞️', title: 'Little film-maker', desc: 'Share 10 moments', metric: 'moments', goal: 10, pearls: 50, reward: 'aquarium' },
  { id: 'look-1', group: 'Your story', icon: '👗', title: 'First look', desc: 'Add to your lookbook', metric: 'looks', goal: 1, pearls: 10, reward: 'lilac-bow' },
  { id: 'look-15', group: 'Your story', icon: '🪞', title: 'Style icon', desc: 'Add 15 looks', metric: 'looks', goal: 15, pearls: 60, reward: 'mirror' },
  // your people
  { id: 'letter-1', group: 'Your people', icon: '💌', title: 'Special delivery', desc: 'Open a letter', metric: 'lettersOpened', goal: 1, pearls: 10, reward: 'letter' },
  { id: 'letters-5', group: 'Your people', icon: '📮', title: 'Pen pals', desc: 'Open 5 letters', metric: 'lettersOpened', goal: 5, pearls: 40, reward: 'jewel-box' },
  { id: 'jar-1', group: 'Your people', icon: '🫙', title: 'Dip in the jar', desc: 'Draw a note from the jar', metric: 'jarDrawn', goal: 1, pearls: 10, reward: 'candle-jar' },
  { id: 'nudge-1', group: 'Your people', icon: '🤗', title: 'Thinking of you too', desc: 'Answer a nudge from a friend', metric: 'nudgesAnswered', goal: 1, pearls: 10, reward: 'octopus-plush' },
  { id: 'songs-5', group: 'Your people', icon: '🎧', title: 'Mixtape', desc: 'Have 5 songs dedicated to you', metric: 'songs', goal: 5, pearls: 30, reward: 'shell-trio' },
  { id: 'songs-15', group: 'Your people', icon: '📻', title: 'On the radio', desc: 'Have 15 songs dedicated to you', metric: 'songs', goal: 15, pearls: 50, reward: 'turtle' },
  { id: 'love-10', group: 'Your people', icon: '💐', title: 'So very loved', desc: 'Get 10 notes on your love wall', metric: 'lovePosts', goal: 10, pearls: 30, reward: 'heart-locket' },
  { id: 'pages-1', group: 'Your people', icon: '📒', title: 'Scrapbook star', desc: 'Get a scrapbook page from your people', metric: 'pages', goal: 1, pearls: 15, reward: 'hatbox' },
  // my corner
  { id: 'project-1', group: 'My Corner', icon: '✂️', title: 'First project', desc: 'Start a project in My Corner', metric: 'projects', goal: 1, pearls: 15, reward: 'study-desk' },
  { id: 'projects-5', group: 'My Corner', icon: '🧵', title: 'Busy studio', desc: 'Have 5 projects', metric: 'projects', goal: 5, pearls: 50, reward: 'telescope' },
  { id: 'items-25', group: 'My Corner', icon: '🧶', title: 'Collector of ideas', desc: 'Add 25 things to your projects', metric: 'cornerItems', goal: 25, pearls: 40, reward: 'lavender-pot' },
  { id: 'palette-1', group: 'My Corner', icon: '🎨', title: 'Colour story', desc: 'Save a colour palette', metric: 'palettes', goal: 1, pearls: 10, reward: 'flower-bowl' },
  { id: 'studio-1', group: 'My Corner', icon: '📖', title: 'Jelly got this', desc: 'Ask a studio question in a project', metric: 'studioChats', goal: 1, pearls: 10, reward: 'magnifier' },
];

export const goalOf = (a: Achievement, s: Stats) => (a.goal === 'all' ? s.checklistTotal : a.goal);
export const progressOf = (a: Achievement, s: Stats) => Math.min(1, s[a.metric] / Math.max(1, goalOf(a, s)));
/** Which reward an item came from, for the shop's "unlock by…" note. */
export const unlockedBy = (itemId: string) => ACHIEVEMENTS.find((a) => a.reward === itemId);
export const backdropUnlockedBy = (id: string) => ACHIEVEMENTS.find((a) => a.backdrop === id);

/* ---------- her home ---------- */
export type Placed = { uid: string; item: string; x: number; y: number; s: number; flip: boolean };
export const MAX_PLACED = 60;
