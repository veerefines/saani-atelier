'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Song } from '@/lib/extras';

const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const SERVICE = {
  spotify: 'Spotify',
  youtube: 'YouTube',
  apple: 'Apple Music',
} as const;
const TINTS = ['#fbd6e2', '#e6dcf7', '#d4efdf', '#ffe0c4', '#d3e9f6', '#fff1c7'];

/** The service's own player. */
function Player({ s }: { s: Song }) {
  const tall =
    s.provider === 'spotify' ? (/\/(playlist|album)\//.test(s.embed) ? 352 : 152) : s.provider === 'apple' ? (/\/(album|playlist)\//.test(s.embed) && !/[?&]i=/.test(s.embed) ? 450 : 175) : 0;
  return (
    <div className={s.provider === 'youtube' ? 'song-frame song-video' : 'song-frame'} style={tall ? { height: tall } : undefined}>
      <iframe
        src={s.embed}
        title={`A song from ${s.authorName}`}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        // the site sends no referrer by default; YouTube's player needs to know where it's embedded
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

/** One dedication as a square record sleeve: cover, note and who it's from. Tap to play. */
export default function SongCard({ song: s, children }: { song: Song; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const tint = TINTS[[...s.id].reduce((h, c) => h + c.charCodeAt(0), 0) % TINTS.length];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <article className={`song song-${s.provider}`}>
      <button type="button" className="song-sleeve" style={{ ['--tint' as string]: tint }} onClick={() => setOpen(true)} aria-label={`Play ${s.title ?? 'the song'} from ${s.authorName}`}>
        {s.cover ? <img src={s.cover} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="song-disc" aria-hidden="true" />}
        <span className="song-play" aria-hidden="true">
          ▶
        </span>
        <span className="song-badge">{SERVICE[s.provider]}</span>
      </button>
      <div className="song-note">
        {s.title && <p className="song-title">{s.title}</p>}
        {s.note && <p className="hand">“{s.note}”</p>}
        <p className="song-from">
          from {s.authorName.split(' ')[0]} · {when(s.createdAt)}
        </p>
        {children}
      </div>

      {open &&
        createPortal(
          <div className="song-pop" role="dialog" aria-modal="true" aria-label={s.title ?? 'Song'} onClick={() => setOpen(false)}>
            <div className="song-pop-card" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="song-pop-close" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
              <Player s={s} />
              {s.note && <p className="hand">“{s.note}”</p>}
              <p className="song-from">from {s.authorName}</p>
            </div>
          </div>,
          // on the page itself: the animated page wrapper would otherwise trap a fixed overlay
          document.body,
        )}
    </article>
  );
}
