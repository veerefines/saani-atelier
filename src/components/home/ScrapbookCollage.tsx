'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Post } from '@/lib/data';
import type { PieceSpot } from '@/lib/extras';
import { api, mediaUrl } from '@/lib/upload-client';
import { PostBody } from './LoveWall';
import ReplyBox from './ReplyBox';

const PAPERS = ['#fff7d6', '#fde3ea', '#e6dcf7', '#d4efdf', '#ffe0c4', '#d3e9f6'];
const TAPES = ['#f7c9a8', '#cdb4f0', '#bfe0d6', '#f4a6c0'];
const PIECE_W = 27; // % of the page width

/** A stable little number from an id, so tilts and paper colours don't jump between visits. */
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Roughly how tall a piece is, as % of the page width, so columns stack without big gaps. */
function tall(p: Post): number {
  if (p.kind === 'photo') return 41;
  if (p.kind === 'video') return 30;
  if (p.kind === 'voice') return 20;
  return 11 + Math.min(20, Math.ceil((p.text?.length ?? 0) / 30) * 3.4);
}

/** A pleasant scattered layout: three loose columns, gently tilted, nudged so nothing lines up too neatly. */
function scatter(posts: Post[], seed = 0): Record<string, PieceSpot> {
  const out: Record<string, PieceSpot> = {};
  const cols = [5, 11, 7]; // the middle column starts a little lower
  posts.forEach((p) => {
    const h = (hash(p.id) + seed * 9973) >>> 0;
    const col = cols.indexOf(Math.min(...cols)); // the shortest column takes the next piece
    out[p.id] = {
      x: 4 + col * 32 + ((h % 7) - 3),
      y: cols[col] + ((h >>> 3) % 4),
      r: ((h >>> 5) % 13) - 6,
    };
    cols[col] += tall(p) * 0.9 + 3;
  });
  return out;
}

function Piece({ p }: { p: Post }) {
  const h = hash(p.id);
  const ids = p.mediaIds ?? (p.mediaId ? [p.mediaId] : []);
  if (p.kind === 'photo' && ids.length) {
    return (
      <div className={`sp-polaroid${ids.length > 1 ? ' stack' : ''}`}>
        <img src={mediaUrl(ids[0])} alt="" loading="lazy" draggable={false} />
        {ids.length > 1 && <span className="sp-count">{ids.length} photos</span>}
        <p className="hand">{p.text?.slice(0, 60) || '♡'}</p>
        <small>from {p.authorName}</small>
      </div>
    );
  }
  if (p.kind === 'video') {
    return (
      <div className="sp-film">
        <video src={mediaUrl(p.mediaId)} preload="metadata" muted playsInline />
        <span className="sp-play" aria-hidden="true">
          ▶
        </span>
        <p className="hand">{p.text?.slice(0, 50) || 'a little film'}</p>
        <small>from {p.authorName}</small>
      </div>
    );
  }
  if (p.kind === 'voice') {
    return (
      <div className="sp-cassette">
        <span className="sp-reels" aria-hidden="true">
          <i />
          <i />
        </span>
        <p className="hand">{p.text?.slice(0, 40) || 'a voice note'}</p>
        <small>🎙️ from {p.authorName}</small>
      </div>
    );
  }
  return (
    <div className="sp-note" style={{ background: PAPERS[h % PAPERS.length] }}>
      <p className="hand">{p.text}</p>
      <small>from {p.authorName}</small>
    </div>
  );
}

/**
 * Her scrapbook page: everyone's pieces as a collage she can rearrange (drag on iPad and desktop,
 * shuffle anywhere), and a "flip through" view that opens each piece big, one at a time.
 */
export default function ScrapbookCollage({ pageId, posts: initial, layout: saved }: { pageId: string; posts: Post[]; layout: Record<string, PieceSpot> }) {
  const [posts, setPosts] = useState(initial);
  const [spots, setSpots] = useState<Record<string, PieceSpot>>(() => ({ ...scatter(initial), ...saved }));
  const [order, setOrder] = useState(() => initial.map((p) => p.id));
  const [version, setVersion] = useState(0);
  const [wide, setWide] = useState(false);
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [dir, setDir] = useState(1);
  const canvas = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number>(0);

  // a little celebration the first time she opens the page this visit
  useEffect(() => {
    const key = `sa_sb_${pageId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !initial.length) return;
    const colors = ['#f4a6c0', '#ffd0dc', '#f7e3a1', '#cdb4f0', '#bfe0d6'];
    const t = setTimeout(() => confetti({ particleCount: 80, spread: 90, origin: { y: 0.35 }, colors, ticks: 220, scalar: 0.9 }), 500);
    return () => clearTimeout(t);
  }, [pageId, initial.length]);

  // the free collage needs room; phones get a flowing, overlapping layout instead
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const mq = window.matchMedia('(min-width: 700px)');
    const update = () => {
      setWide(mq.matches);
      setWidth(el.clientWidth);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    mq.addEventListener('change', update);
    return () => {
      ro.disconnect();
      mq.removeEventListener('change', update);
    };
  }, []);

  const persist = useCallback(
    (next: Record<string, PieceSpot>) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        api(`/api/pages/${pageId}/layout`, 'PATCH', { layout: next }).catch(() => {});
      }, 700);
    },
    [pageId],
  );

  function dropped(id: string, el: HTMLElement) {
    const c = canvas.current;
    if (!c) return;
    const cb = c.getBoundingClientRect();
    const eb = el.getBoundingClientRect();
    const W = cb.width;
    const cur = spots[id];
    // the element is rotated, so measure its centre and convert back to the top-left of an unrotated piece
    const cx = eb.left + eb.width / 2 - cb.left;
    const cy = eb.top + eb.height / 2 - cb.top;
    const w = (PIECE_W / 100) * W;
    const hgt = el.offsetHeight;
    const next = { ...spots, [id]: { ...cur, x: Math.min(85, Math.max(0, ((cx - w / 2) / W) * 100)), y: Math.max(0, ((cy - hgt / 2) / W) * 100) } };
    setSpots(next);
    setVersion((v) => v + 1);
    persist(next);
  }

  function shuffle() {
    const next = scatter(
      [...posts].sort(() => Math.random() - 0.5),
      Math.floor(Math.random() * 1000),
    );
    setSpots(next);
    setVersion((v) => v + 1);
    persist(next);
  }

  const people = useMemo(() => [...new Set(posts.map((p) => p.authorName.split(' ')[0]))], [posts]);
  const canvasH = useMemo(() => {
    const bottom = Math.max(30, ...posts.map((p) => (spots[p.id]?.y ?? 0) + tall(p)));
    return ((bottom + 6) / 100) * width;
  }, [posts, spots, width]);

  const go = (d: number) => {
    if (open === null) return;
    setDir(d);
    setOpen((open + d + posts.length) % posts.length);
  };
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!posts.length) {
    return (
      <div className="h-empty">
        <p className="hand">Your people are making this page for you</p>
        <p className="whisper">Pieces will appear here as they’re added.</p>
      </div>
    );
  }

  const current = open !== null ? posts[open] : null;

  return (
    <>
      <div className="sb-tools">
        <p className="sb-by">
          made by {people.length > 1 ? `${people.slice(0, -1).join(', ')} and ${people[people.length - 1]}` : people[0]} · {posts.length} {posts.length === 1 ? 'piece' : 'pieces'}
        </p>
        <div className="sb-actions">
          <button className="cta h-small-btn" onClick={() => (setDir(1), setOpen(0))}>
            📖 Flip through
          </button>
          <button className="pc-btn" onClick={shuffle}>
            🔀 Shuffle
          </button>
        </div>
        {wide && <p className="sb-hint">Drag pieces to arrange your page · tap one to open it</p>}
      </div>

      <div ref={canvas} className={`sb-canvas${wide ? ' free' : ''}`} style={wide && width ? { height: canvasH } : undefined}>
        {order
          .map((id) => posts.find((p) => p.id === id))
          .filter(Boolean)
          .map((p, z) => {
            const post = p as Post;
            const s = spots[post.id] ?? { x: 4, y: 4, r: 0 };
            const h = hash(post.id);
            return (
              <motion.div
                key={`${post.id}-${version}`}
                className="sb-piece"
                style={
                  wide
                    ? { left: `${s.x}%`, top: (s.y / 100) * width, width: `${PIECE_W}%`, rotate: s.r, zIndex: z + 1 }
                    : { rotate: s.r / 2, zIndex: z + 1 }
                }
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 18, delay: version ? 0 : Math.min(0.6, (z % 12) * 0.04) }}
                drag={wide}
                dragMomentum={false}
                dragConstraints={canvas}
                dragElastic={0.05}
                whileDrag={{ scale: 1.05, zIndex: 999, boxShadow: '0 30px 40px -20px rgba(70,25,45,0.6)' }}
                onDragStart={() => setOrder((o) => [...o.filter((x) => x !== post.id), post.id])}
                onDragEnd={(e) => dropped(post.id, (e.target as HTMLElement).closest('.sb-piece') as HTMLElement)}
                onTap={() => (setDir(1), setOpen(posts.indexOf(post)))}
                role="button"
                tabIndex={0}
                aria-label={`Open ${post.kind === 'text' ? 'note' : post.kind} from ${post.authorName}`}
                onKeyDown={(e) => e.key === 'Enter' && setOpen(posts.indexOf(post))}
              >
                <span className="sb-tape" style={{ background: TAPES[h % TAPES.length], rotate: `${((h >>> 2) % 20) - 10}deg` }} aria-hidden="true" />
                <Piece p={post} />
              </motion.div>
            );
          })}
      </div>

      <AnimatePresence>
        {current && (
          <motion.div className="sb-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)} role="dialog" aria-label="Scrapbook piece">
            <div className="sb-lb-inner" onClick={(e) => e.stopPropagation()}>
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={current.id}
                  className="sb-lb-card"
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 80, rotate: dir * 4 }}
                  animate={{ opacity: 1, x: 0, rotate: 0 }}
                  exit={{ opacity: 0, x: dir * -80, rotate: dir * -4 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                  drag={posts.length > 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -70) go(1);
                    else if (info.offset.x > 70) go(-1);
                  }}
                >
                  <PostBody p={current} />
                  <ReplyBox post={current} onReplied={(np) => setPosts((ps) => ps.map((x) => (x.id === np.id ? np : x)))} />
                </motion.div>
              </AnimatePresence>
              <div className="sb-lb-nav">
                <button onClick={() => go(-1)} disabled={posts.length < 2} aria-label="Previous piece">
                  ‹
                </button>
                <span>
                  {(open ?? 0) + 1} / {posts.length}
                </span>
                <button onClick={() => go(1)} disabled={posts.length < 2} aria-label="Next piece">
                  ›
                </button>
              </div>
              <button className="sb-lb-close" onClick={() => setOpen(null)} aria-label="Close">
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
