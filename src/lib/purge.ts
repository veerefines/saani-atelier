import * as db from './db';
import { deleteMedia, type Media } from './data';

type Authored = { id: string; createdAt: string; authorId?: string; mediaId?: string; mediaIds?: string[]; replies?: { mediaId?: string }[] };

/**
 * Everything a friend left, gone: posts and photo albums (with the files), scrapbook pieces, letters,
 * jar notes, bingo dares, Milano tips, songs, nudges, their reactions on her lookbook and moments, their
 * notification subscriptions and time zone. Returns how many things were removed.
 */
export async function purgeFriend(id: string): Promise<number> {
  let n = 0;
  const files = new Set<string>();

  for (const col of ['posts', 'letters', 'jar', 'dares', 'songs', 'nudges']) {
    const docs = await db.list<Authored>(col).catch(() => [] as Authored[]);
    for (const d of docs.filter((x) => x.authorId === id)) {
      if (d.mediaId) files.add(d.mediaId);
      d.mediaIds?.forEach((m) => files.add(m));
      d.replies?.forEach((r) => r.mediaId && files.add(r.mediaId)); // her voice thank-yous on their posts
      await db.remove(col, d.id);
      n++;
    }
  }

  // Milano tips they suggested
  const wishes = await db.list<{ id: string; createdAt: string; fromId?: string }>('wishes').catch(() => []);
  for (const w of wishes.filter((x) => x.fromId === id)) {
    await db.remove('wishes', w.id);
    n++;
  }

  // their reactions on things she shared from her lookbook
  const looks = await db.list<{ id: string; createdAt: string; reactions?: { by: string }[] }>('lookbook').catch(() => []);
  for (const l of looks.filter((x) => x.reactions?.some((r) => r.by === id))) {
    await db.put('lookbook', { ...l, reactions: l.reactions!.filter((r) => r.by !== id) });
    n++;
  }

  // their reactions on moments she sent
  const moments = await db.list<{ id: string; createdAt: string; reactions?: { by: string }[] }>('moments').catch(() => []);
  for (const m of moments.filter((x) => x.reactions?.some((r) => r.by === id))) {
    await db.put('moments', { ...m, reactions: m.reactions!.filter((r) => r.by !== id) });
    n++;
  }

  // every file they uploaded, used or not
  const media = await db.list<Media>('media').catch(() => [] as Media[]);
  media.filter((m) => m.ownerId === id).forEach((m) => files.add(m.id));
  for (const f of files) await deleteMedia(f).catch(() => {});

  const subs = await db.list<{ id: string; createdAt: string; ownerId?: string }>('push').catch(() => []);
  for (const s of subs.filter((x) => x.ownerId === id)) await db.remove('push', s.id);
  await db.remove('zones', id).catch(() => {});

  return n + files.size;
}
