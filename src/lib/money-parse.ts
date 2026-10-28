import { addDays } from './extras';
import { assistantReady, groqJson } from './assistant';
import { CATEGORIES, IN_CATEGORIES, fallbackFor, isCategory, milanDay, type CategoryId, type Currency, type InCategoryId, type Kind } from './money';

/**
 * Soldi in plain words: "esselunga 23,40 and metro 2,20", "mamma sent ₹10000", "pizza 12 yesterday".
 * Jelly (Groq) reads the message when she can; a careful keyword reader does it when she can't, so
 * logging always works. Whatever comes back is checked here before anything is saved: an amount
 * that isn't in the message, a made-up category or a day in the future never gets through.
 */
export type Draft = { kind: Kind; amount: number; currency: Currency; category: CategoryId | InCategoryId; note: string; day: string };

const MAX = 8;
const BACK = 60; // days she can log into the past
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ---------- amounts ---------- */
// "1.200" and "10,000" are thousands; "23,40" and "2.5" are cents; "10k" is ten thousand
const NUM = String.raw`\d{1,3}(?:[.,]\d{3})+(?!\d)|\d+(?:[.,]\d{1,2})?`;
const AMOUNT = new RegExp(String.raw`(₹|rs\.?|inr|€|eur(?:os?)?)?\s*(${NUM})\s*(k\b)?\s*(₹|rs\b\.?|rupees?\b|inr\b|€|eur(?:os?)?\b|\/-)?`, 'i');
const AMOUNTS = new RegExp(AMOUNT.source, 'gi');
const toNumber = (s: string, k?: string) => {
  const n = /^\d{1,3}(?:[.,]\d{3})+$/.test(s) ? Number(s.replace(/[.,]/g, '')) : Number(s.replace(',', '.'));
  return k ? n * 1000 : n;
};
const isRupee = (s = '') => /₹|rs|inr|rupee/i.test(s);

/** Every amount written in the message, so a reader can't invent one. */
const amountsIn = (text: string) => [...text.matchAll(AMOUNTS)].map((m) => round2(toNumber(m[2], m[3])));

/* ---------- when ---------- */
const WEEKDAYS = [
  ['sunday', 'domenica'],
  ['monday', 'lunedi', 'lunedì'],
  ['tuesday', 'martedi', 'martedì'],
  ['wednesday', 'mercoledi', 'mercoledì'],
  ['thursday', 'giovedi', 'giovedì'],
  ['friday', 'venerdi', 'venerdì'],
  ['saturday', 'sabato'],
];
const WHEN = new RegExp(String.raw`\b(?:on |last )?(day before yesterday|l'altro ieri|altroieri|yesterday|ieri|today|oggi|${WEEKDAYS.flat().join('|')})\b`, 'i');

function dayFrom(text: string, today: string) {
  const m = text.match(WHEN);
  if (!m) return today;
  const w = m[1].toLowerCase();
  if (/before yesterday|altro ?ieri/.test(w)) return addDays(today, -2);
  if (/yesterday|ieri/.test(w)) return addDays(today, -1);
  if (/today|oggi/.test(w)) return today;
  const want = WEEKDAYS.findIndex((names) => names.includes(w));
  const now = new Date(`${today}T12:00:00Z`).getUTCDay();
  return addDays(today, -((now - want + 7) % 7));
}

/* ---------- what it was ---------- */
const OUT_WORDS: [CategoryId, RegExp][] = [
  ['rent', /\b(rent|affitto|bills?|bolletta|electricity|luce|gas bill|condominio|utilities|deposit)\b/i],
  ['health', /\b(pharmacy|farmacia|doctor|medicines?|meds|dentist|hospital|clinic|gym|palestra|physio)\b/i],
  ['uni', /\b(books?|libri|uni|university|polimi|bocconi|iulm|marangoni|domus|ied|course|printing|prints?|stationery|notebooks?|tuition|fees|supplies|fabrics?)\b/i],
  ['travel', /\b(flights?|ryanair|easyjet|wizz|hotel|airbnb|hostel|trip|booking|flixbus|travel)\b/i],
  ['phone', /\b(phone|iliad|vodafone|tim|windtre|sim|recharge|ricarica|spotify|netflix|subscriptions?|icloud|disney\+?|wifi)\b/i],
  ['transport', /\b(metro|atm|tram|bus|trains?|trenord|trenitalia|italo|taxi|uber|bolt|freenow|bikemi|scooter|lime|dott|transport)\b/i],
  ['groceries', /\b(esselunga|carrefour|lidl|coop|conad|pam|aldi|eurospin|penny|grocery|groceries|supermarket|spesa|milk|latte|bread|pane|eggs|vegetables|veggies|verdura|fruit|frutta)\b/i],
  ['cafe', /\b(caff[eè]|coffee|cappuccino|espresso|cornetto|brioche|aperitivo|aperol|spritz|bar|gelato|caf[eé]|starbucks|matcha)\b/i],
  ['eating', /\b(pizza|pizzeria|restaurant|ristorante|trattoria|osteria|dinner|cena|lunch|pranzo|sushi|burger|mcdonald'?s?|deliveroo|glovo|just ?eat|takeaway|panino|poke|kebab|ramen)\b/i],
  ['shopping', /\b(zara|h&m|uniqlo|mango|clothes|dress|shoes|vinted|shopping|amazon|sephora|primark|bershka|makeup|jeans|jacket|bag)\b/i],
  ['fun', /\b(movie|cinema|museum|museo|concert|club|party|tickets?|event|exhibition|mostra|theatre|teatro|bowling|karaoke)\b/i],
];
const IN_SIGNAL = /\b(sent|send me|received|got paid|paid me|salary|stipendio|stipend|scholarship|borsa di studio|refund(?:ed)?|rimborso|reimburs\w*|cashback|income|pocket money|allowance|money in|from (?:mom|mum|dad|mamma|papa|papà|home|parents))\b/i;
const IN_WORDS: [InCategoryId, RegExp][] = [
  ['refund', /\b(refund(?:ed)?|rimborso|reimburs\w*|cashback)\b/i],
  ['stipend', /\b(stipend|scholarship|borsa)\b/i],
  ['work', /\b(salary|stipendio|got paid|paid me|shift|job|work|freelance|client|internship)\b/i],
  ['home', /\b(mom|mum|dad|mamma|mummy|papa|papà|parents|home|family|bhai|didi|nani|dadi)\b/i],
  ['gift', /\b(gift|regalo|birthday)\b/i],
];
const kindOfText = (t: string): Kind => (IN_SIGNAL.test(t) ? 'in' : 'out');
const categoryFor = (t: string, kind: Kind) => ((kind === 'in' ? IN_WORDS : OUT_WORDS).find(([, re]) => re.test(t))?.[0] ?? fallbackFor(kind)) as Draft['category'];

const tidy = (s: string) => {
  const t = s
    .replace(AMOUNTS, ' ')
    .replace(WHEN, ' ')
    .replace(/\b(spent|paid|for|on|at|rs|rupees|euros?|eur|inr|received|sent( me)?|got)\b/gi, ' ')
    .replace(/[₹€]|\/-/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.:;\-–]+|[\s,.:;\-–]+$/g, '');
  return t ? (t[0].toUpperCase() + t.slice(1)).slice(0, 120) : '';
};

/** The keyword reader: no AI, never makes anything up. */
export function quickParse(text: string, today = milanDay()): Draft[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const pieces = clean.split(/\s*(?:\n|;|·|\+|,(?!\d)|\band\b|&(?!m\b))\s*/i).filter(Boolean);
  // one shop with several items and one total stays one entry; separate amounts become separate entries
  const parts = pieces.length > 1 && pieces.every((p) => AMOUNT.test(p) && /\d/.test(p)) ? pieces : [clean];
  const day = dayFrom(clean, today);
  const out: Draft[] = [];
  for (const p of parts.slice(0, MAX)) {
    const m = p.match(AMOUNT);
    if (!m) continue;
    const amount = round2(toNumber(m[2], m[3]));
    if (!(amount > 0) || amount > 1_000_000) continue;
    const kind = kindOfText(p) === 'in' || (parts.length === 1 && kindOfText(clean) === 'in') ? 'in' : 'out';
    out.push({ kind, amount, currency: isRupee(m[1]) || isRupee(m[4]) ? 'INR' : 'EUR', category: categoryFor(p, kind), note: tidy(p), day });
  }
  return out;
}

/* ---------- Jelly reads it ---------- */
const SYSTEM = `SOLDI-PARSE. You turn one short message from Saanika, a student living in Milan, into entries for her money tracker. She usually spends in euros; ₹, Rs, INR or rupees mean Indian rupees.

Spend categories (kind "out"), use the id exactly:
${CATEGORIES.map((c) => `- ${c.id}: ${c.label}`).join('\n')}
Money-in categories (kind "in"):
${IN_CATEGORIES.map((c) => `- ${c.id}: ${c.label}`).join('\n')}

Rules:
- One shop with several items and one total ("esselunga milk eggs pasta 23,40") is ONE entry; keep the items in the note.
- Separate amounts ("pizza 12 and metro 2,20") are separate entries, one per amount.
- Money someone sent her, a stipend, salary, refund or gift is kind "in". Everything else is "out".
- Milan hints: Esselunga, Carrefour, Lidl, Coop, Conad are groceries; ATM, metro, tram, Trenord, Trenitalia are transport; aperitivo, spritz, caffè, cornetto are cafe; Deliveroo and Glovo are eating.
- Amounts can look like 5, 5€, €5, 5,50 (comma decimal), 1.200 (twelve hundred), ₹500, 500rs, 500/-, 10k. Only use amounts that are written in the message.
- daysAgo: 0 for today; 1 for "yesterday"/"ieri"; for a weekday name, how many days ago that weekday last was (today counts as 0).
- note: a few words saying what it was (the shop or the thing), not the amount. Empty if there's nothing.
- If you can't tell the category, use "other" (or "other-in" for money in).
- If there's no amount at all, return no entries.

Reply with JSON only: {"entries":[{"kind":"out","amount":23.4,"currency":"EUR","category":"groceries","note":"Esselunga","daysAgo":0}]}`;

type Raw = { kind?: unknown; amount?: unknown; currency?: unknown; category?: unknown; note?: unknown; daysAgo?: unknown };

/** Checks what came back: real amounts from the message, known categories, a sensible day. */
export function checkDrafts(raw: Raw[], text: string, today: string): Draft[] {
  const written = amountsIn(text);
  const out: Draft[] = [];
  for (const r of raw.slice(0, MAX)) {
    const amount = round2(Number(r.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) continue;
    if (!written.some((w) => Math.abs(w - amount) < 0.01)) continue;
    const kind: Kind = r.kind === 'in' ? 'in' : 'out';
    const ago = Math.round(Number(r.daysAgo));
    const day = Number.isFinite(ago) && ago >= 0 && ago <= BACK ? addDays(today, -ago) : today;
    out.push({
      kind,
      amount,
      currency: r.currency === 'INR' ? 'INR' : 'EUR',
      category: isCategory(r.category, kind) ? r.category : fallbackFor(kind),
      note: typeof r.note === 'string' ? r.note.replace(/\s+/g, ' ').trim().slice(0, 120) : '',
      day: day > today ? today : day,
    });
  }
  return out;
}

const weekday = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });

/** Plain words in, checked drafts out (nothing is saved here). */
export async function parseSpends(text: string, today = milanDay()): Promise<{ drafts: Draft[]; via: 'jelly' | 'quick' }> {
  const msg = text.slice(0, 500);
  const quick = quickParse(msg, today);
  if (!assistantReady() || !/\d/.test(msg)) return { drafts: quick, via: 'quick' };
  try {
    const r = await groqJson<{ entries?: Raw[] }>(SYSTEM, `Today in Milan is ${weekday(today)} ${today}.\nHer message:\n${msg}`, 350);
    const drafts = checkDrafts(Array.isArray(r?.entries) ? r.entries : [], msg, today);
    if (drafts.length) return { drafts, via: 'jelly' };
  } catch {
    // busy, offline or a bad key: the keyword reader still does the job
  }
  return { drafts: quick, via: 'quick' };
}

/** A draft from her screen, checked the same way the add form is. */
export function draftFrom(b: Record<string, unknown>, today = milanDay()): Draft | null {
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  const kind: Kind = b.kind === 'in' ? 'in' : 'out';
  const day = typeof b.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.day) && b.day <= today && b.day >= addDays(today, -366) ? b.day : today;
  return {
    kind,
    amount: round2(amount),
    currency: b.currency === 'INR' ? 'INR' : 'EUR',
    category: isCategory(b.category, kind) ? b.category : fallbackFor(kind),
    note: typeof b.note === 'string' ? b.note.trim().slice(0, 120) : '',
    day,
  };
}
