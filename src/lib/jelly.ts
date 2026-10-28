import * as db from './db';
import { cleanPrefs, DEFAULT_PREFS, type AudioPrefs } from './audio-prefs';
import { milanDay, addDays } from './extras';
import { friendship } from './jelly-mood';
import { ACHIEVEMENTS, BACKDROPS, goalOf, inSeason, itemById, MAX_PLACED, seasonsOf, type Placed, type Stats } from './jelly-catalog';
import { SEASON_NAMES, type Season, type SeasonKey } from './jelly-seasons';
import { ALL_BONUS, EVENTS, pickQuests, questById, TIER_PEARLS, valueOf, type EventName, type Quest, type QuestState } from './quests';

/**
 * What Jelly remembers about her friend: pats, chats, when they last saw each other, and her home
 * (pearls, things she owns, how her room is arranged, and the achievements Saani has unlocked).
 */
export type JellyState = db.Doc & {
  pets: number;
  chats: number;
  lastSeen: string | null;
  pearls?: number;
  earned?: number;
  owned?: Record<string, number>;
  backdrops?: string[];
  backdrop?: string;
  placed?: Placed[];
  bought?: number;
  unlocked?: Record<string, string>;
  /** Milano days she came by (most recent last), for streaks */
  days?: string[];
  /** today's small earnings, so pats and chats can't be farmed */
  today?: { day: string; patPearls: number; chatPearls: number; pats: number };
  /** which catalog her things belong to (3: the high-quality furniture and sea friends) */
  v?: number;
  /** a fresh start: when this is behind RESET, everything is set back to zero (chats are kept) */
  epoch?: number;
  /** voices and sounds (on unless she turned them off); `audio` has the details */
  sound?: boolean;
  audio?: AudioPrefs;
  /** Saani's radio: the Spotify playlist (or album, artist…) she connected */
  spotify?: string | null;
  /** things only her screen sees (heard the phrase, the brief…), ever, and today (for the caps) */
  events?: Partial<Record<EventName, number>>;
  eventsToday?: { day: string; n: Partial<Record<EventName, number>> };
  /** today's three quests, and how many she's done ever (and days she did all three) */
  quests?: QuestState;
  questsDone?: number;
  questDays?: number;
  /** Jelly's games: best scores, games played, and today's game pearls */
  games?: { best: Partial<Record<GameId, number>>; played: number; day: string; pearls: number };
  /** the seasons and events she came by for */
  seasons?: string[];
};

export type GameId = 'catch' | 'pop' | 'says';

// bump to wipe pats, pearls, things, streaks and achievements once (27 Oct 2026: testing done)
const RESET = 1;

// what the first (emoji) catalog charged, so anything bought from it is refunded
const LEGACY: Record<string, number> = {
  cactus: 15, tulips: 15, sunflower: 15, blossom: 15, plant: 20, coral: 25, mushroom: 30, chair: 30, painting: 35, clock: 40, sofa: 60, bed: 70, bathtub: 80,
  bubbles: 5, donut: 10, cupcake: 10, coffee: 10, cornetto: 10, gelato: 12, cake: 15, pasta: 15, pizza: 15, bow: 12, needle: 15, hat: 25, handbag: 45, ring: 60,
  crab: 30, puffer: 35, octopus: 50, turtle: 55, unicorn: 90, whale: 120, sparkles: 8, star: 10, balloon: 10, lemon: 10, flag: 20, mask: 40, vespa: 70,
};

// and what the second (first illustrated) catalog charged for things that have since gone
const V2: Record<string, number> = {
  'coral-table': 40, bookshelf: 80, 'star-pendant': 10, 'shell-lantern': 20, moon: 25, 'moon-mobile': 30, 'star-garland': 35, 'coral-pot': 20,
  'arrow-sign': 12, towels: 15, sign: 15, 'star-sign': 15, 'old-books': 18, curtains: 45, fish: 35, latte: 10,
};

/** Move her things to the current catalog: refund what's gone, and hand over the new rewards she's earned. */
function migrate(s: JellyState): JellyState {
  const v = s.v ?? 1;
  if (v >= 3) return s;
  const prices = v === 2 ? V2 : LEGACY;
  const owned: Record<string, number> = {};
  let refund = 0;
  for (const [id, n] of Object.entries(s.owned ?? {})) {
    if (itemById(id)) owned[id] = n;
    else refund += (prices[id] ?? 0) * n;
  }
  for (const a of ACHIEVEMENTS) if (a.reward && (s.unlocked ?? {})[a.id] && !owned[a.reward]) owned[a.reward] = 1;
  const placed = (s.placed ?? []).filter((p) => itemById(p.item));
  return { ...s, v: 3, owned, placed, pearls: (s.pearls ?? 0) + refund };
}

const COL = 'jelly';
const ID = 'friend';
const fresh = (): JellyState => ({ id: ID, createdAt: new Date().toISOString(), pets: 0, chats: 0, lastSeen: null, v: 3, epoch: RESET });

export async function jellyState() {
  const s = await db.get<JellyState>(COL, ID);
  // a fresh start keeps when they last saw each other, so Jelly doesn't think they've just met
  if (s && (s.epoch ?? 0) < RESET) return { ...fresh(), lastSeen: s.lastSeen, sound: s.sound, audio: s.audio, spotify: s.spotify };
  return migrate(s ?? fresh());
}
const save = (s: JellyState) => db.put<JellyState>(COL, s);

/** Change Jelly's state in one go (read, change, write). */
async function change(fn: (s: JellyState) => JellyState | Promise<JellyState>) {
  return save(await fn(await jellyState()));
}

const todayOf = (s: JellyState) => {
  const day = milanDay();
  return s.today?.day === day ? s.today : { day, patPearls: 0, chatPearls: 0, pats: 0 };
};

/** She came by: returns how Jelly remembered things before, and marks her as seen. */
export async function seen() {
  const before = await jellyState();
  await save({ ...before, lastSeen: new Date().toISOString() });
  return before;
}

/** Pats: they grow friendship, and every 15 earn a pearl (up to 5 pearls a day). */
export async function addPets(n: number) {
  return change((s) => {
    const t = todayOf(s);
    const pats = t.pats + n;
    const pearls = Math.min(5 - t.patPearls, Math.floor(pats / 15) - Math.floor(t.pats / 15));
    const add = Math.max(0, pearls);
    return { ...s, pets: s.pets + n, pearls: (s.pearls ?? 0) + add, earned: (s.earned ?? 0) + add, today: { ...t, pats, patPearls: t.patPearls + add } };
  });
}

/** A chat with Jelly: friendship, and 2 pearls each for the first 5 a day. */
export async function addChat() {
  return change((s) => {
    const t = todayOf(s);
    const add = t.chatPearls < 10 ? 2 : 0;
    return { ...s, chats: s.chats + 1, pearls: (s.pearls ?? 0) + add, earned: (s.earned ?? 0) + add, today: { ...t, chatPearls: t.chatPearls + add } };
  });
}

/** Days in a row up to today. */
export function streakOf(days: string[], today = milanDay()) {
  const set = new Set(days);
  let n = 0;
  for (let d = today; set.has(d); d = addDays(d, -1)) n++;
  return n;
}

export type Gain =
  | { kind: 'daily'; pearls: number; streak: number }
  | { kind: 'achievement'; id: string; title: string; icon: string; pearls: number; reward?: string; backdrop?: string }
  | { kind: 'quest'; id: string; title: string; icon: string; pearls: number; all?: boolean }
  | { kind: 'season'; id: string; title: string; icon: string; pearls: number; hello: string; backdrop?: string };

/** What sync needs to know about today: is she in Milano yet (for the quests), and what's on. */
export type Today = { inMilano: boolean; season?: Season | null };

/**
 * The daily visit bonus, and any achievements newly reached. Each is awarded once: pearls go in her
 * purse, and reward items and backdrops into Jelly's home.
 */
export async function sync(stats: (s: JellyState) => Promise<Stats>, today: Today = { inMilano: true }) {
  const gains: Gain[] = [];
  const st = await change(async (s0) => {
    let s = { ...s0, owned: { ...(s0.owned ?? {}) }, unlocked: { ...(s0.unlocked ?? {}) }, backdrops: [...(s0.backdrops ?? [])] };
    const day = milanDay();
    const days = s.days ?? [];
    if (!days.includes(day)) {
      const next = [...days, day].slice(-400);
      const streak = streakOf(next, day);
      const pearls = 10 + Math.min(10, 2 * (streak - 1));
      s = { ...s, days: next, pearls: (s.pearls ?? 0) + pearls, earned: (s.earned ?? 0) + pearls };
      gains.push({ kind: 'daily', pearls, streak });
    }
    // her first visit in a season or festival: its backdrop and pearls
    const se = today.season;
    if (se && !(s.seasons ?? []).includes(se.id)) {
      const bd = se.backdrop && !s.backdrops.includes(se.backdrop) ? se.backdrop : undefined;
      s = { ...s, seasons: [...(s.seasons ?? []), se.id], backdrops: bd ? [...s.backdrops, bd] : s.backdrops, pearls: (s.pearls ?? 0) + se.pearls, earned: (s.earned ?? 0) + se.pearls };
      gains.push({ kind: 'season', id: se.id, title: se.name, icon: se.emoji, pearls: se.pearls, hello: se.hello, backdrop: bd });
    }
    const seasonQuest: Quest | undefined = se?.quest;

    // today's quests: picked (with where everything stands) on her first visit, then checked each time
    let now = await stats(s);
    let q = s.quests?.day === day ? s.quests : null;
    if (!q) {
      const ids = pickQuests(day, now, s.quests?.ids ?? [], today.inMilano, seasonQuest);
      const find = (id: string) => (id === seasonQuest?.id ? seasonQuest : questById(id));
      q = { day, ids, base: Object.fromEntries(ids.map((id) => [id, valueOf(find(id)!, now, s.events ?? {})])), done: [], bonus: false };
    }
    q = { ...q, done: [...q.done] };
    for (const id of q.ids) {
      const quest = id === seasonQuest?.id ? seasonQuest : questById(id);
      if (!quest || q.done.includes(id) || valueOf(quest, now, s.events ?? {}) - (q.base[id] ?? 0) < quest.n) continue;
      q.done.push(id);
      const pearls = TIER_PEARLS[quest.tier];
      s = { ...s, pearls: (s.pearls ?? 0) + pearls, earned: (s.earned ?? 0) + pearls, questsDone: (s.questsDone ?? 0) + 1 };
      gains.push({ kind: 'quest', id, title: quest.title, icon: quest.icon, pearls });
    }
    if (!q.bonus && q.ids.length && q.ids.every((id) => q!.done.includes(id))) {
      q.bonus = true;
      s = { ...s, pearls: (s.pearls ?? 0) + ALL_BONUS, earned: (s.earned ?? 0) + ALL_BONUS, questDays: (s.questDays ?? 0) + 1 };
      gains.push({ kind: 'quest', id: 'all', title: 'All three quests done!', icon: '🌟', pearls: ALL_BONUS, all: true });
    }
    s = { ...s, quests: q };

    now = await stats(s);
    for (const a of ACHIEVEMENTS) {
      if (s.unlocked![a.id] || now[a.metric] < goalOf(a, now) || goalOf(a, now) <= 0) continue;
      s.unlocked![a.id] = new Date().toISOString();
      s.pearls = (s.pearls ?? 0) + a.pearls;
      s.earned = (s.earned ?? 0) + a.pearls;
      if (a.reward) s.owned![a.reward] = (s.owned![a.reward] ?? 0) + 1;
      if (a.backdrop && !s.backdrops!.includes(a.backdrop)) s.backdrops!.push(a.backdrop);
      gains.push({ kind: 'achievement', id: a.id, title: a.title, icon: a.icon, pearls: a.pearls, reward: a.reward, backdrop: a.backdrop });
    }
    return s;
  });
  return { state: st, gains };
}

/** Something only her screen saw (she heard the phrase, the brief…), up to each one's daily cap. */
export async function addEvent(name: EventName) {
  let counted = false;
  const st = await change((s) => {
    const day = milanDay();
    const t = s.eventsToday?.day === day ? s.eventsToday : { day, n: {} };
    if ((t.n[name] ?? 0) >= EVENTS[name]) return s;
    counted = true;
    return { ...s, events: { ...(s.events ?? {}), [name]: ((s.events ?? {})[name] ?? 0) + 1 }, eventsToday: { day, n: { ...t.n, [name]: (t.n[name] ?? 0) + 1 } } };
  });
  return { counted, state: st };
}

/* ---------- Jelly's games ---------- */
// the most a real player could score each second, and points per pearl
const GAME_RULES: Record<GameId, { perSec: number; per: number; maxMs: number }> = {
  catch: { perSec: 3, per: 4, maxMs: 120_000 },
  pop: { perSec: 6, per: 6, maxMs: 120_000 },
  says: { perSec: 0.5, per: 1, maxMs: 30 * 60_000 },
};
export const GAME_PEARLS_A_DAY = 15;
export const isGame = (x: unknown): x is GameId => typeof x === 'string' && x in GAME_RULES;

/** A finished game: its score (capped to what's possible in the time), a best, and a few pearls. */
export async function addGame(game: GameId, rawScore: number, ms: number) {
  const r = GAME_RULES[game];
  const time = Math.max(0, Math.min(r.maxMs, ms));
  const score = Math.max(0, Math.min(Math.floor(rawScore), Math.ceil((time / 1000) * r.perSec)));
  let result = { score, pearls: 0, best: false };
  const st = await change((s) => {
    const day = milanDay();
    const g = s.games && s.games.day === day ? s.games : { best: s.games?.best ?? {}, played: s.games?.played ?? 0, day, pearls: 0 };
    const pearls = Math.max(0, Math.min(GAME_PEARLS_A_DAY - g.pearls, Math.floor(score / r.per)));
    const best = score > (g.best[game] ?? 0);
    result = { score, pearls, best: best && (g.best[game] ?? 0) > 0 };
    return {
      ...s,
      pearls: (s.pearls ?? 0) + pearls,
      earned: (s.earned ?? 0) + pearls,
      games: { ...g, best: { ...g.best, [game]: Math.max(score, g.best[game] ?? 0) }, played: g.played + 1, pearls: g.pearls + pearls },
    };
  });
  return { ...result, state: st };
}

/** Her sound settings (with the old on/off switch folded in). */
export const prefsOf = (s: JellyState): AudioPrefs => cleanPrefs(s.audio, { ...DEFAULT_PREFS, on: s.sound !== false });
/** Change some of her sound settings. */
export const setPrefs = (patch: Partial<AudioPrefs>) =>
  change((s) => {
    const audio = cleanPrefs(patch, prefsOf(s));
    return { ...s, audio, sound: audio.on };
  });

/** Connect (or disconnect) Saani's radio. */
export const setSpotify = (uri: string | null) => change((s) => ({ ...s, spotify: uri }));

/** Buy a thing (or a backdrop) for Jelly's home. Returns an error message, or the new state. */
export async function buy(id: string, season: SeasonKey | null = null): Promise<string | JellyState> {
  const item = itemById(id);
  const bd = BACKDROPS.find((b) => b.id === id);
  const price = item?.price ?? bd?.price;
  if (!item && !bd) return 'That isn’t in the shop.';
  // a festival's own things are only in the shop while it's on
  if (item && !inSeason(item, season)) return `That one’s only in the shop for ${seasonsOf(item).map((k) => SEASON_NAMES[k]).join(' or ')}.`;
  if (price === undefined) return 'That one can’t be bought: it’s unlocked by an achievement.';
  let err = '';
  const s = await change((s) => {
    if ((s.pearls ?? 0) < price) {
      err = 'Not enough pearls yet. Keep exploring to earn more!';
      return s;
    }
    if (bd) {
      if ((s.backdrops ?? []).includes(bd.id) || !bd.price) {
        err = 'Jelly already has that one.';
        return s;
      }
      return { ...s, pearls: (s.pearls ?? 0) - price, backdrops: [...(s.backdrops ?? []), bd.id], bought: (s.bought ?? 0) + 1 };
    }
    return { ...s, pearls: (s.pearls ?? 0) - price, owned: { ...(s.owned ?? {}), [id]: ((s.owned ?? {})[id] ?? 0) + 1 }, bought: (s.bought ?? 0) + 1 };
  });
  return err || s;
}

const clamp = (n: unknown, lo: number, hi: number, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d);

/** Save how her room is arranged: only things she owns, as many as she owns. */
export async function arrange(raw: unknown, backdrop: unknown): Promise<string | JellyState> {
  if (!Array.isArray(raw)) return 'Nothing to save.';
  if (raw.length > MAX_PLACED) return `Jelly’s home fits up to ${MAX_PLACED} things.`;
  let err = '';
  const s = await change((s) => {
    const owned = s.owned ?? {};
    const used: Record<string, number> = {};
    const placed: Placed[] = [];
    for (const r of raw as Record<string, unknown>[]) {
      const item = String(r?.item ?? '');
      if (!itemById(item) || (used[item] ?? 0) >= (owned[item] ?? 0)) {
        err = 'That isn’t in Jelly’s things yet.';
        return s;
      }
      used[item] = (used[item] ?? 0) + 1;
      placed.push({ uid: String(r.uid ?? db.newId('pl_')).slice(0, 40), item, x: clamp(r.x, 0, 100, 50), y: clamp(r.y, 0, 100, 60), s: clamp(r.s, 0.5, 2.5, 1), flip: Boolean(r.flip) });
    }
    const mine = ['lagoon', ...(s.backdrops ?? [])];
    const bd = typeof backdrop === 'string' && mine.includes(backdrop) ? backdrop : (s.backdrop ?? 'lagoon');
    return { ...s, placed, backdrop: bd };
  });
  return err || s;
}

/** What the browser gets: her purse, her home, friendship and achievements. */
export function view(s: JellyState) {
  const days = s.days ?? [];
  return {
    pearls: s.pearls ?? 0,
    earned: s.earned ?? 0,
    owned: s.owned ?? {},
    backdrops: ['lagoon', ...(s.backdrops ?? [])],
    backdrop: s.backdrop ?? 'lagoon',
    placed: s.placed ?? [],
    unlocked: s.unlocked ?? {},
    pets: s.pets,
    chats: s.chats,
    visits: days.length,
    streak: streakOf(days),
    sound: prefsOf(s).on,
    audio: prefsOf(s),
    spotify: s.spotify ?? null,
    games: { best: s.games?.best ?? {}, played: s.games?.played ?? 0, pearlsToday: s.games?.day === milanDay() ? s.games.pearls : 0 },
    ...friendship(s.pets, s.chats),
  };
}
export type JellyView = ReturnType<typeof view>;
