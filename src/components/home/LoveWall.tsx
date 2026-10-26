'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Post } from '@/lib/data';
import { reactions } from '@/content/home';
import { api, mediaUrl } from '@/lib/upload-client';
import { Voice } from '@/components/journey/items';
import ReplyBox from './ReplyBox';
import PhotoViewer, { type ViewerPhoto } from './PhotoViewer';

const TILTS = [-2.5, 1.8, -1, 2.6, -1.8, 1];

export function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const photoIds = (p: Post) => (p.kind === 'photo' ? (p.mediaIds?.length ? p.mediaIds : p.mediaId ? [p.mediaId] : []) : []);
const viewerPhotos = (posts: Post[]): (ViewerPhoto & { id: string })[] =>
  posts.flatMap((p) => photoIds(p).map((id) => ({ id, src: mediaUrl(id), caption: p.text || undefined, from: p.authorName })));

/** Tap or Enter on a photo opens the viewer. */
const tappable = (open: () => void) => ({
  role: 'button',
  tabIndex: 0,
  onClick: open,
  onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && open(),
});

/** Several photos in one polaroid: swipe through, with a little counter. */
function Album({ p, ids, view }: { p: Post; ids: string[]; view: (id: string) => void }) {
  const [at, setAt] = useState(0);
  return (
    <div className="j-polaroid love-polaroid">
      <div
        className="j-photo-img love-album"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAt(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {ids.map((id, i) => (
          <img key={id} src={mediaUrl(id)} alt={`${p.text || `Photo from ${p.authorName}`} (${i + 1} of ${ids.length}), tap to view`} loading="lazy" {...tappable(() => view(id))} />
        ))}
      </div>
      <span className="love-album-count" aria-hidden="true">
        {at + 1}/{ids.length}
      </span>
      <figcaption className="hand">
        {p.text || '♡'}
        <span className="love-from">from {p.authorName}</span>
      </figcaption>
    </div>
  );
}

/**
 * One thing from her wall. Photos open in the full-screen viewer: through `onView` (the wall's own
 * viewer, which swipes across every photo on it) or, without it, a viewer of just this post's photos.
 */
export function PostBody({ p, onView }: { p: Post; onView?: (id: string) => void }) {
  const [viewing, setViewing] = useState<number | null>(null);
  const own = viewerPhotos([p]);
  const view = onView ?? ((id: string) => setViewing(Math.max(0, own.findIndex((x) => x.id === id))));
  const viewer = viewing !== null && <PhotoViewer photos={own} start={viewing} onClose={() => setViewing(null)} />;

  if (p.kind === 'photo' && p.mediaIds && p.mediaIds.length > 1)
    return (
      <>
        <Album p={p} ids={p.mediaIds} view={view} />
        {viewer}
      </>
    );
  if (p.kind === 'photo')
    return (
      <div className="j-polaroid love-polaroid">
        <div className="j-photo-img">
          <img src={mediaUrl(p.mediaId)} alt={`${p.text || `Photo from ${p.authorName}`}, tap to view`} loading="lazy" {...tappable(() => p.mediaId && view(p.mediaId))} />
        </div>
        <figcaption className="hand">
          {p.text || '♡'}
          <span className="love-from">from {p.authorName}</span>
        </figcaption>
        {viewer}
      </div>
    );
  if (p.kind === 'voice')
    return (
      <>
        <Voice item={{ type: 'voice', src: mediaUrl(p.mediaId), title: p.text || 'A voice note', from: p.authorName, side: 'center' }} />
      </>
    );
  if (p.kind === 'video')
    return (
      <div className="love-videoframe">
        <video src={mediaUrl(p.mediaId)} controls playsInline preload="metadata" />
        <p className="hand" style={{ margin: '6px 2px 4px', fontSize: 20 }}>
          {p.text || 'a little film'}
          <span className="love-from">from {p.authorName}</span>
        </p>
      </div>
    );
  return (
    <div className={`love-note look-${p.look % 6}`}>
      {p.text}
      <span className="love-from">from {p.authorName}</span>
    </div>
  );
}

export default function LoveWall({ posts: initial, seenBefore, trackSeen = true }: { posts: Post[]; seenBefore: string | null; trackSeen?: boolean }) {
  const [posts, setPosts] = useState(initial);
  const [who, setWho] = useState<string>('all');

  useEffect(() => {
    if (trackSeen) api('/api/seen', 'POST', { area: 'love' }).catch(() => {});
  }, [trackSeen]);

  const people = useMemo(() => Array.from(new Set(initial.map((p) => p.authorName))), [initial]);
  const shown = who === 'all' ? posts : posts.filter((p) => p.authorName === who);
  // the viewer swipes across every photo on the wall (as filtered), starting at the tapped one
  const photos = useMemo(() => viewerPhotos(shown), [shown]);
  const [viewing, setViewing] = useState<number | null>(null);

  async function react(id: string, emoji: string) {
    setPosts((ps) =>
      ps.map((p) =>
        p.id === id ? { ...p, reactions: p.reactions.includes(emoji) ? p.reactions.filter((e) => e !== emoji) : [...p.reactions, emoji] } : p,
      ),
    );
    try {
      await api(`/api/posts/${id}/react`, 'POST', { emoji });
    } catch {
      setPosts(initial);
    }
  }

  if (!posts.length)
    return (
      <div className="h-empty">
        <p className="hand">Nothing pinned up yet</p>
        <p className="whisper">Your people are writing. Check back soon.</p>
      </div>
    );

  return (
    <>
      {people.length > 1 && (
        <div className="h-chips" role="group" aria-label="Show messages from">
          <button className="h-chip" aria-pressed={who === 'all'} onClick={() => setWho('all')}>
            Everyone
          </button>
          {people.map((n) => (
            <button key={n} className="h-chip" aria-pressed={who === n} onClick={() => setWho(n)}>
              {n}
            </button>
          ))}
        </div>
      )}
      <div className="love-wall">
        {shown.map((p, i) => (
          <motion.article
            key={p.id}
            className="love-card"
            style={{ ['--tilt' as string]: `${TILTS[p.look % TILTS.length]}deg` }}
            initial={{ opacity: 0, y: 40, rotate: TILTS[p.look % TILTS.length] * 3 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 110, damping: 15, delay: (i % 4) * 0.05 }}
          >
            {trackSeen && (!seenBefore || (p.showAt ?? p.createdAt) > seenBefore) && <span className="love-badge-new">new</span>}
            <PostBody p={p} onView={(id) => setViewing(Math.max(0, photos.findIndex((x) => x.id === id)))} />
            <div className="love-react" role="group" aria-label="React">
              {reactions.map((e) => (
                <button key={e} aria-pressed={p.reactions.includes(e)} onClick={() => react(p.id, e)} aria-label={`React ${e}`}>
                  {e}
                </button>
              ))}
              <span className="love-time" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                {when(p.showAt ?? p.createdAt)}
              </span>
            </div>
            <ReplyBox post={p} onReplied={(np) => setPosts((ps) => ps.map((x) => (x.id === np.id ? np : x)))} />
          </motion.article>
        ))}
      </div>
      {viewing !== null && <PhotoViewer photos={photos} start={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
