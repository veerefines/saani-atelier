import { createHmac, timingSafeEqual } from 'crypto';
import * as db from './db';
import { eurInr } from './fx';
import { categoryOf, kindOf, milanDay, monthOf, summary, type Expense } from './money';
import { parseSpends } from './money-parse';
import { getBudget, getExpense, listExpenses, newExpenseId, removeExpense, saveExpense } from './money-store';

/**
 * Soldi over WhatsApp (Meta's WhatsApp Cloud API): Saanika texts "esselunga 23,40 and metro 2" and
 * Jelly logs it and replies. Only her number (WHATSAPP_OWNER) is listened to, every delivery is
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

export async function sendText(to: string, body: string) {
  await fetch(`${GRAPH()}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: digits(to), type: 'text', text: { body: body.slice(0, 4000), preview_url: false } }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => {});
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

const HELP = [
  '🪼 *Ciao! Jelly keeps Soldi for you.*',
  '',
  'Just tell me what you spent:',
  '• esselunga 23,40',
  '• pizza 12 and metro 2,20',
  '• aperitivo 9 yesterday',
  '• mamma sent ₹10000 _(money in)_',
  '',
  '*summary*: this month so far',
  '*today*: today’s spends',
  '*undo*: take back the last thing I logged',
].join('\n');

const IS = {
  help: /^(help|aiuto|\?|hi|hey|hello|ciao|start)[!. ]*$/i,
  summary: /^(summary|riepilogo|quanto|how much( did i spend)?|this month|month|status|soldi)[?!. ]*$/i,
  today: /^(today|oggi)[?!. ]*$/i,
  undo: /^(undo|annulla|oops|delete( last)?|cancel)[!. ]*$/i,
};

type Last = { id: 'wa-last'; createdAt: string; ids: string[] };

export async function monthText(today = milanDay()) {
  const month = monthOf(today);
  const [all, budget] = await Promise.all([listExpenses(), getBudget()]);
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

/** One message from her, and Jelly's reply. */
export async function handleText(text: string, today = milanDay()): Promise<string> {
  const t = text.trim();
  if (IS.help.test(t)) return HELP;
  if (IS.summary.test(t)) return monthText(today);
  if (IS.today.test(t)) {
    const list = (await listExpenses()).filter((x) => x.day === today);
    if (!list.length) return 'Nothing logged today yet. 🫧';
    return [`🪼 *Today*`, ...list.map((x) => `${kindOf(x) === 'in' ? '+' : '•'} ${shown(x)} ${categoryOf(x.category, kindOf(x)).label}${x.note ? ` (${x.note})` : ''}`)].join('\n');
  }
  if (IS.undo.test(t)) {
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

  const { drafts } = await parseSpends(t, today);
  if (!drafts.length) return 'Jelly couldn’t find an amount in that 🫧 Try “esselunga 23,40” or “mamma sent ₹10000”. Send *help* for more.';
  const rate = (await eurInr()).inr;
  const at = new Date().toISOString();
  const saved: Expense[] = [];
  for (const d of drafts) saved.push(await saveExpense({ id: newExpenseId(), createdAt: at, rate, source: 'whatsapp', ...d }));
  await db.put<Last>('money', { id: 'wa-last', createdAt: at, ids: saved.map((x) => x.id) });

  const [all, budget] = await Promise.all([listExpenses(), getBudget()]);
  const s = summary(all, budget, monthOf(today), today);
  const lines = saved.map((x) => {
    const c = categoryOf(x.category, kindOf(x));
    const when = x.day === today ? '' : ` · ${new Date(`${x.day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
    return `${kindOf(x) === 'in' ? '💚 +' : `${c.icon} `}${shown(x)} ${c.label.toLowerCase()}${x.note ? ` (${x.note})` : ''}${when}`;
  });
  const left = s.budget ? (s.left! >= 0 ? `${eur(s.left!)} left this month.` : `You’re ${eur(-s.left!)} over this month, cara.`) : `${eur(s.spent)} spent this month.`;
  return [`Logged ✨`, ...lines, '', `${left} Reply *undo* to take it back.`].join('\n');
}

/** Every text message in a delivery (Meta can batch several), as [message id, from, text]. */
export function messagesIn(body: unknown): { id: string; from: string; text: string }[] {
  const out: { id: string; from: string; text: string }[] = [];
  const entries = (body as { entry?: unknown[] })?.entry;
  for (const e of Array.isArray(entries) ? entries : []) {
    const changes = (e as { changes?: unknown[] })?.changes;
    for (const c of Array.isArray(changes) ? changes : []) {
      const msgs = (c as { value?: { messages?: unknown[] } })?.value?.messages;
      for (const m of Array.isArray(msgs) ? msgs : []) {
        const x = m as { id?: unknown; from?: unknown; type?: unknown; text?: { body?: unknown } };
        if (x.type === 'text' && typeof x.id === 'string' && typeof x.from === 'string' && typeof x.text?.body === 'string') out.push({ id: x.id, from: x.from, text: x.text.body.slice(0, 1000) });
      }
    }
  }
  return out;
}
