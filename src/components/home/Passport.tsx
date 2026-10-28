'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { sfx } from '@/lib/sound';
import type { Stamp } from '@/lib/extras';
import { categories, distanceKm, distanceLabel, places, type Place } from '@/content/milano';
import { api } from '@/lib/upload-client';
import { useHere } from './useHere';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function pop() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ['#f4a6c0', '#cdb4f0', '#f7e3a1', '#bfe0d6'], ticks: 200 });
}

/** Her stamps, the places around her she can check in to, and every place to collect. */
export default function Passport({ stamps: initial }: { stamps: Stamp[] }) {
  const [stamps, setStamps] = useState(initial);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [cat, setCat] = useState<string>('all');
  const here = useHere();
  const got = useMemo(() => new Map(stamps.map((s) => [s.placeId, s])), [stamps]);

  const nearby = useMemo(() => {
    if (!here.at) return [];
    return places
      .map((p) => ({ p, km: distanceKm(here.at!, p) }))
      .filter((x) => x.km <= 1.5 && !got.has(x.p.id))
      .sort((a, b) => a.km - b.km)
      .slice(0, 6);
  }, [here.at, got]);

  async function stamp(p: Place, manual: boolean) {
    setBusy(p.id);
    setMsg('');
    try {
      const s = await api<Stamp>('/api/stamps', 'POST', manual ? { placeId: p.id, manual: true } : { placeId: p.id, lat: here.at!.lat, lng: here.at!.lng });
      setStamps((x) => [s, ...x.filter((y) => y.placeId !== p.id)]);
      setMsg(`Stamped: ${p.name}!`);
      sfx('stamp');
      pop();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(null);
  }
  async function unstamp(p: Place) {
    setStamps((x) => x.filter((y) => y.placeId !== p.id));
    api(`/api/stamps/${p.id}`, 'DELETE').catch(() => setStamps(initial));
  }

  const shown = categories.filter((c) => cat === 'all' || c.id === cat);

  return (
    <>
      <section className="pp-hero">
        <div className="pp-count">
          <b>{stamps.length}</b>
          <span>of {places.length} stamps</span>
        </div>
        <div className="pp-checkin">
          {!here.at ? (
            <button className="cta" onClick={here.ask} disabled={here.status === 'asking'}>
              📍 {here.status === 'asking' ? 'Finding you…' : 'Check in where I am'}
            </button>
          ) : nearby.length ? (
            <>
              <p className="hand">close to you right now</p>
              <div className="pp-near">
                {nearby.map(({ p, km }) => (
                  <button key={p.id} className="pp-near-btn" onClick={() => stamp(p, km > 0.3)} disabled={busy === p.id}>
                    <b>{p.name}</b>
                    <small>{km <= 0.3 ? 'you’re here: tap to stamp' : `${distanceLabel(km)} · I’ve been`}</small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="pp-none">No unstamped guide places within 1.5 km of you. Explore a little further!</p>
          )}
          {here.status === 'denied' && <p className="pp-none">Location is blocked; you can still mark places as visited below.</p>}
        </div>
        <AnimatePresence>
          {msg && (
            <motion.p className="pp-msg" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status">
              {msg}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      <div className="mil-chips" role="group" aria-label="Category">
        <button className="mil-chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')} style={{ ['--tint' as string]: '#fbe3e8' }}>
          ✨ All
        </button>
        {categories.map((c) => (
          <button key={c.id} className="mil-chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)} style={{ ['--tint' as string]: c.tint }}>
            {c.icon} {c.short}
          </button>
        ))}
      </div>

      {shown.map((c) => {
        const list = places.filter((p) => p.cat === c.id);
        const have = list.filter((p) => got.has(p.id)).length;
        return (
          <section key={c.id} className="pp-cat">
            <h2>
              {c.icon} {c.label} <small>{have}/{list.length}</small>
            </h2>
            <div className="pp-grid">
              {list.map((p) => {
                const s = got.get(p.id);
                return (
                  <div key={p.id} className={`pp-stamp${s ? ' got' : ''}`} style={{ ['--tint' as string]: c.tint }}>
                    <span className="pp-ring" aria-hidden="true">
                      {s ? c.icon : ''}
                    </span>
                    <b>{p.name}</b>
                    {s ? (
                      <small>
                        {s.how === 'here' ? 'checked in' : 'visited'} {fmt(s.createdAt)}{' '}
                        <button onClick={() => unstamp(p)} aria-label={`Remove the stamp for ${p.name}`}>
                          undo
                        </button>
                      </small>
                    ) : (
                      <button className="pp-been" onClick={() => stamp(p, true)} disabled={busy === p.id}>
                        I’ve been
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
