'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export type CornerCounts = { look: number; stamps: number; places: number; days: number; songs: number; checklistDone: number; checklistTotal: number; pages: number; moments: number; pearls: number; jellyLevel: number; moneyLeft: number | null; moneySpent: number };

/** The smaller corners of her desk, under the big six. */
export default function Corners({ counts: c }: { counts: CornerCounts }) {
  const art = (id: string) => `/corner/home/items/${id}.webp`;
  const corners: { href: string; art: string; title: string; sub: string; tint: string; p?: number }[] = [
    { href: '/home/corner', art: art('quill'), title: 'My Corner', sub: 'your projects & ideas', tint: '#f3e3d3' },
    { href: '/home/jelly', art: '/corner/jelly/joyful.webp', title: 'Jelly’s Corner', sub: `🫧 ${c.pearls} pearls · friends Lv ${c.jellyLevel}`, tint: '#ece3fb' },
    { href: '/home/money', art: art('treasure-chest'), title: 'Soldi', sub: c.moneyLeft !== null ? (c.moneyLeft >= 0 ? `€${Math.round(c.moneyLeft)} left this month` : `€${Math.round(-c.moneyLeft)} over this month`) : c.moneySpent ? `€${Math.round(c.moneySpent)} this month` : 'spends, budget & ₹ rate', tint: '#dff1e4' },
    { href: '/home/moments', art: art('instax'), title: 'Moments', sub: c.moments ? `${c.moments} shared` : 'send your people a peek', tint: '#fde3ea' },
    { href: '/home/lookbook', art: art('shopping-bag'), title: 'Lookbook', sub: c.look ? `${c.look} looks & pins` : 'outfits, sketches, Pinterest', tint: '#fbd6e2' },
    { href: '/home/passport', art: art('italian-flag'), title: 'Passport', sub: `${c.stamps} of ${c.places} stamps`, tint: '#d3e9f6', p: c.stamps / Math.max(1, c.places) },
    { href: '/home/chapter', art: art('jelly-book'), title: 'My chapter', sub: c.days ? `${c.days} ${c.days === 1 ? 'day' : 'days'} written` : 'a line a day', tint: '#f8ebbf' },
    { href: '/home/songs', art: art('jelly-globe'), title: 'Songs for you', sub: c.songs ? `${c.songs} dedicated` : 'from your people', tint: '#e6dcf7' },
    { href: '/home/checklist', art: art('lavender-pot'), title: 'Settling in', sub: `${c.checklistDone} of ${c.checklistTotal} done`, tint: '#d4efdf', p: c.checklistDone / Math.max(1, c.checklistTotal) },
    { href: '/home/scrapbooks', art: art('camera'), title: 'Scrapbooks', sub: c.pages ? `${c.pages} ${c.pages === 1 ? 'page' : 'pages'}` : 'made by your people', tint: '#ffe0c4' },
    { href: '/home/book', art: art('books'), title: 'Your book', sub: 'print it all', tint: '#fde2c8' },
  ];
  return (
    <section className="corners" aria-label="More corners">
      <h2 className="hand corners-title">more corners</h2>
      <div className="corners-grid">
        {corners.map((k, i) => (
          <motion.div key={k.href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.5 + i * 0.05 } }}>
            <Link href={k.href} className="corner" style={{ ['--tint' as string]: k.tint }}>
              <span className="corner-art" aria-hidden="true">
                <img src={k.art} alt="" loading="lazy" draggable={false} />
              </span>
              <span className="corner-text">
                <b>{k.title}</b>
                <small>{k.sub}</small>
                {k.p !== undefined && (
                  <i className="corner-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round(k.p * 100)}%` }} />
                  </i>
                )}
              </span>
              <span className="corner-go" aria-hidden="true">
                →
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
