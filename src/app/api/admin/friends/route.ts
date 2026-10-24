import { addFriend, getInvites } from '@/lib/invites';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

/** Everyone who can sign in, with their links. */
export async function GET(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const origin = new URL(req.url).origin;
  const list = (await getInvites()).map((i) => ({ ...i, link: `${origin}/hello/${i.code}` }));
  return json(list);
}

/** A new friend with a fresh code. */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { name } = await req.json().catch(() => ({}));
  if (!String(name ?? '').trim()) return fail('Write their name.');
  const f = await addFriend(String(name));
  return json({ ...f, link: `${new URL(req.url).origin}/hello/${f.code}` }, 201);
}
