import { getProject, listItems, text } from '@/lib/corner';
import { askAssistant, assistantReady, AssistantBusy, AssistantKeyRejected, type Mode } from '@/lib/assistant';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const MODES: Mode[] = ['summary', 'feedback', 'moodboard', 'next', 'question'];

/** Is the assistant switched on? (The tab shows setup steps when it isn't.) */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json({ ready: assistantReady() });
}

/** Ask the assistant about this project. */
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
  // the free tier has little room, so only the last two exchanges come along
  const history = (Array.isArray(body.history) ? body.history : []).slice(-2).map((h: { q?: unknown; a?: unknown }) => ({ q: text(h?.q, 1000), a: text(h?.a, 6000) }));
  try {
    return json(await askAssistant(p, await listItems(id), mode, question, history));
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
