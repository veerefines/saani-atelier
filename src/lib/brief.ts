import * as db from './db';
import { milanoWeather, outfit, sky } from './today';
import { jellyState, streakOf } from './jelly';
import { questsNow, today } from './jelly-world';
import { listReminders, zoneOr } from './reminders';
import { memories } from './jelly-memory';
import { milanDay, monthOf, summary } from './money';
import { getBudget, listExpenses } from './money-store';
import { seasonView } from './jelly-seasons';
import { FACTS } from '@/components/jelly/facts';
import { milano } from '@/content/home';
import { happenings, happeningKinds } from '@/content/happenings';

/**
 * Jelly's morning brief, at the top of Saani's desk: hello, the sky and what to wear, today's
 * reminders and quests, her streak, what's left of the month's money, and a fact for the day.
 * What Jelly says out loud is kept the first time each day, so her recording of it stays right.
 */
type Said = { id: string; createdAt: string; say: string };
const COL = 'briefs';
export const briefSaid = async (day: string) => (await db.get<Said>(COL, day))?.say ?? null;

const pick = <T,>(list: T[], seed: string) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
};
const hourIn = (tz: string) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
const dayIn = (at: Date, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(at);
const clock = (iso: string, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).toUpperCase().replace(':00', '');

function greeting(h: number) {
  if (h >= 5 && h < 12) return 'Buongiorno';
  if (h >= 12 && h < 17) return 'Buon pomeriggio';
  if (h >= 17 && h < 22) return 'Buonasera';
  return 'Ciao, night owl';
}

export async function buildBrief(rawTz: unknown) {
  const tz = zoneOr(rawTz);
  const day = milanDay();
  const [w, s, quests, reminders, facts, expenses, budget, on] = await Promise.all([
    milanoWeather().catch(() => null),
    jellyState(),
    questsNow(),
    listReminders(),
    memories(),
    listExpenses(),
    getBudget(),
    today(),
  ]);
  const myDay = dayIn(new Date(), tz);
  const soon = reminders.filter((r) => !r.done && dayIn(new Date(r.at), tz) === myDay);
  const money = expenses.length || budget.monthly ? summary(expenses, budget, monthOf(day), day) : null;
  const fact = pick(FACTS, day);
  // now and then, something she told Jelly
  const remembered = facts.length && pick([0, 1, 2], day + 'm') === 0 ? pick(facts, day).text : null;
  // Milano happenings starting in the next two weeks
  const inTwoWeeks = new Date(Date.parse(`${day}T12:00:00Z`) + 14 * 86_400_000).toISOString().slice(0, 10);
  const comingUp = happenings
    .flatMap((h) => (h.editions ?? []).filter((e) => e.start >= day && e.start <= inTwoWeeks).map((e) => ({ id: h.id, title: h.title, start: e.start, where: h.where, icon: happeningKinds.find((k) => k.id === h.kind)?.icon ?? '✨', tentative: Boolean(e.tentative) })))
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .slice(0, 4);
  const daysToGo = Math.round((Date.parse(`${milano.arrival}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86_400_000);
  const hello = `${greeting(hourIn(tz))}, Saani!`;
  const weather = w ? { ...w, sky: sky(w.code, w.isDay) } : null;

  // what Jelly says out loud
  const say = [
    on.season ? on.season.hello : hello,
    daysToGo > 0 ? `${daysToGo === 1 ? 'Tomorrow' : `In ${daysToGo} days`} you fly to Milano!` : '',
    weather ? `It’s ${weather.now} degrees and ${weather.sky.words} in Milano today, between ${weather.min} and ${weather.max}.` : '',
    weather ? `Jelly says: ${outfit(w!).replace(/\.$/, '')}.` : '',
    soon.length ? `${soon.length === 1 ? 'One reminder' : `${soon.length} reminders`} today: ${soon.map((r) => `${r.text} at ${clock(r.at, tz)}`).join(', and ')}.` : '',
    quests.length ? `Your quests: ${quests.map((q) => q.title.replace(/\s*\(.*\)$/, '')).join('; ')}.` : '',
    money?.left != null ? (money.left >= 0 ? `You have ${Math.round(money.left)} euros left this month.` : `You’re ${Math.round(-money.left)} euros over this month, gently does it.`) : '',
    `And did you know? ${fact.text}`,
  ]
    .filter(Boolean)
    .join(' ');
  // keep the first version of the day with quests in it (what Jelly recorded)
  if (quests.length && !(await briefSaid(day))) await db.put<Said>(COL, { id: day, createdAt: new Date().toISOString(), say });

  return {
    day,
    hello,
    season: seasonView(on.season),
    daysToGo,
    weather: weather && { now: weather.now, feels: weather.feels, min: weather.min, max: weather.max, rainChance: weather.rainChance, rainFrom: weather.rainFrom, sky: weather.sky },
    outfit: w ? outfit(w) : null,
    reminders: soon.map((r) => ({ id: r.id, text: r.text, at: r.at, tz: r.tz, repeat: r.repeat })),
    quests,
    streak: streakOf(s.days ?? []),
    pearls: s.pearls ?? 0,
    money: money && { spent: money.spent, left: money.left, budget: money.budget },
    comingUp,
    fact: { text: fact.text, ask: fact.ask },
    remembered,
    say: (await briefSaid(day)) ?? say,
  };
}
export type Brief = Awaited<ReturnType<typeof buildBrief>>;
