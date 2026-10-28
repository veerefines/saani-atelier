'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '@/lib/upload-client';
import { sfx } from '@/lib/sound';
import { moodSrc } from '@/lib/jelly-mood';
import type { Brief } from '@/lib/brief';
import { emit, jellyEvent, useJelly } from '@/components/jelly/bus';
import SpeakButton from '@/components/jelly/SpeakButton';

// remembered on this device only
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};
const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const clock = (iso: string) => new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).toUpperCase().replace(':00', '');
const todayHere = () => new Intl.DateTimeFormat('en-CA').format(new Date());
const inAnHour = () => {
  const d = new Date(Date.now() + 3600_000);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
};

/**
 * Jelly's morning brief, at the top of the desk: open on her first visit each day, then a slim bar.
 * Hello (dressed for the season), the sky and what to wear, today's reminders (and setting new
 * ones), today's three quests, her streak, pearls and money, and a fact. Jelly can read it aloud.
 */
export default function MorningBrief() {
  const [b, setB] = useState<Brief | null>(null);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const loaded = useRef(false);

  const load = useCallback(() => {
    fetch(`/api/brief?tz=${encodeURIComponent(tz())}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Brief | null) => {
        if (!d) return;
        setB(d);
        if (!loaded.current) {
          loaded.current = true;
          // open on her first visit of the day
          if (store.get('brief-seen') !== d.day) {
            setOpen(true);
            store.set('brief-seen', d.day);
          }
        }
      })
      .catch(() => {});
  }, []);

  // wait for Jelly's hello (which picks today's quests), then keep up with what she does
  const again = useRef(0);
  const refresh = useCallback(() => {
    clearTimeout(again.current);
    again.current = window.setTimeout(load, loaded.current ? 1200 : 0);
  }, [load]);
  useJelly('jelly:home', refresh);
  useJelly('jelly:reminders', refresh);
  useEffect(() => {
    const id = setTimeout(() => !loaded.current && load(), 4000);
    return () => clearTimeout(id);
  }, [load]);

  if (!b) return <div className="mb mb-loading" aria-hidden="true" />;
  const done = b.quests.filter((q) => q.done).length;

  return (
    <section className={`mb${open ? ' open' : ''}`} aria-label="Jelly’s morning brief" style={b.season ? { ['--mb-tint' as string]: b.season.tint } : undefined}>
      <button type="button" className="mb-bar" onClick={() => (sfx(open ? 'paper' : 'page'), setOpen(!open))} aria-expanded={open}>
        <span className="mb-face" aria-hidden="true">
          <img src={b.season ? b.season.jelly : moodSrc('joyful')} alt="" width={44} height={44} />
        </span>
        <span className="mb-bar-text">
          <b>{b.season ? `${b.season.emoji} ${b.season.name}` : b.hello}</b>
          <small>
            {b.weather ? `${b.weather.sky.icon} ${b.weather.now}° · ` : ''}
            {b.quests.length ? `${done}/${b.quests.length} quests` : 'quests on the way'}
            {b.reminders.length ? ` · ⏰ ${b.reminders.length}` : ''}
            {b.streak > 1 ? ` · 🔥 ${b.streak}` : ''}
          </small>
        </span>
        <span className="mb-chev" aria-hidden="true">
          ⌄
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="mb-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-inner">
              <div className="mb-hello">
                <p>{b.season ? b.season.hello : `${b.hello} Here’s your day, from Jelly 🪼`}</p>
                {b.daysToGo > 0 && <span className="mb-pill">✈️ {b.daysToGo === 1 ? 'Milano tomorrow!' : `${b.daysToGo} days to Milano`}</span>}
                {b.remembered && <span className="mb-pill soft">🫧 Jelly remembers: {b.remembered}</span>}
                <SpeakButton brief={b.day} text={b.say} onPlay={() => jellyEvent('brief')} />
              </div>

              {b.weather && (
                <div className="mb-card mb-sky">
                  <span className="mb-big" aria-hidden="true">
                    {b.weather.sky.icon}
                  </span>
                  <p>
                    <b>
                      {b.weather.now}° in Milano, {b.weather.sky.words}
                    </b>
                    <small>
                      {b.weather.min}°–{b.weather.max}°{b.weather.rainChance >= 40 ? ` · ☔ ${b.weather.rainChance}%${b.weather.rainFrom ? ` from ${b.weather.rainFrom}` : ''}` : ''}
                    </small>
                    {b.outfit && <span className="mb-wear">{b.outfit}</span>}
                  </p>
                </div>
              )}

              <div className="mb-card mb-quests">
                <h3>
                  Today’s quests <small>{done === b.quests.length && b.quests.length ? 'all done! 🌟' : '+10 🫧 for all three'}</small>
                </h3>
                {!b.quests.length && <p className="mb-muted">Jelly is picking today’s quests…</p>}
                <ul>
                  {b.quests.map((q) => {
                    const body = (
                      <>
                        <span className="mb-q-icon" aria-hidden="true">
                          {q.done ? '✅' : q.icon}
                        </span>
                        <span className="mb-q-text">
                          <b>{q.title}</b>
                          {q.n > 1 && !q.done && (
                            <i className="mb-q-bar" aria-hidden="true">
                              <span style={{ width: `${(q.have / q.n) * 100}%` }} />
                            </i>
                          )}
                        </span>
                        <span className="mb-q-pearls">
                          <img src="/corner/pearl.webp" alt="" width={14} height={14} />
                          {q.pearls}
                        </span>
                      </>
                    );
                    return (
                      <li key={q.id} className={q.done ? 'done' : ''}>
                        {q.href && !q.done ? (
                          <Link href={q.href} className="mb-q">
                            {body}
                          </Link>
                        ) : (
                          <span className="mb-q">{body}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mb-card mb-rem">
                <h3>
                  Reminders today
                  <button type="button" className="mb-add" onClick={() => setAdding(!adding)} aria-expanded={adding}>
                    {adding ? 'close' : '+ add'}
                  </button>
                </h3>
                {!b.reminders.length && !adding && <p className="mb-muted">Nothing today. Ask Jelly “remind me to…” anytime, or add one here.</p>}
                <ul>
                  {b.reminders.map((r) => (
                    <li key={r.id}>
                      <span>⏰</span>
                      <b>{r.text}</b>
                      <small>
                        {clock(r.at)}
                        {r.repeat !== 'none' ? ` · ${r.repeat}` : ''}
                      </small>
                      <button
                        type="button"
                        aria-label={`Remove “${r.text}”`}
                        onClick={async () => {
                          sfx('paper');
                          setB({ ...b, reminders: b.reminders.filter((x) => x.id !== r.id) });
                          await api(`/api/reminders/${r.id}`, 'DELETE').catch(() => {});
                          emit('jelly:reminders', null);
                        }}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                {adding && <AddReminder onDone={() => (setAdding(false), emit('jelly:reminders', null))} />}
              </div>

              <div className="mb-chips">
                <span>🔥 {b.streak}-day streak</span>
                <Link href="/home/jelly?tab=shop">
                  <img src="/corner/pearl.webp" alt="" width={14} height={14} /> {b.pearls} pearls
                </Link>
                {b.money && (
                  <Link href="/home/money">
                    💶 {b.money.left !== null ? (b.money.left >= 0 ? `€${Math.round(b.money.left)} left` : `€${Math.round(-b.money.left)} over`) : `€${Math.round(b.money.spent)} this month`}
                  </Link>
                )}
              </div>

              <p className="mb-fact">
                <b>Did you know?</b> {b.fact.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function AddReminder({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  const [day, setDay] = useState(todayHere());
  const [time, setTime] = useState(inAnHour());
  const [repeat, setRepeat] = useState('none');
  const [err, setErr] = useState('');
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const r = await api<{ gains: unknown[] }>('/api/reminders', 'POST', { text, day, time, tz: tz(), repeat });
      sfx('chime');
      if (Array.isArray(r.gains) && r.gains.length) emit('jelly:gains', r.gains as never);
      onDone();
    } catch (x) {
      setErr((x as Error).message);
    }
  }
  return (
    <form className="mb-form" onSubmit={add}>
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={140} placeholder="Call home, pick up the permesso…" aria-label="What to remind you of" required />
      <div className="mb-form-row">
        <input type="date" value={day} min={todayHere()} onChange={(e) => setDay(e.target.value)} aria-label="Day" />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" />
        <select value={repeat} onChange={(e) => setRepeat(e.target.value)} aria-label="Repeat">
          <option value="none">once</option>
          <option value="daily">every day</option>
          <option value="weekly">every week</option>
        </select>
        <button className="mb-go">Set ⏰</button>
      </div>
      {err && <p className="mb-err">{err}</p>}
      <small className="mb-muted">Jelly sends a notification (it can be up to 10 minutes late) and says it here if the site is open.</small>
    </form>
  );
}
