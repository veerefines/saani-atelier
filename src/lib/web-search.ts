import { get, put, update, type Doc } from './db';

/**
 * Jelly's eyes on the web: Google Search through Gemini's "grounding" (free tier). One Gemini call is
 * both the decision and the search: for chit-chat, her own life or general knowledge it says NONE and
 * Jelly answers as usual; for anything current or real-world (events, opening hours, prices, news,
 * weather, transport) it searches Google and returns short findings with their sources.
 *
 * Only the question and the last couple of turns leave the site, never her projects or diary. Every
 * failure (no key, over the allowance, slow, odd answer) just means "no web this time".
 */

export type WebSource = { title: string; url: string };
export type WebFindings = { findings: string; sources: WebSource[]; queries: string[] };

// GEMINI_API_KEY=off switches it off even when .env.local has a key (the tests use this)
export const webReady = () => Boolean(process.env.GEMINI_API_KEY) && process.env.GEMINI_API_KEY !== 'off';
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BASE = () => (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');

/** Stay well inside Gemini's free allowance: a few a minute, a couple of hundred a day. */
const PER_MINUTE = 8;
const PER_DAY = 200;
const TIMEOUT_MS = 8_000;

type Usage = Doc & { minute: number; minuteCount: number; day: string; dayCount: number };
const COL = 'web-usage';
const ID = 'gemini';

async function allowed(now = Date.now()): Promise<boolean> {
  const minute = Math.floor(now / 60_000);
  const day = new Date(now).toISOString().slice(0, 10);
  if (!(await get<Usage>(COL, ID))) await put<Usage>(COL, { id: ID, createdAt: new Date(now).toISOString(), minute: 0, minuteCount: 0, day: '', dayCount: 0 });
  let ok = false;
  await update<Usage>(COL, ID, (u) => {
    const v = { ...u, ...(u.minute !== minute && { minute, minuteCount: 0 }), ...(u.day !== day && { day, dayCount: 0 }) };
    if (v.minuteCount >= PER_MINUTE || v.dayCount >= PER_DAY) return v;
    ok = true;
    return { ...v, minuteCount: v.minuteCount + 1, dayCount: v.dayCount + 1 };
  });
  return ok;
}

const SYSTEM = `You help a friendly assistant (Jelly) answer one question from a student named Saanika, who is moving from Mumbai to Milan.
If answering needs current or real-world facts you cannot be sure of (events, opening hours, prices, news, weather, transport, shops, rules, anything that changes), search Google and reply with concise findings: plain sentences or short bullets, specific names, dates, times and numbers, no more than 180 words, no greeting, no advice beyond the facts.
If the message is casual chat, about her own life or feelings, or general knowledge that does not change, reply with exactly: NONE
Never ask questions back. Never include personal details in a search.`;

type GeminiReply = {
  candidates?: { content?: { parts?: { text?: string }[] }; groundingMetadata?: { webSearchQueries?: string[]; groundingChunks?: { web?: { uri?: string; title?: string } }[] } }[];
};

/** Pull the findings and sources out of a Gemini answer; null when it chose not to search. */
export function readReply(data: GeminiReply): WebFindings | null {
  const c = data.candidates?.[0];
  const text = (c?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  if (!text || /^none\b\.?$/i.test(text)) return null;
  const queries = c?.groundingMetadata?.webSearchQueries ?? [];
  // a reply with no search behind it is just the model's memory: Jelly has that already
  if (!queries.length) return null;
  const seen = new Set<string>();
  const sources: WebSource[] = [];
  for (const g of c?.groundingMetadata?.groundingChunks ?? []) {
    const url = g.web?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: (g.web?.title || new URL(url).hostname).slice(0, 80), url });
    if (sources.length >= 4) break;
  }
  return { findings: text.slice(0, 1500), sources, queries: queries.slice(0, 3) };
}

export async function webLookup(question: string, recent: { q: string; a: string }[] = [], tz = 'Europe/Rome'): Promise<WebFindings | null> {
  if (!webReady()) return null;
  try {
    if (!(await allowed())) return null;
    const earlier = recent
      .slice(-2)
      .map((t) => `Saanika: ${t.q}\nJelly: ${t.a.slice(0, 300)}`)
      .join('\n');
    const today = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    const res = await fetch(`${BASE()}/v1beta/models/${MODEL()}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY as string, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: `Today is ${today}.${earlier ? `\n\nThe chat so far:\n${earlier}` : ''}\n\nSaanika now says: ${question}` }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 700, thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return readReply((await res.json()) as GeminiReply);
  } catch {
    return null;
  }
}
