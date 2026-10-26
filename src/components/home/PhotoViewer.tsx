'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ViewerPhoto = { src: string; caption?: string; from?: string };

/**
 * Full-screen photo viewer: the whole photo, never cropped. Swipe (or arrows / arrow keys)
 * to move between photos; tap the backdrop, ×, or Escape to close.
 */
export default function PhotoViewer({ photos, start, onClose }: { photos: ViewerPhoto[]; start: number; onClose: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(start);

  // open on the tapped photo, without animating there
  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * el.clientWidth;
  }, [start]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', key);
    };
  });

  function go(d: number) {
    const el = track.current;
    if (el) el.scrollTo({ left: Math.max(0, Math.min(photos.length - 1, at + d)) * el.clientWidth, behavior: 'smooth' });
  }

  const cur = photos[at];
  return createPortal(
    <div className="pv" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      <div
        ref={track}
        className="pv-track"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAt(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {photos.map((p, i) => (
          <figure key={`${p.src}-${i}`} className="pv-slide">
            <img src={p.src} alt={p.caption || `Photo ${i + 1} of ${photos.length}`} onClick={(e) => e.stopPropagation()} draggable={false} />
          </figure>
        ))}
      </div>

      <div className="pv-bar" onClick={(e) => e.stopPropagation()}>
        {photos.length > 1 && (
          <span className="pv-count">
            {at + 1} / {photos.length}
          </span>
        )}
        <button type="button" className="pv-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" className="pv-nav prev" onClick={(e) => (e.stopPropagation(), go(-1))} disabled={at === 0} aria-label="Previous photo">
            ‹
          </button>
          <button type="button" className="pv-nav next" onClick={(e) => (e.stopPropagation(), go(1))} disabled={at === photos.length - 1} aria-label="Next photo">
            ›
          </button>
        </>
      )}
      {(cur?.caption || cur?.from) && (
        <p className="pv-caption hand" onClick={(e) => e.stopPropagation()}>
          {cur.caption}
          {cur.from && <span className="love-from">from {cur.from}</span>}
        </p>
      )}
    </div>,
    document.body,
  );
}
