import { getChat, JELLY_CHATS, listChats, listProjects, saveTurn, text } from '@/lib/corner';
import { askJelly, assistantReady, AssistantBusy, AssistantKeyRejected } from '@/lib/assistant';
import { addChat, jellyState, seen, view } from '@/lib/jelly';
import { checkIn, platformContext, today } from '@/lib/jelly-world';
import { seasonView } from '@/lib/jelly-seasons';
import { friendship, timeMood } from '@/lib/jelly-mood';
import { addReminder, zoneOr } from '@/lib/reminders';
import { remember } from '@/lib/jelly-memory';
import type { TurnNote } from '@/lib/corner-model';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Is Jelly awake, how she feels, her chats, the projects she checks in about, how long Saani was away, and today's pearls and achievements. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const before = await seen();
  const { home, gains } = await checkIn();
  const projects = (await listProjects()).map((p) => ({ id: p.id, title: p.title, updatedAt: p.updatedAt, archived: p.archived }));
  return json({
    ready: assistantReady(),
    mood: timeMood(),
    chats: await listChats(JELLY_CHATS),
    projects,
    friend: home,
    gains,
    season: seasonView((await today()).season),
    // null the very first time they meet
    away: before.lastSeen ? Date.now() - Date.parse(before.lastSeen) : null,
  });
}

/** Ask Jelly anything, about the whole Atelier or any project: in a chat she's already in, or a new one. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  if (!assistantReady()) return fail('Jelly is asleep until the assistant is switched on (GROQ_API_KEY in Vercel).', 503);
  const body = await req.json().catch(() => ({}));
  const question = text(body.question, 2000);
  if (!question) return fail('Type your question first.');
  const projectId = typeof body.projectId === 'string' && body.projectId ? body.projectId : null;
  const page = typeof body.page === 'string' ? body.page.slice(0, 200) : null;
  const chatId = typeof body.chatId === 'string' && body.chatId ? body.chatId : null;
  const chat = chatId ? await getChat(JELLY_CHATS, chatId) : null;
  if (chatId && !chat) return fail('That chat isn’t here any more.', 404);
  const history = (chat?.turns ?? []).slice(-2).map((t) => ({ q: t.q, a: t.a }));
  // her own clock, for reminders (Mumbai before she flies, Milano after)
  const tz = zoneOr(body.tz);
  try {
    const before = await jellyState();
    const r = await askJelly(question, history, projectId, friendship(before.pets, before.chats).level, await platformContext(before, page), tz);
    // what Jelly noted down: reminders she set, things she'll remember
    const notes: TurnNote[] = [];
    for (const t of r.tags?.remind ?? []) {
      const rem = await addReminder({ ...t, tz, via: 'chat' });
      if (typeof rem !== 'string') notes.push({ kind: 'remind', id: rem.id, text: rem.text, at: rem.at, tz: rem.tz, repeat: rem.repeat });
    }
    for (const t of r.tags?.remember ?? []) {
      const f = await remember(t, 'jelly', chat?.id);
      if (f) notes.push({ kind: 'remember', id: f.id, text: f.text });
    }
    const saved = await saveTurn(JELLY_CHATS, chat?.id ?? null, { mode: 'question', q: question, a: r.text, read: r.read, notRead: r.notRead, suggestions: r.suggestions, mood: r.mood, ...(notes.length ? { notes } : {}) });
    return json({ ...saved, friend: view(await addChat()) });
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
