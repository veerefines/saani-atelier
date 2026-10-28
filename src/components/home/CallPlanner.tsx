'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNow } from './Clock';
import { usePeople, type Other } from './usePeople';
import { clock12, hour12 } from '@/lib/time';
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

/** One person (or group in the same zone): when you're both awake, across my day. */
function plan(now: Date, me: string, g: Group) {
  const nowMin = minutesIn(now, me);
  const dayStart = new Date(now.getTime() - nowMin * 60_000 - now.getSeconds() * 1000);
  const at = (m: number) => new Date(dayStart.getTime() + m * 60_000);
  const ok = Array.from({ length: (24 * 60) / SLOT }, (_, i) => awake(at(i * SLOT), me) && awake(at(i * SLOT), g.tz));
  const windows = runs(ok);
  const nowSlot = Math.floor(nowMin / SLOT);
  const next = windows.find(([, b]) => b > nowMin);
  return {
    windows,
    hours: Array.from({ length: 24 }, (_, h) => {
      const a = ok[h * 2];
      const b = ok[h * 2 + 1];
      return { h, cls: `${a && b ? 'all' : a || b ? 'some' : ''}${Math.floor(nowSlot / 2) === h ? ' now' : ''}` };
    }),
    goodNow: ok[nowSlot],
    next: next && next[0] > nowMin ? next[0] : null,
    there: clock(now, g.tz),
    theirs: windows.map(([a, b]) => `${clock(at(a), g.tz)}–${clock(at(b), g.tz)}`),
    same: minutesIn(now, me) === minutesIn(now, g.tz),
  };
}

type Plan = ReturnType<typeof plan>;

/** The folded view: a word per person (or group) on whether now is good. */
function status(p: Plan) {
  if (p.goodNow) return { text: 'good now', yes: true };
  if (p.next !== null) return { text: `from ${hhmm(p.next)}`, yes: false };
  return { text: 'tomorrow', yes: false };
}

function Row({ p, g, me1 }: { p: Plan; g: Group; me1: string }) {
  const who = names(g.names);
  const mine = p.windows.map(([a, b]) => `${hhmm(a)}–${hhmm(b)}`);
  return (
    <div className="call-row">
      <p className="call-who">
        <b>{who}</b>
        <span>
          {g.city} · it’s {p.there} there
        </span>
      </p>
      <div className="today-hours" aria-hidden="true">
        {p.hours.map((x) => (
          <i key={x.h} className={x.cls} title={`${hour12(x.h)} your time`} />
        ))}
      </div>
      <div className="today-hours-scale" aria-hidden="true">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>12 AM</span>
      </div>
      <small>
        {p.same
          ? `Same time as you, so anytime ${hhmm(AWAKE.from)}–${hhmm(AWAKE.to)} works, for you to call ${who} or for ${g.names.length > 1 ? 'them' : who} to call you.`
          : mine.length
            ? `Best time for you to call ${who}, or for ${g.names.length > 1 ? 'them' : who} to call you: ${mine.join(' and ')} your time (${p.theirs.join(' and ')} for ${g.names.length > 1 ? 'them' : who}).`
            : `No hour today when you’re both awake. Leave ${who} a voice note instead.`}
      </small>
      {!p.same && mine.length > 0 && (
        <small className={`call-now${p.goodNow ? ' yes' : ''}`}>
          {p.goodNow ? `📞 Good moment right now, ${me1}.` : p.next !== null ? `Next good time: ${hhmm(p.next)} your time.` : 'That’s it for today; try again tomorrow.'}
        </small>
      )}
    </div>
  );
}

/**
 * "Good time to call": uses this browser's time zone (where you're signed in from) and everyone
 * else's from their last visit. Saanika sees her people; a friend sees Saanika.
 */
export default function CallPlanner({ firstName }: { firstName: string }) {
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
                  {g.names.length > 2 ? `${g.names[0]} +${g.names.length - 1}` : names(g.names)} · {st.text}
                </span>
              );
            })}
          </span>
        )}
        <span className="call-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div id="call-details">
          {groups.map((g, i) => (
            <Row key={g.tz} p={plans[i]} g={g} me1={firstName} />
          ))}
          {!groups.length && <small>Nobody to call yet.</small>}
        </div>
      )}
    </div>
  );
}
