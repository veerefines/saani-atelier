'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { timeIn, useNow } from './Clock';
import { usePeople, type Someone } from './usePeople';
import { sfx } from '@/lib/sound';

type Place = { city: string; zones: string[] };

/** The three home clocks; anyone signed in from somewhere else gets a clock of their own. */
const FIXED: Place[] = [
  { city: 'Milano', zones: ['Europe/Rome'] },
  { city: 'Mumbai', zones: ['Asia/Kolkata', 'Asia/Calcutta'] },
  { city: 'Los Angeles', zones: ['America/Los_Angeles'] },
];
const cityOf = (tz: string) => tz.split('/').pop()!.replace(/_/g, ' ');
const TINTS = ['#fbd6e2', '#e6dcf7', '#d4efdf', '#ffe0c4', '#d3e9f6', '#fff1c7'];
const tint = (name: string) => TINTS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % TINTS.length];

function Face({ p }: { p: Someone }) {
  return (
    <span className={`wc-face${p.saanika ? ' her' : ''}`} style={{ ['--tint' as string]: tint(p.name) }}>
      <i aria-hidden="true">{p.saanika ? '👑' : p.name[0]}</i>
      <b>{p.me ? 'you' : p.name}</b>
    </span>
  );
}

function Stamp({ place, now, who, open, onOpen }: { place: Place; now: Date | null; who: Someone[]; open: boolean; onOpen: (v: boolean) => void }) {
  return (
    // hover with a mouse; on a phone a tap toggles it (touch would otherwise "hover" then click)
    <span className="wc" onPointerEnter={(e) => e.pointerType === 'mouse' && onOpen(true)} onPointerLeave={(e) => e.pointerType === 'mouse' && onOpen(false)}>
      <button
        type="button"
        data-quiet
        className={`h-stamp wc-stamp${open ? ' open' : ''}`}
        // a tap opens it before the click arrives, so it plays its own unfold
        onPointerUp={(e) => e.pointerType !== 'mouse' && (sfx(open ? 'close' : 'open'), onOpen(!open))}
        // keyboard (Enter/Space) clicks have no pointer; a mouse already opened it by hovering
        onClick={(e) => e.detail === 0 && onOpen(!open)}
        aria-expanded={open}
        aria-label={`${place.city}: ${who.length ? who.map((p) => (p.me ? 'you' : p.name)).join(', ') : 'nobody right now'}`}
      >
        <span className="h-stamp-city">{place.city}</span>
        <span className="h-stamp-time" suppressHydrationWarning>
          {timeIn(now, place.zones[0])}
        </span>
        {who.length > 0 && (
          <span className="wc-dots" aria-hidden="true">
            {who.slice(0, 4).map((p) => (
              <i key={p.name} style={{ background: tint(p.name) }} />
            ))}
          </span>
        )}
      </button>
      {open && (
        <span className="wc-pop" role="tooltip">
          {who.length ? who.map((p) => <Face key={p.name} p={p} />) : <small>nobody here right now</small>}
        </span>
      )}
    </span>
  );
}

/**
 * Milano, Mumbai and LA clocks on the desk. Hover (or tap) one to see who's there right now,
 * from where each person last opened the atelier.
 */
export default function WorldClocks() {
  const now = useNow();
  const people = usePeople();
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // tap anywhere else to close
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(null);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  const places = useMemo(() => {
    const everyone = people?.everyone ?? [];
    const extra = [...new Set(everyone.map((p) => p.tz))].filter((tz) => !FIXED.some((f) => f.zones.includes(tz))).map((tz) => ({ city: cityOf(tz), zones: [tz] }));
    return [...FIXED, ...extra].map((place) => ({
      place,
      // Saanika first, then you, then everyone else by name
      who: everyone.filter((p) => place.zones.includes(p.tz)).sort((a, b) => Number(b.saanika) - Number(a.saanika) || Number(b.me) - Number(a.me) || a.name.localeCompare(b.name)),
    }));
  }, [people]);

  return (
    <div className="h-stamps wc-row" ref={root}>
      {places.map(({ place, who }) => (
        <Stamp key={place.city} place={place} now={now} who={who} open={open === place.city} onOpen={(v) => setOpen((o) => (v ? place.city : o === place.city ? null : o))} />
      ))}
    </div>
  );
}
