'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

const PETALS = ['petal-1', 'petal-2', 'petal-3', 'petal-7', 'petal-8', 'petal-9'];

/** Petals that drift off the bouquet as it opens. Mounts client-side only. */
export default function Petals({ count = 18 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const side = Math.random() < 0.5 ? -1 : 1;
        return {
          id: i,
          src: `/reveal/${PETALS[i % PETALS.length]}.webp`,
          size: 18 + Math.random() * 14,
          delay: 0.5 + Math.random() * 1.4,
          duration: 3.2 + Math.random() * 1.6,
          x1: side * (30 + Math.random() * 90),
          x2: side * (60 + Math.random() * 140) * (Math.random() < 0.3 ? -1 : 1),
          up: -(50 + Math.random() * 90),
          down: 240 + Math.random() * 160,
          r1: Math.random() * 120 - 60,
          r2: Math.random() * 360 - 180,
        };
      }),
    [count],
  );

  return (
    <>
      {petals.map((p) => (
        <motion.img
          key={p.id}
          src={p.src}
          alt=""
          className="petal"
          style={{ width: p.size }}
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: [0, p.x1, p.x2],
            y: [0, p.up, p.down],
            rotate: [0, p.r1, p.r2],
          }}
          transition={{ duration: p.duration, delay: p.delay, times: [0, 0.3, 1], ease: 'easeOut' }}
        />
      ))}
    </>
  );
}
