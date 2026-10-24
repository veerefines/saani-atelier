import { chapters, journeyIntro, type Chapter, type Item } from '@/content/journey';

/**
 * The words in the journey (chapter titles, captions, notes, quotes, voice-note names…) can be
 * rewritten from /admin. Each editable spot has a stable key; edits are stored by key and laid over
 * the defaults in src/content/journey.ts, so a blank edit falls back to the original.
 */
export type TextField = { key: string; group: string; label: string; value: string; long?: boolean };

const ITEM_FIELDS: Record<Item['type'], { field: string; label: string; long?: boolean }[]> = {
  photo: [{ field: 'caption', label: 'Photo caption' }],
  note: [
    { field: 'text', label: 'Note', long: true },
    { field: 'from', label: 'Note from' },
  ],
  quote: [
    { field: 'text', label: 'Quote', long: true },
    { field: 'by', label: 'Quote by' },
  ],
  voice: [
    { field: 'title', label: 'Voice note title' },
    { field: 'from', label: 'Voice note from' },
  ],
  video: [{ field: 'caption', label: 'Video caption' }],
  film: [{ field: 'title', label: 'Film strip title' }],
  ticket: [{ field: 'seat', label: 'Ticket seat' }],
  postcard: [
    { field: 'text', label: 'Postcard', long: true },
    { field: 'signoff', label: 'Postcard signed' },
  ],
};

const CHAPTER_FIELDS = [
  { field: 'kicker', label: 'Little line above the title' },
  { field: 'title', label: 'Chapter title' },
  { field: 'years', label: 'When' },
  { field: 'intro', label: 'Chapter intro', long: true },
] as const;

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Every editable piece of text, with its default. */
export function journeyTextFields(): TextField[] {
  const out: TextField[] = [
    { key: 'intro.title', group: 'Opening', label: 'Subtitle under her name', value: journeyIntro.title },
    { key: 'intro.line', group: 'Opening', label: 'Opening line', value: journeyIntro.line, long: true },
  ];
  for (const c of chapters) {
    for (const f of CHAPTER_FIELDS) out.push({ key: `${c.id}.${f.field}`, group: c.title, label: f.label, value: str(c[f.field]), long: 'long' in f ? f.long : undefined });
    c.items.forEach((it, i) => {
      for (const f of ITEM_FIELDS[it.type]) out.push({ key: `${c.id}.${i}.${f.field}`, group: c.title, label: f.label, value: str((it as Record<string, unknown>)[f.field]), long: f.long });
      if (it.type === 'film') it.frames.forEach((fr, k) => out.push({ key: `${c.id}.${i}.frames.${k}.caption`, group: c.title, label: `Film frame ${k + 1} caption`, value: fr.caption }));
    });
  }
  return out;
}

export const isJourneyTextKey = (key: string) => journeyTextFields().some((f) => f.key === key);

/** The opening and chapters with any edits laid over the defaults. */
export function withJourneyText(edits: Record<string, string>): { intro: typeof journeyIntro; chapters: Chapter[] } {
  const get = (key: string, fallback: string) => (edits[key]?.trim() ? edits[key] : fallback);
  return {
    intro: { ...journeyIntro, title: get('intro.title', journeyIntro.title), line: get('intro.line', journeyIntro.line) },
    chapters: chapters.map((c) => {
      const next: Chapter = { ...c };
      for (const f of CHAPTER_FIELDS) (next as Record<string, unknown>)[f.field] = get(`${c.id}.${f.field}`, str(c[f.field]));
      next.items = c.items.map((it, i) => {
        const copy = { ...it } as Record<string, unknown>;
        for (const f of ITEM_FIELDS[it.type]) if (str(copy[f.field]) || edits[`${c.id}.${i}.${f.field}`]) copy[f.field] = get(`${c.id}.${i}.${f.field}`, str(copy[f.field]));
        if (it.type === 'film') copy.frames = it.frames.map((fr, k) => ({ ...fr, caption: get(`${c.id}.${i}.frames.${k}.caption`, fr.caption) }));
        return copy as Item;
      });
      return next;
    }),
  };
}
