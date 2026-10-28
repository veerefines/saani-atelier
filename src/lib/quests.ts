import type { Metric, Stats } from './jelly-catalog';
import { SEASONS } from './jelly-seasons';

/**
 * Daily quests: three little things to do each Milano day, one easy, one medium and one special,
 * for pearls (and a bonus for all three). Picked the same way all day from the date, never
 * repeating yesterday's, and never one she can't do (a full checklist, Milano stamps before she lands).
 * Shared by the server (which awards them) and her screen (which shows them). No database code here.
 */

/** Things only her screen sees happen, counted in Jelly's state (with a daily cap each). */
export const EVENTS = { phrase: 5, brief: 2, mood: 3, fact: 6, catch20: 1, pop30: 1, says5: 1 } as const;
export type EventName = keyof typeof EVENTS;
export const isEvent = (x: unknown): x is EventName => typeof x === 'string' && x in EVENTS;

export type Quest = {
  id: string;
  tier: 1 | 2 | 3;
  icon: string;
  title: string;
  /** a Stats metric, or an event counted on her screen */
  metric: Metric | `e:${EventName}`;
  n: number;
  href?: string;
  /** only once she's in Milano */
  milano?: boolean;
  /** can't be done any more (everything's ticked) */
  spent?: (s: Stats) => boolean;
};

export const TIER_PEARLS = { 1: 5, 2: 8, 3: 12 } as const;
export const ALL_BONUS = 10;

export const QUESTS: Quest[] = [
  // easy
  { id: 'pat10', tier: 1, icon: '🫶', title: 'Give Jelly 10 pats', metric: 'pets', n: 10 },
  { id: 'chat1', tier: 1, icon: '💬', title: 'Ask Jelly anything', metric: 'jellyChats', n: 1 },
  { id: 'phrase', tier: 1, icon: '🇮🇹', title: 'Hear today’s Italian phrase (tap 🔊)', metric: 'e:phrase', n: 1, href: '/home' },
  { id: 'mood', tier: 1, icon: '🌷', title: 'Tell your people how you’re feeling', metric: 'e:mood', n: 1, href: '/home' },
  { id: 'brief', tier: 1, icon: '☀️', title: 'Listen to Jelly’s morning brief', metric: 'e:brief', n: 1, href: '/home' },
  { id: 'fact', tier: 1, icon: '💡', title: 'Hear a “Did you know?” from Jelly', metric: 'e:fact', n: 1 },
  // medium
  { id: 'diary', tier: 2, icon: '📔', title: 'Write a line in My chapter', metric: 'diaryDays', n: 1, href: '/home/chapter' },
  { id: 'spend', tier: 2, icon: '💶', title: 'Log a spend in Soldi', metric: 'expenses', n: 1, href: '/home/money' },
  { id: 'look', tier: 2, icon: '👗', title: 'Pin something to your Lookbook', metric: 'looks', n: 1, href: '/home/lookbook' },
  { id: 'wish', tier: 2, icon: '🌠', title: 'Add a wish to your Milano list', metric: 'wishes', n: 1, href: '/home/milano' },
  { id: 'place', tier: 2, icon: '🛋️', title: 'Put something new in Jelly’s home', metric: 'placed', n: 1, href: '/home/jelly' },
  { id: 'game', tier: 2, icon: '🎮', title: 'Play a game with Jelly', metric: 'games', n: 1, href: '/home/jelly?tab=games' },
  { id: 'check', tier: 2, icon: '✅', title: 'Tick off a settling-in task', metric: 'checklist', n: 1, href: '/home/checklist', spent: (s) => s.checklist >= s.checklistTotal },
  { id: 'jar', tier: 2, icon: '🫙', title: 'Draw a note from your jar', metric: 'jarDrawn', n: 1, href: '/home/jar' },
  // special
  { id: 'stamp', tier: 3, icon: '🛂', title: 'Stamp a new place in your passport', metric: 'stamps', n: 1, href: '/home/passport', milano: true, spent: (s) => s.stamps >= s.placesTotal },
  { id: 'moment', tier: 3, icon: '📸', title: 'Share a moment with your people', metric: 'moments', n: 1, href: '/home/moments' },
  { id: 'bingo', tier: 3, icon: '🎲', title: 'Stitch a Milano bingo square', metric: 'bingo', n: 1, href: '/home/bingo', milano: true, spent: (s) => s.bingo >= s.bingoTotal },
  { id: 'chat3', tier: 3, icon: '🫧', title: 'Have 3 chats with Jelly', metric: 'jellyChats', n: 3 },
  { id: 'buy', tier: 3, icon: '🛍️', title: 'Buy Jelly a little something', metric: 'bought', n: 1, href: '/home/jelly?tab=shop' },
  { id: 'corner', tier: 3, icon: '🪡', title: 'Add something to a My Corner project', metric: 'cornerItems', n: 1, href: '/home/corner' },
  { id: 'catch20', tier: 3, icon: '🫧', title: 'Catch 20 pearls in Pearl Catch', metric: 'e:catch20', n: 1, href: '/home/jelly?tab=games' },
  { id: 'pop30', tier: 3, icon: '🎈', title: 'Score 30 in Bubble Pop', metric: 'e:pop30', n: 1, href: '/home/jelly?tab=games' },
  { id: 'says5', tier: 3, icon: '🎵', title: 'Reach round 5 in Jelly Says', metric: 'e:says5', n: 1, href: '/home/jelly?tab=games' },
];
export const questById = (id: string): Quest | undefined => QUESTS.find((q) => q.id === id) ?? SEASONS.find((s) => s.quest?.id === id)?.quest;

/** How far along a quest's metric is, right now. */
export function valueOf(q: Quest, stats: Stats, events: Partial<Record<EventName, number>>) {
  return q.metric.startsWith('e:') ? (events[q.metric.slice(2) as EventName] ?? 0) : stats[q.metric as Metric];
}

/** A small seeded random, so a day always gets the same quests. */
function seeded(day: string) {
  let h = 2166136261;
  for (const c of day) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Today's three: one of each tier, none from yesterday, none she can't do. */
export function pickQuests(day: string, stats: Stats, yesterday: string[], inMilano: boolean, extra?: Quest) {
  const rnd = seeded(day);
  const ok = (q: Quest) => !yesterday.includes(q.id) && (!q.milano || inMilano) && !q.spent?.(stats);
  const ids = ([1, 2, 3] as const).map((tier) => {
    const pool = QUESTS.filter((q) => q.tier === tier && ok(q));
    const any = pool.length ? pool : QUESTS.filter((q) => q.tier === tier && !q.spent?.(stats) && (!q.milano || inMilano));
    return any[Math.floor(rnd() * any.length)].id;
  });
  // a season's own quest takes the special slot
  if (extra) ids[2] = extra.id;
  return ids;
}

export type QuestState = { day: string; ids: string[]; base: Record<string, number>; done: string[]; bonus: boolean };
export type QuestView = { id: string; icon: string; title: string; href?: string; tier: 1 | 2 | 3; pearls: number; have: number; n: number; done: boolean };
