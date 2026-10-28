'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { cityCalendars, happeningKinds, happenings, type Happening, type HappeningKind } from '@/content/happenings';
import { googleLink } from '@/lib/ical';
import { api } from '@/lib/upload-client';
import { sfx } from '@/lib/sound';
import { emit } from '@/components/jelly/bus';

const DAY = 86_400_000;
const fmt = (iso: string, withYear = true) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
const todayMilan = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

function range(e: { start: string; end: string }) {
  const [a, b] = [e.start, e.end];
  if (a === b) return fmt(a);
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

// a little illustration for each kind, until (or instead of) a photo from the organiser
const ART: Record<HappeningKind, string> = {
  dates: 'shopping-pisa',
  workshop: 'study-set',
  exhibition: 'vintage-camera',
  market: 'shopping-bag',
  talk: 'books',
  tea: 'matcha',
  runway: 'hatbox',
  network: 'cake-cafe',
};
const isNew = (h: Happening) => Boolean(h.added && h.added > '2026-10-24' && Date.now() - Date.parse(h.added) <= 30 * DAY);

type Tab = HappeningKind | 'soon';

export default function Happenings({ onSave, saved }: { onSave: (text: string) => void; saved: Set<string> }) {
  const [kind, setKind] = useState<Tab>('soon');
  const [focus, setFocus] = useState<string | null>(null);
  const now = useMemo(() => Date.now(), []);

  // arriving from the calendar or a nudge with ?event=<id>: open it
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('event');
    const h = id && happenings.find((x) => x.id === id);
    if (!h) return;
    setKind(nextEdition(h, Date.now()) ? 'soon' : h.kind);
    setFocus(h.id);
    setTimeout(() => document.getElementById(`hc-${h.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
  }, []);

  const list = useMemo(() => {
    if (kind === 'soon') {
      // everything with a date in the next three months, soonest first
      return happenings.filter((h) => {
        const n = nextEdition(h, now);
        return n && n.days <= 92;
      }).sort((a, b) => nextEdition(a, now)!.days - nextEdition(b, now)!.days);
    }
    const items = happenings.filter((h) => h.kind === kind);
    return [...items].sort((a, b) => (nextEdition(a, now)?.days ?? 1e6) - (nextEdition(b, now)?.days ?? 1e6));
  }, [kind, now]);

  return (
    <section className="hap" id="happenings" aria-labelledby="hap-title">
      <p className="hand mil-kicker">grow, glow and meet your people</p>
      <h2 id="hap-title" className="mil-h2">
        Workshops, shows &amp; people
      </h2>
      <p className="whisper mil-sub">
        Things to learn, see and be part of in Milano, with everything you need to decide.{' '}
        <Link href="/home/calendar" className="hap-callink">
          See them all on your calendar →
        </Link>
      </p>

      <div className="mil-chips" role="tablist" aria-label="What kind">
        <button role="tab" aria-selected={kind === 'soon'} aria-pressed={kind === 'soon'} className="mil-chip" style={{ ['--tint' as string]: '#ffd6e4' }} onClick={() => setKind('soon')}>
          ⏳ Coming up
        </button>
        {happeningKinds.map((k) => (
          <button key={k.id} role="tab" aria-selected={kind === k.id} aria-pressed={kind === k.id} className="mil-chip" style={{ ['--tint' as string]: k.tint }} onClick={() => setKind(k.id)}>
            {k.icon} {k.label}
          </button>
        ))}
      </div>

      <div className="hap-grid">
        {!list.length && <p className="hap-empty">Nothing here just yet. New things are added every week ✨</p>}
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((h, i) => (
            <EventCard key={h.id} h={h} i={i} now={now} focus={focus === h.id} onSave={onSave} saved={saved} />
          ))}
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

function EventCard({ h, i, now, focus, onSave, saved }: { h: Happening; i: number; now: number; focus: boolean; onSave: (t: string) => void; saved: Set<string> }) {
  const next = nextEdition(h, now);
  const k = happeningKinds.find((x) => x.id === h.kind)!;
  const saveText = `${h.title}${next ? ` · ${range(next.e)}` : ''}`;
  const d = h.details ?? {};
  const [cal, setCal] = useState(false);
  const [reminded, setReminded] = useState(false);
  const [msg, setMsg] = useState('');
  const itemId = next ? `h:${h.id}:${next.e.start}` : null;

  useEffect(() => {
    try {
      setReminded(localStorage.getItem(`remind-${itemId}`) === '1');
    } catch {}
  }, [itemId]);

  async function remind() {
    if (!next) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = todayMilan();
    const jobs: { day: string; time: string; text: string }[] = [];
    // a week before (so she can plan), and the evening before
    const weekBefore = addDays(next.e.start, -7);
    if (weekBefore > today) jobs.push({ day: weekBefore, time: '10:00', text: `📅 Next week: ${h.title} (${range(next.e)})` });
    const eve = addDays(next.e.start, -1);
    if (eve >= today) jobs.push({ day: eve, time: '19:00', text: `📅 Tomorrow: ${h.title}${d.time ? ` · ${d.time}` : ''}` });
    if (!jobs.length) return setMsg('It’s on now. Go go go! ✨');
    try {
      for (const j of jobs) await api('/api/reminders', 'POST', { ...j, tz, repeat: 'none' });
      sfx('chime');
      setReminded(true);
      setMsg(jobs.length === 2 ? 'Jelly will remind you a week before and the evening before ⏰' : 'Jelly will remind you the evening before ⏰');
      try {
        localStorage.setItem(`remind-${itemId}`, '1');
      } catch {}
      emit('jelly:reminders', null);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  const google = next
    ? googleLink({ uid: itemId!, title: h.title, start: next.e.start, end: next.e.end, time: next.e.time, where: d.address ?? h.where, details: [h.note, d.time, d.price].filter(Boolean).join('\n'), url: h.links[0]?.url })
    : '';

  return (
    <motion.article
      id={`hc-${h.id}`}
      className={`hc${focus ? ' focus' : ''}`}
      style={{ ['--tint' as string]: k.tint }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04 } }}
      exit={{ opacity: 0, scale: 0.97 }}
      layout
    >
      <div className="hc-art">
        {h.image ? (
          <>
            <img className="hc-photo" src={h.image.src} alt="" loading="lazy" />
            <a className="hc-credit" href={h.image.from} target="_blank" rel="noreferrer">
              📷 {h.image.credit}
            </a>
          </>
        ) : (
          <img className="hc-illo" src={`/corner/home/items/${ART[h.kind]}.webp`} alt="" loading="lazy" />
        )}
        <span className="hc-kind">
          {k.icon} {k.label}
        </span>
        {isNew(h) && <span className="hc-new">✨ New</span>}
        {next ? (
          <span className={`hc-sticker${next.days <= 0 ? ' now' : next.days <= 7 ? ' soon' : ''}`}>
            <b>{range(next.e)}</b>
            <small>{next.e.tentative ? 'dates to be confirmed' : next.soon}</small>
          </span>
        ) : h.usually ? (
          <span className="hc-sticker">
            <b>{h.usually}</b>
          </span>
        ) : null}
      </div>

      <h3>{h.title}</h3>
      <p className="hc-where">{h.where}</p>
      <p className="hc-note">{h.note}</p>

      {(d.time || d.price || d.language || d.address || d.booking || d.goodFor || next?.e.time) && (
        <dl className="hc-details">
          {(d.time || next?.e.time) && (
            <div>
              <dt>🕰️</dt>
              <dd>{d.time ?? next?.e.time}</dd>
            </div>
          )}
          {d.price && (
            <div>
              <dt>🎟️</dt>
              <dd>{d.price}</dd>
            </div>
          )}
          {d.language && (
            <div>
              <dt>🗣️</dt>
              <dd>{d.language}</dd>
            </div>
          )}
          {d.address && (
            <div>
              <dt>📍</dt>
              <dd>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}`} target="_blank" rel="noreferrer">
                  {d.address}
                </a>
              </dd>
            </div>
          )}
          {d.booking && (
            <div>
              <dt>✍️</dt>
              <dd>{d.booking}</dd>
            </div>
          )}
          {d.goodFor && (
            <div>
              <dt>💡</dt>
              <dd>{d.goodFor}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="hc-links">
        {h.links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
            {l.label} ↗
          </a>
        ))}
        {next && (
          <button type="button" onClick={remind} disabled={reminded} data-quiet>
            {reminded ? '⏰ Reminding' : '🔔 Remind me'}
          </button>
        )}
        {next && (
          <span className="hc-cal">
            <button type="button" onClick={() => setCal(!cal)} aria-expanded={cal} data-quiet>
              📅 Add to calendar
            </button>
            {cal && (
              <span className="hc-cal-menu">
                <a href={google} target="_blank" rel="noreferrer" onClick={() => sfx('tick')}>
                  Google Calendar
                </a>
                <a href={`/api/calendar/ics?item=${encodeURIComponent(itemId!)}`} onClick={() => sfx('tick')}>
                  Apple / other (.ics)
                </a>
              </span>
            )}
          </span>
        )}
        <button type="button" onClick={() => onSave(saveText)} disabled={saved.has(saveText)}>
          {saved.has(saveText) ? 'Saved ✓' : 'Save'}
        </button>
      </div>
      {msg && <p className="hc-msg">{msg}</p>}
    </motion.article>
  );
}
