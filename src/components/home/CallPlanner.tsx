'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNow } from './Clock';
import { usePeople, type Other } from './usePeople';
import { clock12 } from '@/lib/time';
import { AWAKE, SLOT, awake, minutesIn } from '@/lib/overlap';

type Group = { tz: string; city: string; names: string[] };

const hhmm = (m: number) => clock12(Math.floor(m / 60), m % 60);
const clock = (d: Date, tz: string) => hhmm(minutesIn(d, tz));
const names = (n: string[]) => (n.length > 2 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n.join(' and '));

/** Runs of consecutive good slots, as [startMinute, endMinute) of my day. */
function runs(ok: boolean[]) {
  const out: [number, number][] = [];
  ok.forEach((g, i) => {
    if (!g) return;
    const last = out[out.length - 1];
    if (last && last[1] === i * SLOT) last[1] = (i + 1) * SLOT;
    else out.push([i * SLOT, (i + 1) * SLOT]);
  });
  return out;
}

/** "in 1h 32m", "in 20m" */
const until = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);
/** A zone's distance from UTC right now, in minutes */
const utcOffset = (d: Date, tz: string) => Math.round((Date.parse(d.toLocaleString('en-US', { timeZone: tz })) - Date.parse(d.toLocaleString('en-US', { timeZone: 'UTC' }))) / 60_000);
/** "12½h ahead", "9h behind" */
function offset(d: number) {
  if (!d) return 'same time as you';
  const h = Math.floor(Math.abs(d) / 60);
  const half = Math.abs(d) % 60 === 30 ? '½' : Math.abs(d) % 60 ? `:${String(Math.abs(d) % 60).padStart(2, '0')}` : '';
  return `${h}${half}h ${d > 0 ? 'ahead' : 'behind'}`;
}

/** One person (or group in the same zone): when you're both awake, across my day. */
function plan(now: Date, me: string, g: Group) {
  const nowMin = minutesIn(now, me);
  const dayStart = new Date(now.getTime() - nowMin * 60_000 - now.getSeconds() * 1000);
  const at = (m: number) => new Date(dayStart.getTime() + m * 60_000);
  const ok = Array.from({ length: (24 * 60) / SLOT }, (_, i) => awake(at(i * SLOT), me) && awake(at(i * SLOT), g.tz));
  const windows = runs(ok);
  const current = windows.find(([a, b]) => a <= nowMin && nowMin < b);
  const next = windows.find(([a]) => a > nowMin);
  const theirMin = minutesIn(now, g.tz);
  return {
    nowMin,
    windows: windows.map(([a, b]) => ({ a, b, theirs: `${clock(at(a), g.tz)}–${clock(at(b), g.tz)}` })),
    goodNow: Boolean(current),
    endsAt: current ? current[1] : null,
    next: next ? next[0] : null,
    there: clock(now, g.tz),
    phase: phaseOf(theirMin),
    offset: offset(utcOffset(now, g.tz) - utcOffset(now, me)),
    same: theirMin === nowMin,
  };
}

/** What the sky is doing there: morning, afternoon, evening (5 to 9 PM) or night. */
function phaseOf(min: number) {
  const h = Math.floor(min / 60);
  if (h >= 5 && h < 12) return { emoji: '🌅', label: 'morning' };
  if (h >= 12 && h < 17) return { emoji: '☀️', label: 'afternoon' };
  if (h >= 17 && h < 21) return { emoji: '🌇', label: 'evening' };
  return { emoji: '🌙', label: 'night' };
}

type Plan = ReturnType<typeof plan>;

/** A word per person (or group) on whether now is good, for the folded view and the row's pill. */
function status(p: Plan) {
  if (p.goodNow) return { text: `good now · until ${hhmm(p.endsAt!)}`, short: 'good now', yes: true };
  if (p.next !== null) return { text: `next at ${hhmm(p.next)} · in ${until(p.next - p.nowMin)}`, short: `from ${hhmm(p.next)}`, yes: false };
  return { text: 'try tomorrow', short: 'tomorrow', yes: false };
}

const pct = (m: number) => `${(m / 1440) * 100}%`;

function Row({ p, g }: { p: Plan; g: Group }) {
  const who = names(g.names);
  const st = status(p);
  return (
    <div className="call-row">
      <div className="call-head">
        <p className="call-who">
          <b>{who}</b>
          <span>
            <span title={p.phase.label}>{p.phase.emoji}</span> {p.there} in {g.city} · {p.offset}
          </span>
        </p>
        <span className={`call-state${st.yes ? ' yes' : ''}`}>
          <i aria-hidden="true" />
          {st.text}
        </span>
      </div>

      <div className="call-line" aria-hidden="true">
        {p.windows.map((w) => (
          <span key={w.a} className={`call-win${w.a <= p.nowMin && p.nowMin < w.b ? ' on' : ''}`} style={{ left: pct(w.a), width: pct(w.b - w.a) }} />
        ))}
        <span className="call-needle" style={{ left: pct(p.nowMin) }}>
          <em>now</em>
        </span>
      </div>
      <div className="call-scale" aria-hidden="true">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>12 AM</span>
      </div>

      {p.windows.length ? (
        <ul className="call-wins" aria-label={`Good times to call ${who}`}>
          {p.windows.map((w) => (
            <li key={w.a} className={w.a <= p.nowMin && p.nowMin < w.b ? 'on' : w.b <= p.nowMin ? 'past' : ''}>
              <b>
                {hhmm(w.a)}–{hhmm(w.b)}
              </b>
              <span>{p.same ? 'for both of you' : `${w.theirs} for ${g.names.length > 1 ? 'them' : who}`}</span>
            </li>
          ))}
        </ul>
      ) : (
        <small>No hour today when you’re both awake. Leave {who} a voice note instead 🎙️</small>
      )}
    </div>
  );
}

/**
 * "Good time to call": uses this browser's time zone (where you're signed in from) and everyone
 * else's from their last visit. Saanika sees her people; a friend sees Saanika.
 */
export default function CallPlanner() {
  const now = useNow(60_000);
  const people = usePeople();
  const me = people?.tz ?? null;
  const others: Other[] | null = people?.others ?? null;

  const groups = useMemo(() => {
    const by = new Map<string, Group>();
    for (const o of others ?? []) {
      const g = by.get(o.tz) ?? { tz: o.tz, city: o.city, names: [] };
      g.names.push(o.name.split(' ')[0]);
      by.set(o.tz, g);
    }
    return [...by.values()];
  }, [others]);

  const plans = useMemo(() => (now && me ? groups.map((g) => plan(now, me, g)) : []), [now, me, groups]);

  // folded by default to save room on the desk; remembered on this device
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(localStorage.getItem('call-open') === '1');
    } catch {}
  }, []);
  const toggle = () =>
    setOpen((o) => {
      try {
        localStorage.setItem('call-open', o ? '0' : '1');
      } catch {}
      return !o;
    });

  if (!now || !me || !others) return null;
  return (
    <div className={`today-call${open ? ' open' : ''}`}>
      <button type="button" className="call-toggle" aria-expanded={open} aria-controls="call-details" onClick={toggle}>
        <span className="hand">good time to call</span>
        {!open && groups.length > 0 && (
          <span className="call-peek">
            {groups.map((g, i) => {
              const st = status(plans[i]);
              return (
                <span key={g.tz} className={`call-chip${st.yes ? ' yes' : ''}`}>
                  <i aria-hidden="true" />
                  {g.names.length > 2 ? `${g.names[0]} +${g.names.length - 1}` : names(g.names)} · {st.short}
                </span>
              );
            })}
          </span>
        )}
        <span className="dd-caret call-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div id="call-details">
          {groups.map((g, i) => (
            <Row key={g.tz} p={plans[i]} g={g} />
          ))}
          {!groups.length && <small>Nobody to call yet.</small>}
          {groups.length > 0 && (
            <p className="call-key">
              <i aria-hidden="true" /> you’re both awake (8 AM–11 PM) · times on the line are yours
            </p>
          )}
        </div>
      )}
    </div>
  );
}
