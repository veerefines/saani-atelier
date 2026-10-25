import { get, put, update, type Doc } from './db';

/**
 * Keeps the assistant inside Groq's free tier for qwen/qwen3.8-27b: 30 requests, 8,000 tokens and
 * 1,000 answer (output) tokens a minute, and 1,000 requests a day. We stay a little under each, count every request in the doc store
 * (so it holds across server instances), and when Groq itself says to slow down (its
 * x-ratelimit-* headers, or a 429 with retry-after) we pause until it says we can go again.
 */
export const FREE = {
  perMinute: Number(process.env.GROQ_RPM) || 20,
  perDay: 900,
  tokensPerMinute: 7500,
  outputPerMinute: 1000, // Groq enforces this one without a header; it counts each request's max answer length
  requestTokens: 7000, // the most one request (question, project and answer together) may use
};

export class AssistantBusy extends Error {
  constructor(
    message: string,
    public retryAfter: number,
  ) {
    super(message);
  }
}

type Usage = Doc & { minute: number; minuteRequests: number; minuteTokens: number; minuteOutput?: number; day: string; dayRequests: number; pausedUntil: number };
export type Budget = { estimate: number; output: number };

const COL = 'groq-usage';
const ID = 'free-tier';
const minuteOf = (t: number) => Math.floor(t / 60_000);
const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);

const waitText = (secs: number) => (secs < 90 ? `${secs} seconds` : secs < 5400 ? `${Math.ceil(secs / 60)} minutes` : `${Math.round(secs / 3600)} hours`);
export const busy = (secs: number, why = 'The free assistant is catching its breath.') => new AssistantBusy(`${why} Try again in about ${waitText(secs)}.`, secs);

/** Groq writes waits like "7.66s", "2m59.5s" or "1h2m". */
export function seconds(v: string | null): number {
  if (!v) return 0;
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v);
  let s = 0;
  for (const [, n, u] of v.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) s += Number(n) * (u === 'h' ? 3600 : u === 'm' ? 60 : u === 's' ? 1 : 0.001);
  return s;
}

async function current(now: number): Promise<Usage> {
  const u = (await get<Usage>(COL, ID)) ?? (await put<Usage>(COL, { id: ID, createdAt: new Date(now).toISOString(), minute: 0, minuteRequests: 0, minuteTokens: 0, day: '', dayRequests: 0, pausedUntil: 0 }));
  return u;
}

const fresh = (u: Usage, now: number): Usage => {
  const m = minuteOf(now);
  const d = dayOf(now);
  return {
    ...u,
    ...(u.minute !== m && { minute: m, minuteRequests: 0, minuteTokens: 0, minuteOutput: 0 }),
    ...(u.day !== d && { day: d, dayRequests: 0 }),
  };
};

/** Book room for one request, or throw AssistantBusy saying how long to wait. */
export async function reserve(estimate: number, output: number): Promise<Budget> {
  const now = Date.now();
  await current(now);
  let refusal: AssistantBusy | null = null;
  await update<Usage>(COL, ID, (u0) => {
    const u = fresh(u0, now);
    const toNextMinute = Math.max(1, Math.ceil(60 - (now % 60_000) / 1000));
    if (u.pausedUntil > now) refusal = busy(Math.ceil((u.pausedUntil - now) / 1000));
    else if (u.dayRequests >= FREE.perDay) refusal = busy(Math.ceil((Date.parse(`${u.day}T00:00:00Z`) + 86_400_000 - now) / 1000), 'The assistant has used today’s free questions.');
    else if (u.minuteRequests >= FREE.perMinute || u.minuteTokens + estimate > FREE.tokensPerMinute || (u.minuteOutput ?? 0) + output > FREE.outputPerMinute) refusal = busy(toNextMinute);
    if (refusal) return u;
    return { ...u, minuteRequests: u.minuteRequests + 1, minuteTokens: u.minuteTokens + estimate, minuteOutput: (u.minuteOutput ?? 0) + output, dayRequests: u.dayRequests + 1 };
  });
  if (refusal) throw refusal;
  return { estimate, output };
}

/** After the call: count what it really used, and listen to Groq if it asks us to wait. */
export async function settle(b: Budget, used: number, answered: number, headers: Headers | null) {
  const now = Date.now();
  let pause = 0;
  if (headers) {
    pause = Math.max(pause, seconds(headers.get('retry-after')));
    if (headers.get('x-ratelimit-remaining-requests') === '0') pause = Math.max(pause, seconds(headers.get('x-ratelimit-reset-requests')));
    const tokensLeft = Number(headers.get('x-ratelimit-remaining-tokens'));
    if (headers.has('x-ratelimit-remaining-tokens') && tokensLeft < 2000) pause = Math.max(pause, seconds(headers.get('x-ratelimit-reset-tokens')));
  }
  await update<Usage>(COL, ID, (u0) => {
    const u = fresh(u0, now);
    return {
      ...u,
      minuteTokens: used > 0 && u.minute === minuteOf(now) ? Math.max(0, u.minuteTokens - b.estimate + used) : u.minuteTokens,
      minuteOutput: used > 0 && u.minute === minuteOf(now) ? Math.max(0, (u.minuteOutput ?? 0) - b.output + answered) : u.minuteOutput,
      pausedUntil: pause ? Math.max(u.pausedUntil, now + Math.ceil(pause * 1000)) : u.pausedUntil,
    };
  });
}
