export type Role = 'saanika' | 'wellwisher';

export type Invite = {
  id: string;
  name: string;
  role: Role;
  code: string;
};

const DEMO_INVITES: Invite[] = [
  { id: 'saanika', name: 'Saanika', role: 'saanika', code: 'DEMO-SAANIKA' },
  { id: 'demo-friend', name: 'Demo Friend', role: 'wellwisher', code: 'DEMO-FRIEND' },
];

/** Letters and digits only, uppercase, so "tulip 7f2" and "TULIP-7F2" match. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function getInvites(): Invite[] {
  const raw = process.env.INVITES;
  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as Partial<Invite>[];
      return parsed
        .filter((i) => i.code && i.name && (i.role === 'saanika' || i.role === 'wellwisher'))
        .map((i) => ({
          id: i.id || slug(i.name as string),
          name: i.name as string,
          role: i.role as Role,
          code: i.code as string,
        }));
    } catch {
      console.error('INVITES is not valid JSON. No invite codes are active.');
      return [];
    }
  }
  return process.env.NODE_ENV === 'production' ? [] : DEMO_INVITES;
}

export function findInvite(code: string): Invite | null {
  const wanted = normalizeCode(code);
  if (!wanted) return null;
  return getInvites().find((i) => normalizeCode(i.code) === wanted) ?? null;
}

export function isActiveInvite(id: string): boolean {
  return getInvites().some((i) => i.id === id);
}
