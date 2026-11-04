'use client';

import { useEffect, useRef, useState } from 'react';
import type { ResolvedItem } from './types';

type Of<T extends ResolvedItem['type']> = Extract<ResolvedItem, { type: T }>;
/** A voice note as a cassette. Not part of the journey any more; the love wall still plays these. */
export type VoiceItem = { src: string; title: string; from: string; side?: 'left' | 'right' | 'center'; missing?: boolean };
type FilmItem = Omit<Of<'film'>, 'frames'> & { frames: { src: string; caption: string; missing?: boolean }[] };

/** 'wide' or 'tall' once a photo or video knows its size, so frames can fit the whole picture. */
export type Shape = 'wide' | 'tall' | undefined;
export function shapeOf(w: number, h: number): Shape {
  if (!w || !h) return undefined;
  return w / h > 1.15 ? 'wide' : 'tall';
}

/** Ref, shape and width-to-height ratio for an <img>: also catches images that finished loading before hydration. */
export function useImgShape() {
  const ref = useRef<HTMLImageElement>(null);
  const [shape, setShape] = useState<Shape>();
  const [ratio, setRatio] = useState<number>();
  const read = () => {
    const img = ref.current;
    if (!img?.complete || !img.naturalWidth || !img.naturalHeight) return;
    setShape(shapeOf(img.naturalWidth, img.naturalHeight));
    setRatio(img.naturalWidth / img.naturalHeight);
  };
  useEffect(read, []);
  return { ref, shape, ratio, onLoad: read };
}

function fileName(src: string) {
  return src.split('/').pop();
}

/** Pearl-head pin. The thread passes through every pin on the page. */
export function Pin({ color = '#e2588c', anchor = true }: { color?: string; anchor?: boolean }) {
  return (
    <span className="j-pin" data-anchor={anchor ? '' : undefined} aria-hidden="true" style={{ ['--pin' as string]: color }} />
  );
}

export function PhotoPlaceholder({ src, label }: { src: string; label?: string }) {
  return (
    <div className="j-ph" role="img" aria-label={label ? `Placeholder for ${label}` : 'Photo placeholder'}>
      <span className="hand">your photo here</span>
      <code>{fileName(src)}</code>
    </div>
  );
}

export function Photo({ item }: { item: Of<'photo'> }) {
  const size = item.size ?? 'm';
  const { ref, shape, ratio, onLoad } = useImgShape();
  return (
    <figure
      className={`j-item j-photo size-${size} side-${item.side ?? 'center'}`}
      data-shape={shape}
      data-reveal
      style={{ ['--tilt' as string]: `${item.tilt ?? 0}deg`, ...(ratio ? { ['--ar' as string]: ratio.toFixed(4) } : {}) }}
    >
      <Pin />
      {item.tape && <img className="j-tape" src="/reveal/washi.webp" alt="" />}
      <div className="j-polaroid">
        <div className="j-photo-img" data-develop>
          {item.missing ? (
            <PhotoPlaceholder src={item.src} label={item.caption} />
          ) : (
            <img ref={ref} onLoad={onLoad} src={item.src} alt={item.caption ?? ''} loading="lazy" decoding="async" />
          )}
        </div>
        {item.caption && <figcaption className="hand">{item.caption}</figcaption>}
      </div>
    </figure>
  );
}

export function Note({ item }: { item: Of<'note'> }) {
  return (
    <figure
      className={`j-item j-note paper-${item.paper ?? 'plain'} side-${item.side ?? 'center'}`}
      data-reveal
      style={{ ['--tilt' as string]: `${item.tilt ?? 0}deg` }}
    >
      <Pin color="#c9a064" />
      <blockquote className="hand">{item.text}</blockquote>
      {item.from && <figcaption className="whisper">from {item.from}</figcaption>}
    </figure>
  );
}

export function Quote({ item }: { item: Of<'quote'> }) {
  return (
    <figure className="j-item j-quote side-center">
      <Pin color="#b2305f" />
      <span className="j-quote-mark" aria-hidden="true">
        “
      </span>
      <blockquote className="whisper" data-words>
        {item.text}
      </blockquote>
      {item.by && <figcaption>{item.by}</figcaption>}
    </figure>
  );
}

function fmt(t: number) {
  if (!isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Voice note as a little cassette. Reels spin while it plays. */
export function Voice({ item }: { item: VoiceItem }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDur(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  function toggle() {
    const a = audio.current;
    if (!a || item.missing) return;
    if (a.paused) {
      document.querySelectorAll('audio[data-voice]').forEach((el) => {
        if (el !== a) (el as HTMLAudioElement).pause();
      });
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  const pct = dur ? (time / dur) * 100 : 0;

  return (
    <figure className={`j-item j-voice side-${item.side ?? 'center'}`} data-reveal style={{ ['--tilt' as string]: '-2deg' }}>
      <Pin color="#7fb7b0" />
      <div className={`cassette${playing ? ' playing' : ''}`}>
        <div className="cassette-label">
          <span className="hand">{item.title}</span>
          {item.from && <small className="whisper">from {item.from}</small>}
        </div>
        <div className="cassette-window">
          <span className="reel" />
          <span className="tape-band" />
          <span className="reel" />
        </div>
        <div className="cassette-holes" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="voice-controls">
        <button
          type="button"
          className="voice-play"
          onClick={toggle}
          disabled={item.missing}
          aria-label={`${playing ? 'Pause' : 'Play'} voice note${item.from ? ` from ${item.from}` : ''}`}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1.5" />
              <rect x="14" y="5" width="4" height="14" rx="1.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </button>
        <div className="voice-track" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="voice-time">{item.missing ? 'add audio' : `${fmt(time)} / ${fmt(dur)}`}</span>
      </div>
      {item.missing && <code className="j-missing">{fileName(item.src)}</code>}
      <audio ref={audio} src={item.missing ? undefined : item.src} preload="metadata" data-voice />
    </figure>
  );
}

/** Video plays silently when it scrolls into view; tap for sound. */
export function Video({ item }: { item: Of<'video'> }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [shape, setShape] = useState<Shape>();
  const readShape = () => {
    const v = ref.current;
    if (v && v.readyState >= 1) setShape(shapeOf(v.videoWidth, v.videoHeight));
  };
  useEffect(readShape, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.45 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  function toggleSound() {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (v.paused) v.play().catch(() => {});
  }

  return (
    <figure className={`j-item j-video side-${item.side ?? 'center'}`} data-shape={shape} data-reveal style={{ ['--tilt' as string]: '1.5deg' }}>
      <Pin color="#e0a84b" />
      <div className="j-video-frame">
        <video ref={ref} onLoadedMetadata={readShape} src={item.src} poster={item.poster} muted loop playsInline preload="metadata" />
        <button type="button" className="j-sound" onClick={toggleSound}>
          {muted ? 'Tap for sound' : 'Sound on'}
        </button>
        {item.missing && <span className="j-video-ph">placeholder video</span>}
      </div>
      {item.caption && <figcaption className="hand">{item.caption}</figcaption>}
      {item.missing && <code className="j-missing">{fileName(item.src === '/journey/video/placeholder.mp4' ? '' : item.src) || 'add your .mp4 in /public/journey/video'}</code>}
    </figure>
  );
}

/** Pinned horizontal film strip. Scrolling down slides the roll sideways. */
export function Film({ item }: { item: FilmItem }) {
  return (
    <section className="j-film" data-film>
      <div className="j-film-head">
        <Pin color="#f7e3a1" anchor={false} />
        <h3 className="hand">{item.title}</h3>
      </div>
      <div className="j-film-track" data-film-track>
        {item.frames.map((f, i) => (
          <figure key={i} className="j-frame">
            <div className="j-frame-img">
              {f.missing ? <PhotoPlaceholder src={f.src} label={f.caption} /> : <img src={f.src} alt={f.caption} />}
            </div>
            <figcaption className="hand">{f.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function Ticket({ item }: { item: Of<'ticket'> }) {
  return (
    <figure className="j-item j-ticket side-center" data-reveal style={{ ['--tilt' as string]: '-3deg' }}>
      <Pin color="#f0a6b8" />
      <div className="ticket">
        <div className="ticket-main">
          <span className="ticket-airline hand">Saanika Airways</span>
          <div className="ticket-route">
            <div>
              <strong>{item.from}</strong>
              <small>{item.fromCity}</small>
            </div>
            <svg viewBox="0 0 64 24" aria-hidden="true">
              <path d="M2 14 C 20 2, 44 2, 62 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M54 9 l8 5 -9 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div>
              <strong>{item.to}</strong>
              <small>{item.toCity}</small>
            </div>
          </div>
          <div className="ticket-meta">
            <span>
              Passenger <b>Saanika</b>
            </span>
            <span>
              Date <b>{item.date}</b>
            </span>
            {item.seat && (
              <span>
                Seat <b>{item.seat}</b>
              </span>
            )}
          </div>
        </div>
        <div className="ticket-stub" data-stub>
          <span className="hand">one way</span>
          <div className="barcode" aria-hidden="true" />
        </div>
      </div>
      <span className="ticket-torn hand" data-torn aria-hidden="true">
        no going back now ✂︎
      </span>
    </figure>
  );
}

export function Postcard({ item }: { item: Of<'postcard'> }) {
  return (
    <figure className="j-item j-postcard side-center" data-reveal style={{ ['--tilt' as string]: '2deg' }}>
      <Pin color="#e0a84b" />
      <div className="postcard">
        <div className="postcard-msg">
          <p className="hand">{item.text}</p>
          <p className="hand postcard-sign">with love, {item.signoff}</p>
        </div>
        <div className="postcard-side">
          <div className="stamp">
            <img src="/reveal/tulips.webp" alt="" />
          </div>
          <svg className="postmark" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <path id="pmc" d="M60,60 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0" />
            </defs>
            <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <text fontSize="11" letterSpacing="3" fill="currentColor">
              <textPath href="#pmc">MILANO · ITALIA · 2026 ·</textPath>
            </text>
            <text x="60" y="65" textAnchor="middle" fontSize="13" fill="currentColor">
              ♥
            </text>
          </svg>
          <div className="postcard-address">
            <span className="hand">Saanika</span>
            <span className="hand">Milano, Italia</span>
          </div>
        </div>
      </div>
    </figure>
  );
}

export function ItemView({ item }: { item: ResolvedItem }) {
  switch (item.type) {
    case 'photo':
      return <Photo item={item} />;
    case 'note':
      return <Note item={item} />;
    case 'quote':
      return <Quote item={item} />;
    case 'video':
      return <Video item={item} />;
    case 'film':
      return <Film item={item as FilmItem} />;
    case 'ticket':
      return <Ticket item={item} />;
    case 'postcard':
      return <Postcard item={item} />;
  }
}
