'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import type { Wish } from '@/lib/data';
import { api } from '@/lib/upload-client';
import { categories, distanceKm, distanceLabel, mapsAround, mapsLink, places, type Category, type Place } from '@/content/milano';
import Happenings from './Happenings';
import { useHere } from './useHere';
import { dayInfo, timeIn, useNow } from './Clock';

const MiniMap = dynamic(() => import('./MiniMap'), { ssr: false, loading: () => <div className="mm mm-loading" /> });

const catOf = (p: Place) => categories.find((c) => c.id === p.cat)!;
const wishText = (p: Place) => `${p.name} · ${p.area}`;
// quick "what's around me" searches, opened in Google Maps where she's standing
const AROUND = [
  { label: 'Matcha', q: 'matcha', icon: '🍵' },
  { label: 'Iced coffee', q: 'specialty coffee', icon: '🧋' },
  { label: 'Gelato', q: 'gelateria', icon: '🍦' },
  { label: 'Flowers', q: 'fiorista', icon: '💐' },
  { label: 'Fabric shops', q: 'negozio di tessuti', icon: '🧵' },
  { label: 'Vintage', q: 'vintage shop', icon: '👜' },
  { label: 'Boutiques', q: 'boutique', icon: '👠' },
  { label: 'Trattoria', q: 'trattoria', icon: '🍝' },
];

const BEACH_REGIONS = ['In Milano', 'The lakes', 'Liguria', 'Tuscany', 'Sardinia', 'Sicily', 'Puglia', 'Amalfi Coast', 'Calabria'];

function Face({ now, zone, city }: { now: Date | null; zone: string; city: string }) {
  let h = 0;
  let m = 0;
  if (now) {
    const parts = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: zone }).formatToParts(now);
    h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  }
  return (
    <div className="mil-clock">
      <div className="mil-face" aria-hidden="true">
        <i className="h" style={{ transform: `rotate(${(h % 12) * 30 + m * 0.5}deg)` }} />
        <i className="m" style={{ transform: `rotate(${m * 6}deg)` }} />
      </div>
      <div className="hand">{city}</div>
      <div className="t" suppressHydrationWarning>
        {timeIn(now, zone)}
      </div>
    </div>
  );
}

type Rating = { configured: false } | { configured: true; rating: number | null; count: number | null; url: string | null };
const ratings = new Map<string, Rating>();

function GoogleRating({ place }: { place: Place }) {
  const [r, setR] = useState<Rating | null>(() => ratings.get(place.id) ?? null);
  useEffect(() => {
    const known = ratings.get(place.id);
    if (known) return setR(known);
    setR(null);
    let live = true;
    fetch(`/api/places/${place.id}/rating`)
      .then((res) => (res.ok ? res.json() : { configured: false }))
      .catch(() => ({ configured: false }))
      .then((v: Rating) => {
        ratings.set(place.id, v);
        if (live) setR(v);
      });
    return () => {
      live = false;
    };
  }, [place.id]);

  if (!r) return <p className="pc-rating pc-rating-wait">★ checking Google…</p>;
  if (r.configured && r.rating) {
    return (
      <a className="pc-rating" href={r.url || mapsLink(place)} target="_blank" rel="noreferrer">
        <span className="pc-stars" style={{ ['--r' as string]: r.rating }} aria-hidden="true" />
        <b>{r.rating.toFixed(1)}</b>
        {r.count ? <span> · {r.count.toLocaleString('en-GB')} reviews on Google</span> : <span> on Google</span>}
      </a>
    );
  }
  return (
    <a className="pc-rating" href={mapsLink(place)} target="_blank" rel="noreferrer">
      ★ See the rating on Google
    </a>
  );
}

function PlaceCard({
  place,
  km,
  saved,
  onSave,
  onAgain,
}: {
  place: Place;
  km: number | null;
  saved: boolean;
  onSave: () => void;
  onAgain?: () => void;
}) {
  const c = catOf(place);
  return (
    <motion.article
      key={place.id}
      className="pc"
      style={{ ['--tint' as string]: c.tint }}
      initial={{ opacity: 0, y: 18, rotate: -1.5, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
    >
      <span className="pc-tag">
        {c.icon} {c.label}
      </span>
      <h3 className="pc-name">{place.name}</h3>
      <p className="pc-area">
        {place.area}
        {place.reach ? ` · ${place.reach} from Milano` : ''}
      </p>
      {km !== null && <p className="pc-dist">📍 {distanceLabel(km)}</p>}
      <p className="pc-note">{place.note}</p>
      <div className="pc-try">
        <span className="hand">try</span>
        <ul>
          {place.try.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <GoogleRating place={place} />
      <div className="pc-actions">
        <a className="cta pc-go" href={mapsLink(place)} target="_blank" rel="noreferrer">
          Take me there
        </a>
        <button className="pc-btn" onClick={onSave} disabled={saved}>
          {saved ? 'On your list ✓' : 'Save to my list'}
        </button>
        {onAgain && (
          <button className="pc-btn pc-again" onClick={onAgain}>
            Another one
          </button>
        )}
      </div>
    </motion.article>
  );
}

function Wishlist({
  wishes,
  setWishes,
  onOpen,
}: {
  wishes: Wish[];
  setWishes: React.Dispatch<React.SetStateAction<Wish[]>>;
  /** open a saved place's card in the guide */
  onOpen: (placeId: string) => void;
}) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const w = await api<Wish>('/api/wishes', 'POST', { text });
      setWishes((ws) => [w, ...ws]);
      setText('');
      setErr('');
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function toggle(id: string) {
    setWishes((ws) => ws.map((w) => (w.id === id ? { ...w, done: !w.done } : w)));
    api(`/api/wishes/${id}`, 'POST').catch(() => {});
  }
  async function remove(id: string) {
    setWishes((ws) => ws.filter((w) => w.id !== id));
    api(`/api/wishes/${id}`, 'DELETE').catch(() => {});
  }

  return (
    <section className="wish" aria-label="Milano wishlist">
      <h2>My list</h2>
      <ul>
        <AnimatePresence initial={false}>
          {wishes.map((w) => (
            <motion.li
              key={w.id}
              className={w.done ? 'done' : ''}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <button className="check" onClick={() => toggle(w.id)} aria-pressed={w.done} aria-label={w.done ? `Mark ${w.text} as not done` : `Mark ${w.text} as done`}>
                {w.done ? '🌷' : ''}
              </button>
              <span>
                {w.placeId ? (
                  <button className="wish-open" onClick={() => onOpen(w.placeId!)} aria-label={`Open ${w.text} in the guide`}>
                    {w.text} <span aria-hidden="true">📍</span>
                  </button>
                ) : (
                  w.text
                )}
                {w.fromName && <small className="wish-from">from {w.fromName}</small>}
              </span>
              <button className="x" onClick={() => remove(w.id)} aria-label={`Remove ${w.text}`}>
                ×
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        {!wishes.length && (
          <li>
            <span style={{ opacity: 0.6 }}>A café you walked past, a shop to go back to, a weekend trip…</span>
          </li>
        )}
      </ul>
      <form onSubmit={add}>
        <input className="h-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a place or plan" aria-label="Add a place or plan" />
        <button className="cta h-small-btn" type="submit" disabled={!text.trim()}>
          Add
        </button>
      </form>
      {err && <p className="h-err">{err}</p>}
    </section>
  );
}

export default function Milano({
  info,
  wishes: initial,
  heroDecor,
  guideDecor,
  beachDecor,
}: {
  info: { arrival: string; homeCity: string; homeZone: string; milanZone: string; laCity: string; laZone: string };
  wishes: Wish[];
  heroDecor?: React.ReactNode;
  guideDecor?: React.ReactNode;
  beachDecor?: React.ReactNode;
}) {
  const now = useNow(15_000);
  const day = dayInfo(now, info.arrival);
  const [wishes, setWishes] = useState(initial);
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [selected, setSelected] = useState<Place | null>(null);
  const [fromSurprise, setFromSurprise] = useState(false);
  const [rolling, setRolling] = useState<string | null>(null);
  const recent = useRef<string[]>([]);
  const guideRef = useRef<HTMLElement>(null);
  const here = useHere();
  const [near, setNear] = useState(false);
  const wantNear = useRef(false);

  // once she's allowed location from the Near me chip, switch it on
  useEffect(() => {
    if (wantNear.current && here.status === 'on') {
      wantNear.current = false;
      setNear(true);
    }
    if (here.status === 'denied' || here.status === 'unavailable') wantNear.current = false;
  }, [here.status]);

  const kmTo = useMemo(() => {
    const at = here.at;
    return (p: Place) => (at ? distanceKm(at, p) : null);
  }, [here.at]);

  // the map and Surprise me share the mood chips; beaches only show when asked for
  const byMood = useMemo(() => places.filter((p) => (cat === 'all' ? p.cat !== 'beach' : p.cat === cat)), [cat]);
  const nearest = useMemo(() => (here.at ? [...byMood].sort((a, b) => kmTo(a)! - kmTo(b)!) : byMood), [byMood, here.at, kmTo]);
  // far from Milano (say, still at home): nothing is "near", so keep the whole guide
  const farAway = here.at && nearest.length ? kmTo(nearest[0])! > 50 : false;
  const pool = useMemo(() => {
    if (!near || !here.at || farAway) return byMood;
    // a short walk first, then a longer one, then simply the closest dozen
    for (const r of [1.2, 3]) {
      const within = nearest.filter((p) => kmTo(p)! <= r);
      if (within.length >= 6) return within;
    }
    return nearest.slice(0, 12);
  }, [near, here.at, farAway, byMood, nearest, kmTo]);
  const beaches = useMemo(() => {
    const all = places.filter((p) => p.cat === 'beach');
    return here.at ? all.sort((a, b) => kmTo(a)! - kmTo(b)!) : all;
  }, [here.at, kmTo]);
  const savedTexts = useMemo(() => new Set(wishes.map((w) => w.text)), [wishes]);

  function toggleNear() {
    if (near) return setNear(false);
    if (here.status === 'on') return setNear(true);
    wantNear.current = true;
    here.ask();
  }

  function choose(p: Place, surprise = false) {
    setSelected(p);
    setFromSurprise(surprise);
    recent.current = [p.id, ...recent.current.filter((id) => id !== p.id)].slice(0, Math.min(8, Math.floor(pool.length / 2)));
  }

  function surprise() {
    if (!pool.length || rolling) return;
    const fresh = pool.filter((p) => !recent.current.includes(p.id) && p.id !== selected?.id);
    const from = fresh.length ? fresh : pool;
    const pick = from[Math.floor(Math.random() * from.length)];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return choose(pick, true);
    // a quick shuffle through names before landing
    let n = 0;
    const t = setInterval(() => {
      setRolling(pool[Math.floor(Math.random() * pool.length)].name);
      if (++n >= 9) {
        clearInterval(t);
        setRolling(null);
        choose(pick, true);
      }
    }, 70);
  }

  async function save(p: Place) {
    return saveText(wishText(p), p.id);
  }
  async function saveText(text: string, placeId?: string) {
    if (savedTexts.has(text)) return;
    try {
      const w = await api<Wish>('/api/wishes', 'POST', { text, placeId });
      setWishes((ws) => [w, ...ws]);
    } catch {}
  }

  // arriving from elsewhere (e.g. the jar's "something calming") with ?place=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('place');
    if (id) openPlace(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** From her list: open the place's card and pin, whatever mood was showing. */
  function openPlace(id: string) {
    const p = places.find((x) => x.id === id);
    if (!p) return;
    setNear(false);
    setCat(p.cat === 'beach' ? 'beach' : 'all');
    choose(p);
    guideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showOnMap(p: Place) {
    setCat('beach');
    choose(p);
    guideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pickCat(c: Category | 'all') {
    setCat(c);
    if (selected && c !== 'all' && selected.cat !== c) setSelected(null);
    if (selected && c === 'all' && selected.cat === 'beach') setSelected(null);
  }

  return (
    <>
      <section className="mil-top">
        {heroDecor}
        <div className="mil-hero">
          <div className="mil-count" suppressHydrationWarning>
            {now ? day.n : '·'}
          </div>
          <div className="mil-count-label" suppressHydrationWarning>
            {day.before ? (day.n === 1 ? 'sleep until Milano' : 'sleeps until Milano') : 'days in Milano'}
          </div>
        </div>
        <div className="mil-clocks" aria-label="Clocks">
          <Face now={now} zone={info.milanZone} city="Milano" />
          <Face now={now} zone={info.homeZone} city={info.homeCity} />
          <Face now={now} zone={info.laZone} city={info.laCity} />
        </div>
      </section>

      <div className="mil-layout">
        <div className="mil-main">
          <section className="mil-guide" ref={guideRef} aria-labelledby="mil-guide-title">
            {guideDecor}
            <p className="hand mil-kicker">what are you in the mood for?</p>
            <h2 id="mil-guide-title" className="mil-h2">
              Your little Milano
            </h2>
            <div className="mil-chips" role="group" aria-label="Choose a mood">
              <button
                className="mil-chip mil-near"
                aria-pressed={near}
                onClick={toggleNear}
                disabled={here.status === 'asking'}
                style={{ ['--tint' as string]: '#ffd6e4' }}
              >
                📍 {here.status === 'asking' ? 'Finding you…' : 'Near me'}
              </button>
              <button className="mil-chip" aria-pressed={cat === 'all'} onClick={() => pickCat('all')} style={{ ['--tint' as string]: '#fbe3e8' }}>
                ✨ Everything
              </button>
              {categories.map((c) => (
                <button key={c.id} className="mil-chip" aria-pressed={cat === c.id} onClick={() => pickCat(c.id)} style={{ ['--tint' as string]: c.tint }}>
                  {c.icon} {c.short}
                </button>
              ))}
            </div>

            {here.status === 'denied' && (
              <p className="mil-here-note">Location is blocked for this site. Allow it in the browser’s site settings, then tap Near me again.</p>
            )}
            {here.status === 'unavailable' && <p className="mil-here-note">Couldn’t find your location just now. Try again in a moment.</p>}
            {near && farAway && here.at && (
              <p className="mil-here-note">
                You’re about {Math.round(kmTo(nearest[0])!).toLocaleString('en-GB')} km from Milano, so here’s the whole guide. It’ll all be waiting for you.
              </p>
            )}

            <div className="mil-guide-grid">
              <div className="mil-map">
                <MiniMap places={pool} selected={selected} onPick={(p) => choose(p)} me={here.at} nearMe={near && !farAway} />
                <p className="mil-map-hint">
                  Tap a pin to open it · {pool.length} {near && !farAway ? 'places near you' : 'places'}
                </p>
              </div>
              <div className="mil-card-col">
                <button className="mil-surprise" onClick={surprise} disabled={!!rolling}>
                  <span className="mil-surprise-spark" aria-hidden="true">
                    ✦
                  </span>
                  {rolling ? <span className="mil-rolling">{rolling}</span> : 'Surprise me'}
                </button>
                <AnimatePresence mode="wait">
                  {selected ? (
                    <PlaceCard
                      key={selected.id}
                      place={selected}
                      km={kmTo(selected)}
                      saved={savedTexts.has(wishText(selected))}
                      onSave={() => save(selected)}
                      onAgain={fromSurprise ? surprise : undefined}
                    />
                  ) : (
                    <motion.div key="empty" className="pc pc-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <p className="whisper">Pick a mood, then tap Surprise me, or tap any pin on the map.</p>
                      <p className="hand">a place, what to order, and the way there</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {here.at && (
              <div className="mil-around">
                <p className="hand">around you right now</p>
                <div>
                  {AROUND.map((a) => (
                    <a key={a.q} href={mapsAround(a.q, here.at!)} target="_blank" rel="noreferrer">
                      {a.icon} {a.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          <Happenings onSave={saveText} saved={savedTexts} />

          <section className="mil-beaches" aria-labelledby="mil-beach-title">
            <div className="mil-beach-head">
              {beachDecor}
              <p className="hand mil-kicker">sun, salt and a good book</p>
              <h2 id="mil-beach-title" className="mil-h2">
                Beaches to run away to
              </h2>
              <p className="whisper mil-sub">From the lidos in Milano to the islands. Times are rough, door to door.</p>
            </div>
            {BEACH_REGIONS.map((region) => {
              const list = beaches.filter((b) => b.region === region);
              if (!list.length) return null;
              return (
                <div key={region} className="mil-region">
                  <h3>{region}</h3>
                  <div className="mil-beach-row">
                    {list.map((b) => (
                      <article key={b.id} className="bc">
                        <div className="bc-top">
                          <h4>{b.name}</h4>
                          {b.reach && <span className="bc-reach">{b.reach}</span>}
                        </div>
                        <p className="bc-area">
                          {b.area}
                          {here.at && !farAway ? ` · ${distanceLabel(kmTo(b)!)}` : ''}
                        </p>
                        <p className="bc-note">{b.note}</p>
                        <div className="bc-actions">
                          <a href={mapsLink(b)} target="_blank" rel="noreferrer">
                            Directions
                          </a>
                          <button onClick={() => showOnMap(b)}>Map</button>
                          <button onClick={() => save(b)} disabled={savedTexts.has(wishText(b))}>
                            {savedTexts.has(wishText(b)) ? 'Saved ✓' : 'Save'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        <aside className="mil-side">
          <Wishlist wishes={wishes} setWishes={setWishes} onOpen={openPlace} />
        </aside>
      </div>
    </>
  );
}
