import { deleteChat, getChat, renameChat, text } from '@/lib/corner';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string; chatId: string }> };

/** Rename a saved conversation. */
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id, chatId } = await params;
  if (!(await getChat(id, chatId))) return fail('That conversation isn’t here.', 404);
  const title = text((await req.json().catch(() => ({}))).title, 80);
  if (!title) return fail('Give the conversation a name.');
  return json(await renameChat(id, chatId, title));
}

/** Delete a saved conversation. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id, chatId } = await params;
  if (!(await deleteChat(id, chatId))) return fail('That conversation isn’t here.', 404);
  return json({ ok: true });
}
