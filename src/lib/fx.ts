/**
 * Euro to rupee, for Soldi. Frankfurter (the European Central Bank's reference rate, free, no key)
 * with open.er-api.com as the fallback. The ECB sets the rate once each working day around 4 PM
 * Milano time, so it's cached for an hour per server instance. FX_BASE_URL points both at a fake in tests.
 */

export type Rate = {
  /** ₹ for €1 */
  inr: number;
  /** the day the rate is for (YYYY-MM-DD) */
  day: string;
  /** when we fetched it */
  at: string;
  source: 'ECB' | 'ExchangeRate-API' | 'saved';
  /** the last month of rates, oldest first, for the little trend line */
  trend: { day: string; inr: number }[];
};

const FRANK = () => process.env.FX_BASE_URL ? `${process.env.FX_BASE_URL}/frankfurter` : 'https://api.frankfurter.dev/v1';
const ER = () => process.env.FX_BASE_URL ? `${process.env.FX_BASE_URL}/er` : 'https://open.er-api.com/v6';
// a sensible guess for the very first request if both sources are down (Oct 2026)
const LAST_RESORT = 106;

let cache: { at: number; r: Rate } | null = null;

async function get(url: string) {
  const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 10 && n < 1000;

async function fromEcb(): Promise<Rate> {
  const j = await get(`${FRANK()}/latest?base=EUR&symbols=INR`);
  if (!ok(j?.rates?.INR)) throw new Error('no rate');
  const start = new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10);
  const series = await get(`${FRANK()}/${start}..?base=EUR&symbols=INR`).catch(() => null);
  const trend = series?.rates
    ? Object.entries(series.rates as Record<string, { INR: number }>)
        .filter(([, v]) => ok(v?.INR))
        .map(([day, v]) => ({ day, inr: v.INR }))
        .sort((a, b) => (a.day < b.day ? -1 : 1))
    : [];
  return { inr: j.rates.INR, day: String(j.date), at: new Date().toISOString(), source: 'ECB', trend };
}

async function fromEr(): Promise<Rate> {
  const j = await get(`${ER()}/latest/EUR`);
  if (j?.result !== 'success' || !ok(j?.rates?.INR)) throw new Error('no rate');
  const day = new Date((j.time_last_update_unix ?? Date.now() / 1000) * 1000).toISOString().slice(0, 10);
  return { inr: j.rates.INR, day, at: new Date().toISOString(), source: 'ExchangeRate-API', trend: cache?.r.trend ?? [] };
}

export async function eurInr(): Promise<Rate> {
  // (no cache against the test fake, so tests can switch a source off)
  if (cache && !process.env.FX_BASE_URL && Date.now() - cache.at < 60 * 60_000) return cache.r;
  for (const src of [fromEcb, fromEr]) {
    try {
      const r = await src();
      cache = { at: Date.now(), r };
      return r;
    } catch {
      /* try the next one */
    }
  }
  if (cache) return { ...cache.r, source: 'saved' };
  return { inr: LAST_RESORT, day: new Date().toISOString().slice(0, 10), at: new Date().toISOString(), source: 'saved', trend: [] };
}
