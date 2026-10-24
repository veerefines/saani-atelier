import * as db from './db';
import { getInvites } from './invites';
import { milano } from '@/content/home';

/**
 * Where everyone is, for "good time to call". Each person's browser reports its time zone when
 * they open their desk; until then we assume Vee is in LA, the friends are in India, and Saanika is
 * in Mumbai until she flies and in Milano after.
 */
export type ZoneDoc = { id: string; createdAt: string; tz: string; at: string };
export type Person = { id: string; name: string; role: string; tz: string; city: string; known: boolean };

export function validZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "America/Los_Angeles" → "Los Angeles"; the few she cares about get their usual names. */
export function cityOf(tz: string) {
  const names: Record<string, string> = {
    'Asia/Kolkata': 'India',
    'Asia/Calcutta': 'India',
    'Europe/Rome': 'Milano',
    'America/Los_Angeles': 'LA',
  };
  return names[tz] ?? tz.split('/').pop()!.replace(/_/g, ' ');
}

export async function setZone(id: string, tz: string) {
  const cur = await db.get<ZoneDoc>('zones', id);
  if (cur?.tz === tz) return cur;
  return db.put<ZoneDoc>('zones', { id, createdAt: cur?.createdAt ?? new Date().toISOString(), tz, at: new Date().toISOString() });
}

const flown = (at = new Date()) => at.getTime() >= new Date(`${milano.arrival}T00:00:00+01:00`).getTime();

function guess(id: string, name: string, role: string) {
  if (role === 'saanika') return flown() ? milano.milanZone : milano.homeZone;
  return /^(vee|varun)\b/i.test(name) ? milano.laZone : milano.homeZone;
}

/** Everyone, with their best-known zone. Saanika's zone from before her flight doesn't count after it. */
export async function people(): Promise<Person[]> {
  const [invites, saved] = await Promise.all([getInvites(), db.list<ZoneDoc>('zones')]);
  const byId = new Map(saved.map((z) => [z.id, z]));
  return invites.map((i) => {
    let z = byId.get(i.id);
    if (z && i.role === 'saanika' && flown() && !flown(new Date(z.at))) z = undefined;
    const tz = z?.tz ?? guess(i.id, i.name, i.role);
    return { id: i.id, name: i.name, role: i.role, tz, city: cityOf(tz), known: Boolean(z) };
  });
}
