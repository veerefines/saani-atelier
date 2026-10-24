'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

/** A festival or special day: a banner on her desk, a little confetti, and the letters for today. */
export default function OccasionBanner({ occasion: o }: { occasion: { title: string; emoji: string; note?: string; letters: number } }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#f4a6c0', '#ffd0dc', '#f7e3a1', '#cdb4f0', '#e48aae'];
    const t = setTimeout(() => {
      confetti({ particleCount: 70, spread: 80, origin: { x: 0.25, y: 0.3 }, colors, ticks: 220 });
      confetti({ particleCount: 70, spread: 80, origin: { x: 0.75, y: 0.3 }, colors, ticks: 220 });
    }, 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="occasion" aria-label={o.title}>
      <span className="occasion-emoji" aria-hidden="true">
        {o.emoji}
      </span>
      <div>
        <h2 className="whisper">Happy {o.title}!</h2>
        {o.note && <p>{o.note}</p>}
        {o.letters > 0 && (
          <Link href="/home/letters" className="occasion-link">
            {o.letters === 1 ? 'A letter opened for today ✉️' : `${o.letters} letters opened for today ✉️`}
          </Link>
        )}
      </div>
    </section>
  );
}
