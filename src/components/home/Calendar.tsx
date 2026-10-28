'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { CalItem, CalKind } from '@/lib/calendar';
import { googleLink } from '@/lib/ical';
import { sfx } from '@/lib/sound';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const KIND: Record<CalKind, { label: string; dot: string }> = {
  event: { label: 'Events', dot: '#a98be6' },
  special: { label: 'Special days', dot: '#f27ca2' },
  festival: { label: 'Festivals', dot: '#f2b84b' },
  meetup: { label: 'Meetups', dot: '#5fa3e0' },
  reminder: { label: 'Reminders', dot: '#e0904b' },
};
const LANES = 2; // multi-day bars a week row shows before "+ more"
const DAY = 86_400_000;
const monthOnly = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
const shift = (m: string, n: number) => {
  const d = new Date(`${m}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const weekday = (d: string, style: 'long' | 'short' = 'long') => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: style, timeZone: 'UTC' });
const clock = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};
const days = (x: CalItem) => Math.round((Date.parse(x.end) - Date.parse(x.start)) / DAY) + 1;
/** Long runs (an exhibition, a month of Natale): gathered once as "on all month" rather than drawn on the grid. */
const isLong = (x: CalItem) => days(x) > 14;
const isSpan = (x: CalItem) => !isLong(x) && days(x) > 1;
const countdown = (today: string, x: CalItem) => {
  if (x.start <= today && x.end >= today) return 'on now';
  const n = Math.round((Date.parse(x.start) - Date.parse(today)) / DAY);
  if (n < 0) return 'passed';
  return n === 1 ? 'tomorrow' : n < 7 ? `in ${n} days` : n < 14 ? 'next week' : `in ${Math.round(n / 7)} weeks`;
};

/** A word from Jelly about the month. */
function jellyTip(items: CalItem[]) {
  const markets = items.filter((x) => x.label.startsWith('Markets')).length;
  const shows = items.filter((x) => x.label.startsWith('Exhib')).length;
  const meet = items.filter((x) => x.kind === 'meetup').length;
  if (meet) return `${meet} ${meet === 1 ? 'call' : 'calls'} with your people this month. Jelly’s saving you a seat 💻`;
  if (markets >= 2) return `${markets} markets this month: comfy shoes and a big tote, cara! 🛍️`;
  if (shows) return `${shows} ${shows === 1 ? 'exhibition' : 'exhibitions'} to see. Perfect moodboard fuel ✨`;
  if (items.some((x) => x.kind === 'festival')) return 'A festive month! Jelly’s already in costume 🪼';
  return 'A calm month. Time for long walks and gelato 🍨';
}

/** Her planner: everything with a date, in the Atelier's paper-and-pastel style. */
export default function Calendar({ initial, today }: { initial: { month: string; items: CalItem[] }; today: string }) {
  const [month, setMonth] = useState(initial.month);
  const [items, setItems] = useState<CalItem[]>(initial.items);
  const [day, setDay] = useState<string>(today.slice(0, 7) === initial.month ? today : `${initial.month}-01`);
  const [show, setShow] = useState<Record<CalKind, boolean>>({ event: true, special: true, festival: true, meetup: true, reminder: true });
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [sheet, setSheet] = useState(false);
  const [phone, setPhone] = useState(false);
  const [dir, setDir] = useState(1);

  // phones open on the agenda (a month grid is cramped there); her own choice is remembered
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const set = () => setPhone(mq.matches);
    set();
    mq.addEventListener('change', set);
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('cal-view');
    } catch {}
    setView(saved === 'month' || saved === 'agenda' ? saved : mq.matches ? 'agenda' : 'month');
    return () => mq.removeEventListener('change', set);
  }, []);
  const pickView = (v: 'month' | 'agenda') => {
    sfx('tick');
    setView(v);
    try {
      localStorage.setItem('cal-view', v);
    } catch {}
  };

  useEffect(() => {
    if (month === initial.month) return setItems(initial.items);
    let stop = false;
    fetch(`/api/calendar/items?month=${month}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !stop && d && setItems(d.items))
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, [month, initial]);

  const visible = useMemo(() => items.filter((x) => show[x.kind]), [items, show]);
  const on = useCallback((d: string) => visible.filter((x) => x.start <= d && x.end >= d), [visible]);

  const go = useCallback(
    (n: number) => {
      sfx('page');
      setDir(n);
      const m = shift(month, n);
      setMonth(m);
      setDay(m === today.slice(0, 7) ? today : `${m}-01`);
    },
    [month, today],
  );
  const toToday = () => {
    sfx('tick');
    setDir(today.slice(0, 7) >= month ? 1 : -1);
    setMonth(today.slice(0, 7));
    setDay(today);
  };
  const pick = (d: string) => {
    sfx('tap');
    if (d.slice(0, 7) !== month) {
      setDir(d.slice(0, 7) > month ? 1 : -1);
      setMonth(d.slice(0, 7));
    }
    setDay(d);
    if (phone) setSheet(true);
  };

  // arrow keys move the picked day (and the month with it)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select') || view !== 'month') return;
      const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
      if (!step) return;
      e.preventDefault();
      const next = addDays(day, step);
      if (next.slice(0, 7) !== month) {
        setDir(step > 0 ? 1 : -1);
        setMonth(next.slice(0, 7));
      }
      setDay(next);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [day, month, view]);

  // Monday-first weeks covering the month
  const weeks = useMemo(() => {
    const first = `${month}-01`;
    const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
    const start = addDays(first, -lead);
    const out: string[][] = [];
    for (let w = 0; w < 6; w++) {
      const row = Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i));
      if (w > 3 && row[0].slice(0, 7) !== month) break;
      out.push(row);
    }
    return out;
  }, [month]);

  const events = items.filter((x) => x.kind === 'event');
  const fresh = events.filter((x) => x.isNew);
  const ongoing = visible.filter(isLong);
  const from = today.slice(0, 7) === month ? today : `${month}-01`;
  const upNext = visible
    .filter((x) => !isLong(x) && x.end >= from && x.start.slice(0, 7) <= month)
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .slice(0, 3);

  return (
    <div className="cal3">
      <section className="cal3-hero" aria-label={`${monthOnly(month)} in Milano`}>
        <img className="cal3-tape" src="/reveal/washi.webp" alt="" aria-hidden="true" />
        <div className="cal3-hero-text">
          <p className="hand">this month in Milano</p>
          <h2>
            <span>{monthOnly(month)}</span>
            <em>{events.length ? `${events.length} ${events.length === 1 ? 'thing' : 'things'} to do` : 'quiet, so far'}</em>
          </h2>
          <p className="cal3-tip">{jellyTip(items)}</p>
          <div className="cal3-hero-actions">
            {fresh.length > 0 && <span className="cal3-badge">✨ {fresh.length} new</span>}
            {events.length > 0 && (
              <a className="cal3-cta" href={`/api/calendar/ics?month=${month}`} onClick={() => sfx('tick')}>
                📲 Add the month to my calendar
              </a>
            )}
          </div>
        </div>
        <img className="cal3-hero-art" src="/corner/jelly/hd/joyful.webp" alt="" width={680} height={680} />
      </section>

      {upNext.length > 0 && (
        <section className="cal3-next" aria-label="Up next">
          <p className="hand">up next</p>
          <div>
            {upNext.map((x) => (
              <button key={x.id} type="button" className="cal3-next-card" style={{ ['--dot' as string]: KIND[x.kind].dot }} onClick={() => pick(x.start < from ? from : x.start)} data-quiet>
                <span className="cal3-next-date">
                  <b>{+x.start.slice(8)}</b>
                  <small>{short(x.start).split(' ')[1]}</small>
                </span>
                <span className="cal3-next-text">
                  <small>{countdown(today, x)}</small>
                  <b>
                    {x.emoji} {x.title}
                  </b>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="cal3-body">
        <section className="cal3-card" aria-label="Calendar">
          <header className="cal3-head">
            <h2 className="hand">
              {monthOnly(month)} <small>{month.slice(0, 4)}</small>
            </h2>
            <div className="cal3-tools">
              <div className="cal3-seg" role="tablist" aria-label="View">
                {(['month', 'agenda'] as const).map((v) => (
                  <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => pickView(v)} data-quiet>
                    {v === 'month' ? '🗓️ Month' : '📋 Agenda'}
                  </button>
                ))}
              </div>
              <div className="cal3-nav">
                <button type="button" onClick={() => go(-1)} aria-label="Previous month" data-quiet>
                  ‹
                </button>
                <button type="button" onClick={toToday} className="cal3-today-btn" data-quiet>
                  Today
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next month" data-quiet>
                  ›
                </button>
              </div>
            </div>
          </header>

          <div className="cal3-filters" role="group" aria-label="Show">
            {(Object.keys(KIND) as CalKind[]).map((k) => (
              <button key={k} type="button" aria-pressed={show[k]} onClick={() => (sfx('tap'), setShow({ ...show, [k]: !show[k] }))} style={{ ['--dot' as string]: KIND[k].dot }} data-quiet>
                <i aria-hidden="true" /> {KIND[k].label}
              </button>
            ))}
          </div>

          {ongoing.length > 0 && (
            <div className="cal3-ongoing">
              <span className="hand">on all month</span>
              <div>
                {ongoing.map((x) => (
                  <button key={x.id} type="button" onClick={() => pick(x.start >= `${month}-01` ? x.start : `${month}-01`)} style={{ ['--tint' as string]: x.tint }} data-quiet>
                    {x.emoji} {x.title}
                    <small>until {short(x.end)}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${view}-${month}`}
              initial={{ opacity: 0, x: dir * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -24 }}
              transition={{ duration: 0.22 }}
              drag={view === 'month' ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_e, i) => (i.offset.x < -60 ? go(1) : i.offset.x > 60 ? go(-1) : null)}
              className="cal3-pane"
            >
              {view === 'month' ? (
                <MonthGrid weeks={weeks} month={month} today={today} day={day} visible={visible} on={on} onPick={pick} />
              ) : (
                <Agenda month={month} today={today} visible={visible} onPick={pick} />
              )}
            </motion.div>
          </AnimatePresence>
          {view === 'month' && <p className="cal3-hint">swipe or use ← → to move around</p>}
        </section>

        {!phone && <DayPanel day={day} items={on(day)} />}
      </div>

      {/* on <body>: the page transition's transform would otherwise pin the sheet to the page, not the screen */}
      {phone &&
        createPortal(
      <AnimatePresence>
        {sheet && (
          <motion.div className="cal3-sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)}>
            <motion.div
              className="cal3-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_e, i) => i.offset.y > 100 && setSheet(false)}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="cal3-grab" aria-hidden="true" />
              <DayPanel day={day} items={on(day)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/** The month as week rows: multi-day things as bars across the days, single days as chips. */
function MonthGrid({ weeks, month, today, day, visible, on, onPick }: { weeks: string[][]; month: string; today: string; day: string; visible: CalItem[]; on: (d: string) => CalItem[]; onPick: (d: string) => void }) {
  return (
    <div className="cal3-grid">
      <div className="cal3-weekdays" aria-hidden="true">
        {WEEK.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      {weeks.map((row) => {
        const a = row[0];
        const b = row[6];
        // this week's bars, packed into lanes
        const spans = visible.filter((x) => isSpan(x) && x.start <= b && x.end >= a).sort((x, y) => (x.start < y.start ? -1 : x.start > y.start ? 1 : days(y) - days(x)));
        const lanes: { s: string; e: string }[][] = [];
        const placed = spans.map((x) => {
          const s = x.start < a ? a : x.start;
          const e = x.end > b ? b : x.end;
          let lane = lanes.findIndex((l) => l.every((o) => o.e < s || o.s > e));
          if (lane < 0) {
            lane = lanes.length;
            lanes.push([]);
          }
          lanes[lane].push({ s, e });
          return { x, s, e, lane, from: row.indexOf(s), to: row.indexOf(e) };
        });
        const used = Math.min(LANES, lanes.length);
        return (
          <div key={a} className="cal3-week" style={{ ['--lanes' as string]: used }}>
            {row.map((d, i) => {
              const singles = on(d).filter((x) => !isSpan(x) && !isLong(x));
              const hidden = placed.filter((p) => p.lane >= LANES && d >= p.s && d <= p.e).length;
              const extra = Math.max(0, singles.length - 2) + hidden;
              return (
                <button
                  key={d}
                  type="button"
                  className={`cal3-day${d === today ? ' is-today' : ''}${d === day ? ' picked' : ''}${d < today ? ' past' : ''}${d.slice(0, 7) !== month ? ' out' : ''}${i >= 5 ? ' weekend' : ''}`}
                  style={{ gridColumn: i + 1, gridRow: 1 }}
                  onClick={() => onPick(d)}
                  aria-pressed={d === day}
                  aria-label={`${weekday(d)} ${short(d)}${on(d).length ? `, ${on(d).length} on` : ''}`}
                  data-quiet
                >
                  <span className="cal3-num">{+d.slice(8)}</span>
                  <span className="cal3-chips" aria-hidden="true">
                    {singles.slice(0, 2).map((x) => (
                      <i key={x.id} style={{ ['--dot' as string]: KIND[x.kind].dot }}>
                        {x.time ? <small>{clock(x.time)} </small> : null}
                        {x.emoji} {x.title}
                      </i>
                    ))}
                    {extra > 0 && <em>+{extra} more</em>}
                  </span>
                  <span className="cal3-dots" aria-hidden="true">
                    {on(d)
                      .filter((x) => !isLong(x))
                      .slice(0, 4)
                      .map((x) => (
                        <i key={x.id} style={{ background: KIND[x.kind].dot }} />
                      ))}
                  </span>
                </button>
              );
            })}
            {placed
              .filter((p) => p.lane < LANES)
              .map((p) => (
                <button
                  key={p.x.id}
                  type="button"
                  className={`cal3-bar${p.s !== p.x.start ? ' cont-l' : ''}${p.e !== p.x.end ? ' cont-r' : ''}`}
                  style={{ gridColumn: `${p.from + 1} / ${p.to + 2}`, gridRow: 1, ['--lane' as string]: p.lane, ['--dot' as string]: KIND[p.x.kind].dot }}
                  onClick={() => onPick(p.s)}
                  title={`${p.x.title} · ${short(p.x.start)}–${short(p.x.end)}`}
                  data-quiet
                >
                  {p.x.emoji} {p.x.title}
                </button>
              ))}
          </div>
        );
      })}
    </div>
  );
}

/** The month as a list: day by day, with how long until each thing. */
function Agenda({ month, today, visible, onPick }: { month: string; today: string; visible: CalItem[]; onPick: (d: string) => void }) {
  const from = today.slice(0, 7) === month ? today : `${month}-01`;
  const groups = useMemo(() => {
    const g = new Map<string, CalItem[]>();
    for (const x of visible) {
      if (isLong(x) || x.end < from) continue;
      const d = x.start < from ? from : x.start;
      if (d.slice(0, 7) !== month) continue;
      g.set(d, [...(g.get(d) ?? []), x]);
    }
    return [...g.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [visible, month, from]);
  if (!groups.length) return <p className="cal3-none">Nothing else this month. Jelly suggests a long walk by the Navigli 🌷</p>;
  return (
    <ol className="cal3-agenda">
      {groups.map(([d, list]) => (
        <li key={d}>
          <button type="button" className={`cal3-agenda-date${d === today ? ' is-today' : ''}`} onClick={() => onPick(d)} data-quiet>
            <b>{+d.slice(8)}</b>
            <small>{weekday(d, 'short')}</small>
          </button>
          <div className="cal3-agenda-items">
            {list.map((x) => (
              <button key={x.id} type="button" className="cal3-agenda-item" style={{ ['--dot' as string]: KIND[x.kind].dot }} onClick={() => onPick(d)} data-quiet>
                <small>
                  {x.time ? clock(x.time) : days(x) > 1 ? `${short(x.start)} – ${short(x.end)}` : 'all day'} · {countdown(today, x)}
                </small>
                <b>
                  {x.emoji} {x.title}
                </b>
                {x.where && <span>📍 {x.where}</span>}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

function DayPanel({ day, items }: { day: string; items: CalItem[] }) {
  const long = items.filter(isLong);
  const main = items.filter((x) => !isLong(x));
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section key={day} className="cal3-dayview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} aria-label={`${weekday(day)} ${short(day)}`}>
        <header>
          <span className="cal3-bignum">
            <b>{+day.slice(8)}</b>
            <small>{short(day).split(' ')[1]}</small>
          </span>
          <p>
            <b className="hand">{weekday(day)}</b>
            <small>{main.length ? `${main.length} ${main.length === 1 ? 'thing' : 'things'} planned` : 'nothing planned yet'}</small>
          </p>
        </header>
        {!main.length && (
          <div className="cal3-empty">
            <img src="/corner/jelly/hd/calm.webp" alt="" />
            <p>A free day! Jelly votes for a cappuccino and a wander ☕</p>
          </div>
        )}
        <ol className="cal3-items">
          {main.map((x) => (
            <Item key={x.id} x={x} />
          ))}
        </ol>
        {long.length > 0 && (
          <>
            <p className="cal3-also hand">also on these days</p>
            <ol className="cal3-items compact">
              {long.map((x) => (
                <Item key={x.id} x={x} compact />
              ))}
            </ol>
          </>
        )}
      </motion.section>
    </AnimatePresence>
  );
}

function Item({ x, compact }: { x: CalItem; compact?: boolean }) {
  return (
    <li className="cal3-item" style={{ ['--dot' as string]: KIND[x.kind].dot }}>
      <span className="cal3-when">{x.time ? clock(x.time) : days(x) > 1 ? `until ${short(x.end)}` : 'all day'}</span>
      <div className="cal3-item-body">
        <small>
          {x.emoji} {x.label}
          {x.tentative ? ' · dates tbc' : ''}
          {x.isNew ? ' · ✨ new' : ''}
        </small>
        <b>{x.title}</b>
        {x.where && !compact && <span className="cal3-where">📍 {x.where}</span>}
        {x.note && !compact && x.kind !== 'festival' && <p>{x.note}</p>}
        <div className="cal3-actions">
          {x.href && <Link href={x.href}>Details →</Link>}
          {x.kind !== 'reminder' && (
            <>
              <a href={googleLink(x.ev)} target="_blank" rel="noreferrer">
                + Google
              </a>
              <a href={`/api/calendar/ics?item=${encodeURIComponent(x.id)}`}>+ Apple</a>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
