import fs from 'node:fs';
import path from 'node:path';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
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

function resolve(item: Item): ResolvedItem {
  switch (item.type) {
    case 'photo':
      return { ...item, missing: !exists(item.src) };
    case 'voice':
      return { ...item, missing: !exists(item.src) };
    case 'video': {
      const ok = exists(item.src);
      return {
        ...item,
        src: ok ? item.src : PLACEHOLDER_VIDEO,
        poster: ok && exists(item.poster) ? item.poster : PLACEHOLDER_POSTER,
        missing: !ok,
      };
    }
    case 'film':
      return {
        ...item,
        frames: item.frames.map((f) => ({ ...f, missing: !exists(f.src) })),
      } as ResolvedItem;
    default:
      return item;
  }
}

export default async function JourneyPage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'saanika') redirect('/wall');

  const resolved: ResolvedChapter[] = chapters.map((c) => ({ ...c, items: c.items.map(resolve) }));
  return <Journey intro={journeyIntro} chapters={resolved} music={{ ...journeyMusic, missing: !exists(journeyMusic.src) }} decor={<Keepsakes set="journey" />} />;
}
