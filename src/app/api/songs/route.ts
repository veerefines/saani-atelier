import { after } from 'next/server';
import { addSong } from '@/lib/extras';
import { notifySaanika } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** A friend dedicates a song: a Spotify, YouTube or Apple Music link, and a note. */
export async function POST(req: Request) {
  const s = await requireSession('wellwisher');
  if (isResponse(s)) return s;
  const { url, note } = await req.json().catch(() => ({}));
  if (!String(url ?? '').trim()) return fail('Paste a link to the song.');
  const song = await addSong(s, String(url), String(note ?? ''));
  if (!song) return fail('Paste a Spotify, YouTube or Apple Music link.');
  after(() => notifySaanika({ title: '🎶 A song for you', body: `${s.name.split(' ')[0]} dedicated a song to you`, url: '/home/songs' }));
  return json(song, 201);
}
