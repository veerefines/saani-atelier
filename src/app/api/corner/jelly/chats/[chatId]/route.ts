import { deleteChat, getChat, JELLY_CHATS, pinChat, renameChat, text } from '@/lib/corner';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ chatId: string }> };

/** Rename a chat with Jelly, or pin it to the top. */
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { chatId } = await params;
  if (!(await getChat(JELLY_CHATS, chatId))) return fail('That chat isn’t here.', 404);
  const body = await req.json().catch(() => ({}));
  if (typeof body.pinned === 'boolean' && body.title === undefined) return json(await pinChat(JELLY_CHATS, chatId, body.pinned));
  const title = text(body.title, 80);
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
