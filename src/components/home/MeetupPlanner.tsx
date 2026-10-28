'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '@/lib/upload-client';
import { sfx } from '@/lib/sound';
import { goodTimes } from '@/lib/overlap';
import { MEETUP_TITLES, type Meetup, type Rsvp } from '@/lib/meetup-model';
import { checkSoon } from '@/components/jelly/bus';

type Friend = { id: string; name: string; hasEmail: boolean; tz: string; city: string };
type Shown = Meetup & { friends: { id: string; name: string; rsvp: Rsvp | null }[] };
type Data = { google: { ready: boolean; linked: boolean; email: string | null }; me: { tz: string; city: string }; friends: Friend[]; meetups: Shown[] };

const first = (n: string) => n.split(' ')[0];
const when = (iso: string, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).replace(':00', '');
const clockIn = (d: Date, tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(d).replace(':00', '');
const RSVP = { yes: '🎉 coming', maybe: '🤞 maybe', no: '💗 can’t' } as const;
const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
/** "2026-11-14T19:30" in this browser's zone, for the datetime box. */
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

/** Video calls with her people on Google Meet: pick friends, a time that suits everyone, done. */
export default function MeetupPlanner({ status }: { status: string | null }) {
  const [d, setD] = useState<Data | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [at, setAt] = useState('');
  const [minutes, setMinutes] = useState(45);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState(
    status === 'linked' ? 'Google is connected. Jelly can make Meet links now ✨' : status === 'error' ? 'Google didn’t connect. Try again?' : status === 'declined' ? 'No worries, you can connect Google any time.' : status === 'off' ? 'Google Meet isn’t switched on for the site yet (Varun is setting it up).' : '',
  );

  const load = useCallback(() => api<Data>('/api/meetups', 'GET').then(setD).catch(() => setErr('Couldn’t load your meetups.')), []);
  useEffect(() => {
    load();
  }, [load]);

  const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const picked = (d?.friends ?? []).filter((f) => chosen.includes(f.id));
  const times = useMemo(() => (picked.length ? goodTimes(myTz, picked.map((f) => f.tz), 7) : []), [myTz, picked.map((f) => f.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const atDate = at ? new Date(at) : null;

  function surprise() {
    if (!d?.friends.length) return;
    sfx('spin');
    const pool = [...d.friends].sort(() => Math.random() - 0.5);
    const group = pool.slice(0, Math.min(pool.length, 1 + Math.floor(Math.random() * Math.min(3, pool.length))));
    const slots = goodTimes(myTz, group.map((f) => f.tz), 7);
    setChosen(group.map((f) => f.id));
    setTitle(pick(MEETUP_TITLES));
    if (slots.length) setAt(local(pick(slots.slice(0, 4))));
    setTimeout(() => sfx('land'), 500);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!atDate) return setErr('Pick a time.');
    setBusy(true);
    setErr('');
    try {
      const r = await api<{ meetup: Meetup; noEmail: string[] }>('/api/meetups', 'POST', { title, start: atDate.toISOString(), minutes, friendIds: chosen });
      sfx('harp');
      setNote(`Done! It’s in your Google Calendar with a Meet link${r.noEmail.length ? `. ${r.noEmail.join(', ')} ${r.noEmail.length === 1 ? 'has' : 'have'} no email in admin, so they’ll only see it on their desk` : ', and Google has emailed everyone'} 💌`);
      setChosen([]);
      setTitle('');
      setAt('');
      load();
      checkSoon();
    } catch (x) {
      sfx('nope');
      setErr((x as Error).message);
    }
    setBusy(false);
  }

  async function cancel(m: Shown) {
    if (!confirm(`Cancel “${m.title}”? Google will let everyone know.`)) return;
    try {
      await api(`/api/meetups/${m.id}`, 'DELETE');
      sfx('paper');
      load();
    } catch (x) {
      sfx('nope');
      setErr((x as Error).message);
    }
  }

  if (!d) return <p className="mt-loading">Jelly’s checking the calendar… 🪼</p>;

  return (
    <div className="mt">
      {note && <p className="mt-note">{note}</p>}

      {d.google.linked && (
        <section className="mt-account">
          <span className="mt-account-dot" aria-hidden="true" />
          <p>
            <b>Google connected</b>
            <small>{d.google.email ?? 'calls go in this Google Calendar'}</small>
          </p>
          <a href="/api/google/connect?switch=1" className="mt-account-btn">
            Switch account
          </a>
          <button
            type="button"
            className="mt-account-btn quiet"
            onClick={async () => {
              if (!confirm('Disconnect Google? Calls already planned stay in your calendar; new ones need Google connected again.')) return;
              await api('/api/google/disconnect', 'POST').catch(() => {});
              sfx('paper');
              setNote('Google disconnected. Connect again any time 💌');
              load();
            }}
          >
            Disconnect
          </button>
        </section>
      )}

      {!d.google.linked && (
        <section className="mt-connect">
          <img src="/corner/home/items/vintage-camera.webp" alt="" width={64} height={64} />
          <div>
            <b>Connect Google once</b>
            <p>Jelly puts each call in your Google Calendar with a Google Meet link, and Google emails your friends the invite. She only gets to add and change calendar events, nothing else.</p>
          </div>
          {d.google.ready ? (
            <a className="mt-go" href="/api/google/connect">
              Connect Google
            </a>
          ) : (
            <span className="mt-soon">coming soon</span>
          )}
        </section>
      )}

      <form className="mt-plan" onSubmit={create}>
        <div className="mt-plan-head">
          <h2 className="hand">plan a call</h2>
          <button type="button" className="mt-surprise" onClick={surprise} disabled={!d.friends.length} data-quiet>
            🎲 Surprise me
          </button>
        </div>

        <p className="mt-label">Who?</p>
        <div className="mt-friends" role="group" aria-label="Friends">
          {d.friends.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={chosen.includes(f.id)}
              onClick={() => (sfx('pop'), setChosen((c) => (c.includes(f.id) ? c.filter((x) => x !== f.id) : [...c, f.id])))}
              data-quiet
            >
              <span className="mt-av" aria-hidden="true">
                {f.name[0]}
              </span>
              <span>
                <b>{first(f.name)}</b>
                <small>
                  {f.city}
                  {!f.hasEmail ? ' · no email yet' : ''}
                </small>
              </span>
            </button>
          ))}
          {!d.friends.length && <p className="mt-muted">Add your friends in admin first.</p>}
        </div>

        {picked.length > 0 && (
          <>
            <p className="mt-label">When? Times everyone’s awake</p>
            <div className="mt-times">
              {times.slice(0, 6).map((t) => (
                <button key={t.toISOString()} type="button" aria-pressed={at === local(t)} onClick={() => (sfx('tick'), setAt(local(t)))} data-quiet>
                  <b>{when(t.toISOString(), myTz)}</b>
                  <small>{picked.map((f) => `${first(f.name)} ${clockIn(t, f.tz)}`).join(' · ')}</small>
                </button>
              ))}
              {!times.length && <p className="mt-muted">No hour this week when you’re all awake. Pick one below anyway?</p>}
            </div>
          </>
        )}

        <div className="mt-row">
          <label>
            <span>or pick your own</span>
            <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} min={local(new Date())} />
          </label>
          <label>
            <span>how long</span>
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              {[30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60} h${m % 60 ? ' 30' : ''}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        {atDate && picked.length > 0 && <p className="mt-their">For them: {picked.map((f) => `${first(f.name)} ${when(atDate.toISOString(), f.tz)}`).join(' · ')}</p>}

        <label className="mt-title">
          <span>call it</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chai & chisme ☕" maxLength={80} />
        </label>
        {err && <p className="mt-err">{err}</p>}
        <button className="mt-go big" disabled={busy || !chosen.length || !at || !title.trim() || !d.google.linked}>
          {busy ? 'Making the Meet link…' : d.google.linked ? '💻 Schedule on Google Meet' : 'Connect Google to schedule'}
        </button>
      </form>

      <section className="mt-list" aria-label="Coming up">
        <h2 className="hand">coming up</h2>
        {!d.meetups.length && <p className="mt-muted">No calls planned. Surprise someone? 🎲</p>}
        <AnimatePresence initial={false}>
          {d.meetups.map((m) => {
            const live = Date.parse(m.start) - Date.now() < 15 * 60_000;
            return (
              <motion.article key={m.id} className="mt-card" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                <div className="mt-card-when">
                  <b>{when(m.start, myTz)}</b>
                  <small>{m.minutes} min</small>
                </div>
                <h3>{m.title}</h3>
                <ul className="mt-rsvps">
                  {m.friends.map((f) => (
                    <li key={f.id} className={f.rsvp ?? 'none'}>
                      {first(f.name)} <small>{f.rsvp ? RSVP[f.rsvp] : 'hasn’t said'}</small>
                    </li>
                  ))}
                </ul>
                <div className="mt-actions">
                  {m.meetLink && (
                    <a className={`mt-go${live ? ' live' : ''}`} href={m.meetLink} target="_blank" rel="noreferrer">
                      {live ? '🔴 Join now' : 'Join on Google Meet'}
                    </a>
                  )}
                  <a href={`/api/calendar/ics?item=m:${m.id}`}>Apple (.ics)</a>
                  <button type="button" onClick={() => cancel(m)}>
                    Cancel
                  </button>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </section>
    </div>
  );
}
