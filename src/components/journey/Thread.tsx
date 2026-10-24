'use client';

import { useEffect, useRef, useState } from 'react';

const NEEDLE_W = 120;
const NEEDLE_H = NEEDLE_W * (36 / 900);
const EYE_X = NEEDLE_W * 0.04;
const LIGHT_DEG = -32;
/** the needle's own little layer: room for the needle and its sparkle at any angle */
const BOX = 300;

/** `hug`: a point beside a block of text; the thread runs straight between two of them, so it skirts the words */
type Pt = { x: number; y: number; hug?: boolean };

/** Top-left of an element within the root, plus its size. */
function boxIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/**
 * Chapter titles and quotes sit in the middle of the page; the thread goes down one side of each
 * (alternating) instead of straight through the words, and the needle follows it there.
 */
function skirts(root: HTMLElement, w: number): Pt[] {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('.j-chapter-head, .j-quote'));
  return blocks.flatMap((el, i) => {
    const b = boxIn(el, root);
    // the words themselves can be narrower than their box; measure the widest line
    const inner = Array.from(el.children).reduce((m, c) => Math.max(m, (c as HTMLElement).offsetWidth || 0), 0) || b.w;
    const half = Math.min(b.w, inner) / 2;
    const mid = b.x + b.w / 2;
    const x = i % 2 ? Math.min(w - 10, mid + half + 22) : Math.max(10, mid - half - 22);
    return [
      { x, y: b.y - 14, hug: true },
      { x, y: b.y + b.h + 14, hug: true },
    ];
  });
}

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
    // straight down the side of a title or quote; elsewhere a gentle swing, kept on screen
    const swing = (a.hug && b.hug) || i === 0 ? 0 : (i % 2 ? -1 : 1) * Math.min(width * 0.22, 160);
    const onScreen = (x: number) => Math.min(width - 8, Math.max(8, x));
    const c1 = { x: onScreen(a.x + swing), y: a.y + dy * 0.45 };
    const c2 = { x: onScreen(b.x - swing), y: b.y - dy * 0.45 };
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
  const threadSvg = useRef<SVGSVGElement>(null);
  const needle = useRef<HTMLDivElement>(null);
  const shine = useRef<SVGImageElement>(null);
  const glint = useRef<SVGGElement>(null);
  const glintI = useRef(0);
  const segs = useRef<Seg[]>([]);
  const samples = useRef<Sample[]>([]);
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
        // starts just under "follow the thread" at the bottom of the opening screen
        const pts: Pt[] = [{ x: w / 2, y: -18 }, ...pins.map((p) => offsetIn(p, root)), ...skirts(root, w)].sort((a, b) => a.y - b.y);
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

  // follow the scroll
  useEffect(() => {
    let raf = 0;
    let current = 0;
    let shown = -1;
    let drawnFor: Sample[] | null = null;
    let spin = 0;
    let last = performance.now();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Phones grow and shrink the address bar while scrolling, which changes innerHeight every
    // few frames and made the needle jump. Only take a new height on rotation or a real resize.
    let vh = window.innerHeight;
    let vw = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth !== vw || Math.abs(window.innerHeight - vh) > 160) {
        vw = window.innerWidth;
        vh = window.innerHeight;
      }
    };
    window.addEventListener('resize', onResize);

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

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const root = rootRef.current;
      const svg = threadSvg.current;
      const n = needle.current;
      const s = samples.current;
      if (root && svg && n && s.length > 1) {
        const L = s[s.length - 1].len;
        const top = root.getBoundingClientRect().top;
        const target = Math.max(0, Math.min(L, lengthAtY(vh * 0.62 - top)));
        // ease by time, not by frame, so 60Hz phones and 120Hz iPads glide the same
        current = reduce ? target : current + (target - current) * (1 - Math.exp(-dt / 0.12));
        if (Math.abs(target - current) < 0.05) current = target;

        // only touch the page when something moved (or the thread was re-laid out)
        if (s !== drawnFor) {
          drawnFor = s;
          shown = -1;
        }
        if (Math.abs(current - shown) > 0.02) {
          shown = current;
          const a = at(current);
          // the thread is revealed down to the needle with a plain clip (cheap), not a mask
          svg.style.clipPath = `inset(0px 0px ${Math.max(0, Number(svg.getAttribute('height')) - a.y - 3)}px 0px)`;
          // the needle is its own small layer, moved by the compositor
          n.style.transform = `translate3d(${a.x - BOX / 2}px, ${a.y - BOX / 2}px, 0) rotate(${a.ang}deg)`;
          n.style.opacity = current < 2 || current >= L - 2 ? '0' : '1';
          const rel = ((a.ang - LIGHT_DEG) * Math.PI) / 180;
          const I = Math.pow(Math.abs(Math.cos(rel)), 18);
          if (shine.current) shine.current.style.opacity = String(Math.min(1, I * 1.1));
          if (glint.current) glint.current.style.opacity = String(I);
          glintI.current = I;
        }
        // the sparkle keeps turning only while it's visible
        if (glint.current && glintI.current > 0.02 && !reduce) {
          spin += 180 * dt;
          glint.current.setAttribute('transform', `translate(${NEEDLE_W * 0.55} 0) rotate(${spin}) scale(${0.5 + glintI.current * 0.9})`);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [rootRef]);

  if (!geo) return null;
  const { d, w, h } = geo;
  const half = BOX / 2;

  return (
    <>
      <svg ref={threadSvg} className="j-thread" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ clipPath: 'inset(0 0 100% 0)' }}>
        <path d={d} fill="none" stroke="rgba(107,30,58,0.16)" strokeWidth="4" strokeLinecap="round" transform="translate(1 2)" />
        <path d={d} fill="none" stroke="#e48aae" strokeWidth="3.2" strokeLinecap="round" />
        <path d={d} fill="none" stroke="#fde0ea" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="3 2.4" />
      </svg>
      <div ref={needle} className="j-needle" style={{ width: BOX, height: BOX, transformOrigin: `${half}px ${half}px`, opacity: 0 }} aria-hidden="true">
        <svg width={BOX} height={BOX} viewBox={`${-half} ${-half} ${BOX} ${BOX}`}>
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
        </svg>
      </div>
    </>
  );
}
