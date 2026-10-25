import { cleanItemEdit, deleteItem, getItem, updateItem } from '@/lib/corner';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/** Only items that belong to this project. */
async function find(ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  const it = await getItem(itemId);
  return it && it.projectId === id ? it : null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const it = await find(ctx);
  if (!it) return fail('That isn’t in this project.', 404);
  const edit = cleanItemEdit(it, await req.json().catch(() => ({})));
  if (typeof edit === 'string') return fail(edit);
  return json(await updateItem(it.id, edit));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const it = await find(ctx);
  if (!it) return fail('That isn’t in this project.', 404);
  await deleteItem(it.id);
  return json({ ok: true });
}
