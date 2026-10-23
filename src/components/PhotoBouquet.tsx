'use client';

import { motion, type Variants } from 'framer-motion';

export type BouquetState = 'tied' | 'untying' | 'open';

/*
 * The bouquet is a stack of real photo cutouts positioned inside a 2:3 stage.
 * Positions are percentages of the stage, so it scales on any screen.
 * Swap any file in /public/reveal to change a layer; keep the transparent PNG/WebP format.
 */

const ease = [0.3, 0.7, 0.2, 1] as const;

const bouquet: Variants = {
  tied: { y: '2%', scale: 0.97, rotate: 0 },
  open: { y: '-2%', scale: 1.03, rotate: -1.5, transition: { duration: 1.4, ease, delay: 0.35 } },
};

const tissue: Variants = {
  tied: { x: '0%', y: '0%', rotate: 6, scale: 1, opacity: 1 },
  open: {
    x: '38%',
    y: '-75%',
    rotate: 34,
    scale: 1.15,
    opacity: 0,
    transition: { duration: 1.3, ease: [0.4, 0, 0.6, 1], opacity: { delay: 0.6, duration: 0.6 } },
  },
};

const bow: Variants = {
  tied: { y: '0%', rotate: -18, scale: 1, opacity: 1 },
  untying: {
    scale: [1, 1.12, 1.04],
    rotate: [-18, -26, -8],
    transition: { duration: 0.8, times: [0, 0.4, 1] },
  },
  open: {
    y: '260%',
    rotate: 40,
    scale: 0.9,
    opacity: 0,
    transition: { duration: 1.1, ease: 'easeIn', opacity: { delay: 0.7, duration: 0.4 } },
  },
};

const bloom: Variants = {
  tied: { scale: 0.35, opacity: 0, rotate: -20 },
  open: (i: number) => ({
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 80, damping: 11, delay: 0.75 + i * 0.16 },
  }),
};

type Layer = { src: string; left: number; top: number; width: number; rotate?: number; z: number; i: number };

// carnations tucked behind the kraft paper, peeking over the top
const BACK: Layer[] = [
  { src: 'carn-white-1.webp', left: 52, top: 13, width: 34, rotate: 14, z: 1, i: 1 },
  { src: 'carn-pink-2.webp', left: 9, top: 17, width: 27, rotate: -16, z: 1, i: 0 },
];
// carnations tucked in front, among the tulip leaves
const FRONT: Layer[] = [
  { src: 'carn-pink-3.webp', left: 47, top: 37, width: 24, rotate: 8, z: 4, i: 2 },
  { src: 'carn-pink-4.webp', left: 22, top: 40, width: 21, rotate: -12, z: 4, i: 3 },
];

function Carnation({ l }: { l: Layer }) {
  return (
    <motion.img
      src={`/reveal/${l.src}`}
      alt=""
      draggable={false}
      custom={l.i}
      variants={bloom}
      className="layer"
      style={{ left: `${l.left}%`, top: `${l.top}%`, width: `${l.width}%`, zIndex: l.z, rotate: l.rotate ?? 0 }}
    />
  );
}

export default function PhotoBouquet({
  state,
  showString,
  interactive,
  onUntie,
  small,
  big,
}: {
  state: BouquetState;
  showString: boolean;
  interactive: boolean;
  onUntie: () => void;
  small: boolean;
  big: boolean;
}) {
  return (
    <div className={`bouquet${big ? ' big' : ''}${small ? ' small' : ''}`}>
      <motion.div
        className="stage"
        initial={false}
        animate={state}
        role="img"
        aria-label="A bouquet of pink tulips wrapped in kraft paper, tied with a pink satin bow, with pink and white carnations"
      >
        <motion.div className="stage-inner" variants={bouquet}>
          {BACK.map((l) => (
            <Carnation key={l.src} l={l} />
          ))}
          <img
            src="/reveal/tulips.webp"
            alt=""
            draggable={false}
            className="layer"
            style={{ left: '8%', top: '22%', width: '84%', zIndex: 2 }}
          />
          {FRONT.map((l) => (
            <Carnation key={l.src} l={l} />
          ))}
        </motion.div>

        {/* tissue paper covering the flowers until the bow is untied */}
        <motion.img
          src="/reveal/tissue.webp"
          alt=""
          draggable={false}
          variants={tissue}
          className="layer"
          style={{ left: '4%', top: '14%', width: '92%', zIndex: 6 }}
        />

        {/* string from the bow down to the gift tag (login stage only) */}
        <motion.svg
          className="layer"
          viewBox="0 0 100 150"
          preserveAspectRatio="none"
          style={{ inset: 0, width: '100%', height: '100%', zIndex: 7, overflow: 'visible' }}
          initial={false}
          animate={{ opacity: showString ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          aria-hidden="true"
        >
          <path
            d="M35,114 C40,128 56,136 50,152"
            fill="none"
            stroke="#b58a52"
            strokeWidth="0.9"
            strokeDasharray="1.4 0.5"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 2.4 }}
          />
        </motion.svg>

        <motion.img
          src="/reveal/bow.webp"
          alt=""
          draggable={false}
          variants={bow}
          className="layer bow"
          style={{ left: '15%', top: '68%', width: '40%', zIndex: 8 }}
        />

        {interactive && (
          <motion.span
            className="bow-ring"
            aria-hidden="true"
            initial={{ scale: 0.4, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeOut', delay: 1 }}
          />
        )}
      </motion.div>

      {interactive && <button type="button" className="untie" aria-label="Untie the ribbon" onClick={onUntie} />}
    </div>
  );
}
