import { removeFriend } from '@/lib/invites';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

/** Revoke a friend added from here. Their link stops working straight away. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { id } = await params;
  return (await removeFriend(id)) ? json({ ok: true }) : fail('Only friends added here can be removed here. The others are in Vercel’s INVITES setting.', 400);
}
