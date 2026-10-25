import { getChat, getProject, listChats, listItems, saveTurn, STUDIO, text } from '@/lib/corner';
import { askAssistant, assistantReady, AssistantBusy, AssistantKeyRejected, type Mode } from '@/lib/assistant';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const MODES: string[] = [...STUDIO.map((x) => x.id), 'question'];

/** Is the assistant switched on, and the project's saved conversations. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  return json({ ready: assistantReady(), chats: (await getProject(id)) ? await listChats(id) : [] });
}

/** Ask the assistant about this project. The question and answer are saved to the conversation. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  if (!assistantReady()) return fail('The assistant isn’t switched on yet: add GROQ_API_KEY to the site’s settings in Vercel, then redeploy.', 503);
  const { id } = await params;
  const p = await getProject(id);
  if (!p) return fail('That project isn’t here.', 404);
  const body = await req.json().catch(() => ({}));
  const mode = MODES.includes(body.mode) ? (body.mode as Mode) : null;
  if (!mode) return fail('Choose what you’d like help with.');
  const question = text(body.question, 2000);
  if (mode === 'question' && !question) return fail('Type your question first.');
  const chatId = typeof body.chatId === 'string' && body.chatId ? body.chatId : null;
  const chat = chatId ? await getChat(id, chatId) : null;
  if (chatId && !chat) return fail('That conversation isn’t here any more.', 404);
  // the free tier has little room, so only the last two exchanges come along
  const history = (chat?.turns ?? []).slice(-2).map((t) => ({ q: t.q, a: t.a }));
  try {
    const r = await askAssistant(p, await listItems(id), mode, question, history);
    const label = mode === 'question' ? question : STUDIO.find((x) => x.id === mode)!.label;
    return json(await saveTurn(id, chat?.id ?? null, { mode, q: label, a: r.text, read: r.read, notRead: r.notRead, suggestions: r.suggestions }));
  } catch (e) {
    if (e instanceof AssistantBusy) {
      const r = fail(e.message, 429);
      r.headers.set('Retry-After', String(e.retryAfter));
      return r;
    }
    if (e instanceof AssistantKeyRejected) return fail('The assistant’s API key was rejected. Check GROQ_API_KEY in Vercel.', 502);
    console.error('assistant', e);
    return fail('The assistant couldn’t answer just now. Try again.', 502);
  }
}
