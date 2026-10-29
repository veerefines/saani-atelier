import { createHmac, timingSafeEqual } from 'crypto';
import * as db from './db';
import { eurInr } from './fx';
import { categoryOf, kindOf, milanDay, monthOf, shiftMonth, summary, type Expense } from './money';
import { facts } from './money-insights';
import { jellyTake } from './money-take';
import { parseSpends } from './money-parse';
import { getBudget, getExpense, listExpenses, newExpenseId, removeExpense, saveExpense } from './money-store';

/**
 * Soldi over WhatsApp (Meta's WhatsApp Cloud API): Saanika texts "esselunga 23,40 and metro 2" and
 * Jelly logs it and replies; "menu" opens a list to tap for her budget, spends and tips. Only her number (WHATSAPP_OWNER) is listened to, every delivery is
 * checked against the app secret, and a message Meta sends twice is only logged once.
 *
 * WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_OWNER.
 */
const GRAPH = () => (process.env.WHATSAPP_GRAPH_URL || 'https://graph.facebook.com/v23.0').replace(/\/$/, '');
const digits = (s: string) => s.replace(/\D/g, '');
export const whatsappReady = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_OWNER);
export const isOwner = (from: string) => Boolean(process.env.WHATSAPP_OWNER) && digits(from) === digits(process.env.WHATSAPP_OWNER!);

/** Meta signs each delivery: "sha256=" + HMAC of the raw body with the app secret. */
export function signedByMeta(raw: string, header: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const want = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'));
  const got = Buffer.from(header.slice(7));
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The last few digits only, so the logs can tell numbers apart without holding them. */
export const tail = (n: string) => `…${digits(n).slice(-4)}`;

async function post(to: string, message: Record<string, unknown>) {
  const r = await fetch(`${GRAPH()}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN?.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: digits(to), ...message }),
    signal: AbortSignal.timeout(15_000),
  }).catch((e: Error) => {
    console.error(`[whatsapp] reply to ${tail(to)} didn't go: ${e.message}`);
    return null;
  });
  if (r && !r.ok) console.error(`[whatsapp] Meta refused the reply to ${tail(to)} (${r.status}): ${(await r.text().catch(() => '')).slice(0, 400)}`);
}

export const sendText = (to: string, body: string) => post(to, { type: 'text', text: { body: body.slice(0, 4000), preview_url: false } });

/* ---------- replies with something to tap ---------- */
type Btn = { id: Command; title: string }; // a title fits 20 characters
export type Reply = { text: string; buttons?: Btn[]; menu?: boolean };
const BODY_MAX = 1024; // what a message with buttons or a list can hold

const MENU: { id: Command; title: string; description: string }[] = [
  { id: 'budget', title: '💶 Budget', description: 'What’s left, your pace and each cap' },
  { id: 'spends', title: '🧾 This month’s spends', description: 'Every spend so far, day by day' },
  { id: 'summary', title: '📊 Summary', description: 'The month in a few lines' },
  { id: 'today', title: '📅 Today', description: 'What you spent today' },
  { id: 'week', title: '🗓️ This week', description: 'Monday to today' },
  { id: 'cats', title: '🍰 By category', description: 'Where the money went, in %' },
  { id: 'last', title: '⏪ Last month', description: 'How last month went, and what changed' },
  { id: 'tips', title: '💡 Jelly’s tips', description: 'Jelly studies your month' },
  { id: 'how', title: '✍️ How to log', description: 'Examples of what to send' },
  { id: 'undo', title: '↩️ Undo last', description: 'Take back the last thing logged' },
];
const B = {
  summary: { id: 'summary', title: '📊 Summary' },
  undo: { id: 'undo', title: '↩️ Undo' },
  menu: { id: 'menu', title: '📋 Menu' },
  tips: { id: 'tips', title: '💡 Tips' },
  budget: { id: 'budget', title: '💶 Budget' },
} satisfies Record<string, Btn>;

/** A reply as WhatsApp shows it: the menu as a list, buttons under the text, or plain text. */
export async function sendReply(to: string, r: Reply) {
  if (r.menu && r.text.length <= BODY_MAX)
    return post(to, { type: 'interactive', interactive: { type: 'list', body: { text: r.text }, action: { button: 'Open menu', sections: [{ title: 'Soldi', rows: MENU }] } } });
  const buttons = r.buttons?.slice(0, 3).map((b) => ({ type: 'reply', reply: b }));
  if (buttons?.length && r.text.length <= BODY_MAX) return post(to, { type: 'interactive', interactive: { type: 'button', body: { text: r.text }, action: { buttons } } });
  await sendText(to, r.text);
  // too long to carry buttons: they follow on their own
  if (buttons?.length) await post(to, { type: 'interactive', interactive: { type: 'button', body: { text: 'Anything else? 🫧' }, action: { buttons } } });
}

/** Meta retries deliveries; this remembers each message id for a while. True the first time only. */
export async function firstTime(id: string) {
  if (await db.get('wa-seen', id)) return false;
  await db.put('wa-seen', { id, createdAt: new Date().toISOString() });
  return true;
}
export async function forgetOldMessages(days = 7) {
  const cut = Date.now() - days * 86_400_000;
  for (const x of await db.list('wa-seen')) if (Date.parse(x.createdAt) < cut) await db.remove('wa-seen', x.id);
}

/* ---------- what she can send ---------- */
const eur = (n: number) => `€${n.toLocaleString('en-IE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const shown = (x: Pick<Expense, 'currency' | 'eur' | 'inr'>) => (x.currency === 'INR' ? `${inr(x.inr)} (${eur(x.eur)})` : eur(x.eur));
const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const SOLDI = 'https://saani.space/home/money';
const dayName = (d: string, o: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' });
function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** ▓▓▓░░ for how much of a cap is used */
const bar = (used: number, of: number) => {
  const n = Math.round(Math.min(1, used / of) * 5);
  return '▓'.repeat(n) + '░'.repeat(5 - n);
};
const line = (x: Expense) => {
  const c = categoryOf(x.category, kindOf(x));
  return `${kindOf(x) === 'in' ? '💚 +' : `${c.icon} `}${shown(x)} ${c.label.toLowerCase()}${x.note ? ` (${x.note.slice(0, 40)})` : ''}`;
};

const GREETING = '🪼 *Ciao! Jelly keeps Soldi for you.*\n\nTell me what you spent, like _esselunga 23,40_ or _pizza 12 and metro 2,20_, and I’ll log it.\n\nOr open the menu for your budget, spends and tips 👇';
const HOW = [
  '✍️ *Just tell me what you spent:*',
  '• esselunga 23,40',
  '• pizza 12 and metro 2,20',
  '• aperitivo 9 yesterday',
  '• zara 45 on saturday',
  '• mamma sent ₹10000 _(money in)_',
  '',
  'You can type these too: *budget*, *spends*, *summary*, *today*, *week*, *categories*, *last month*, *tips*, *undo*, *menu*.',
].join('\n');

export type Command = 'menu' | 'how' | 'budget' | 'spends' | 'summary' | 'today' | 'week' | 'cats' | 'last' | 'tips' | 'undo';
const COMMANDS: [Command, RegExp][] = [
  ['menu', /^(menu|help|aiuto|\?|hi|hey|hello|ciao|start|options|jelly)[!. ]*$/i],
  ['how', /^(how( to log)?|examples?|come)[?!. ]*$/i],
  ['budget', /^(budget|budgetto|caps?|left|how much( is)? left)[?!. ]*$/i],
  ['spends', /^(spends|spese|list|expenses|this month'?s spends)[?!. ]*$/i],
  ['summary', /^(summary|riepilogo|quanto|how much( did i spend)?|this month|month|status|soldi)[?!. ]*$/i],
  ['today', /^(today|oggi)[?!. ]*$/i],
  ['week', /^((this )?week|settimana)[?!. ]*$/i],
  ['cats', /^(categories|category|by category|categorie|where did it go)[?!. ]*$/i],
  ['last', /^(last month|mese scorso|previous month)[?!. ]*$/i],
  ['tips', /^(tips?|consigli|advice|suggestions?|insights?)[?!. ]*$/i],
  ['undo', /^(undo|annulla|oops|delete( last)?|cancel)[!. ]*$/i],
];
const isCommand = (x: string): x is Command => COMMANDS.some(([c]) => c === x);

type Last = { id: 'wa-last'; createdAt: string; ids: string[] };
const data = () => Promise.all([listExpenses(), getBudget()]);

export async function monthText(today = milanDay()) {
  const month = monthOf(today);
  const [all, budget] = await data();
  const s = summary(all, budget, month, today);
  const take = await db.get<{ id: string; createdAt: string; headline?: string }>('money', `insights-${month}`);
  const L = [`🪼 *${monthName(month)}*`];
  L.push(`Spent *${eur(s.spent)}*${s.budget ? ` of ${eur(s.budget)} · ${s.left! >= 0 ? `${eur(s.left!)} left` : `${eur(-s.left!)} over`} (${s.daysLeft} days to go)` : ''}`);
  if (s.inEur) L.push(`Money in ${eur(s.inEur)} · net ${s.net >= 0 ? '+' : '−'}${eur(Math.abs(s.net))}`);
  if (s.byCat.some((c) => c.eur > 0))
    L.push(
      `Top: ${s.byCat
        .filter((c) => c.eur > 0)
        .slice(0, 3)
        .map((c) => `${c.icon} ${c.label} ${eur(c.eur)}`)
        .join(' · ')}`,
    );
  if (take?.headline) L.push('', `💡 ${take.headline}`);
  if (!s.count && !s.inEur) L.push('Nothing logged yet. Tell me your first spend! 🫧');
  return L.join('\n');
}

async function budgetText(today: string) {
  const [all, budget] = await data();
  const s = summary(all, budget, monthOf(today), today);
  if (!s.budget) return `💶 You haven’t set a monthly budget yet, cara. You’ve spent ${eur(s.spent)} so far this month.\n\nSet one (and caps for each category) in Soldi: ${SOLDI}`;
  const L = [`💶 *Budget · ${monthName(s.month)}*`, `${eur(s.spent)} of ${eur(s.budget)} spent · *${s.left! >= 0 ? `${eur(s.left!)} left` : `${eur(-s.left!)} over`}*`];
  if (s.daysLeft) L.push(`${s.daysLeft} days to go${s.left! > 0 ? `, about ${eur(Math.floor(s.left! / s.daysLeft))} a day` : ''}`);
  if (s.onTrack !== null) L.push(s.onTrack ? 'You’re on pace, brava ✨' : 'A little ahead of pace. Gentle days ahead 🫶');
  const caps = s.byCat.filter((c) => c.cap);
  if (caps.length) {
    L.push('', '*Caps*');
    for (const c of caps) L.push(`${c.icon} ${bar(c.eur, c.cap!)} ${eur(c.eur)} / ${eur(c.cap!)} ${c.label}${c.eur > c.cap! ? ' ❗' : c.eur >= c.cap! * 0.8 ? ' ⚠️' : ''}`);
  }
  return L.join('\n');
}

/** Spends between two days, newest first, grouped by day and kept to a phone-sized list. */
function byDay(list: Expense[], max = 30) {
  const L: string[] = [];
  let day = '';
  let count = 0;
  for (const x of list) {
    if (count === max) break;
    if (x.day !== day) {
      day = x.day;
      L.push('', `*${dayName(day)}*`);
    }
    L.push(line(x));
    count++;
  }
  if (list.length > count) L.push('', `_+${list.length - count} more in Soldi_`);
  return L;
}

async function spendsText(today: string) {
  const month = monthOf(today);
  const [all, budget] = await data();
  const list = all.filter((x) => monthOf(x.day) === month);
  if (!list.length) return `🧾 Nothing logged in ${monthName(month)} yet. Tell me your first spend! 🫧`;
  const s = summary(all, budget, month, today);
  return [`🧾 *${monthName(month)}* · ${s.count} ${s.count === 1 ? 'spend' : 'spends'} · ${eur(s.spent)}${s.inEur ? ` · ${eur(s.inEur)} in` : ''}`, ...byDay(list)].join('\n');
}

async function todayText(today: string) {
  const list = (await listExpenses()).filter((x) => x.day === today);
  if (!list.length) return 'Nothing logged today yet. 🫧';
  const out = list.filter((x) => kindOf(x) === 'out').reduce((t, x) => t + x.eur, 0);
  return [`📅 *Today* · ${eur(Math.round(out * 100) / 100)}`, ...list.map(line)].join('\n');
}

async function weekText(today: string) {
  const monday = addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const list = (await listExpenses()).filter((x) => x.day >= monday && x.day <= today);
  if (!list.length) return '🗓️ Nothing logged this week yet. 🫧';
  const out = list.filter((x) => kindOf(x) === 'out');
  const total = Math.round(out.reduce((t, x) => t + x.eur, 0) * 100) / 100;
  return [`🗓️ *This week* (since ${dayName(monday, { weekday: 'long' })}) · ${eur(total)}`, ...byDay(list, 25)].join('\n');
}

async function catsText(today: string) {
  const [all, budget] = await data();
  const s = summary(all, budget, monthOf(today), today);
  const cats = s.byCat.filter((c) => c.eur > 0);
  if (!cats.length) return '🍰 Nothing spent this month yet, so nothing to slice up! 🫧';
  const L = [`🍰 *Where it went · ${monthName(s.month)}*`, ...cats.map((c) => `${c.icon} ${c.label}: ${eur(c.eur)} · ${Math.round((c.eur / s.spent) * 100)}%`)];
  if (s.byIn.length) L.push('', '*Money in*', ...s.byIn.map((c) => `${c.icon} ${c.label}: ${eur(c.eur)}`));
  L.push('', `The pie chart is in Soldi: ${SOLDI}`);
  return L.join('\n');
}

async function lastText(today: string) {
  const month = monthOf(today);
  const prev = shiftMonth(month, -1);
  const [all, budget] = await data();
  const p = summary(all, budget, prev, today);
  if (!p.count && !p.inEur) return `⏪ Nothing was logged in ${monthName(prev)}, so there’s nothing to compare yet. 🫧`;
  const f = facts(all, budget, month, today);
  const L = [`⏪ *${monthName(prev)}*`, `Spent ${eur(p.spent)}${p.budget ? ` of ${eur(p.budget)} (${p.left! >= 0 ? `${eur(p.left!)} under` : `${eur(-p.left!)} over`})` : ''} over ${p.count} spends`];
  if (p.inEur) L.push(`Money in ${eur(p.inEur)} · net ${p.net >= 0 ? '+' : '−'}${eur(Math.abs(p.net))}`);
  const top = p.byCat.filter((c) => c.eur > 0).slice(0, 3);
  if (top.length) L.push(`Top: ${top.map((c) => `${c.icon} ${c.label} ${eur(c.eur)}`).join(' · ')}`);
  if (f.sameDay) L.push('', `By day ${f.sameDay} it was ${eur(f.beforeTotal)}; this month you’re at ${eur(f.summary.spent)}.`);
  const c = f.change;
  if (c) L.push(`Biggest change: ${c.icon} ${c.label} ${c.isNew ? `is new (${eur(c.now)})` : c.gone ? `dropped to nothing (was ${eur(c.before)})` : `${c.now > c.before ? 'up' : 'down'} ${Math.abs(c.pct ?? 0)}% (${eur(c.before)} → ${eur(c.now)})`}`);
  return L.join('\n');
}

async function tipsText(today: string) {
  const [all, budget] = await data();
  const { take } = await jellyTake(all, budget, monthOf(today), today);
  return [`💡 *Jelly’s take*`, take.headline, ...take.tips.map((t, i) => `\n${i + 1}. ${t.icon} ${t.text}`)].join('\n');
}

async function undo() {
  const last = await db.get<Last>('money', 'wa-last');
  const gone: Expense[] = [];
  for (const id of last?.ids ?? []) {
    const x = await getExpense(id);
    if (x) {
      gone.push(x);
      await removeExpense(id);
    }
  }
  await db.put<Last>('money', { id: 'wa-last', createdAt: new Date().toISOString(), ids: [] });
  return gone.length ? `↩️ Taken back: ${gone.map((x) => `${shown(x)} ${categoryOf(x.category, kindOf(x)).label.toLowerCase()}`).join(', ')}.` : 'Nothing to undo. 🫧';
}

async function run(c: Command, today: string): Promise<Reply> {
  const more = [B.tips, B.menu];
  switch (c) {
    case 'menu':
      return { text: GREETING, menu: true };
    case 'how':
      return { text: HOW, buttons: [B.menu] };
    case 'budget':
      return { text: await budgetText(today), buttons: more };
    case 'spends':
      return { text: await spendsText(today), buttons: more };
    case 'summary':
      return { text: await monthText(today), buttons: more };
    case 'today':
      return { text: await todayText(today), buttons: [B.summary, B.menu] };
    case 'week':
      return { text: await weekText(today), buttons: more };
    case 'cats':
      return { text: await catsText(today), buttons: more };
    case 'last':
      return { text: await lastText(today), buttons: more };
    case 'tips':
      return { text: await tipsText(today), buttons: [B.budget, B.menu] };
    case 'undo':
      return { text: await undo(), buttons: [B.summary, B.menu] };
  }
}

/** One message from her (typed, or a tap on the menu or a button), and Jelly's reply. */
export async function handleText(text: string, today = milanDay(), tap?: string): Promise<Reply> {
  const t = text.trim();
  const c = tap && isCommand(tap) ? tap : COMMANDS.find(([, re]) => re.test(t))?.[0];
  if (c) return run(c, today);
  if (tap) return { text: GREETING, menu: true };

  const { drafts } = await parseSpends(t, today);
  if (!drafts.length) return { text: 'Jelly couldn’t find an amount in that 🫧 Try “esselunga 23,40” or “mamma sent ₹10000”, or open the menu 👇', menu: true };
  const rate = (await eurInr()).inr;
  const at = new Date().toISOString();
  const saved: Expense[] = [];
  for (const d of drafts) saved.push(await saveExpense({ id: newExpenseId(), createdAt: at, rate, source: 'whatsapp', ...d }));
  await db.put<Last>('money', { id: 'wa-last', createdAt: at, ids: saved.map((x) => x.id) });

  const [all, budget] = await data();
  const s = summary(all, budget, monthOf(today), today);
  const lines = saved.map((x) => `${line(x)}${x.day === today ? '' : ` · ${dayName(x.day)}`}`);
  const left = s.budget ? (s.left! >= 0 ? `${eur(s.left!)} left this month.` : `You’re ${eur(-s.left!)} over this month, cara.`) : `${eur(s.spent)} spent this month.`;
  return { text: [`Logged ✨`, ...lines, '', left].join('\n'), buttons: [B.summary, B.undo, B.menu] };
}

/** Every message in a delivery (Meta can batch several) that Jelly can answer: typed text, or a tap on her menu or buttons. */
export function messagesIn(body: unknown): { id: string; from: string; text: string; tap?: string }[] {
  const out: { id: string; from: string; text: string; tap?: string }[] = [];
  const entries = (body as { entry?: unknown[] })?.entry;
  for (const e of Array.isArray(entries) ? entries : []) {
    const changes = (e as { changes?: unknown[] })?.changes;
    for (const c of Array.isArray(changes) ? changes : []) {
      const msgs = (c as { value?: { messages?: unknown[] } })?.value?.messages;
      for (const m of Array.isArray(msgs) ? msgs : []) {
        const x = m as { id?: unknown; from?: unknown; type?: unknown; text?: { body?: unknown }; interactive?: { button_reply?: { id?: unknown; title?: unknown }; list_reply?: { id?: unknown; title?: unknown } } };
        if (typeof x.id !== 'string' || typeof x.from !== 'string') continue;
        if (x.type === 'text' && typeof x.text?.body === 'string') out.push({ id: x.id, from: x.from, text: x.text.body.slice(0, 1000) });
        const pick = x.type === 'interactive' ? (x.interactive?.button_reply ?? x.interactive?.list_reply) : undefined;
        if (pick && typeof pick.id === 'string') out.push({ id: x.id, from: x.from, text: typeof pick.title === 'string' ? pick.title.slice(0, 100) : '', tap: pick.id.slice(0, 40) });
      }
    }
  }
  return out;
}
