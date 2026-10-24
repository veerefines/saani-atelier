import PageHead from '@/components/home/Back';
import SongCard from '@/components/home/SongCard';
import { listSongs } from '@/lib/extras';

export default async function SongsPage() {
  const songs = await listSongs();
  return (
    <main className="h-page">
      <PageHead kicker="a playlist from your people" title="Songs for you" sub="Every song here was picked for you, with a note about why." />
      <div className="songs">
        {songs.map((s) => (
          <SongCard key={s.id} song={s} />
        ))}
      </div>
      {!songs.length && <p className="h-empty whisper">Your people are picking songs for you. They’ll land here.</p>}
    </main>
  );
}
