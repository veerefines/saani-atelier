import * as db from './db';
import { friendEmails, googleAccount } from './google';
import { getInvites } from './invites';
import { mailReady, sendMail } from './mail';
import { checklist } from '@/content/checklist';
import { happenings } from '@/content/happenings';
import { places } from '@/content/milano';
import { listPosts } from './data';
import { addDays, getChecklist, getPresence, listMoments, listStamps, milanDay } from './extras';
import { jellyState, view } from './jelly';
import { ACHIEVEMENTS } from './jelly-catalog';
import { listChats, JELLY_CHATS } from './corner';
import { signUnsub } from './session';
import { people } from './zones';
import type { Meetup } from './meetup-model';

/**
 * Jelly's emails: the call invites to Saani's friends, a nudge to Saani when she hasn't been by for two
 * weeks, a note to her friends when she hits something big or is having a hard time (only if she
 * switched that on), and a fortnightly "how Saani's doing" for her friends. Every one can be stopped
 * with the link at its bottom; nothing here ever includes her diary, money, messages or chats.
 */
const SITE = 'https://saani.space';
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const first = (n: string) => n.split(' ')[0];
const DAY = 86_400_000;

/* ---------- what she's switched on, and who's said stop ---------- */
export type Prefs = { id: 'jelly-mail-prefs'; createdAt: string; inactive: boolean; achievements: boolean; low: boolean; digest: boolean; optOut: string[] };
const DEFAULTS = { inactive: true, achievements: true, low: false, digest: true, optOut: [] as string[] };
export async function getPrefs(): Promise<Prefs> {
  return { id: 'jelly-mail-prefs', createdAt: new Date().toISOString(), ...DEFAULTS, ...(await db.get<Prefs>('state', 'jelly-mail-prefs')) };
}
export async function setPrefs(patch: Partial<Pick<Prefs, 'inactive' | 'achievements' | 'low' | 'digest'>>) {
  const cur = await getPrefs();
  const next: Prefs = { ...cur };
  for (const k of ['inactive', 'achievements', 'low', 'digest'] as const) if (typeof patch[k] === 'boolean') next[k] = patch[k] as boolean;
  return db.put<Prefs>('state', next);
}
/** Someone pressed "stop these emails": a friend is left out of Jelly's mail, Saani's own nudges switch off. */
export async function unsubscribe(personId: string) {
  const p = await getPrefs();
  if (personId === 'saanika') return db.put<Prefs>('state', { ...p, inactive: false });
  return db.put<Prefs>('state', { ...p, optOut: [...new Set([...p.optOut, personId])] });
}

/* ---------- what's been sent ---------- */
type State = { id: 'jelly-mail'; createdAt: string; achSeen?: string[]; inactiveLast?: string; lowLast?: string; digestLast?: string };
const getState = async (): Promise<State> => (await db.get<State>('state', 'jelly-mail')) ?? { id: 'jelly-mail', createdAt: new Date().toISOString() };
const putState = (s: State) => db.put<State>('state', s);

/* ---------- the look ---------- */
type Shell = { preheader: string; kicker: string; title: string; body: string; cta?: { label: string; url: string }; cta2?: { label: string; url: string }; foot: string };

/** One layout for all of them: Jelly's picture, a cream card, solid colours (so dark mode keeps it readable). */
function shell(o: Shell) {
  const btn = (b: { label: string; url: string }, main: boolean) => `<a href="${esc(b.url)}" style="display:inline-block;margin:4px 3px;padding:11px 24px;border-radius:999px;background:${main ? '#b2305f' : '#fbe3e8'};color:${main ? '#ffffff' : '#6b1e3a'};font:700 14px Arial,Helvetica,sans-serif;text-decoration:none">${esc(b.label)}</a>`;
  return `<!doctype html><html><head><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head><body style="margin:0;padding:0;background-color:#fbe3e8" bgcolor="#fbe3e8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#fbe3e8">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fbe3e8" style="background-color:#fbe3e8"><tr><td align="center" style="padding:14px 6px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%">
<tr><td style="padding:0 4px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  <td width="72" valign="middle"><img src="${SITE}/email/jelly.png" width="64" height="64" alt="Jelly" style="display:block;width:64px;height:64px;border-radius:32px;border:3px solid #ffffff;background:#ffffff"></td>
  <td valign="middle" style="padding-left:6px"><div style="font:italic 400 14px Georgia,'Times New Roman',serif;color:#6b1e3a">${esc(o.kicker)}</div><div style="font:700 22px/1.2 Georgia,'Times New Roman',serif;color:#6b1e3a">${esc(o.title)}</div></td>
</tr></table></td></tr>
<tr><td style="background:#fff8f3;border-radius:22px;border:1px solid #f3d4de;padding:18px 18px 16px;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:#3a2a33">
${o.body}
${o.cta ? `<div style="text-align:center;padding-top:16px">${btn(o.cta, true)}${o.cta2 ? btn(o.cta2, false) : ''}</div>` : ''}
</td></tr>
<tr><td align="center" style="padding:10px 14px 0;font:400 11.5px/1.6 Arial,Helvetica,sans-serif;color:#8a6a77">${o.foot}</td></tr>
</table></td></tr></table></body></html>`;
}
const p = (t: string) => `<p style="margin:0 0 10px">${t}</p>`;
const hi = (n: string) => `Ciao ${esc(first(n))}! 🪼`;
const stop = (url: string, what: string) => `Jelly 🫧 sends ${what} from Saani's Atelier.<br><a href="${esc(url)}" style="color:#8a6a77">Stop these emails</a>`;

type Who = { id: string; name: string; email: string };
/** Friends who have an email set in admin and haven't asked to stop. */
async function friendsToMail(only?: string[]): Promise<Who[]> {
  const [invites, emails, prefs] = await Promise.all([getInvites(), friendEmails(), getPrefs()]);
  return invites.filter((i) => i.role === 'wellwisher' && emails[i.id] && !prefs.optOut.includes(i.id) && (!only || only.includes(i.id))).map((i) => ({ id: i.id, name: i.name, email: emails[i.id] }));
}
async function eachFriend(list: Who[], make: (f: Who, stopUrl: string) => { subject: string; html: string; text: string }) {
  let n = 0;
  for (const f of list) {
    const m = make(f, `${SITE}/api/mail/unsubscribe?t=${await signUnsub(f.id)}`);
    if (await sendMail({ to: f.email, ...m })) n++;
  }
  return n;
}

/* ---------- 1. a call: invited, moved, or cancelled ---------- */
const whenIn = (iso: string, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));

export async function meetupMail(kind: 'new' | 'moved' | 'cancelled', m: Meetup): Promise<number> {
  if (!mailReady()) return 0;
  const [list, zones] = await Promise.all([friendsToMail(m.friendIds), people()]);
  const tzOf = (id: string) => zones.find((z) => z.id === id)?.tz ?? 'Asia/Kolkata';
  const head = kind === 'new' ? 'Saani planned a call' : kind === 'moved' ? 'A call moved' : 'A call is off';
  return eachFriend(list, (f, stopUrl) => {
    const mine = whenIn(m.start, tzOf(f.id));
    const milano = whenIn(m.start, 'Europe/Rome');
    const lines =
      kind === 'cancelled'
        ? [p(`${hi(f.name)}`), p(`Saani cancelled <b>“${esc(m.title)}”</b>. Another time! 💗`)]
        : [
            p(hi(f.name)),
            p(kind === 'new' ? `Saani would love to see you on a video call:` : `The call has a new time:`),
            `<div style="margin:0 0 12px;padding:12px 14px;border-radius:14px;background:#fbe3e8"><div style="font:700 17px Georgia,'Times New Roman',serif;color:#6b1e3a">${esc(m.title)}</div><div style="margin-top:4px"><b>${esc(mine)}</b> your time<br><span style="color:#8a6a77">${esc(milano)} in Milano · ${m.minutes} min</span></div></div>`,
            p('A calendar invite from Google is on its way too. Tap below to join, or to tell Saani if you can make it.'),
          ];
    const cta = kind === 'cancelled' ? { label: 'Say hi on the wall 💗', url: `${SITE}/wall` } : { label: m.meetLink ? 'Join the call 💻' : 'Open the invite', url: m.meetLink ?? `${SITE}/wall` };
    const html = shell({ preheader: `${m.title} · ${mine}`, kicker: 'Jelly here 🪼', title: head, body: lines.join(''), cta, cta2: kind === 'cancelled' ? undefined : { label: 'Can I come?', url: `${SITE}/wall` }, foot: stop(stopUrl, 'call invites and updates') });
    return { subject: `${kind === 'new' ? '💻 Saani invited you to' : kind === 'moved' ? '💻 New time for' : '💻 Cancelled:'} “${m.title}”`, html, text: `${head}: ${m.title}${kind === 'cancelled' ? '' : `\n${mine} (your time)\n${m.meetLink ?? ''}`}\n\nStop these emails: ${stopUrl}` };
  });
}

/* ---------- 2. Saani hasn't been by for two weeks ---------- */
const sawLast = async () => {
  const [pres, jelly] = await Promise.all([getPresence(), jellyState()]);
  const t = [pres?.lastSeen, jelly.lastSeen].filter(Boolean).map((x) => Date.parse(x as string));
  return t.length ? Math.max(...t) : null;
};
const saaniEmail = async () => (await googleAccount())?.email || process.env.SAANI_EMAIL || null;

export async function inactiveMail(now = Date.now()): Promise<boolean> {
  if (!mailReady() || !(await getPrefs()).inactive) return false;
  const last = await sawLast();
  if (last === null || now - last < 14 * DAY) return false;
  const st = await getState();
  if (st.inactiveLast && now - Date.parse(st.inactiveLast) < 14 * DAY) return false;
  const to = await saaniEmail();
  if (!to) return false;
  const [posts, moments] = await Promise.all([listPosts(), listMoments()]);
  const newPosts = posts.filter((x) => !x.pageId && Date.parse(x.createdAt) > last).length;
  const days = Math.floor((now - last) / DAY);
  const bits = [newPosts ? `${newPosts} new ${newPosts === 1 ? 'message' : 'messages'} on your love wall 💌` : '', 'Jelly misses you and has a few pearls waiting 🫧', 'new things to do in Milano this month 🇮🇹'].filter(Boolean);
  const url = `${SITE}/home`;
  const stopUrl = `${SITE}/api/mail/unsubscribe?t=${await signUnsub('saanika')}`;
  const html = shell({
    preheader: `It's been ${days} days. Come see what's new!`,
    kicker: 'Jelly misses you 🪼',
    title: 'Come see what’s new',
    body: p('Ciao Saani!') + p(`It's been about <b>${days} days</b> since you came by your Atelier, so Jelly thought she'd say hello. While you were away:`) + `<ul style="margin:0 0 6px;padding-left:20px">${bits.map((b) => `<li style="margin:0 0 6px">${esc(b)}</li>`).join('')}</ul>` + p('Even two minutes is enough. Your people are rooting for you. 💗'),
    cta: { label: 'Open my Atelier 💗', url },
    foot: stop(stopUrl, 'a little nudge if you haven\'t visited in a while'),
  });
  void moments;
  const ok = await sendMail({ to, subject: 'Jelly misses you 🪼 come see what’s new', html, text: `Ciao Saani! It's been about ${days} days. Come see what's new: ${url}\n\nStop these emails: ${stopUrl}` });
  if (ok) await putState({ ...st, inactiveLast: new Date(now).toISOString() });
  return ok;
}

/* ---------- 3. something big: friends cheer her on ---------- */
/** "Amazing" is the big milestones: worth 100+ pearls, or one that needs everything done. */
const amazing = (a: (typeof ACHIEVEMENTS)[number]) => a.pearls >= 100 || (a as { goal: unknown }).goal === 'all';

export async function achievementMail(): Promise<number> {
  if (!mailReady()) return 0;
  const [state, s, prefs] = await Promise.all([getState(), jellyState(), getPrefs()]);
  const unlocked = Object.keys(s.unlocked ?? {});
  // the first look just takes note of what she already has, so nobody is mailed about old news
  if (!state.achSeen) {
    await putState({ ...state, achSeen: unlocked });
    return 0;
  }
  const fresh = ACHIEVEMENTS.filter((a) => unlocked.includes(a.id) && !state.achSeen!.includes(a.id));
  if (!fresh.length) return 0;
  await putState({ ...state, achSeen: [...new Set([...state.achSeen, ...unlocked])] });
  const big = fresh.filter(amazing).slice(0, 3);
  if (!big.length || !prefs.achievements) return 0;
  const list = await friendsToMail();
  const what = big.map((a) => `${a.icon} <b>${esc(a.title)}</b> · ${esc(a.desc)}`);
  return eachFriend(list, (f, stopUrl) => ({
    subject: `🎉 Saani just did something amazing: ${big[0].title}`,
    html: shell({
      preheader: `${big[0].title}: cheer her on!`,
      kicker: 'Jelly here, bursting with news 🪼',
      title: 'Saani achieved something big!',
      body: p(hi(f.name)) + p('Saani just unlocked:') + `<div style="margin:0 0 12px;padding:12px 14px;border-radius:14px;background:#fbe3e8;line-height:1.7">${what.join('<br>')}</div>` + p('A little cheer from you would make her whole day. Leave her a note, send a voice note or a song. 💗'),
      cta: { label: 'Cheer her on 🎉', url: `${SITE}/wall` },
      foot: stop(stopUrl, 'good news about Saani'),
    }),
    text: `Saani just unlocked: ${big.map((a) => a.title).join(', ')}. Cheer her on: ${SITE}/wall\n\nStop these emails: ${stopUrl}`,
  }));
}

/* ---------- 4. she's having a hard time (only if she said Jelly may tell) ---------- */
export async function lowMail(now = Date.now()): Promise<number> {
  if (!mailReady() || !(await getPrefs()).low) return 0;
  const st = await getState();
  if (st.lowLast && now - Date.parse(st.lowLast) < 7 * DAY) return 0;
  const list = await friendsToMail();
  if (!list.length) return 0;
  const n = await eachFriend(list, (f, stopUrl) => ({
    subject: 'A little check-in for Saani 💗',
    html: shell({
      preheader: 'She could use a little love today',
      kicker: 'Jelly here, softly 🪼',
      title: 'Saani could use some love',
      body: p(hi(f.name)) + p('Saani may be having a harder few days, the way anyone does when they are far from home. She hasn\'t asked for anything. Jelly just thought you\'d want to know.') + p('A short message, a voice note or a song from you can change her day.'),
      cta: { label: 'Send her some love 💗', url: `${SITE}/wall#nudges` },
      foot: stop(stopUrl, 'a gentle heads-up when Saani could use a friend'),
    }),
    text: `Saani may be having a harder few days. A short message or a voice note from you would mean a lot: ${SITE}/wall#nudges\n\nStop these emails: ${stopUrl}`,
  }));
  if (n) await putState({ ...st, lowLast: new Date(now).toISOString() });
  return n;
}

/** Jelly's own face in her chats is a rough read of Saani's mood: a few sad ones in three days counts. */
export async function chatsLookLow(now = Date.now()): Promise<boolean> {
  const chats = await listChats(JELLY_CHATS);
  const lows = chats.flatMap((c) => c.turns).filter((t) => t.mood === 'sad' && now - Date.parse(t.at) < 3 * DAY);
  return lows.length >= 3;
}

/* ---------- 5. every two weeks: how Saani is doing ---------- */
export async function digestMail(now = Date.now(), today = milanDay(new Date(now))): Promise<number> {
  if (!mailReady() || !(await getPrefs()).digest) return 0;
  const st = await getState();
  // the clock starts the first time this runs
  if (!st.digestLast) {
    await putState({ ...st, digestLast: new Date(now).toISOString() });
    return 0;
  }
  if (now - Date.parse(st.digestLast) < 14 * DAY) return 0;
  const list = await friendsToMail();
  const since = now - 14 * DAY;
  const [chk, stamps, moments, posts, s] = await Promise.all([getChecklist(), listStamps(), listMoments(), listPosts(), jellyState()]);
  const v = view(s);
  const done = checklist.filter((c) => chk.done[c.id]).length;
  const newMoments = moments.filter((x) => Date.parse(x.createdAt) > since).length;
  const newMsgs = posts.filter((x) => !x.pageId && x.authorId !== 'seed' && Date.parse(x.createdAt) > since).length;
  const soon = happenings
    .map((h) => ({ h, e: (h.editions ?? []).find((e) => e.start >= today && e.start <= addDays(today, 21)) }))
    .filter((x) => x.e)
    .sort((a, b) => a.e!.start.localeCompare(b.e!.start))
    .slice(0, 3);
  const rows: [string, string][] = [
    ['🏡 Settling in', `${done} of ${checklist.length} first-weeks tasks done`],
    ['🇮🇹 Milano passport', `${stamps.length} of ${places.length} places stamped`],
    ['📸 Moments she shared', `${newMoments} in the last two weeks`],
    ['💌 Messages from her people', `${newMsgs} in the last two weeks`],
    ['🪼 Jelly & Saani', `friendship level ${v.level}${v.streak > 1 ? `, a ${v.streak}-day streak` : ''}`],
  ];
  const n = await eachFriend(list, (f, stopUrl) => ({
    subject: 'How Saani’s doing 🪼 your fortnightly Jelly update',
    html: shell({
      preheader: 'A little look at Saani’s last two weeks in Italy',
      kicker: 'Jelly\'s fortnightly update 🪼',
      title: 'How Saani’s doing',
      body:
        p(hi(f.name)) +
        p('Here\'s a peek at Saani\'s last two weeks, from the little world you helped make for her:') +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px">${rows.map(([k, val]) => `<tr><td style="padding:6px 0;border-bottom:1px solid #f3d4de"><b style="color:#6b1e3a">${esc(k)}</b><br>${esc(val)}</td></tr>`).join('')}</table>` +
        (soon.length ? p('<b style="color:#6b1e3a">Coming up in Milano</b>') + `<ul style="margin:0 0 10px;padding-left:20px">${soon.map((x) => `<li style="margin:0 0 4px">${esc(x.h.title)}</li>`).join('')}</ul>` : '') +
        p('Nothing makes her day like hearing from you. A line, a voice note, a song, or a call, whatever feels like you. 💗'),
      cta: { label: 'Say hi to Saani 💗', url: `${SITE}/wall` },
      foot: stop(stopUrl, 'a fortnightly update about Saani'),
    }),
    text: `How Saani's doing:\n${rows.map(([k, val]) => `${k}: ${val}`).join('\n')}\n\nSay hi: ${SITE}/wall\n\nStop these emails: ${stopUrl}`,
  }));
  await putState({ ...(await getState()), digestLast: new Date(now).toISOString() });
  return n;
}

/** The daily job's turn: everything that's due. Returns a short log line. */
export async function runJellyMail(at: Date): Promise<string> {
  if (!mailReady()) return 'off';
  const now = at.getTime();
  const out: string[] = [];
  if (await inactiveMail(now)) out.push('inactive');
  const ach = await achievementMail();
  if (ach) out.push(`achievements:${ach}`);
  if ((await getPrefs()).low && (await chatsLookLow(now))) {
    const low = await lowMail(now);
    if (low) out.push(`low:${low}`);
  }
  const dig = await digestMail(now);
  if (dig) out.push(`digest:${dig}`);
  return out.join(' ') || 'nothing-due';
}
