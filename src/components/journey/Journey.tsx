'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import confetti from 'canvas-confetti';
import type { Palette } from '@/content/journey';
import type { Intro, Music, ResolvedChapter } from './types';
import { ItemView } from './items';
import Thread from './Thread';
import MusicToggle from './MusicToggle';
import './journey.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/* ---------- colour helpers for the scroll-driven backdrop ---------- */

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

const TEXTURES = ['none', 'lined', 'grid', 'linen', 'stars', 'map'] as const;

/* little scraps that drift at different speeds in each chapter */
const SCRAPS: Record<string, { src: string; left: string; top: string; w: number; speed: number; rot: number }[]> = {
  once: [
    { src: '/reveal/petal-1.webp', left: '6%', top: '18%', w: 34, speed: 0.6, rot: -20 },
    { src: '/reveal/washi.webp', left: '72%', top: '8%', w: 110, speed: 0.25, rot: 12 },
    { src: '/reveal/petal-8.webp', left: '84%', top: '62%', w: 30, speed: 0.9, rot: 30 },
  ],
  spark: [
    { src: '/reveal/carn-pink-4.webp', left: '80%', top: '12%', w: 90, speed: 0.4, rot: 18 },
    { src: '/reveal/petal-2.webp', left: '4%', top: '55%', w: 30, speed: 0.8, rot: -10 },
  ],
  designer: [
    { src: '/reveal/bow.webp', left: '76%', top: '4%', w: 110, speed: 0.35, rot: 14 },
    { src: '/reveal/petal-9.webp', left: '8%', top: '30%', w: 32, speed: 0.7, rot: -30 },
    { src: '/reveal/carn-pink-2.webp', left: '-4%', top: '78%', w: 100, speed: 0.5, rot: -14 },
  ],
  leap: [
    { src: '/reveal/petal-3.webp', left: '82%', top: '20%', w: 32, speed: 0.8, rot: 20 },
    { src: '/reveal/petal-7.webp', left: '10%', top: '70%', w: 30, speed: 0.6, rot: -24 },
  ],
  milan: [
    { src: '/reveal/carn-white-1.webp', left: '74%', top: '6%', w: 120, speed: 0.4, rot: 10 },
    { src: '/reveal/petal-1.webp', left: '6%', top: '44%', w: 32, speed: 0.9, rot: -16 },
  ],
};

export default function Journey({ intro, chapters, music }: { intro: Intro; chapters: ResolvedChapter[]; music: Music }) {
  const root = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const [celebrated, setCelebrated] = useState(false);

  /* smooth scrolling, tied into GSAP's clock */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  /* backdrop colours + textures follow the chapter on screen */
  useEffect(() => {
    const last = chapters[chapters.length - 1];
    const palettes: Palette[] = [intro.palette, ...chapters.map((c) => c.palette), last.palette];
    const textures: string[] = ['none', ...chapters.map((c) => c.texture), last.texture];
    let raf = 0;
    const tick = () => {
      const el = backdrop.current;
      const sections = root.current?.querySelectorAll<HTMLElement>('[data-chapter]');
      if (el && sections && sections.length) {
        const vh = window.innerHeight;
        const mid = vh * 0.55;
        let i = 0;
        sections.forEach((s, k) => {
          if (s.getBoundingClientRect().top <= mid) i = k;
        });
        const next = sections[i + 1];
        let t = 0;
        if (next) {
          const gap = next.getBoundingClientRect().top - mid;
          t = Math.min(1, Math.max(0, 1 - gap / (vh * 0.75)));
          t = t * t * (3 - 2 * t);
        }
        const A = palettes[i];
        const B = palettes[Math.min(i + 1, palettes.length - 1)];
        el.style.setProperty('--bg-base', mix(A.base, B.base, t));
        el.style.setProperty('--bg-a', mix(A.a, B.a, t));
        el.style.setProperty('--bg-b', mix(A.b, B.b, t));
        el.style.setProperty('--bg-c', mix(A.c, B.c, t));
        TEXTURES.forEach((tex) => {
          const w = (textures[i] === tex ? 1 - t : 0) + (textures[i + 1] === tex ? t : 0);
          el.style.setProperty(`--tex-${tex}`, String(w));
        });
        // light text when the background is dark (the leap chapter)
        const dark = (c: string) => hexToRgb(c).reduce((s, v) => s + v, 0) < 300;
        el.style.setProperty('--night', String((dark(A.base) ? 1 - t : 0) + (dark(B.base) ? t : 0)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [intro.palette, chapters]);

  /* scroll animations */
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // hero
        const heroTitle = new SplitText('.j-hero-title', { type: 'chars,words' });
        gsap.from(heroTitle.chars, { yPercent: 120, rotate: 10, opacity: 0, stagger: 0.035, duration: 1.1, ease: 'expo.out', delay: 0.2 });
        gsap.from('.j-hero-name', { scale: 0.85, opacity: 0, filter: 'blur(10px)', duration: 1.6, ease: 'expo.out' });
        gsap.from('.j-hero-line, .j-scroll-cue', { opacity: 0, y: 20, duration: 1, delay: 1, stagger: 0.2 });
        gsap.to('.j-hero-inner', {
          yPercent: -30,
          opacity: 0.2,
          ease: 'none',
          scrollTrigger: { trigger: '.j-hero', start: 'top top', end: 'bottom top', scrub: true },
        });

        // chapter titles
        gsap.utils.toArray<HTMLElement>('.j-chapter-title').forEach((el) => {
          const split = new SplitText(el, { type: 'chars,words' });
          gsap.from(split.chars, {
            yPercent: 110,
            rotate: 8,
            opacity: 0,
            stagger: 0.03,
            duration: 1,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 85%' },
          });
        });
        gsap.utils.toArray<HTMLElement>('.j-chapter-head').forEach((el) => {
          gsap.from(el.querySelectorAll('.j-num, .j-kicker, .j-years, .j-intro'), {
            opacity: 0,
            y: 24,
            stagger: 0.12,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 80%' },
          });
        });

        // scrapbook pieces settle onto the page
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el, i) => {
          gsap.fromTo(
            el,
            { y: 110, opacity: 0, rotate: i % 2 ? 9 : -9, scale: 0.92 },
            {
              y: 0,
              opacity: 1,
              rotate: 0,
              scale: 1,
              ease: 'power2.out',
              scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 68%', scrub: 0.8 },
            },
          );
        });

        // photos "develop" like instant film
        gsap.utils.toArray<HTMLElement>('[data-develop]').forEach((el) => {
          gsap.fromTo(
            el,
            { filter: 'sepia(0.7) brightness(1.6) contrast(0.7) blur(3px)' },
            {
              filter: 'sepia(0) brightness(1) contrast(1) blur(0px)',
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top 85%', end: 'center 55%', scrub: true },
            },
          );
        });

        // quotes light up word by word
        gsap.utils.toArray<HTMLElement>('[data-words]').forEach((el) => {
          const split = new SplitText(el, { type: 'words' });
          gsap.fromTo(
            split.words,
            { opacity: 0.12, y: 6 },
            { opacity: 1, y: 0, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: true } },
          );
        });

        // ticket stub tears away
        gsap.utils.toArray<HTMLElement>('[data-stub]').forEach((el) => {
          gsap.to(el, {
            rotate: 9,
            x: 18,
            y: 10,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: el, start: 'top 55%', end: 'top 35%', scrub: 0.6 },
          });
        });

        // drifting scraps (parallax)
        gsap.utils.toArray<HTMLElement>('[data-speed]').forEach((el) => {
          const speed = parseFloat(el.dataset.speed || '0.5');
          gsap.fromTo(
            el,
            { yPercent: speed * 120 },
            {
              yPercent: -speed * 220,
              rotate: `+=${speed * 40}`,
              ease: 'none',
              scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          );
        });
      });

      // pinned film roll: vertical scroll slides it sideways (also with reduced motion it stays usable)
      gsap.utils.toArray<HTMLElement>('[data-film]').forEach((section) => {
        const track = section.querySelector<HTMLElement>('[data-film-track]');
        if (!track) return;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 32);
        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'center center',
            end: () => `+=${distance()}`,
            pin: true,
            // .j-items is a flex column, where GSAP turns spacing off by default; without it the
            // next item (the video) scrolls up underneath the pinned film
            pinSpacing: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
      });

      // finale confetti, once
      ScrollTrigger.create({
        trigger: '.j-finale',
        start: 'top 60%',
        once: true,
        onEnter: () => setCelebrated(true),
      });

      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener('load', refresh);
      document.fonts?.ready.then(refresh);
      return () => {
        window.removeEventListener('load', refresh);
        mm.revert();
      };
    },
    { scope: root },
  );

  useEffect(() => {
    if (!celebrated) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#f4a6c0', '#ffd0dc', '#fff4f6', '#f7e3a1', '#e48aae', '#cdb4f0'];
    const shoot = (x: number) =>
      confetti({ particleCount: 70, spread: 75, startVelocity: 38, origin: { x, y: 0.75 }, colors, scalar: 1.1, ticks: 260, shapes: ['circle', 'square'] });
    shoot(0.2);
    setTimeout(() => shoot(0.8), 250);
    setTimeout(() => shoot(0.5), 500);
  }, [celebrated]);

  return (
    <div ref={root} className="j-root">
      <div ref={backdrop} className="j-backdrop" aria-hidden="true">
        <div className="j-blob a" />
        <div className="j-blob b" />
        <div className="j-blob c" />
        {TEXTURES.filter((t) => t !== 'none').map((t) => (
          <div key={t} className={`j-tex tex-${t}`} style={{ opacity: `var(--tex-${t}, 0)` }} />
        ))}
      </div>

      <header className="j-hero" data-chapter>
        <div className="j-hero-inner">
          <h1 className="chrome j-hero-name">{intro.name}</h1>
          <p className="j-hero-title whisper">{intro.title}</p>
          <p className="j-hero-line">{intro.line}</p>
        </div>
        <div className="j-scroll-cue" aria-hidden="true">
          <img src="/reveal/needle.webp" alt="" />
          <span className="hand">follow the thread</span>
        </div>
      </header>

      <div ref={flow} className="j-flow">
        <Thread rootRef={flow} />

        {chapters.map((c) => (
          <section
            key={c.id}
            className={`j-chapter ch-${c.id}`}
            data-chapter
            aria-labelledby={`t-${c.id}`}
            style={{ ['--ink' as string]: c.palette.ink }}
          >
            {(SCRAPS[c.id] ?? []).map((s, i) => (
              <img
                key={i}
                src={s.src}
                alt=""
                className="j-scrap"
                data-speed={s.speed}
                style={{ left: s.left, top: s.top, width: s.w, rotate: `${s.rot}deg` }}
              />
            ))}
            <div className="j-chapter-head">
              <span className="j-num">{c.number}</span>
              <span className="j-kicker hand">{c.kicker}</span>
              <h2 id={`t-${c.id}`} className="j-chapter-title">
                {c.title}
              </h2>
              {c.years && <span className="j-years">{c.years}</span>}
              <p className="j-intro whisper">{c.intro}</p>
            </div>
            <div className="j-items">
              {c.items.map((item, i) => (
                <ItemView key={i} item={item} />
              ))}
            </div>
          </section>
        ))}

        <section className="j-finale" data-chapter>
          <p className="hand j-finale-kicker">and the story keeps going</p>
          <h2 className="j-finale-title whisper">Your people left you a few things.</h2>
          <div className="j-finale-actions">
            <a className="cta" href="/home">
              Open your desk
            </a>
            <a className="j-link" href="/home/love">
              Go straight to your messages
            </a>
          </div>
        </section>
      </div>

      <MusicToggle music={music} />
    </div>
  );
}
