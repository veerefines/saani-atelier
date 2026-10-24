import fs from 'node:fs';
import path from 'node:path';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { listDiary, listSlotMedia } from '@/lib/extras';
import { chapters, journeyIntro, journeyMusic, type Item } from '@/content/journey';
import type { ResolvedChapter, ResolvedItem } from '@/components/journey/types';
import Journey from '@/components/journey/Journey';
import Keepsakes from '@/components/Keepsakes';

export const dynamic = 'force-dynamic';

const PLACEHOLDER_VIDEO = '/journey/video/placeholder.mp4';
const PLACEHOLDER_POSTER = '/journey/video/placeholder-poster.jpg';

function exists(src?: string) {
  if (!src) return false;
  return fs.existsSync(path.join(process.cwd(), 'public', src));
}

/** Files uploaded from /admin win over the files in public/journey, which win over placeholders. */
function resolver(uploaded: Map<string, string>) {
  const pick = (src: string) => {
    const id = uploaded.get(src);
    if (id) return { src: `/api/media/${id}`, missing: false };
    return { src, missing: !exists(src) };
  };
  return (item: Item): ResolvedItem => {
    switch (item.type) {
      case 'photo':
      case 'voice':
        return { ...item, ...pick(item.src) };
      case 'video': {
        const v = pick(item.src);
        if (!v.missing) return { ...item, src: v.src, poster: exists(item.poster) ? item.poster : undefined, missing: false };
        return { ...item, src: PLACEHOLDER_VIDEO, poster: PLACEHOLDER_POSTER, missing: true };
      }
      case 'film':
        return { ...item, frames: item.frames.map((f) => ({ ...f, ...pick(f.src) })) } as ResolvedItem;
      default:
        return item;
    }
  };
}

const fmtDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

export default async function JourneyPage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'saanika' && !session.admin) redirect('/wall');

  const [slots, diary] = await Promise.all([listSlotMedia(), session.role === 'saanika' ? listDiary() : Promise.resolve([])]);
  const resolve = resolver(new Map(slots.map((x) => [x.slot, x.mediaId])));
  const resolved: ResolvedChapter[] = chapters.map((c) => ({ ...c, items: c.items.map(resolve) }));

  // Chapter six: her own days in Milano, from "My chapter"
  if (diary.length) {
    const milan = chapters[chapters.length - 1];
    const sides = ['left', 'right', 'center'] as const;
    const items: ResolvedItem[] = diary.slice(-24).flatMap((d, i) => {
      const side = sides[i % 3];
      const caption = `${fmtDay(d.day)} ${d.mood}`;
      if (d.mediaId) {
        return [{ type: 'photo', src: `/api/media/${d.mediaId}`, caption: d.text ? `${caption} · ${d.text.slice(0, 60)}` : caption, size: 'm', side, tilt: i % 2 ? 3 : -3, tape: i % 3 === 0, missing: false } as ResolvedItem];
      }
      return [{ type: 'note', text: d.text, from: caption, paper: 'lined', side, tilt: i % 2 ? -2 : 2 } as ResolvedItem];
    });
    resolved.push({
      ...milan,
      id: 'mine',
      number: 'Chapter six',
      kicker: 'written by you',
      title: 'Milano, in your words',
      years: undefined,
      intro: 'Your own days, one line and one photo at a time. This chapter keeps writing itself.',
      items,
    } as ResolvedChapter);
  }

  const music = slots.find((x) => x.slot === journeyMusic.src);
  return (
    <Journey
      intro={journeyIntro}
      chapters={resolved}
      music={music ? { ...journeyMusic, src: `/api/media/${music.mediaId}`, missing: false } : { ...journeyMusic, missing: !exists(journeyMusic.src) }}
      decor={<Keepsakes set="journey" />}
    />
  );
}
