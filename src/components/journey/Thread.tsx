'use client';

import { useEffect, useRef, useState } from 'react';

const NEEDLE_W = 120;
const NEEDLE_H = NEEDLE_W * (36 / 900);
const EYE_X = NEEDLE_W * 0.04;
const LIGHT_DEG = -32;

type Pt = { x: number; y: number };

function offsetIn(el: HTMLElement, root: HTMLElement): Pt {
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

type Seg = [Pt, Pt, Pt, Pt];
/** One point along the thread: arc length, the furthest y reached so far, and where it sits on its curve. */
type Sample = { len: number; maxY: number; seg: number; t: number };

const STEPS = 48; // samples per curve; plenty for a smooth needle

function bez(s: Seg, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x, y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y };
}
function bezAngle(s: Seg, t: number): number {
  const u = 1 - t;
  const dx = 3 * u * u * (s[1].x - s[0].x) + 6 * u * t * (s[2].x - s[1].x) + 3 * t * t * (s[3].x - s[2].x);
  const dy = 3 * u * u * (s[1].y - s[0].y) + 6 * u * t * (s[2].y - s[1].y) + 3 * t * t * (s[3].y - s[2].y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Builds the path and samples it in plain JS. (Sampling with getPointAtLength
 * took ~400ms on a long journey and froze the page every time it re-measured.)
 */
function buildThread(pts: Pt[], width: number): { d: string; segs: Seg[]; samples: Sample[] } {
  if (pts.length < 2) return { d: '', segs: [], samples: [] };
  let d = `M ${pts[0].x} ${pts[0].y}`;
  const segs: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dy = b.y - a.y;
    const swing = (i % 2 ? -1 : 1) * Math.min(width * 0.22, 160);
    const c1 = { x: a.x + swing, y: a.y + dy * 0.45 };
    const c2 = { x: b.x - swing, y: b.y - dy * 0.45 };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
    segs.push([a, c1, c2, b]);
  }
  const samples: Sample[] = [{ len: 0, maxY: pts[0].y, seg: 0, t: 0 }];
  let len = 0;
  let maxY = pts[0].y;
  let prev = pts[0];
  segs.forEach((s, i) => {
    for (let k = 1; k <= STEPS; k++) {
      const t = k / STEPS;
      const p = bez(s, t);
      len += Math.hypot(p.x - prev.x, p.y - prev.y);
      maxY = Math.max(maxY, p.y);
      samples.push({ len, maxY, seg: i, t });
      prev = p;
    }
  });
  return { d, segs, samples };
}

/**
 * The thread that runs through the whole journey. It is drawn up to the point
 * just below the middle of the screen, so it feels like it is being stitched as she scrolls.
 * The thread sits behind the scrapbook pieces (so it looks sewn through the pins);
 * the needle rides on top.
 */
export default function Thread({ rootRef }: { rootRef: React.RefObject<HTMLDivElement | null> }) {
  const [geo, setGeo] = useState<{ d: string; w: number; h: number } | null>(null);
  const drawPath = useRef<SVGPathElement>(null);
  const needle = useRef<SVGGElement>(null);
  const shine = useRef<SVGImageElement>(null);
  const glint = useRef<SVGGElement>(null);
  const segs = useRef<Seg[]>([]);
  const samples = useRef<Sample[]>([]);
  const total = useRef(0);
  const shape = useRef('');

  // measure pins -> path
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = root.offsetWidth;
        const h = root.offsetHeight;
        const pins = Array.from(root.querySelectorAll<HTMLElement>('[data-anchor]'));
        const pts = [{ x: w / 2, y: 0 }, ...pins.map((p) => offsetIn(p, root))].sort((a, b) => a.y - b.y);
        pts.push({ x: w / 2, y: h - 40 });
        const built = buildThread(pts, w);
        const key = `${w}x${h} ${built.d}`;
        if (key === shape.current) return; // nothing moved; skip the re-render
        shape.current = key;
        segs.current = built.segs;
        samples.current = built.samples;
        setGeo({ d: built.d, w, h });
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    window.addEventListener('load', measure);
    document.fonts?.ready.then(measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('load', measure);
      cancelAnimationFrame(raf);
    };
  }, [rootRef]);

  // line our sampled lengths up with the browser's, once per geometry
  useEffect(() => {
    const p = drawPath.current;
    const s = samples.current;
    if (!p || !geo || !s.length) return;
    const L = p.getTotalLength();
    const scale = L / (s[s.length - 1].len || 1);
    if (scale !== 1) s.forEach((x) => (x.len *= scale));
    total.current = L;
    p.style.strokeDasharray = `${L}`;
  }, [geo]);

  // follow the scroll
  useEffect(() => {
    let raf = 0;
    let current = 0;
    let spin = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lengthAtY = (y: number) => {
      const s = samples.current;
      if (!s.length) return 0;
      let lo = 0;
      let hi = s.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (s[mid].maxY < y) lo = mid + 1;
        else hi = mid;
      }
      return s[lo].len;
    };

    // exact point + direction on the curve at a given length
    const at = (len: number) => {
      const s = samples.current;
      let lo = 1;
      let hi = s.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (s[mid].len < len) lo = mid + 1;
        else hi = mid;
      }
      const b = s[lo];
      const a = s[lo - 1];
      const t0 = a.seg === b.seg ? a.t : 0;
      const f = b.len > a.len ? Math.min(1, Math.max(0, (len - a.len) / (b.len - a.len))) : 1;
      const t = t0 + (b.t - t0) * f;
      const seg = segs.current[b.seg];
      return { ...bez(seg, t), ang: bezAngle(seg, t) };
    };

    const tick = () => {
      const root = rootRef.current;
      const p = drawPath.current;
      const n = needle.current;
      if (root && p && n && samples.current.length > 1 && total.current) {
        const top = root.getBoundingClientRect().top;
        const targetY = window.innerHeight * 0.62 - top;
        const target = Math.max(0, Math.min(total.current, lengthAtY(targetY)));
        current = reduce ? target : current + (target - current) * 0.12;
        const L = total.current;
        p.style.strokeDashoffset = `${L - current}`;
        const a = at(current);
        const ang = a.ang;
        n.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${ang})`);
        const rel = ((ang - LIGHT_DEG) * Math.PI) / 180;
        const I = Math.pow(Math.abs(Math.cos(rel)), 18);
        if (shine.current) shine.current.style.opacity = String(Math.min(1, I * 1.1));
        if (glint.current) {
          spin += 3;
          glint.current.style.opacity = String(I);
          glint.current.setAttribute('transform', `translate(${NEEDLE_W * 0.55} 0) rotate(${spin - ang}) scale(${0.5 + I * 0.9})`);
        }
        n.style.opacity = current < 2 || current >= L - 2 ? '0' : '1';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rootRef]);

  if (!geo) return null;
  const { d, w, h } = geo;

  return (
    <>
      <svg className="j-thread" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <defs>
          <mask id="jThreadMask" maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
            <path ref={drawPath} d={d} fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
          </mask>
        </defs>
        <g mask="url(#jThreadMask)">
          <path d={d} fill="none" stroke="rgba(107,30,58,0.16)" strokeWidth="4" strokeLinecap="round" transform="translate(1 2)" />
          <path d={d} fill="none" stroke="#e48aae" strokeWidth="3.2" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#fde0ea" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="3 2.4" />
        </g>
      </svg>
      <svg className="j-needle" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <defs>
          <filter id="jBrighten" x="-10%" y="-200%" width="120%" height="500%">
            <feColorMatrix type="matrix" values="1.6 0 0 0 0.35  0 1.6 0 0 0.32  0 0 1.6 0 0.25  0 0 0 1 0" />
          </filter>
          <radialGradient id="jGlow">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.35" stopColor="#fff6dc" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g ref={needle} style={{ transition: 'opacity .4s' }}>
          <g style={{ filter: 'drop-shadow(0 3px 3px rgba(60,20,40,0.3))' }}>
            <image href="/reveal/needle.webp" x={-EYE_X} y={-NEEDLE_H / 2} width={NEEDLE_W} height={NEEDLE_H} preserveAspectRatio="none" />
          </g>
          <image
            ref={shine}
            href="/reveal/needle.webp"
            x={-EYE_X}
            y={-NEEDLE_H / 2}
            width={NEEDLE_W}
            height={NEEDLE_H}
            preserveAspectRatio="none"
            filter="url(#jBrighten)"
            style={{ opacity: 0, mixBlendMode: 'screen' }}
          />
          <g ref={glint} style={{ opacity: 0 }}>
            <circle r="22" fill="url(#jGlow)" />
            <path d="M0,-28 L2.2,-2.2 L28,0 L2.2,2.2 L0,28 L-2.2,2.2 L-28,0 L-2.2,-2.2 Z" fill="#fff" />
            <path d="M0,-12 L1.2,-1.2 L12,0 L1.2,1.2 L0,12 L-1.2,1.2 L-12,0 L-1.2,-1.2 Z" fill="#fff" transform="rotate(45)" opacity="0.8" />
          </g>
        </g>
      </svg>
    </>
  );
}
