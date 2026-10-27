import { deleteChat, listChats, listProjects, saveTurn, text } from '@/lib/corner';
import { askJelly, assistantReady, AssistantBusy, AssistantKeyRejected } from '@/lib/assistant';
import { requireSession, isResponse, json, fail } from '@/lib/api';

// Jelly keeps one running conversation, stored with the project chats under this id
const JELLY = 'jelly';
const current = async () => (await listChats(JELLY))[0] ?? null;

/** Is Jelly awake, her conversation so far, and the projects she checks in about. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const projects = (await listProjects()).map((p) => ({ id: p.id, title: p.title, updatedAt: p.updatedAt, archived: p.archived }));
  return json({ ready: assistantReady(), chat: await current(), projects });
}

/** Ask Jelly anything, about any project (or none). */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  if (!assistantReady()) return fail('Jelly is asleep until the assistant is switched on (GROQ_API_KEY in Vercel).', 503);
  const body = await req.json().catch(() => ({}));
  const question = text(body.question, 2000);
  if (!question) return fail('Type your question first.');
  const projectId = typeof body.projectId === 'string' && body.projectId ? body.projectId : null;
  const chat = await current();
  const history = (chat?.turns ?? []).slice(-2).map((t) => ({ q: t.q, a: t.a }));
  try {
    const r = await askJelly(question, history, projectId);
    return json(await saveTurn(JELLY, chat?.id ?? null, { mode: 'question', q: question, a: r.text, read: r.read, notRead: r.notRead, suggestions: r.suggestions }));
  } catch (e) {
    if (e instanceof AssistantBusy) {
      const r = fail(e.message, 429);
      r.headers.set('Retry-After', String(e.retryAfter));
      return r;
    }
    if (e instanceof AssistantKeyRejected) return fail('The assistant’s API key was rejected. Check GROQ_API_KEY in Vercel.', 502);
    console.error('jelly', e);
    return fail('Jelly got tangled up. Try again.', 502);
  }
}

/** Start afresh. */
export async function DELETE() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const chat = await current();
  if (chat) await deleteChat(JELLY, chat.id);
  return json({ ok: true });
}
