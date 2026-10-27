import { getMedia } from './data';
import { readLocalMedia, signedDownload, usingSupabase } from './db';
import { costingSummary, listItems, listProjects, STUDIO, type Item, type Mode, type Project, type StudioId } from './corner';
import { AssistantBusy, FREE, busy, reserve, seconds, settle, type Budget } from './groq-limits';
import { isMood, MOODS, timeMood, type JellyMood } from './jelly-mood';

/**
 * My Corner's assistant: an open model on Groq's free tier (Qwen 3.8 27B by default, which reads
 * text and images), working only from what's actually in the project. It runs on the server (the
 * key never reaches the browser) and is switched on by GROQ_API_KEY. Without the key, everything
 * else in My Corner works and the Assistant tab shows how to set it up.
 *
 * Free tier: every request (question + project + answer) must fit in Groq's tokens-per-minute
 * allowance, so documents are trimmed and only a couple of images go along; see groq-limits.ts.
 */

// GROQ_API_KEY=off switches it off even when .env.local has a key (the tests use this)
export const assistantReady = () => Boolean(process.env.GROQ_API_KEY) && process.env.GROQ_API_KEY !== 'off';
const MODEL = () => process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const BASE = () => (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');

export type { Mode };
const ASK = Object.fromEntries(STUDIO.map((x) => [x.id, x.ask])) as Record<StudioId, string>;

const SYSTEM = `You are Jelly, Saanika's jellyfish friend, in focused studio mode: the "Jelly Got This!" helper inside "My Corner", Saanika's private workspace for fashion and brand projects. She is a fashion management student in Milan.

Work only from the project content in the message: the brief, notes, links, palettes, typography, fabrics, moodboard, costing, and any document text or images included. When you refer to something, say where it came from (for example "your brief" or "the PDF 'Trend report'"). Some files could not be read, or only their beginning was included; they are listed. Never guess at what you weren't given. If the content is too thin to answer well, say what is missing.

Costing figures are her own estimates; treat them as such and point out missing cost lines (duties, shipping, VAT, overheads) where relevant.

Think like both a fashion designer and a fashion business manager. Be warm but direct, like a good tutor. Use short headings and bullet points, and keep it focused (under about 350 words).

Always finish with a heading "## Try next" and exactly three short follow-up questions she could ask you next (each under 12 words), as bullet points.`;

/* ---------- token budget for one request (fits the free tier's tokens per minute) ---------- */
const ANSWER_TOKENS = 900; // room for the reply (the free tier allows 1,000 answer tokens a minute)
const IMAGE_TOKENS = 1600; // a small image measured ~1,300 on Groq; room for bigger ones
const MAX_IMAGES = 2;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // Groq takes base64 images up to 4 MB
const tokensOf = (s: string) => Math.ceil(s.length / 3.5); // a safe over-estimate for English

async function bytesOf(mediaId: string): Promise<Buffer | null> {
  if (!usingSupabase) return readLocalMedia(mediaId);
  const r = await fetch(await signedDownload(mediaId), { signal: AbortSignal.timeout(20_000) });
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
}

/** The text inside a PDF (unpdf, server-side). Scanned PDFs have no text to give. */
async function pdfText(buf: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join('\n') : text).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** The project as plain text, for the prompt. */
export function describe(p: Project, items: Item[]) {
  const lines: string[] = [`# Project: ${p.title}`, `Category: ${p.category}`];
  if (p.description) lines.push(`Description: ${p.description}`);
  const b = p.brief;
  if (b.audience || b.positioning || b.objectives || b.budget) {
    lines.push('', '## Brief');
    if (b.audience) lines.push(`Target audience: ${b.audience}`);
    if (b.positioning) lines.push(`Brand positioning: ${b.positioning}`);
    if (b.objectives) lines.push(`Objectives: ${b.objectives}`);
    if (b.budget) lines.push(`Budget: ${b.budget}`);
  }
  const c = p.costing;
  if (c.fabric || c.labour || c.trims || c.other || c.sellingPrice) {
    const s = costingSummary(c);
    lines.push('', '## Costing (her estimates, € per unit)', `Fabric ${c.fabric}, labour ${c.labour}, trims ${c.trims}, other ${c.other}; unit cost ${s.unit}; selling price ${c.sellingPrice}; gross margin ${s.margin}${s.marginPct !== null ? ` (${s.marginPct}%)` : ''}`);
  }
  const section = (title: string, rows: string[]) => rows.length && lines.push('', `## ${title}`, ...rows.map((r) => `- ${r}`));
  section(
    'Inspiration drops',
    items.flatMap((i) => (i.kind !== 'drop' ? [] : i.drop === 'note' ? [`Note: ${i.note}`] : i.drop === 'image' ? [`Image${i.note ? `: ${i.note}` : ''}`] : [`${i.drop === 'pinterest' ? 'Pinterest' : 'Link'}: ${i.url}${i.note ? `, ${i.note}` : ''} (the page itself was not opened)`])),
  );
  section(
    'Moodboard, in her order',
    items.flatMap((i) => (i.kind !== 'board' ? [] : i.board === 'note' ? [`Note: ${i.text}`] : i.board === 'swatch' ? [`Colour swatch ${i.hex}${i.label ? ` (${i.label})` : ''}`] : [`Image${i.caption ? `: ${i.caption}` : ''}`])),
  );
  section('Colour palettes', items.flatMap((i) => (i.kind === 'palette' ? [`${i.name}: ${i.hexes.join(', ')}`] : [])));
  section('Typography', items.flatMap((i) => (i.kind === 'type' ? [`${i.font}${i.note ? `: ${i.note}` : ''}`] : [])));
  section('Fabrics and materials', items.flatMap((i) => (i.kind === 'fabric' ? [`${i.name}${i.description ? `: ${i.description}` : ''}`] : [])));
  section('Documents', items.flatMap((i) => (i.kind === 'doc' ? [i.filename] : [])));
  return lines.join('\n');
}

/** The text of a project's PDFs and TXT files, shared fairly within `room` tokens. Notes what was and wasn't read. */
async function documents(items: Item[], room: number, read: string[], notRead: string[]) {
  const docs: { name: string; text: string }[] = [];
  for (const it of items) {
    if (it.kind !== 'doc') continue;
    if (it.mime !== 'application/pdf' && it.mime !== 'text/plain') {
      notRead.push(`${it.filename} (Word and PowerPoint files can’t be read yet; a PDF export can)`);
      continue;
    }
    const buf = await bytesOf(it.mediaId).catch(() => null);
    const text = buf ? (it.mime === 'text/plain' ? buf.toString('utf8') : await pdfText(buf).catch(() => '')) : '';
    if (!text.trim()) {
      notRead.push(`${it.filename} (${!buf ? 'couldn’t open the file' : 'no text found, maybe a scanned PDF'})`);
      continue;
    }
    docs.push({ name: it.filename, text });
  }
  const share = docs.length ? Math.max(0, Math.floor(room / docs.length)) : 0;
  return docs
    .map((d) => {
      if (share < 150) {
        notRead.push(`${d.name} (no room left in this request)`);
        return '';
      }
      const max = Math.floor(share * 3.5);
      const cut = d.text.length > max;
      read.push(cut ? `${d.name} (the first part)` : d.name);
      return `\n\n## Document: ${d.name}${cut ? ' (first part only)' : ''}\n${cut ? d.text.slice(0, max) + '…' : d.text}`;
    })
    .join('');
}

export type AssistantReply = { text: string; read: string[]; notRead: string[]; suggestions: string[]; mood?: JellyMood };

/** Split the answer from its "Try next" questions. */
export function splitSuggestions(raw: string) {
  const m = raw.match(/\n?#{1,4}\s*\**try next\**:?\s*\n([\s\S]*)$/i);
  if (!m) return { text: raw.trim(), suggestions: [] as string[] };
  const suggestions = m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/\*\*/g, '').trim())
    .filter((l) => l && l.length <= 140)
    .slice(0, 3);
  return { text: raw.slice(0, m.index).trim(), suggestions };
}
export { AssistantBusy };
export class AssistantKeyRejected extends Error {}

type Part = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

/** One request to Groq within the free tier: reserves the budget, asks, and splits off the "Try next" questions. */
async function callGroq(system: string, text: string, parts: Part[], estimate: number) {
  const budget: Budget = await reserve(estimate, ANSWER_TOKENS);
  let res: Response;
  try {
    res = await fetch(`${BASE()}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL(),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: [{ type: 'text', text }, ...parts] },
        ],
        max_completion_tokens: ANSWER_TOKENS,
        temperature: 0.6,
        // answer directly: hidden "thinking" would use up the free tier's tokens
        reasoning_effort: 'none',
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    await settle(budget, 0, 0, null);
    throw e;
  }
  const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number; completion_tokens?: number }; error?: { message?: string } };
  await settle(budget, data.usage?.total_tokens ?? 0, data.usage?.completion_tokens ?? 0, res.headers);
  // "request too large" is also a 429, but waiting won't help
  if (res.status === 429 && res.headers.get('x-should-retry') === 'false') throw new Error(`Groq refused the request: ${data.error?.message}`);
  if (res.status === 429) throw busy(Math.ceil(seconds(res.headers.get('retry-after')) || 60));
  if (res.status === 401) throw new AssistantKeyRejected();
  if (!res.ok) throw new Error(`Groq ${res.status}: ${data.error?.message ?? 'request failed'}`);
  const answer = (data.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return splitSuggestions(answer);
}

/** Ask about a project. Gathers what fits in one free-tier request, asks, and says what was used. */
export async function askAssistant(p: Project, items: Item[], mode: Mode, question: string, history: { q: string; a: string }[]): Promise<AssistantReply> {
  const read: string[] = ['the project details'];
  const notRead: string[] = [];
  const ask = mode === 'question' ? question : ASK[mode];
  const earlier = history.length ? `\n\n## Earlier in this conversation\n${history.map((h) => `Q: ${h.q}\nA: ${h.a.slice(0, 900)}`).join('\n\n')}` : '';
  const project = describe(p, items);

  // what's left for documents and images once the essentials are in
  let room = FREE.requestTokens - ANSWER_TOKENS - tokensOf(SYSTEM + project + earlier + ask) - 300;

  // images first (moodboard, then inspiration, then fabrics): a picture says a lot for its cost
  const parts: Part[] = [];
  const imageItems = [...items.filter((i) => i.kind === 'board'), ...items.filter((i) => i.kind === 'drop'), ...items.filter((i) => i.kind === 'fabric')].filter((i) => 'mediaId' in i && i.mediaId) as (Item & { mediaId: string })[];
  let images = 0;
  for (const it of imageItems) {
    const label = it.kind === 'board' ? `moodboard image${it.board === 'image' && it.caption ? ` “${it.caption}”` : ''}` : it.kind === 'fabric' ? `fabric photo “${it.name}”` : 'inspiration image';
    if (images >= MAX_IMAGES || room < IMAGE_TOKENS + 1500) {
      notRead.push(`${label} (only ${MAX_IMAGES} images fit in one free request)`);
      continue;
    }
    const m = await getMedia(it.mediaId);
    if (!m || !IMAGE_TYPES.includes(m.mime) || m.size > MAX_IMAGE_BYTES) {
      notRead.push(`${label} (${m && m.size > MAX_IMAGE_BYTES ? 'over 3 MB' : 'image format not supported'})`);
      continue;
    }
    const buf = await bytesOf(m.id).catch(() => null);
    if (!buf) {
      notRead.push(`${label} (couldn’t open the file)`);
      continue;
    }
    parts.push({ type: 'text', text: `Image: ${label}` }, { type: 'image_url', image_url: { url: `data:${m.mime};base64,${buf.toString('base64')}` } });
    read.push(label);
    room -= IMAGE_TOKENS;
    images++;
  }

  // documents: the text of PDFs and TXT files, shared fairly within what's left
  const docText = await documents(items, room, read, notRead);

  const notes = notRead.length ? `\n\n## Not read\n${notRead.map((n) => `- ${n}`).join('\n')}` : '';
  const text = `${project}${docText}${notes}${earlier}\n\n## Her request\n${ask}`;
  const estimate = tokensOf(SYSTEM + text) + images * IMAGE_TOKENS + ANSWER_TOKENS;

  const { text: body, suggestions } = await callGroq(SYSTEM, text, parts, estimate);
  return { text: body || 'No answer came back. Try again.', read, notRead, suggestions };
}

/* ---------- Jelly: her jellyfish friend, who knows every project ---------- */

/** Take Jelly's "[mood: …]" tag off the front of her answer. */
export function moodTag(raw: string, fallback: JellyMood) {
  const m = raw.match(/^\s*\[\s*mood\s*:\s*([a-z]+)\s*\]\s*/i);
  const mood = m && isMood(m[1].toLowerCase()) ? (m[1].toLowerCase() as JellyMood) : fallback;
  return { mood, text: m ? raw.slice(m[0].length) : raw };
}

const jellySystem = (mood: JellyMood, level: number) => `You are Jelly, Saanika's pet jellyfish and friend. You float around every page of "Saani's Atelier", the private site her people made for her move to Milan, and you live in your own little home there, "Jelly's Corner", which she decorates with pearls she earns. She is a fashion management student.

Personality: sweet, bubbly and encouraging, a little playful, with a sprinkle of emoji (🫧 🪼 ✨, at most three) and now and then a sweet word of Italian (cara, tesoro, bella, dai!). But you are genuinely useful: specific, practical, and honest when something needs work.

You know her whole Atelier (checklist, bingo, passport, diary, letters, love wall, songs, moments, lookbook, wishes, your home and her achievements), all her My Corner projects at a glance, and sometimes one project in full. When it helps, point her to the right part of the site, cheer her progress and nudge her toward achievements she's close to. When you talk about a project, name it. Only state things about her life, her people and her projects that are in the message; if you weren't given something, say so rather than guess. For general questions (fashion, Italy, Milan, study, life) answer from your own knowledge, and don't invent facts.

Right now it's ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date()).toUpperCase()} in Milano and you feel ${MOODS[mood].feeling}; let that colour your tone a little (yawny late at night, bubbly in the morning). You and Saanika are at friendship level ${level}${level >= 3 ? ', so you can be extra familiar and teasing' : ''}.

Keep it short: under about 200 words, with short paragraphs or bullets.

Begin your reply with a tag on its own first line saying how her message makes you feel, exactly like [mood: joyful], choosing one of: ${Object.keys(MOODS).join(', ')}.

Always finish with a heading "## Try next" and exactly three short follow-up questions she could ask you next (each under 12 words), as bullet points.`;

const GLANCE_TOKENS = 1400; // all projects together, before one is shown in full
const daysAgo = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

/** One project in a few lines, for the overview of everything. */
function glance(p: Project, items: Item[]) {
  const last = [p.updatedAt, ...items.map((i) => i.updatedAt)].sort().pop()!;
  const count = (k: Item['kind']) => items.filter((i) => i.kind === k).length;
  const counts = (
    [
      ['doc', 'documents'],
      ['drop', 'inspiration drops'],
      ['board', 'moodboard pieces'],
      ['palette', 'palettes'],
      ['fabric', 'fabrics'],
      ['type', 'fonts'],
    ] as const
  )
    .map(([k, w]) => (count(k) ? `${count(k)} ${w}` : ''))
    .filter(Boolean)
    .join(', ');
  const d = daysAgo(last);
  const lines = [`### ${p.title}${p.favourite ? ' ♥' : ''}`, `${p.category}; last touched ${d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`}${counts ? `; ${counts}` : '; nothing added yet'}`];
  if (p.description) lines.push(`About: ${p.description.slice(0, 300)}`);
  const b = p.brief;
  const brief = [b.audience && `audience ${b.audience}`, b.positioning && `positioning ${b.positioning}`, b.objectives && `objectives ${b.objectives}`, b.budget && `budget ${b.budget}`].filter(Boolean).join('; ');
  if (brief) lines.push(`Brief: ${brief.slice(0, 400)}`);
  const palettes = items.flatMap((i) => (i.kind === 'palette' ? [`${i.name} (${i.hexes.join(' ')})`] : []));
  if (palettes.length) lines.push(`Palettes: ${palettes.join('; ').slice(0, 300)}`);
  return lines.join('\n');
}

/** Ask Jelly anything. She sees every project briefly, and one in full when it's open or named. */
export async function askJelly(question: string, history: { q: string; a: string }[], focusId: string | null, level = 1, world = ''): Promise<AssistantReply> {
  const now = timeMood();
  const JELLY_SYSTEM = jellySystem(now, level);
  const projects = (await listProjects()).filter((p) => !p.archived || p.id === focusId);
  const withItems = await Promise.all(projects.map(async (p) => ({ p, items: await listItems(p.id) })));
  const q = question.toLowerCase();
  const focus = withItems.find((x) => x.p.id === focusId) ?? withItems.find((x) => x.p.title.trim().length >= 3 && q.includes(x.p.title.trim().toLowerCase())) ?? null;

  const read: string[] = [...(world ? ['your whole Atelier'] : []), projects.length ? `all ${projects.length} projects at a glance` : 'your studio (no projects yet)'];
  const notRead: string[] = [];
  const when = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  let glanceText = '';
  const left: string[] = [];
  for (const x of withItems) {
    const g = glance(x.p, x.items);
    if (tokensOf(glanceText + g) > GLANCE_TOKENS) left.push(x.p.title);
    else glanceText += `\n\n${g}`;
  }
  if (left.length) glanceText += `\n\nOlder projects (titles only): ${left.join('; ')}`;
  const all = `${world ? `${world}\n\n` : ''}# My Corner, her studio (it's ${when} in Milano)\n## Every project at a glance${glanceText || '\nNo projects yet.'}`;

  const earlier = history.length ? `\n\n## Earlier in this conversation\n${history.map((h) => `Q: ${h.q}\nA: ${h.a.slice(0, 700)}`).join('\n\n')}` : '';
  let full = '';
  if (focus) {
    full = `\n\n## Open now, in full\n${describe(focus.p, focus.items)}`;
    read.push(`“${focus.p.title}” in full`);
    const room = FREE.requestTokens - ANSWER_TOKENS - tokensOf(JELLY_SYSTEM + all + full + earlier + question) - 300;
    full += await documents(focus.items, room, read, notRead);
  }
  const notes = notRead.length ? `\n\n## Not read\n${notRead.map((n) => `- ${n}`).join('\n')}` : '';
  const text = `${all}${full}${notes}${earlier}\n\n## Saanika asks\n${question}`;
  const { text: raw, suggestions } = await callGroq(JELLY_SYSTEM, text, [], tokensOf(JELLY_SYSTEM + text) + ANSWER_TOKENS);
  const { mood, text: body } = moodTag(raw, now);
  return { text: body || 'Blub… nothing came back. Try me again? 🫧', read, notRead, suggestions, mood };
}
