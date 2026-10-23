'use client';

import { useEffect, useMemo, useRef } from 'react';
import { animate, motion } from 'framer-motion';

type Pt = { x: number; y: number };

function buildPath(from: Pt, to: Pt, width: number): string {
  const A = Math.min(width * 0.36, 150);
  const dy = to.y - from.y;
  return [
    `M ${from.x} ${from.y}`,
    `C ${from.x + A * 1.2} ${from.y - 70}, ${from.x + A * 1.5} ${from.y + dy * 0.22}, ${from.x + A * 0.1} ${from.y + dy * 0.36}`,
    `S ${from.x - A * 1.5} ${from.y + dy * 0.58}, ${from.x - A * 0.15} ${from.y + dy * 0.72}`,
    `S ${to.x + A * 0.8} ${to.y - 40}, ${to.x} ${to.y}`,
  ].join(' ');
}

// Needle image is 900x36; scaled so it reads as a real sewing needle on a phone.
const NEEDLE_W = 132;
const NEEDLE_H = NEEDLE_W * (36 / 900);
const EYE_X = NEEDLE_W * 0.04; // where the thread passes through, from the left end

// Direction the light comes from. The needle flashes when its body lines up with it.
const LIGHT_DEG = -32;

/** A silk thread pulled across the screen by a gold needle that catches the light. */
export default function ThreadOverlay({ from, to, onDone }: { from: Pt; to: Pt; onDone: () => void }) {
  const draw = useRef<SVGPathElement>(null);
  const needle = useRef<SVGGElement>(null);
  const shine = useRef<SVGImageElement>(null);
  const glint = useRef<SVGGElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  const w = typeof window === 'undefined' ? 390 : window.innerWidth;
  const h = typeof window === 'undefined' ? 844 : window.innerHeight;
  const d = useMemo(() => buildPath(from, to, w), [from, to, w]);

  useEffect(() => {
    const path = draw.current;
    const n = needle.current;
    const s = shine.current;
    const g = glint.current;
    if (!path || !n || !s || !g) return;
    const L = path.getTotalLength();
    path.style.strokeDasharray = `${L}`;

    let spin = 0;
    const set = (p: number) => {
      const len = p * L;
      path.style.strokeDashoffset = `${L - len}`;
      const a = path.getPointAtLength(len);
      const b = path.getPointAtLength(Math.min(L, len + 2));
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      n.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${ang})`);

      // specular reflection: strongest when the needle lies along the light direction
      const rel = ((ang - LIGHT_DEG) * Math.PI) / 180;
      const I = Math.pow(Math.abs(Math.cos(rel)), 22);
      s.style.opacity = String(Math.min(1, I * 1.1));
      spin += 4;
      g.style.opacity = String(I);
      g.setAttribute('transform', `translate(${NEEDLE_W * 0.55} 0) rotate(${spin - ang}) scale(${0.5 + I * 0.9})`);
    };
    set(0);

    const controls = animate(0, 1, {
      duration: 3,
      ease: [0.5, 0.05, 0.25, 1],
      onUpdate: set,
      onComplete: () => done.current(),
    });
    return () => controls.stop();
  }, [d]);

  return (
    <motion.svg
      aria-hidden="true"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20 }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.9, delay: 0.4 } }}
    >
      <defs>
        <mask id="threadReveal" maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <path ref={draw} d={d} fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
        </mask>
        <filter id="brighten" x="-10%" y="-200%" width="120%" height="500%">
          <feColorMatrix
            type="matrix"
            values="1.6 0 0 0 0.35  0 1.6 0 0 0.32  0 0 1.6 0 0.25  0 0 0 1 0"
          />
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
        <radialGradient id="glow">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.35" stopColor="#fff6dc" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* silk thread: a soft pink core with a fine twisted highlight */}
      <g mask="url(#threadReveal)">
        <path d={d} fill="none" stroke="rgba(107,30,58,0.18)" strokeWidth="3.6" strokeLinecap="round" transform="translate(0.8 1.6)" />
        <path d={d} fill="none" stroke="#e48aae" strokeWidth="3" strokeLinecap="round" />
        <path d={d} fill="none" stroke="#fbd3e2" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="3 2.2" />
      </g>

      <g ref={needle}>
        <g style={{ filter: 'drop-shadow(0 3px 3px rgba(107,30,58,0.3))' }}>
          <image
            href="/reveal/needle.webp"
            x={-EYE_X}
            y={-NEEDLE_H / 2}
            width={NEEDLE_W}
            height={NEEDLE_H}
            preserveAspectRatio="none"
          />
        </g>
        <image
          ref={shine}
          href="/reveal/needle.webp"
          x={-EYE_X}
          y={-NEEDLE_H / 2}
          width={NEEDLE_W}
          height={NEEDLE_H}
          preserveAspectRatio="none"
          filter="url(#brighten)"
          style={{ opacity: 0, mixBlendMode: 'screen' }}
        />
        <g ref={glint} style={{ opacity: 0 }}>
          <circle r="24" fill="url(#glow)" />
          <path d="M0,-30 L2.4,-2.4 L30,0 L2.4,2.4 L0,30 L-2.4,2.4 L-30,0 L-2.4,-2.4 Z" fill="#fff" />
          <path d="M0,-14 L1.4,-1.4 L14,0 L1.4,1.4 L0,14 L-1.4,1.4 L-14,0 L-1.4,-1.4 Z" fill="#fff" transform="rotate(45)" opacity="0.8" />
        </g>
      </g>
    </motion.svg>
  );
}
