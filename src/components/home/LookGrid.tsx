'use client';

import { useEffect } from 'react';
import type { LookItem } from '@/lib/extras';
import { mediaUrl } from '@/lib/upload-client';

declare global {
  interface Window {
    PinUtils?: { build: () => void };
  }
}

/** Load Pinterest's embed script once, then ask it to draw any new pins and boards. */
export function usePinterest(deps: unknown[]) {
  useEffect(() => {
    const draw = () => window.PinUtils?.build();
    if (!document.getElementById('pinterest-js')) {
      const s = document.createElement('script');
      s.id = 'pinterest-js';
      s.async = true;
      s.src = 'https://assets.pinterest.com/js/pinit.js';
      s.onload = draw;
      document.body.appendChild(s);
    } else {
      // after React has put the new anchors in place
      const t = setTimeout(draw, 50);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Pinterest's widget replaces the anchor with its own markup, so React only hands it raw HTML. */
export function PinterestEmbed({ url: raw, board }: { url: string; board: boolean }) {
  const url = raw.replace(/"/g, '');
  const html = board
    ? `<a data-pin-do="embedBoard" data-pin-board-width="900" data-pin-scale-height="320" data-pin-scale-width="90" href="${url}"></a>`
    : `<a data-pin-do="embedPin" data-pin-width="medium" data-pin-lang="en" href="${url}"></a>`;
  return (
    <div className="lk-pin">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <a className="lk-pin-open" href={url} target="_blank" rel="noreferrer">
        Open on Pinterest ↗
      </a>
    </div>
  );
}

const PinEmbed = ({ item }: { item: LookItem }) => <PinterestEmbed url={item.pinUrl ?? ''} board={item.kind === 'board'} />;

export default function LookGrid({ items, renderActions }: { items: LookItem[]; renderActions?: (x: LookItem) => React.ReactNode }) {
  usePinterest([items.map((i) => i.id).join(',')]);
  return (
    <div className="lk-grid">
      {items.map((x) => (
        <article key={x.id} className={`lk-card lk-${x.kind}`}>
          {x.kind === 'photo' && x.mediaId ? <img src={mediaUrl(x.mediaId)} alt={x.caption || 'A look'} loading="lazy" /> : <PinEmbed item={x} />}
          {(x.caption || x.tags.length > 0) && (
            <div className="lk-meta">
              {x.caption && <p className="hand">{x.caption}</p>}
              {x.tags.length > 0 && <p className="lk-tags">{x.tags.map((t) => `#${t}`).join(' ')}</p>}
            </div>
          )}
          {x.reactions.length > 0 && (
            <p className="lk-reacts" title={x.reactions.map((r) => `${r.name} ${r.emoji}`).join(', ')}>
              {x.reactions.map((r) => r.emoji).join(' ')} <small>from {[...new Set(x.reactions.map((r) => r.name.split(' ')[0]))].join(', ')}</small>
            </p>
          )}
          {renderActions?.(x)}
        </article>
      ))}
    </div>
  );
}
