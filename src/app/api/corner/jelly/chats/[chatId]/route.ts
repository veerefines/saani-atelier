import { deleteChat, getChat, JELLY_CHATS, renameChat, text } from '@/lib/corner';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ chatId: string }> };

/** Rename a chat with Jelly. */
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { chatId } = await params;
  if (!(await getChat(JELLY_CHATS, chatId))) return fail('That chat isn’t here.', 404);
  const title = text((await req.json().catch(() => ({}))).title, 80);
  if (!title) return fail('Give the chat a name.');
  return json(await renameChat(JELLY_CHATS, chatId, title));
}

/** Delete a chat with Jelly. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { chatId } = await params;
  if (!(await deleteChat(JELLY_CHATS, chatId))) return fail('That chat isn’t here.', 404);
  return json({ ok: true });
}
