'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
const monthOnly = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
const shift = (m: string, n: number) => {
  const d = new Date(`${m}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const weekday = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
const clock = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};
const span = (x: CalItem) => (Date.parse(x.end) - Date.parse(x.start)) / 86_400_000;
/** Runs of more than a few days (an exhibition for months): shown once, as "on all month". */
const isLong = (x: CalItem) => x.kind !== 'festival' && span(x) > 4;

/** Her planner: everything with a date, in the site's soft, glassy style. */
export default function Calendar({ initial, today }: { initial: { month: string; items: CalItem[] }; today: string }) {
  const [month, setMonth] = useState(initial.month);
  const [items, setItems] = useState<CalItem[]>(initial.items);
  const [day, setDay] = useState<string>(today.slice(0, 7) === initial.month ? today : `${initial.month}-01`);
  const [show, setShow] = useState<Record<CalKind, boolean>>({ event: true, special: true, festival: true, meetup: true, reminder: true });
  const [dir, setDir] = useState(1);

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

  const visible = items.filter((x) => show[x.kind]);
  const cells = useMemo(() => {
    const first = new Date(`${month}-01T12:00:00Z`);
    const lead = (first.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) out.push(`${month}-${String(d).padStart(2, '0')}`);
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);
  const on = (d: string) => visible.filter((x) => x.start <= d && x.end >= d);
  // what a day cell shows: short things, and long runs only on their first and last day
  const inCell = (d: string) => on(d).filter((x) => x.kind !== 'festival' && (!isLong(x) || x.start === d || x.end === d));
  const festival = (d: string) => (show.festival ? items.find((x) => x.kind === 'festival' && x.start <= d && x.end >= d) : undefined);

  const events = items.filter((x) => x.kind === 'event');
  const fresh = events.filter((x) => x.isNew);
  const ongoing = visible.filter((x) => isLong(x));
  const specials = [...new Map(items.filter((x) => x.kind === 'special' || x.kind === 'festival').map((x) => [x.title, x])).values()];

  const go = (n: number) => {
    sfx('page');
    setDir(n);
    const m = shift(month, n);
    setMonth(m);
    setDay(m === today.slice(0, 7) ? today : `${m}-01`);
  };
  const toToday = () => {
    sfx('tick');
    setDir(today.slice(0, 7) > month ? 1 : -1);
    setMonth(today.slice(0, 7));
    setDay(today);
  };

  return (
    <div className="cal2">
      {/* the month at a glance */}
      <section className="cal2-hero" aria-label={`${monthOnly(month)} in Milano`}>
        <div className="cal2-hero-text">
          <p className="hand">this month in Milano</p>
          <h2>
            <span>{monthOnly(month)}</span>
            <em>{events.length ? `${events.length} ${events.length === 1 ? 'thing' : 'things'} to do` : 'a quiet month, so far'}</em>
          </h2>
          <div className="cal2-stats">
            {fresh.length > 0 && <span>✨ {fresh.length} new</span>}
            {specials.slice(0, 4).map((x) => (
              <span key={x.id}>
                {x.emoji} {x.title}
              </span>
            ))}
          </div>
          {events.length > 0 && (
            <a className="cal2-cta" href={`/api/calendar/ics?month=${month}`} onClick={() => sfx('tick')}>
              Add the whole month to my calendar
            </a>
          )}
        </div>
        <img className="cal2-hero-art" src="/corner/jelly/hd/joyful.webp" alt="" width={680} height={680} />
      </section>

      <div className="cal2-body">
        <section className="cal2-card" aria-label="Month">
          <header className="cal2-head">
            <h2>
              {monthOnly(month)} <small>{month.slice(0, 4)}</small>
            </h2>
            <div className="cal2-nav">
              <button type="button" onClick={() => go(-1)} aria-label="Previous month" data-quiet>
                ‹
              </button>
              <button type="button" onClick={toToday} className="cal2-today" data-quiet>
                Today
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next month" data-quiet>
                ›
              </button>
            </div>
          </header>

          <div className="cal2-filters" role="group" aria-label="Show">
            {(Object.keys(KIND) as CalKind[]).map((k) => (
              <button key={k} type="button" aria-pressed={show[k]} onClick={() => (sfx('tap'), setShow({ ...show, [k]: !show[k] }))} style={{ ['--dot' as string]: KIND[k].dot }} data-quiet>
                <i aria-hidden="true" /> {KIND[k].label}
              </button>
            ))}
          </div>

          {ongoing.length > 0 && (
            <div className="cal2-ongoing">
              <span className="hand">on all month</span>
              {ongoing.map((x) => (
                <button key={x.id} type="button" onClick={() => setDay(x.start >= `${month}-01` ? x.start : `${month}-01`)} style={{ ['--tint' as string]: x.tint }}>
                  {x.emoji} {x.title}
                  <small>until {short(x.end)}</small>
                </button>
              ))}
            </div>
          )}

          <div className="cal2-week" aria-hidden="true">
            {WEEK.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={month}
              className="cal2-grid"
              custom={dir}
              initial={{ opacity: 0, x: dir * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -24 }}
              transition={{ duration: 0.22 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_e, i) => (i.offset.x < -60 ? go(1) : i.offset.x > 60 ? go(-1) : null)}
            >
              {cells.map((d, k) => {
                if (!d) return <span key={`e${k}`} className="cal2-day blank" aria-hidden="true" />;
                const list = inCell(d);
                const fest = festival(d);
                const wk = k % 7 >= 5;
                return (
                  <button
                    key={d}
                    type="button"
                    className={`cal2-day${d === today ? ' today' : ''}${d === day ? ' picked' : ''}${d < today ? ' past' : ''}${wk ? ' weekend' : ''}${fest ? ' fest' : ''}`}
                    style={fest ? { ['--fest' as string]: fest.tint } : undefined}
                    onClick={() => (sfx('tap'), setDay(d))}
                    aria-label={`${weekday(d)} ${short(d)}${on(d).length ? `, ${on(d).length} on` : ''}`}
                    aria-pressed={d === day}
                    data-quiet
                  >
                    <span className="cal2-num">{+d.slice(8)}</span>
                    {fest && fest.start === d && (
                      <span className="cal2-fest" title={fest.title} aria-hidden="true">
                        {fest.emoji}
                      </span>
                    )}
                    <span className="cal2-chips" aria-hidden="true">
                      {list.slice(0, 2).map((x) => (
                        <i key={x.id} style={{ ['--dot' as string]: KIND[x.kind].dot }}>
                          <b>{x.emoji}</b> {x.title}
                        </i>
                      ))}
                      {list.length > 2 && <em>+{list.length - 2} more</em>}
                    </span>
                    <span className="cal2-dots" aria-hidden="true">
                      {list.slice(0, 4).map((x) => (
                        <i key={x.id} style={{ background: KIND[x.kind].dot }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </section>

        <DayPanel day={day} items={on(day)} long={on(day).filter(isLong)} />
      </div>
    </div>
  );
}

function DayPanel({ day, items, long }: { day: string; items: CalItem[]; long: CalItem[] }) {
  const main = items.filter((x) => !long.includes(x));
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section key={day} className="cal2-dayview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} aria-label={`${weekday(day)} ${short(day)}`}>
        <header>
          <span className="cal2-bignum">{+day.slice(8)}</span>
          <p>
            <b>{weekday(day)}</b>
            <small>{new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</small>
          </p>
        </header>
        {!items.length && (
          <div className="cal2-empty">
            <img src="/corner/home/items/cappuccino.webp" alt="" />
            <p>Nothing planned. A free day for a cappuccino and a wander? ☕</p>
          </div>
        )}
        <ol className="cal2-items">
          {main.map((x) => (
            <Item key={x.id} x={x} />
          ))}
        </ol>
        {long.length > 0 && (
          <>
            <p className="cal2-also hand">also on these days</p>
            <ol className="cal2-items compact">
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
    <li className="cal2-item" style={{ ['--dot' as string]: KIND[x.kind].dot, ['--tint' as string]: x.tint }}>
      <span className="cal2-when">{x.time ? clock(x.time) : x.start !== x.end ? `until ${short(x.end)}` : 'all day'}</span>
      <div className="cal2-item-body">
        <small>
          {x.emoji} {x.label}
          {x.tentative ? ' · dates tbc' : ''}
          {x.isNew ? ' · ✨ new' : ''}
        </small>
        <b>{x.title}</b>
        {x.where && !compact && <span className="cal2-where">📍 {x.where}</span>}
        {x.note && !compact && x.kind !== 'festival' && <p>{x.note}</p>}
        <div className="cal2-actions">
          {x.href && <Link href={x.href}>Details</Link>}
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
