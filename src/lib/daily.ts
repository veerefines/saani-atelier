import { listDares, listJar, listLetters, listPosts, listWishes } from './data';
import { addDays, getDaily, listOccasions, listSongs, milanDay, setDaily } from './extras';
import { notifyFriends, notifySaanika } from './push';
import { listReminders } from './reminders';
import { milanoWeather, sky } from './today';
import { occasionSeasons, seasonOn } from './jelly-seasons';
import { happenings } from '@/content/happenings';
import { places } from '@/content/milano';
import * as db from './db';
import { forgetOldMessages } from './whatsapp';
import { monthlyReport } from './money-report';

const first = (name: string) => name.split(' ')[0];
const between = (iso: string | null | undefined, from: Date, to: Date) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t > from.getTime() && t <= to.getTime();
};

/**
 * The morning job (Vercel Cron, 06:00 UTC). Everything since the last run, announced once:
 * letters that unlocked, scheduled surprises that arrived, today's occasion, reminders to friends
 * before an occasion, and on Sundays a little weekly digest. Reading the store also keeps it awake.
 */
export async function runDaily(at = new Date()) {
  const state = await getDaily();
  const since = state ? new Date(state.lastRun) : new Date(at.getTime() - 86_400_000);
  const today = milanDay(at);
  const newDay = milanDay(since) !== today || !state;
  const out = { since: since.toISOString(), at: at.toISOString(), letters: 0, drops: 0, occasion: null as string | null, reminders: [] as string[], digest: 0, morning: false, ahead: [] as string[], month: 0, report: null as string | null };

  const [letters, posts, occasions] = await Promise.all([listLetters(), listPosts(), listOccasions()]);

  // sealed letters whose day has come
  const opened = letters.filter((l) => between(l.unlockAt, since, at));
  out.letters = opened.length;
  if (opened.length === 1) {
    const l = opened[0];
    await notifySaanika({ title: '✉️ A letter just opened', body: `${first(l.authorName)} sealed “${l.title}” for today`, url: '/home/letters' });
  } else if (opened.length > 1) {
    await notifySaanika({ title: '✉️ Letters just opened', body: `${opened.length} sealed letters are ready for you`, url: '/home/letters' });
  }

  // scheduled surprises that have arrived
  const drops = posts.filter((p) => between(p.showAt, since, at));
  out.drops = drops.length;
  if (drops.length) {
    const who = [...new Set(drops.map((p) => first(p.authorName)))];
    await notifySaanika({
      title: '🎁 A surprise just arrived',
      body: drops.length === 1 ? `${who[0]} planned this one for today` : `${drops.length} surprises from ${who.join(', ')}`,
      url: drops.every((p) => p.pageId) ? '/home/scrapbooks' : '/home/love',
    });
  }

  if (newDay) {
    // her occasion today
    const o = occasions.find((x) => x.date === today);
    if (o) {
      out.occasion = o.title;
      await notifySaanika({ title: `${o.emoji} ${o.title}`, body: o.note || 'Your people left you something for today.', url: '/home' });
      // and her people, so the day doesn't slip by
      await notifyFriends({ title: `${o.emoji} It’s ${o.title} for Saanika today`, body: 'A nudge, a voice note or a photo would make her day.', url: '/wall' });
    }

    // nudge friends a few days before
    for (const x of occasions) {
      if (addDays(x.date, -x.remindDays) === today) {
        out.reminders.push(x.title);
        await notifyFriends({ title: `${x.emoji} ${x.title} in ${x.remindDays} days`, body: 'Seal her a letter for the day, or plan a surprise.', url: '/wall/letters' });
      }
    }

    // Jelly's good morning: the sky, today's reminders, and new quests to do
    const [w, rem] = await Promise.all([milanoWeather().catch(() => null), listReminders().catch(() => [])]);
    const todays = rem.filter((r) => !r.done && milanDay(new Date(r.at)) === today).length;
    const season = seasonOn(today, occasionSeasons(occasions));
    const bits = [w ? `${w.now}° and ${sky(w.code, w.isDay).words}` : '', todays ? `${todays} ${todays === 1 ? 'reminder' : 'reminders'}` : '', '3 new quests'].filter(Boolean);
    await notifySaanika({ title: season ? `${season.emoji} ${season.name}! Buongiorno, Saani` : '☀️ Buongiorno, Saani!', body: `${bits.join(' · ')}. Jelly has your morning brief ready 🪼`, url: '/home' });
    out.morning = true;

    // Milano happenings: a week ahead (to plan), the day before, and on the 1st, the month's list
    const nudged = new Set((await db.get<{ id: string; createdAt: string; ids: string[] }>('state', 'nudged-events'))?.ids ?? []);
    const fresh: string[] = [];
    const inWeek = addDays(today, 7);
    const tomorrow = addDays(today, 1);
    const dayName = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
    for (const h of happenings) {
      for (const e of h.editions ?? []) {
        for (const [when, key, title, body] of [
          [inWeek, `w:${h.id}:${e.start}`, `📅 Next ${dayName(e.start).split(' ')[0]}: ${h.title}`, `${h.where}${e.tentative ? ' (dates to be confirmed)' : ''}. Want to go? Jelly can remind you.`],
          [tomorrow, `d:${h.id}:${e.start}`, `📅 Tomorrow: ${h.title}`, `${h.details?.time ? `${h.details.time} · ` : ''}${h.where}`],
        ] as const) {
          if (e.start !== when || nudged.has(key)) continue;
          await notifySaanika({ title, body, url: `/home/milano?event=${h.id}#happenings` });
          fresh.push(key);
          out.ahead.push(key);
        }
      }
    }
    if (today.endsWith('-01') && !nudged.has(`m:${today.slice(0, 7)}`)) {
      const month = today.slice(0, 7);
      const things = happenings.filter((h) => (h.editions ?? []).some((e) => e.start.slice(0, 7) === month || (e.start < `${month}-01` && e.end >= `${month}-01`))).length;
      const finds = places.filter((p) => p.added && p.added > addDays(today, -31)).length;
      const name = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
      await notifySaanika({ title: `🗓️ Your ${name} in Milano`, body: `${things} ${things === 1 ? 'thing' : 'things'} to do${finds ? ` and ${finds} new ${finds === 1 ? 'find' : 'finds'}` : ''}. Jelly made you a list ✨`, url: '/home/calendar' });
      fresh.push(`m:${month}`);
      out.month = things;
    }
    if (fresh.length) await db.put('state', { id: 'nudged-events', createdAt: new Date().toISOString(), ids: [...nudged, ...fresh].slice(-500) });

    // Sunday digest of the week's arrivals
    const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short' }).format(at);
    if (weekday === 'Sun') {
      const weekAgo = new Date(at.getTime() - 7 * 86_400_000);
      const [jar, dares, wishes, songs] = await Promise.all([listJar(), listDares(), listWishes(), listSongs()]);
      const arrived = (p: { createdAt: string; showAt?: string }) => between(p.showAt ?? p.createdAt, weekAgo, at);
      const count =
        posts.filter((p) => !p.pageId && arrived(p)).length +
        letters.filter((l) => l.authorId !== 'seed' && between(l.createdAt, weekAgo, at)).length +
        jar.filter((n) => n.authorId !== 'seed' && between(n.createdAt, weekAgo, at)).length +
        dares.filter((d) => between(d.createdAt, weekAgo, at)).length +
        wishes.filter((w) => w.fromId && between(w.createdAt, weekAgo, at)).length +
        songs.filter((s) => between(s.createdAt, weekAgo, at)).length;
      out.digest = count;
      if (count) await notifySaanika({ title: '💗 Your week', body: `${count} new ${count === 1 ? 'thing' : 'things'} from your people this week`, url: '/home' });
    }
  }

  // the 1st of the month: Jelly emails last month's Soldi sheet
  if (newDay) out.report = await monthlyReport(today).catch(() => 'failed');

  // WhatsApp message ids are only kept long enough to spot Meta's retries
  if (newDay) await forgetOldMessages().catch(() => {});
  await setDaily(at.toISOString());
  return out;
}
