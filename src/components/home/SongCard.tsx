import type { Song } from '@/lib/extras';

const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** One dedication: the player (Spotify, YouTube or Apple Music) and the note that came with it. */
export default function SongCard({ song: s, children }: { song: Song; children?: React.ReactNode }) {
  const tall = s.provider === 'spotify' ? (/\/(playlist|album)\//.test(s.embed) ? 352 : 152) : s.provider === 'apple' ? (/\/(album|playlist)\//.test(s.embed) && !/[?&]i=/.test(s.embed) ? 450 : 175) : 0;
  return (
    <article className={`song song-${s.provider}`}>
      <div className={s.provider === 'youtube' ? 'song-frame song-video' : 'song-frame'} style={tall ? { height: tall } : undefined}>
        <iframe
          src={s.embed}
          title={`A song from ${s.authorName}`}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          // the site sends no referrer by default; YouTube's player needs to know where it's embedded
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <div className="song-note">
        {s.note && <p className="hand">“{s.note}”</p>}
        <p className="song-from">
          from {s.authorName} · {when(s.createdAt)}
        </p>
        {children}
      </div>
    </article>
  );
}
