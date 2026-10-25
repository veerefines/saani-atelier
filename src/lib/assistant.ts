import Anthropic from '@anthropic-ai/sdk';
import { getMedia } from './data';
import { readLocalMedia, signedDownload, usingSupabase } from './db';
import { costingSummary, type Item, type Project } from './corner';

/**
 * My Corner's assistant: Claude, reading only what's actually in the project. It runs on the server
 * (the key never reaches the browser) and is switched on by ANTHROPIC_API_KEY in Vercel. Without
 * the key, everything else in My Corner works and the Assistant tab shows how to set it up.
 */

export const assistantReady = () => Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

export type Mode = 'summary' | 'feedback' | 'moodboard' | 'next' | 'question';
const ASK: Record<Exclude<Mode, 'question'>, string> = {
  summary: 'Summarise this project: the brief, the research and documents, and where the creative direction stands.',
  feedback: 'Give honest, specific feedback on the creative direction: what is working, what feels unclear or inconsistent, and why.',
  moodboard: 'Suggest how to strengthen the moodboard and the brand concept: gaps, contradictions, and concrete additions.',
  next: 'What information is missing from this project, and what are the most useful next steps, in order?',
};

const SYSTEM = `You are the studio assistant inside "My Corner", Saanika's private workspace for fashion and brand projects. She is a fashion management student in Milan.

Work only from the project content provided in the message: the brief, notes, links, palettes, typography, fabrics, moodboard, costing, and any documents or images attached. When you refer to something, say where it came from (for example "your brief" or "the PDF 'Trend report'"). Some files could not be read (they are listed as not read); never guess at what they contain. If the content is too thin to answer well, say what is missing.

Costing figures are her own estimates; treat them as such and point out missing cost lines (duties, shipping, VAT, overheads) where relevant.

Be warm but direct, like a good tutor. Use short headings and bullet points, and keep it focused.`;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
const LIMITS = { images: 6, imageBytes: 5 * 1024 * 1024, pdfs: 3, pdfBytes: 10 * 1024 * 1024, txtBytes: 100 * 1024 };

async function bytesOf(mediaId: string): Promise<Buffer | null> {
  if (!usingSupabase) return readLocalMedia(mediaId);
  const r = await fetch(await signedDownload(mediaId), { signal: AbortSignal.timeout(20_000) });
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
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
    items.flatMap((i) => (i.kind !== 'drop' ? [] : i.drop === 'note' ? [`Note: ${i.note}`] : i.drop === 'image' ? [`Image${i.note ? `: ${i.note}` : ''} (attached below if readable)`] : [`${i.drop === 'pinterest' ? 'Pinterest' : 'Link'}: ${i.url}${i.note ? `, ${i.note}` : ''} (the page itself was not opened)`])),
  );
  section(
    'Moodboard, in her order',
    items.flatMap((i) => (i.kind !== 'board' ? [] : i.board === 'note' ? [`Note: ${i.text}`] : i.board === 'swatch' ? [`Colour swatch ${i.hex}${i.label ? ` (${i.label})` : ''}`] : [`Image${i.caption ? `: ${i.caption}` : ''} (attached below if readable)`])),
  );
  section('Colour palettes', items.flatMap((i) => (i.kind === 'palette' ? [`${i.name}: ${i.hexes.join(', ')}`] : [])));
  section('Typography', items.flatMap((i) => (i.kind === 'type' ? [`${i.font}${i.note ? `: ${i.note}` : ''}`] : [])));
  section('Fabrics and materials', items.flatMap((i) => (i.kind === 'fabric' ? [`${i.name}${i.description ? `: ${i.description}` : ''}${i.mediaId ? ' (photo attached below if readable)' : ''}`] : [])));
  section('Documents', items.flatMap((i) => (i.kind === 'doc' ? [i.filename] : [])));
  return lines.join('\n');
}

export type AssistantReply = { text: string; read: string[]; notRead: string[] };

/** Ask about a project. Gathers what can be read, sends it with the question, and says what was used. */
export async function askAssistant(p: Project, items: Item[], mode: Mode, question: string, history: { q: string; a: string }[]): Promise<AssistantReply> {
  const read: string[] = ['the project details'];
  const notRead: string[] = [];
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];

  // documents: PDFs as documents Claude reads itself, TXT inline; DOCX and PPTX can't be read here
  let pdfs = 0;
  for (const it of items) {
    if (it.kind !== 'doc') continue;
    if (it.mime === 'application/pdf') {
      if (pdfs >= LIMITS.pdfs || it.size > LIMITS.pdfBytes) {
        notRead.push(`${it.filename} (${pdfs >= LIMITS.pdfs ? `only the first ${LIMITS.pdfs} PDFs are read` : 'over 10 MB'})`);
        continue;
      }
      const buf = await bytesOf(it.mediaId).catch(() => null);
      if (!buf) {
        notRead.push(`${it.filename} (couldn’t open the file)`);
        continue;
      }
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') }, title: it.filename });
      read.push(it.filename);
      pdfs++;
    } else if (it.mime === 'text/plain') {
      const buf = it.size <= LIMITS.txtBytes ? await bytesOf(it.mediaId).catch(() => null) : null;
      if (!buf) {
        notRead.push(`${it.filename} (${it.size > LIMITS.txtBytes ? 'over 100 KB' : 'couldn’t open the file'})`);
        continue;
      }
      blocks.push({ type: 'document', source: { type: 'text', media_type: 'text/plain', data: buf.toString('utf8') }, title: it.filename });
      read.push(it.filename);
    } else {
      notRead.push(`${it.filename} (Word and PowerPoint files can’t be read yet; a PDF export can)`);
    }
  }

  // images from the moodboard, inspiration and fabrics, in that order of importance
  const imageItems = [...items.filter((i) => i.kind === 'board'), ...items.filter((i) => i.kind === 'drop'), ...items.filter((i) => i.kind === 'fabric')].filter((i) => 'mediaId' in i && i.mediaId) as (Item & { mediaId: string })[];
  let images = 0;
  for (const it of imageItems) {
    const label = it.kind === 'board' ? `moodboard image${it.board === 'image' && it.caption ? ` “${it.caption}”` : ''}` : it.kind === 'fabric' ? `fabric photo “${it.name}”` : 'inspiration image';
    if (images >= LIMITS.images) {
      notRead.push(`${label} (only the first ${LIMITS.images} images are looked at)`);
      continue;
    }
    const m = await getMedia(it.mediaId);
    if (!m || !IMAGE_TYPES.includes(m.mime as ImageType) || m.size > LIMITS.imageBytes) {
      notRead.push(`${label} (${m && m.size > LIMITS.imageBytes ? 'over 5 MB' : 'image format not supported'})`);
      continue;
    }
    const buf = await bytesOf(m.id).catch(() => null);
    if (!buf) {
      notRead.push(`${label} (couldn’t open the file)`);
      continue;
    }
    blocks.push({ type: 'text', text: `Image: ${label}` }, { type: 'image', source: { type: 'base64', media_type: m.mime as ImageType, data: buf.toString('base64') } });
    read.push(label);
    images++;
  }

  const earlier = history.length ? `\n\n## Earlier in this conversation\n${history.map((h) => `Q: ${h.q}\nA: ${h.a}`).join('\n\n')}` : '';
  const notes = notRead.length ? `\n\n## Not read\n${notRead.map((n) => `- ${n}`).join('\n')}` : '';
  const ask = mode === 'question' ? question : ASK[mode];
  blocks.push({ type: 'text', text: `${describe(p, items)}${notes}${earlier}\n\n## Her request\n${ask}` });

  const client = new Anthropic(); // ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL in tests) from the environment
  const message = await client.beta.messages
    .stream({
      model: MODEL(),
      max_tokens: 16000,
      output_config: { effort: 'high' },
      // if a safety check declines, the API retries on a suitable model instead of failing
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{ role: 'user', content: blocks }],
    })
    .finalMessage();

  if (message.stop_reason === 'refusal') return { text: 'The assistant couldn’t help with that one. Try rephrasing the request.', read, notRead };
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return { text: text || 'No answer came back. Try again.', read, notRead };
}
