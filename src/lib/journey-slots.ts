import { chapters, journeyMusic } from '@/content/journey';

/** Every media spot in the journey, so the admin page can fill each one from the browser. */
export type JourneySlot = { slot: string; kind: 'photo' | 'video' | 'music'; label: string; chapter: string };

export function journeySlots(): JourneySlot[] {
  const out: JourneySlot[] = [];
  for (const c of chapters) {
    for (const it of c.items) {
      if (it.type === 'photo') out.push({ slot: it.src, kind: 'photo', label: it.caption || 'photo', chapter: c.title });
      else if (it.type === 'video') out.push({ slot: it.src, kind: 'video', label: it.caption || 'video', chapter: c.title });
      else if (it.type === 'film') for (const f of it.frames) out.push({ slot: f.src, kind: 'photo', label: `${it.title}: ${f.caption}`, chapter: c.title });
    }
  }
  out.push({ slot: journeyMusic.src, kind: 'music', label: 'Background music (the record)', chapter: 'Everywhere' });
  return out;
}
