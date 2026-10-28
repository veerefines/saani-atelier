'use client';

import { sfx } from '@/lib/sound';
import { useState } from 'react';
import type { Song } from '@/lib/extras';
import { api } from '@/lib/upload-client';
import SongCard from '@/components/home/SongCard';
import { deleteMine } from './Composer';

/** A friend dedicates a song, and sees the ones they've sent. */
export default function SongsForm({ songs: initial }: { songs: Song[] }) {
  const [songs, setSongs] = useState(initial);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const s = await api<Song>('/api/songs', 'POST', { url, note });
      setSongs((x) => [s, ...x]);
      sfx('sparkle');
      setUrl('');
      setNote('');
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
    setBusy(false);
  }
  async function remove(id: string) {
    try {
      if (await deleteMine('songs', id)) setSongs((x) => x.filter((s) => s.id !== id));
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
  }

  return (
    <>
      <form className="w-card" onSubmit={add}>
        <img className="h-tape" src="/reveal/washi.webp" alt="" />
        <p className="whisper w-hint">Pick a song for her: the one that reminds you of her, or one for a hard day. Paste a Spotify, YouTube or Apple Music link.</p>
        <label className="w-label" htmlFor="song">
          Link to the song
        </label>
        <input id="song" className="h-input" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://open.spotify.com/track/…" />
        <label className="w-label" htmlFor="why">
          Why this one? (optional)
        </label>
        <input id="why" className="h-input" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Our road-trip song, obviously" />
        {err && <p className="h-err">{err}</p>}
        <div className="w-send">
          <button className="cta" disabled={busy || !url.trim()}>
            {busy ? 'Adding…' : 'Dedicate it to her'}
          </button>
        </div>
      </form>
      <section className="w-mine">
        <h2 className="hand">{songs.length ? `Songs you’ve picked (${songs.length})` : 'No songs yet'}</h2>
        <div className="songs">
          {songs.map((s) => (
            <SongCard key={s.id} song={s}>
              <div className="w-mine-meta">
                <span />
                <button onClick={() => remove(s.id)}>Delete</button>
              </div>
            </SongCard>
          ))}
        </div>
      </section>
    </>
  );
}
