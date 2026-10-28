import { getInvites } from '@/lib/invites';
import { isEmail, setFriendEmail } from '@/lib/google';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

/** A friend's email, so Google can send them meetup invites ({ id, email }; empty clears it). */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { id, email } = await req.json().catch(() => ({}));
  if (!(await getInvites()).some((i) => i.id === id && i.role === 'wellwisher')) return fail('Unknown friend.', 404);
  if (email && !isEmail(email)) return fail('That doesn’t look like an email.');
  await setFriendEmail(id, email || null);
  return json({ ok: true, email: email ? String(email).trim().toLowerCase() : null });
}
