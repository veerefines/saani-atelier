import fs from 'node:fs';
import path from 'node:path';
import { chapters } from '@/content/journey';
import { listJourneyExtras, listSlotMedia } from '@/lib/extras';

/**
 * The best photos from her journey, for the "Your story" film strip on her desk.
 * Bigger frames in the journey count as better (the milestone first), then story order.
 * Only photos that really exist: uploaded from /admin, or a file in public/journey.
 */
export async function journeyHighlights(n = 4): Promise<string[]> {
  const [slots, extras] = await Promise.all([listSlotMedia(), listJourneyExtras()]);
  const uploaded = new Map(slots.map((s) => [s.slot, s.mediaId]));
  const resolve = (src: string) => {
    const id = uploaded.get(src);
    if (id) return `/api/media/${id}`;
    return fs.existsSync(path.join(process.cwd(), 'public', src)) ? src : null;
  };

  const weight = { xl: 4, l: 3, m: 2, s: 1 } as const;
  const picks: { src: string; w: number }[] = [];
  for (const c of chapters) {
    for (const it of c.items) {
      if (it.type === 'photo') {
        const src = resolve(it.src);
        if (src) picks.push({ src, w: weight[it.size ?? 'm'] });
      } else if (it.type === 'film') {
        for (const f of it.frames) {
          const src = resolve(f.src);
          if (src) picks.push({ src, w: 2 });
        }
      }
    }
  }
  for (const x of extras) if (x.kind === 'photo' && x.mediaIds[0]) picks.push({ src: `/api/media/${x.mediaIds[0]}`, w: 2 });

  // stable sort: equal weights keep story order
  return [...new Set(picks.sort((a, b) => b.w - a.w).map((p) => p.src))].slice(0, n);
}
