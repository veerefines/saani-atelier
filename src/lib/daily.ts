import { listDares, listJar, listLetters, listPosts, listWishes } from './data';
import { addDays, getDaily, listOccasions, listSongs, milanDay, setDaily } from './extras';
import { notifyFriends, notifySaanika } from './push';

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
  const out = { since: since.toISOString(), at: at.toISOString(), letters: 0, drops: 0, occasion: null as string | null, reminders: [] as string[], digest: 0 };

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

  await setDaily(at.toISOString());
  return out;
}
