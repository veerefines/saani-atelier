'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cityCalendars, happeningKinds, happenings, type Happening, type HappeningKind } from '@/content/happenings';

const DAY = 86_400_000;
const fmt = (iso: string, withYear = true) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });

function range(e: { start: string; end: string }) {
  const [a, b] = [e.start, e.end];
  if (a.slice(0, 7) === b.slice(0, 7)) return `${+a.slice(8)}–${fmt(b)}`;
  return `${fmt(a, false)} – ${fmt(b)}`;
}

/** The next edition still to come (or happening now), with a friendly "in 4 months". */
function nextEdition(h: Happening, now: number) {
  const e = h.editions?.find((x) => new Date(`${x.end}T23:59:59`).getTime() >= now);
  if (!e) return null;
  const start = new Date(`${e.start}T00:00:00`).getTime();
  const days = Math.ceil((start - now) / DAY);
  const soon =
    days <= 0 ? 'happening now' : days === 1 ? 'tomorrow' : days < 14 ? `in ${days} days` : days < 60 ? `in ${Math.round(days / 7)} weeks` : `in ${Math.round(days / 30)} months`;
  return { e, days, soon };
}

export default function Happenings({ onSave, saved }: { onSave: (text: string) => void; saved: Set<string> }) {
  const [kind, setKind] = useState<HappeningKind>('dates');
  const now = useMemo(() => Date.now(), []);

  const list = useMemo(() => {
    const items = happenings.filter((h) => h.kind === kind);
    if (kind !== 'dates') return items;
    // soonest first; ones without known dates at the end
    return [...items].sort((a, b) => (nextEdition(a, now)?.days ?? 1e6) - (nextEdition(b, now)?.days ?? 1e6));
  }, [kind, now]);

  return (
    <section className="hap" aria-labelledby="hap-title">
      <p className="hand mil-kicker">grow, glow and meet your people</p>
      <h2 id="hap-title" className="mil-h2">
        Workshops, shows &amp; people
      </h2>
      <p className="whisper mil-sub">Things to learn, see and be part of in Milano. Dates are checked; listings open live.</p>

      <div className="mil-chips" role="tablist" aria-label="What kind">
        {happeningKinds.map((k) => (
          <button
            key={k.id}
            role="tab"
            aria-selected={kind === k.id}
            aria-pressed={kind === k.id}
            className="mil-chip"
            style={{ ['--tint' as string]: k.tint }}
            onClick={() => setKind(k.id)}
          >
            {k.icon} {k.label}
          </button>
        ))}
      </div>

      <div className="hap-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((h, i) => {
            const next = nextEdition(h, now);
            const tint = happeningKinds.find((k) => k.id === h.kind)!.tint;
            const saveText = `${h.title}${next ? ` · ${range(next.e)}` : ''}`;
            return (
              <motion.article
                key={h.id}
                className="hc"
                style={{ ['--tint' as string]: tint }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                exit={{ opacity: 0, scale: 0.97 }}
                layout
              >
                {next ? (
                  <div className={`hc-when${next.days <= 0 ? ' now' : ''}`}>
                    <b>{range(next.e)}</b>
                    <span>{next.soon}</span>
                  </div>
                ) : h.usually ? (
                  <div className="hc-when">
                    <b>{h.usually}</b>
                  </div>
                ) : h.editions ? (
                  <div className="hc-when">
                    <b>Next dates on the site</b>
                  </div>
                ) : null}
                <h3>{h.title}</h3>
                <p className="hc-where">{h.where}</p>
                <p className="hc-note">{h.note}</p>
                <div className="hc-links">
                  {h.links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                      {l.label} ↗
                    </a>
                  ))}
                  <button onClick={() => onSave(saveText)} disabled={saved.has(saveText)}>
                    {saved.has(saveText) ? 'Saved ✓' : 'Save'}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      <p className="hap-cal">
        <span className="hand">and everything else:</span>
        {cityCalendars.map((c) => (
          <a key={c.url} href={c.url} target="_blank" rel="noreferrer">
            {c.label} ↗
          </a>
        ))}
      </p>
    </section>
  );
}
