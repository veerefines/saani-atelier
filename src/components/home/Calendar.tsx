'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import type { CalItem, CalKind } from '@/lib/calendar';
import { googleLink } from '@/lib/ical';
import { sfx } from '@/lib/sound';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const KIND: Record<CalKind, { label: string; dot: string }> = {
  event: { label: 'Workshops, shows & markets', dot: '#b9a4e8' },
  special: { label: 'Special days', dot: '#f27ca2' },
  festival: { label: 'Festivals', dot: '#f2c84b' },
  meetup: { label: 'Meetups', dot: '#7fb7d9' },
  reminder: { label: 'Reminders', dot: '#e0a84b' },
};
const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shift = (m: string, n: number) => {
  const d = new Date(`${m}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const clock = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};

/** A pastel paper planner of everything with a date: events, special days, festivals, meetups, reminders. */
export default function Calendar({ initial, today }: { initial: { month: string; items: CalItem[] }; today: string }) {
  const [month, setMonth] = useState(initial.month);
  const [items, setItems] = useState<CalItem[]>(initial.items);
  const [day, setDay] = useState<string | null>(null);
  const [show, setShow] = useState<Record<CalKind, boolean>>({ event: true, special: true, festival: true, meetup: true, reminder: true });

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
  // the grid: Monday-first weeks covering the month
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
  // long runs (an exhibition for months) only get a sticker on their first and last day
  const span = (x: CalItem) => (Date.parse(x.end) - Date.parse(x.start)) / 86_400_000;
  const stickers = (d: string) => on(d).filter((x) => x.kind === 'festival' ? x.start === d : span(x) <= 4 || x.start === d || x.end === d);
  const longOn = (d: string) => on(d).filter((x) => x.kind !== 'festival' && span(x) > 4 && x.start !== d && x.end !== d);
  const festivalOn = (d: string) => items.find((x) => x.kind === 'festival' && x.start <= d && x.end >= d);

  const events = items.filter((x) => x.kind === 'event');
  const fresh = events.filter((x) => x.isNew);
  const specials = items.filter((x) => x.kind === 'special' || x.kind === 'festival');

  const go = (n: number) => {
    sfx('page');
    setDay(null);
    setMonth(shift(month, n));
  };

  return (
    <div className="cal">
      <section className="cal-digest" aria-label={`${monthName(month)} in Milano`}>
        <p className="hand cal-digest-kicker">this month in Milano</p>
        <h2>
          {events.length ? `${events.length} ${events.length === 1 ? 'thing' : 'things'} to do` : 'A quiet month (so far)'}
          {fresh.length ? <small> · {fresh.length} new ✨</small> : null}
        </h2>
        {events.length > 0 && (
          <div className="cal-digest-list">
            {events.slice(0, 8).map((x) => (
              <button key={x.id} type="button" className="cal-pill" style={{ ['--tint' as string]: x.tint }} onClick={() => setDay(x.start < `${month}-01` ? `${month}-01` : x.start)}>
                <span aria-hidden="true">{x.emoji}</span> {x.title}
                <small>{x.start.slice(0, 7) === month ? +x.start.slice(8) : 'on now'}</small>
              </button>
            ))}
          </div>
        )}
        {specials.length > 0 && <p className="cal-digest-specials">{[...new Set(specials.map((x) => `${x.emoji} ${x.title}`))].join(' · ')}</p>}
        {events.length > 0 && (
          <a className="cal-all" href={`/api/calendar/ics?month=${month}`} onClick={() => sfx('tick')}>
            📲 Add the whole month to my calendar
          </a>
        )}
      </section>

      <section className="cal-sheet" aria-label={monthName(month)}>
        <header className="cal-head">
          <button type="button" onClick={() => go(-1)} aria-label="Previous month" data-quiet>
            ‹
          </button>
          <h2>{monthName(month)}</h2>
          <button type="button" onClick={() => go(1)} aria-label="Next month" data-quiet>
            ›
          </button>
        </header>
        <div className="cal-legend" role="group" aria-label="Show">
          {(Object.keys(KIND) as CalKind[]).map((k) => (
            <button key={k} type="button" aria-pressed={show[k]} onClick={() => setShow({ ...show, [k]: !show[k] })} style={{ ['--dot' as string]: KIND[k].dot }}>
              <i aria-hidden="true" /> {KIND[k].label}
            </button>
          ))}
        </div>
        <div className="cal-week" aria-hidden="true">
          {WEEK.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <motion.div
          key={month}
          className="cal-grid"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_e, i) => (i.offset.x < -60 ? go(1) : i.offset.x > 60 ? go(-1) : null)}
        >
          {cells.map((d, k) =>
            d ? (
              <button
                key={d}
                type="button"
                className={`cal-day${d === today ? ' today' : ''}${d === day ? ' picked' : ''}${d < today ? ' past' : ''}`}
                style={festivalOn(d) ? { ['--fest' as string]: festivalOn(d)!.tint } : undefined}
                onClick={() => (sfx('tap'), setDay(d === day ? null : d))}
                aria-label={`${dayLabel(d)}${on(d).length ? `, ${on(d).length} things` : ''}`}
              >
                <b>{+d.slice(8)}</b>
                <span className="cal-stickers" aria-hidden="true">
                  {stickers(d)
                    .slice(0, 3)
                    .map((x) => (
                      <i key={x.id} title={x.title}>
                        {x.emoji}
                      </i>
                    ))}
                  {stickers(d).length > 3 && <em>+{stickers(d).length - 3}</em>}
                </span>
                {longOn(d).length > 0 && <span className="cal-ongoing" aria-hidden="true" />}
              </button>
            ) : (
              <span key={`e${k}`} className="cal-day blank" aria-hidden="true" />
            ),
          )}
        </motion.div>
      </section>

      <AnimatePresence>
        {day && (
          <motion.section key={day} className="cal-dayview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} aria-label={dayLabel(day)}>
            <h3>
              {dayLabel(day)}
              <button type="button" onClick={() => setDay(null)} aria-label="Close">
                ×
              </button>
            </h3>
            {!on(day).length && <p className="cal-none">Nothing planned. A free day for a gelato walk? 🍨</p>}
            {[on(day).filter((x) => !longOn(day).includes(x)), longOn(day)].map((group, gi) =>
              group.length ? (
            <ul key={gi} className={gi ? 'cal-also' : undefined}>
              {gi === 1 && <li className="cal-also-title">also on, all through these days</li>}
              {group.map((x) => (
                <li key={x.id} style={{ ['--tint' as string]: x.tint }}>
                  <span className="cal-item-emoji" aria-hidden="true">
                    {x.emoji}
                  </span>
                  <div className="cal-item-body">
                    <small>
                      {x.label}
                      {x.time ? ` · ${clock(x.time)}` : x.start !== x.end ? ` · until ${new Date(`${x.end}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}` : ''}
                      {x.tentative ? ' · dates to be confirmed' : ''}
                      {x.isNew ? ' · ✨ new' : ''}
                    </small>
                    <b>{x.title}</b>
                    {x.where && <span className="cal-where">📍 {x.where}</span>}
                    {x.note && x.kind !== 'festival' && <p>{x.note}</p>}
                    <div className="cal-actions">
                      {x.href && <Link href={x.href}>Details →</Link>}
                      {x.kind !== 'reminder' && (
                        <>
                          <a href={googleLink(x.ev)} target="_blank" rel="noreferrer">
                            Google Calendar
                          </a>
                          <a href={`/api/calendar/ics?item=${encodeURIComponent(x.id)}`}>Apple (.ics)</a>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
              ) : null,
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
