import { getBingo, isLocked, listJar, listLetters, listWishes, wallPosts } from './data';
import { addDays, getChecklist, getMood, listDiary, listLook, listMoments, listNudges, listOccasions, listPages, listSongs, listStamps, milanDay } from './extras';
import { listAllChats, listAllItems, listProjects, JELLY_CHATS } from './corner';
import { getInvites } from './invites';
import { milanoWeather, sky } from './today';
import { monthOf, summary } from './money';
import { getBudget, listExpenses } from './money-store';
import { memories, memoryText } from './jelly-memory';
import { listReminders } from './reminders';
import { occasionSeasons, seasonOn, type Season } from './jelly-seasons';
import { questById, TIER_PEARLS, valueOf, type QuestView } from './quests';
import { friendship } from './jelly-mood';
import { ACHIEVEMENTS, goalOf, itemById, progressOf, type Stats } from './jelly-catalog';
import { jellyState, streakOf, sync, view, type JellyState } from './jelly';
import { bingo } from '@/content/home';
import { milano } from '@/content/home';
import { checklist } from '@/content/checklist';
import { places } from '@/content/milano';
import { happenings } from '@/content/happenings';
import { MOODS as HER_MOODS } from '@/content/mood';

/**
 * Everything happening across Saani's Atelier, read once. Jelly uses it two ways: to count what
 * Saani has done (achievements) and to know what's going on when she answers (her context).
 * Surprises stay surprises: sealed letters, unread jar notes and scheduled posts are counted, never read.
 */
async function gather() {
  const [board, check, stamps, wishes, diary, moments, look, letters, jar, nudges, songs, posts, pages, projects, items, chats, expenses, budget, facts, reminders] = await Promise.all([
    getBingo(),
    getChecklist(),
    listStamps(),
    listWishes(),
    listDiary(),
    listMoments(),
    listLook(),
    listLetters(),
    listJar(),
    listNudges(),
    listSongs(),
    wallPosts(),
    listPages(),
    listProjects(),
    listAllItems(),
    listAllChats(),
    listExpenses(),
    getBudget(),
    memories(),
    listReminders(),
  ]);
  return { board, check, stamps, wishes, diary, moments, look, letters, jar, nudges, songs, posts, pages, projects, items, chats, expenses, budget, facts, reminders };
}
type World = Awaited<ReturnType<typeof gather>>;

const placeById = new Map(places.map((p) => [p.id, p]));

function statsOf(w: World, s: JellyState): Stats {
  const days = s.days ?? [];
  return {
    visits: days.length,
    streak: streakOf(days),
    pets: s.pets,
    jellyChats: s.chats,
    level: friendship(s.pets, s.chats).level,
    placed: (s.placed ?? []).length,
    bought: s.bought ?? 0,
    bingo: Object.keys(w.board.done).length,
    checklist: Object.keys(w.check.done).length,
    checklistTotal: checklist.length,
    stamps: w.stamps.length,
    fashionStamps: w.stamps.filter((x) => placeById.get(x.placeId)?.cat === 'fashion').length,
    wishes: w.wishes.filter((x) => !x.fromId).length, // her own, not friends' tips
    wishesDone: w.wishes.filter((x) => x.done).length,
    diaryDays: new Set(w.diary.map((d) => d.day)).size,
    moments: w.moments.length,
    looks: w.look.length,
    lettersOpened: w.letters.filter((l) => l.openedAt).length,
    jarDrawn: w.jar.filter((n) => n.drawnAt).length,
    nudgesAnswered: w.nudges.filter((n) => n.answeredAt).length,
    songs: w.songs.length,
    lovePosts: w.posts.length,
    pages: w.pages.length,
    projects: w.projects.length,
    cornerItems: w.items.length,
    palettes: w.items.filter((i) => i.kind === 'palette').length,
    studioChats: w.chats.filter((c) => c.projectId !== JELLY_CHATS).reduce((n, c) => n + c.turns.length, 0),
    earned: s.earned ?? 0,
    owned: Object.values(s.owned ?? {}).reduce((a, b) => a + b, 0),
    friends: Object.keys(s.owned ?? {}).filter((id) => itemById(id)?.kind === 'friends').length,
    backdrops: (s.backdrops ?? []).length,
    placesTotal: places.length,
    bingoTotal: bingo.length,
    expenses: w.expenses.length,
    underBudget: underBudget(w),
    questsDone: s.questsDone ?? 0,
    questDays: s.questDays ?? 0,
    games: s.games?.played ?? 0,
    catchBest: s.games?.best.catch ?? 0,
    popBest: s.games?.best.pop ?? 0,
    saysBest: s.games?.best.says ?? 0,
    memories: w.facts.length,
    reminders: w.reminders.length,
    seasons: (s.seasons ?? []).length,
  };
}

/** Finished months (with a few spends logged) that she kept under her budget. */
function underBudget(w: World) {
  if (!w.budget.monthly) return 0;
  const now = monthOf(milanDay());
  const months = [...new Set(w.expenses.map((x) => monthOf(x.day)))].filter((m) => m < now);
  return months.filter((m) => {
    const s = summary(w.expenses, w.budget, m);
    return s.count >= 5 && s.spent <= w.budget.monthly;
  }).length;
}

/** What's on today (a festival, a season, her birthday), and whether she's in Milano yet. */
export async function today(): Promise<{ inMilano: boolean; season: Season | null }> {
  const day = milanDay();
  const occasions = await listOccasions().catch(() => []);
  return { inMilano: day >= milano.arrival, season: seasonOn(day, occasionSeasons(occasions)) };
}

/** Today's quests and how far along each one is, without awarding anything. */
export async function questsNow(): Promise<QuestView[]> {
  const [w, s] = await Promise.all([gather(), jellyState()]);
  const q = s.quests;
  if (!q || q.day !== milanDay()) return [];
  const st = statsOf(w, s);
  return q.ids.flatMap((id) => {
    const quest = questById(id);
    if (!quest) return [];
    const done = q.done.includes(id);
    const have = done ? quest.n : Math.max(0, Math.min(quest.n, valueOf(quest, st, s.events ?? {}) - (q.base[id] ?? 0)));
    return [{ id, icon: quest.icon, title: quest.title, href: quest.href, tier: quest.tier, pearls: TIER_PEARLS[quest.tier], have, n: quest.n, done }];
  });
}

const PAGES: [RegExp, string][] = [
  [/^\/home\/?$/, 'her desk (the dashboard)'],
  [/^\/home\/corner\/[^/]+/, 'a project in My Corner'],
  [/^\/home\/corner/, 'My Corner (her projects)'],
  [/^\/home\/jelly/, 'Jelly’s Corner (your home!)'],
  [/^\/home\/milano/, 'the Milano guide'],
  [/^\/home\/passport/, 'her passport of stamps'],
  [/^\/home\/checklist/, 'the settling-in checklist'],
  [/^\/home\/bingo/, 'Milano bingo'],
  [/^\/home\/chapter/, 'My chapter (her diary)'],
  [/^\/home\/moments/, 'Moments'],
  [/^\/home\/lookbook/, 'her lookbook'],
  [/^\/home\/letters/, 'her letters'],
  [/^\/home\/love/, 'the love wall'],
  [/^\/home\/jar/, 'the jar of notes'],
  [/^\/home\/songs/, 'songs for her'],
  [/^\/home\/money/, 'Soldi, her spending tracker'],
  [/^\/home\/scrapbook/, 'the scrapbooks'],
  [/^\/home\/book/, 'her printable book'],
];
export const pageName = (path: string) => PAGES.find(([r]) => r.test(path))?.[1] ?? null;

const short = (t: string | undefined, n: number) => {
  const s = (t ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};
const fmt = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Saani's whole Atelier as a few compact lines, for Jelly. `max` is a rough character budget. */
export async function platformContext(s: JellyState, path: string | null, max = 6000) {
  const w = await gather();
  const st = statsOf(w, s);
  const today = milanDay();
  const before = today < milano.arrival;
  const dayN = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${milano.arrival}T12:00:00Z`)) / 86_400_000);
  const [weather, mood, invites, occasions] = await Promise.all([milanoWeather().catch(() => null), getMood().catch(() => null), getInvites().catch(() => []), listOccasions().catch(() => [])]);
  const her = mood ? HER_MOODS.find((m) => m.id === mood.mood) : null;
  const where = path ? pageName(path) : null;

  const L: string[] = ['# Saani’s Atelier (her private site; friends see only their side)'];
  L.push(
    `About her: Saanika (“Saani”), a fashion management student from ${milano.homeCity}, moving to Milano. ${before ? `She flies on ${fmt(milano.arrival)}: ${-dayN} days to go.` : `Today is day ${dayN + 1} in Milano.`} Varun, who made this site for her, is in ${milano.laCity}.`,
  );
  if (where) L.push(`Right now she’s looking at ${where}.`);
  // what she's told Jelly before comes early, so it's never cut off
  const mem = memoryText(w.facts);
  if (mem) L.push(mem);
  if (her) L.push(`Her mood today: ${her.emoji} ${her.label}${mood?.note ? ` (“${short(mood.note, 80)}”)` : ''}.`);
  if (weather) L.push(`Milano weather: ${weather.now}°, ${sky(weather.code, weather.isDay).words}, ${weather.min}°–${weather.max}°, sunset ${weather.sunset}.`);
  const friends = invites.filter((i) => i.role === 'wellwisher').map((i) => i.name);
  if (friends.length) L.push(`Her people on the site: ${friends.join(', ')}.`);

  const left = checklist.filter((c) => !w.check.done[c.id]);
  L.push(`Settling-in checklist: ${st.checklist}/${checklist.length} done${left.length ? `; still to do: ${left.slice(0, 5).map((c) => c.title).join('; ')}` : ' (all done!)'}.`);
  const done = bingo.filter((q) => w.board.done[q.id]);
  L.push(`Milano bingo: ${done.length}/${bingo.length} squares${done.length ? ` (done: ${done.slice(-5).map((q) => q.label).join('; ')})` : ''}.`);
  const stamped = w.stamps.map((x) => placeById.get(x.placeId)?.name).filter(Boolean);
  L.push(`Passport: ${stamped.length}/${places.length} places stamped${stamped.length ? ` (latest: ${stamped.slice(0, 5).join(', ')})` : ''}.`);
  const open = w.wishes.filter((x) => !x.done);
  if (w.wishes.length) L.push(`Wish list: ${open.length} open${open.length ? ` (${open.slice(0, 6).map((x) => short(x.text, 50)).join('; ')})` : ''}, ${st.wishesDone} done.`);

  const lastDiary = [...w.diary].slice(-3).reverse();
  if (lastDiary.length) L.push(`My chapter (her diary), ${st.diaryDays} days written. Latest: ${lastDiary.map((d) => `${fmt(d.day)} ${d.mood} “${short(d.text, 160)}”`).join(' | ')}`);
  if (w.moments.length) L.push(`Moments she shared: ${w.moments.length}${w.moments[0]?.caption ? ` (latest: “${short(w.moments[0].caption, 80)}”)` : ''}.`);
  if (w.look.length) L.push(`Lookbook: ${w.look.length} looks and pins${w.look.some((l) => l.caption) ? ` (recent: ${w.look.filter((l) => l.caption).slice(0, 3).map((l) => `“${short(l.caption, 50)}”`).join(', ')})` : ''}.`);

  const opened = w.letters.filter((l) => l.openedAt);
  const ready = w.letters.filter((l) => !isLocked(l) && !l.openedAt).length;
  const sealed = w.letters.filter((l) => isLocked(l)).length;
  L.push(`Letters: ${opened.length} opened${ready ? `, ${ready} ready to open` : ''}${sealed ? `, ${sealed} still sealed (never reveal or guess what they say)` : ''}${opened.length ? `; opened ones from ${[...new Set(opened.map((l) => l.authorName))].join(', ')}` : ''}.`);
  L.push(`Jar of notes: ${w.jar.length} notes from friends for different moods, ${st.jarDrawn} drawn (don’t reveal unread ones).`);
  if (w.posts.length) L.push(`Love wall: ${w.posts.length} notes from friends. Recent: ${w.posts.slice(0, 4).map((p) => `${p.authorName}: “${short(p.text, 90) || `a ${p.kind}`}”`).join(' | ')}`);
  if (w.songs.length) L.push(`Songs dedicated to her: ${w.songs.length} (recent: ${w.songs.slice(0, 4).map((x) => `${x.title ? `“${short(x.title, 40)}”` : 'a song'} from ${x.authorName}`).join(', ')}).`);
  const fresh = w.nudges.filter((n) => !n.dismissedAt).slice(0, 3);
  if (fresh.length) L.push(`Thinking-of-you nudges: ${fresh.map((n) => `${n.emoji} from ${n.authorName}${n.text ? ` “${short(n.text, 50)}”` : ''}`).join(', ')}.`);
  if (w.pages.length) L.push(`Scrapbook pages her people made: ${w.pages.map((p) => `${p.emoji} ${p.title}`).slice(0, 5).join(', ')}.`);

  if (w.expenses.length || w.budget.monthly) {
    const m = summary(w.expenses, w.budget, monthOf(today), today);
    const cats = m.byCat.slice(0, 5).map((c) => `${c.label} €${c.eur}${c.cap ? ` of €${c.cap}` : ''}`).join('; ');
    L.push(
      `Soldi (her spending, private to her): this month €${m.spent} (₹${Math.round(m.spentInr)}) over ${m.count} spends${m.budget ? `, budget €${m.budget}, €${m.left} left with ${m.daysLeft} days to go (${m.onTrack ? 'on track' : 'ahead of pace'})` : ', no budget set'}; this week €${m.week.eur}${cats ? `. By category: ${cats}` : ''}.`,
    );
  }

  const soon = occasions.filter((o) => o.date >= today && o.date <= addDays(today, 60)).slice(0, 6);
  if (soon.length) L.push(`Coming up: ${soon.map((o) => `${o.emoji} ${o.title} (${fmt(o.date)})`).join(', ')}.`);
  const events = happenings
    .flatMap((h) => (h.editions ?? []).filter((e) => e.end >= today).map((e) => ({ h, e })))
    .sort((a, b) => a.e.start.localeCompare(b.e.start))
    .slice(0, 3);
  if (events.length) L.push(`Fashion happenings in Milano: ${events.map(({ h, e }) => `${h.title} (${fmt(e.start)})`).join('; ')}.`);

  const upcoming = w.reminders.filter((r) => !r.done).slice(0, 5);
  if (upcoming.length) L.push(`Her reminders (you set these for her): ${upcoming.map((r) => `“${short(r.text, 60)}” ${new Intl.DateTimeFormat('en-GB', { timeZone: r.tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(r.at))}${r.repeat !== 'none' ? ` (${r.repeat})` : ''}`).join('; ')}.`);
  const q = s.quests?.day === today ? s.quests : null;
  if (q) L.push(`Today’s daily quests: ${q.ids.map((id) => `${questById(id)?.title ?? id}${q.done.includes(id) ? ' (done)' : ''}`).join('; ')}.`);
  const on = seasonOn(today, occasionSeasons(occasions));
  if (on) L.push(`It’s ${on.name} ${on.emoji} right now: you’re dressed up for it; be festive about it.`);

  // Jelly's own corner: her home, and what Saani is close to unlocking
  const near = ACHIEVEMENTS.filter((a) => !(s.unlocked ?? {})[a.id])
    .map((a) => ({ a, p: progressOf(a, st) }))
    .filter((x) => x.p > 0 || x.a.goal === 1)
    .sort((x, y) => y.p - x.p)
    .slice(0, 3);
  L.push(
    `Your home, Jelly’s Corner: ${s.pearls ?? 0} pearls to spend, ${(s.placed ?? []).length} things placed, friendship level ${friendship(s.pets, s.chats).level}, ${Object.keys(s.unlocked ?? {}).length}/${ACHIEVEMENTS.length} achievements. Close to unlocking: ${near.map(({ a }) => `${a.title} (${a.desc}; ${st[a.metric]}/${goalOf(a, st)})`).join('; ')}.`,
  );

  let out = L.join('\n');
  if (out.length > max) out = out.slice(0, max - 1) + '…';
  return out;
}

/** Award the daily visit and any achievements now reached; returns her home as the browser sees it. */
export async function checkIn() {
  const w = await gather();
  const { state, gains } = await sync(async (s) => statsOf(w, s), await today());
  return { home: view(state), stats: statsOf(w, state), gains };
}
