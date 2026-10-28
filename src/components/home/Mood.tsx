'use client';

import { sfx } from '@/lib/sound';
import { jellyEvent } from '@/components/jelly/bus';
import { useEffect, useState } from 'react';
import { MOODS, type MoodId, type MoodState } from '@/content/mood';
import { api } from '@/lib/upload-client';

function useMood() {
  const [mood, setMood] = useState<MoodState | null | undefined>(undefined);
  useEffect(() => {
    fetch('/api/mood')
      .then((r) => (r.ok ? r.json() : null))
      .then(setMood)
      .catch(() => setMood(null));
  }, []);
  return [mood, setMood] as const;
}

/** On her desk: "how are you today?" Her people see the answer on theirs. */
export function MoodPicker() {
  const [mood, setMood] = useMood();
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => setNote(mood?.note ?? ''), [mood?.note]);

  async function pick(id: MoodId, withNote = note) {
    setErr('');
    sfx('chime');
    const prev = mood;
    setMood({ mood: id, note: withNote, at: new Date().toISOString(), day: '' });
    try {
      setMood(await api<MoodState>('/api/mood', 'POST', { mood: id, note: withNote }));
      jellyEvent('mood');
    } catch (e) {
      setMood(prev);
      setErr((e as Error).message);
    }
  }

  if (mood === undefined) return null;
  const current = MOODS.find((m) => m.id === mood?.mood);
  return (
    <section className="mood" aria-label="How are you today?">
      <span className="hand">{current ? `feeling ${current.label} today` : 'how are you today?'}</span>
      <div className="mood-row" role="radiogroup" aria-label="Your mood">
        {MOODS.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mood?.mood === m.id} onClick={() => pick(m.id)} aria-label={m.label} title={m.label}>
            {m.emoji}
          </button>
        ))}
      </div>
      {current &&
        (editing ? (
          <form
            className="nudge-reply"
            onSubmit={(e) => {
              e.preventDefault();
              setEditing(false);
              pick(current.id, note);
            }}
          >
            <input className="h-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder="Want to say more? (optional)" aria-label="A few words" autoFocus />
            <button className="cta h-small-btn">Save</button>
          </form>
        ) : (
          <button type="button" className="mood-note" onClick={() => setEditing(true)}>
            {mood?.note ? `“${mood.note}” ✎` : '+ add a few words'}
          </button>
        ))}
      <small className="mood-who">
        {current ? `Your people can see this on their desks${current.low ? ', and they’ve had a little nudge to check in' : ''}.` : 'Pick one and your people will see it on their desks.'}
      </small>
      {err && <p className="h-err">{err}</p>}
    </section>
  );
}

/** On a friend's desk: how she's feeling today, if she's said. */
export function MoodStatus() {
  const [mood] = useMood();
  const m = MOODS.find((x) => x.id === mood?.mood);
  if (!mood || !m) return null;
  return (
    <section className={`dk-card mood-status${m.low ? ' low' : ''}`} aria-label="How she’s feeling">
      <div className="dk-head">
        <span className="hand">how she’s feeling</span>
        <small>today</small>
      </div>
      <p className="dk-line">
        <span className="dk-emoji" aria-hidden="true">
          {m.emoji}
        </span>
        <span>
          Saanika’s feeling <b>{m.label}</b>
        </span>
      </p>
      {mood.note && <p className="dk-note">“{mood.note}”</p>}
      {m.low && <small className="dk-sub">Send her a little love.</small>}
    </section>
  );
}
