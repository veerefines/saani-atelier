import { inviteById, removeFriend } from '@/lib/invites';
import { purgeFriend } from '@/lib/purge';
import { requireAdmin, isResponse, json, fail } from '@/lib/api';

/** Remove a friend: their link stops working straight away, and everything they shared is deleted. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (isResponse(s)) return s;
  const { id } = await params;
  if (id === s.id) return fail('You can’t remove yourself.');
  if ((await inviteById(id))?.role === 'saanika') return fail('Saanika can’t be removed.');
  if (!(await removeFriend(id))) return fail('There’s no friend with that id.', 404);
  return json({ ok: true, removed: await purgeFriend(id) });
}
