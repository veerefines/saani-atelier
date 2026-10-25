'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export type CornerCounts = { look: number; stamps: number; places: number; days: number; songs: number; checklistDone: number; checklistTotal: number; pages: number; moments: number };

/** The smaller corners of her desk, under the big six. */
export default function Corners({ counts: c }: { counts: CornerCounts }) {
  const corners = [
    { href: '/home/corner', icon: '🪡', title: 'My Corner', sub: 'your projects & ideas', tint: '#f3e3d3' },
    { href: '/home/moments', icon: '📸', title: 'Moments', sub: c.moments ? `${c.moments} shared` : 'send your people a peek', tint: '#fde3ea' },
    { href: '/home/lookbook', icon: '👗', title: 'Lookbook', sub: c.look ? `${c.look} looks & pins` : 'outfits, sketches, Pinterest', tint: '#fbd6e2' },
    { href: '/home/passport', icon: '🛂', title: 'Passport', sub: `${c.stamps} of ${c.places} stamps`, tint: '#d3e9f6' },
    { href: '/home/chapter', icon: '📔', title: 'My chapter', sub: c.days ? `${c.days} ${c.days === 1 ? 'day' : 'days'} written` : 'a line a day', tint: '#f8ebbf' },
    { href: '/home/songs', icon: '🎶', title: 'Songs for you', sub: c.songs ? `${c.songs} dedicated` : 'from your people', tint: '#e6dcf7' },
    { href: '/home/checklist', icon: '✅', title: 'Settling in', sub: `${c.checklistDone} of ${c.checklistTotal} done`, tint: '#d4efdf' },
    { href: '/home/scrapbooks', icon: '📒', title: 'Scrapbooks', sub: c.pages ? `${c.pages} ${c.pages === 1 ? 'page' : 'pages'}` : 'made by your people', tint: '#ffe0c4' },
    { href: '/home/book', icon: '📖', title: 'Your book', sub: 'print it all', tint: '#fde2c8' },
  ];
  return (
    <section className="corners" aria-label="More corners">
      <h2 className="hand corners-title">more corners</h2>
      <div className="corners-grid">
        {corners.map((k, i) => (
          <motion.div key={k.href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.5 + i * 0.05 } }}>
            <Link href={k.href} className="corner" style={{ ['--tint' as string]: k.tint }}>
              <span className="corner-icon" aria-hidden="true">
                {k.icon}
              </span>
              <b>{k.title}</b>
              <small>{k.sub}</small>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
