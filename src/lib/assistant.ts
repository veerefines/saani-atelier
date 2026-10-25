import { getMedia } from './data';
import { readLocalMedia, signedDownload, usingSupabase } from './db';
import { costingSummary, STUDIO, type Item, type Mode, type Project, type StudioId } from './corner';
import { AssistantBusy, FREE, busy, reserve, seconds, settle, type Budget } from './groq-limits';

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

const SYSTEM = `You are the studio assistant inside "My Corner", Saanika's private workspace for fashion and brand projects. She is a fashion management student in Milan.

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
function describe(p: Project, items: Item[]) {
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

export type AssistantReply = { text: string; read: string[]; notRead: string[]; suggestions: string[] };

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
  const docText = docs
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

  const notes = notRead.length ? `\n\n## Not read\n${notRead.map((n) => `- ${n}`).join('\n')}` : '';
  const text = `${project}${docText}${notes}${earlier}\n\n## Her request\n${ask}`;
  const estimate = tokensOf(SYSTEM + text) + images * IMAGE_TOKENS + ANSWER_TOKENS;

  const budget: Budget = await reserve(estimate, ANSWER_TOKENS);
  let res: Response;
  try {
    res = await fetch(`${BASE()}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL(),
        messages: [
          { role: 'system', content: SYSTEM },
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
  const { text: body, suggestions } = splitSuggestions(answer);
  return { text: body || 'No answer came back. Try again.', read, notRead, suggestions };
}
