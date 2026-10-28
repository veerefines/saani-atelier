import * as db from './db';

/**
 * What Jelly remembers about Saani: small lasting things from their chats ("her favourite gelato is
 * pistachio", "her exam is on 12 Dec"), so she can bring them up later. Saani can read, change or
 * forget any of them in Jelly's Corner. Never anything sensitive (the prompt says so, and a filter checks).
 */
export type Fact = { id: string; text: string; at: string; chatId?: string; by: 'jelly' | 'her' };
type Memory = { id: 'memory'; createdAt: string; facts: Fact[] };

export const MAX_FACTS = 60;
const COL = 'jelly';

const words = (t: string) => new Set(t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter((w) => w.length > 2));
/** Mostly the same words: a newer version of something she already said. */
function similar(a: string, b: string) {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return false;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / Math.min(x.size, y.size) >= 0.7;
}
// a last check on what Jelly may keep, whatever the model says
const SENSITIVE = /\b(password|passcode|pin|otp|cvv|card number|iban|account number|passport number|aadhaar|ssn|codice fiscale|address is|lives at)\b/i;

export async function memories(): Promise<Fact[]> {
  return (await db.get<Memory>(COL, 'memory'))?.facts ?? [];
}
const save = (facts: Fact[]) => db.put<Memory>(COL, { id: 'memory', createdAt: new Date().toISOString(), facts: facts.slice(-MAX_FACTS) });

export function cleanFact(raw: unknown) {
  const t = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().replace(/^[-•*]\s*/, '').slice(0, 160) : '';
  return t.length >= 4 && !SENSITIVE.test(t) ? t : '';
}

/** Keep something; a near-duplicate is replaced by the newer version. Returns the fact, or null. */
export async function remember(raw: unknown, by: Fact['by'], chatId?: string): Promise<Fact | null> {
  const text = cleanFact(raw);
  if (!text) return null;
  const facts = (await memories()).filter((f) => !similar(f.text, text));
  const f: Fact = { id: db.newId('mf_'), text, at: new Date().toISOString(), by, ...(chatId ? { chatId } : {}) };
  await save([...facts, f]);
  return f;
}

export async function forget(id: string) {
  const facts = await memories();
  await save(facts.filter((f) => f.id !== id));
}

export async function editFact(id: string, raw: unknown): Promise<Fact | null> {
  const text = cleanFact(raw);
  if (!text) return null;
  const facts = await memories();
  const f = facts.find((x) => x.id === id);
  if (!f) return null;
  const next = { ...f, text, at: new Date().toISOString() };
  await save(facts.map((x) => (x.id === id ? next : x)));
  return next;
}

/** For Jelly's prompt: the most recent things first, within a character budget. */
export function memoryText(facts: Fact[], max = 1200) {
  const out: string[] = [];
  let n = 0;
  for (const f of [...facts].reverse()) {
    if (n + f.text.length > max) break;
    out.push(`- ${f.text}`);
    n += f.text.length + 3;
  }
  return out.length ? `## Things Saanika told you before (bring them up naturally when it fits; never invent more)\n${out.join('\n')}` : '';
}
