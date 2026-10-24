/**
 * Little things she loves, scattered around the site.
 * Drop transparent PNGs into public/her/ with these exact names (about 800px on the long side is plenty).
 * A missing file simply doesn't show; in `npm run dev` you'll see a dashed placeholder instead.
 */
export const keepsakeFiles = {
  sunglasses: 'Gentle Monster-style sunglasses',
  'iced-coffee': 'Iced coffee in a glass, with a straw',
  matcha: 'Iced or hot matcha latte',
  chamomile: 'A cup of chamomile tea',
  handbag: 'A designer handbag or purse',
  heels: 'A pair of heels',
  scarf: 'A check scarf (Burberry-style), softly folded',
  'shopping-bags': 'Fashion-brand shopping bags',
  peonies: 'A bunch of pastel peonies or roses',
  daisies: 'A few daisies or wildflowers',
  pasta: 'A plate of pasta',
  gelato: 'A gelato cone',
  pizza: 'A pizza or a slice',
  seashell: 'A seashell',
  starfish: 'A starfish',
  'sun-hat': 'A straw sun hat',
  'beach-umbrella': 'A pastel beach umbrella',
} as const;

export type KeepsakeName = keyof typeof keepsakeFiles;

/**
 * A keepsake's spot, relative to the section it sits in.
 * Wide screens use top/left/right/w; phones use the p* values, or hide it if there are none.
 */
export type Spot = {
  name: KeepsakeName;
  top: string;
  left?: string;
  right?: string;
  w: number;
  rot: number;
  phone?: { top: string; left?: string; right?: string; w: number };
};

export const keepsakeSets: Record<string, Spot[]> = {
  // her desk: things on a desk around the edges
  desk: [
    { name: 'sunglasses', top: '30px', left: '-150px', w: 190, rot: -14, phone: { top: '8px', left: '-14px', w: 92 } },
    { name: 'iced-coffee', top: '0px', right: '-130px', w: 130, rot: 8, phone: { top: '0px', right: '-10px', w: 64 } },
    { name: 'peonies', top: '34%', left: '-190px', w: 210, rot: 10 },
    { name: 'handbag', top: '46%', right: '-200px', w: 200, rot: -8 },
    { name: 'heels', top: '72%', left: '-170px', w: 180, rot: -6 },
  ],
  love: [
    { name: 'peonies', top: '10px', left: '-180px', w: 200, rot: -10, phone: { top: '4px', left: '-16px', w: 80 } },
    { name: 'daisies', top: '0px', right: '-160px', w: 170, rot: 12 },
  ],
  letters: [
    { name: 'scarf', top: '20px', right: '-190px', w: 220, rot: 8, phone: { top: '0px', right: '-18px', w: 86 } },
    { name: 'daisies', top: '40%', left: '-170px', w: 170, rot: -12 },
  ],
  jar: [
    { name: 'chamomile', top: '20px', left: '-170px', w: 180, rot: -6, phone: { top: '2px', left: '-12px', w: 76 } },
    { name: 'matcha', top: '10px', right: '-150px', w: 150, rot: 8, phone: { top: '0px', right: '-10px', w: 64 } },
  ],
  bingo: [
    { name: 'shopping-bags', top: '10px', left: '-200px', w: 210, rot: -8, phone: { top: '0px', left: '-16px', w: 80 } },
    { name: 'heels', top: '45%', right: '-170px', w: 170, rot: 10 },
  ],
  // milano corner: Italian food by the countdown
  milano: [
    { name: 'pasta', top: '40px', left: '-40px', w: 170, rot: -8, phone: { top: '70px', left: '-24px', w: 96 } },
    { name: 'gelato', top: '10px', right: '-10px', w: 120, rot: 12, phone: { top: '60px', right: '-16px', w: 70 } },
    { name: 'pizza', top: '250px', left: '-90px', w: 150, rot: -10 },
  ],
  // around the beaches heading
  beach: [
    { name: 'sun-hat', top: '-30px', left: '-10px', w: 150, rot: -10, phone: { top: '-18px', left: '-14px', w: 70 } },
    { name: 'seashell', top: '-20px', left: '170px', w: 70, rot: 18 },
    { name: 'beach-umbrella', top: '-60px', right: '-20px', w: 140, rot: 8, phone: { top: '-26px', right: '-12px', w: 64 } },
    { name: 'starfish', top: '-10px', right: '160px', w: 60, rot: -20 },
  ],
  // around the journey's opening title
  journey: [
    { name: 'peonies', top: '14%', left: '7%', w: 190, rot: -10, phone: { top: '7%', left: '-10px', w: 96 } },
    { name: 'sunglasses', top: '18%', right: '8%', w: 180, rot: 12, phone: { top: '9%', right: '-6px', w: 88 } },
    { name: 'iced-coffee', top: '62%', right: '12%', w: 120, rot: -6 },
    { name: 'scarf', top: '60%', left: '10%', w: 200, rot: 8 },
  ],
  // by the Surprise me card
  guide: [
    { name: 'sunglasses', top: '-38px', right: '-20px', w: 150, rot: 10, phone: { top: '-26px', right: '-10px', w: 84 } },
  ],
};
