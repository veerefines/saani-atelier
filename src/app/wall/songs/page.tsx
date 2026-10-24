import PageHead from '@/components/home/Back';
import SongsForm from '@/components/wall/SongsForm';
import { getSession } from '@/lib/auth';
import { listSongs } from '@/lib/extras';

export default async function WallSongs() {
  const s = (await getSession())!;
  const songs = (await listSongs()).filter((x) => x.authorId === s.id);
  return (
    <main className="h-page w-page">
      <PageHead back="/wall" kicker="her playlist" title="Dedicate a song" sub="Every song lands in her playlist, with your note." />
      <SongsForm songs={songs} />
    </main>
  );
}
