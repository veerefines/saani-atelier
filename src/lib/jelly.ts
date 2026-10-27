import * as db from './db';
import { milanDay, addDays } from './extras';
import { friendship } from './jelly-mood';
import { ACHIEVEMENTS, BACKDROPS, goalOf, itemById, MAX_PLACED, type Placed, type Stats } from './jelly-catalog';

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
  /** which catalog her things belong to (2: the illustrated furniture) */
  v?: number;
};

// what the first (emoji) catalog charged, so anything bought from it is refunded
const LEGACY: Record<string, number> = {
  cactus: 15, tulips: 15, sunflower: 15, blossom: 15, plant: 20, coral: 25, mushroom: 30, chair: 30, painting: 35, clock: 40, sofa: 60, bed: 70, bathtub: 80,
  bubbles: 5, donut: 10, cupcake: 10, coffee: 10, cornetto: 10, gelato: 12, cake: 15, pasta: 15, pizza: 15, bow: 12, needle: 15, hat: 25, handbag: 45, ring: 60,
  crab: 30, puffer: 35, octopus: 50, turtle: 55, unicorn: 90, whale: 120, sparkles: 8, star: 10, balloon: 10, lemon: 10, flag: 20, mask: 40, vespa: 70,
};

/** Move her things to the illustrated catalog: refund what's gone, and hand over the new rewards she's earned. */
function migrate(s: JellyState): JellyState {
  if ((s.v ?? 1) >= 2) return s;
  const owned: Record<string, number> = {};
  let refund = 0;
  for (const [id, n] of Object.entries(s.owned ?? {})) {
    if (itemById(id)) owned[id] = n;
    else refund += (LEGACY[id] ?? 0) * n;
  }
  for (const a of ACHIEVEMENTS) if (a.reward && (s.unlocked ?? {})[a.id] && !owned[a.reward]) owned[a.reward] = 1;
  const placed = (s.placed ?? []).filter((p) => itemById(p.item));
  return { ...s, v: 2, owned, placed, pearls: (s.pearls ?? 0) + refund };
}

const COL = 'jelly';
const ID = 'friend';
const fresh = (): JellyState => ({ id: ID, createdAt: new Date().toISOString(), pets: 0, chats: 0, lastSeen: null, v: 2 });

export const jellyState = async () => migrate((await db.get<JellyState>(COL, ID)) ?? fresh());
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

export type Gain = { kind: 'daily'; pearls: number; streak: number } | { kind: 'achievement'; id: string; title: string; icon: string; pearls: number; reward?: string; backdrop?: string };

/**
 * The daily visit bonus, and any achievements newly reached. Each is awarded once: pearls go in her
 * purse, and reward items and backdrops into Jelly's home.
 */
export async function sync(stats: (s: JellyState) => Promise<Stats>) {
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
    const now = await stats(s);
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

/** Buy a thing (or a backdrop) for Jelly's home. Returns an error message, or the new state. */
export async function buy(id: string): Promise<string | JellyState> {
  const item = itemById(id);
  const bd = BACKDROPS.find((b) => b.id === id);
  const price = item?.price ?? bd?.price;
  if (!item && !bd) return 'That isn’t in the shop.';
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
    ...friendship(s.pets, s.chats),
  };
}
export type JellyView = ReturnType<typeof view>;
