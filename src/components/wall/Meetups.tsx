'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/upload-client';
import { sfx } from '@/lib/sound';
import type { Meetup, Rsvp } from '@/lib/meetup-model';

type Shown = Meetup & { friends: { id: string; name: string }[]; mine: Rsvp | null };
const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).replace(':00', '');
const milan = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).replace(':00', '');

/** On a friend's desk: video calls Saanika invited them to, with Join and "are you coming?". */
export default function Meetups() {
  const [list, setList] = useState<Shown[] | null>(null);
  useEffect(() => {
    api<{ meetups: Shown[] }>('/api/meetups', 'GET')
      .then((d) => setList(d.meetups))
      .catch(() => setList([]));
  }, []);
  if (!list?.length) return null;

  async function answer(m: Shown, rsvp: Rsvp) {
    sfx(rsvp === 'yes' ? 'chime' : 'pop');
    setList((l) => (l ?? []).map((x) => (x.id === m.id ? { ...x, mine: rsvp } : x)));
    await api(`/api/meetups/${m.id}/rsvp`, 'POST', { rsvp }).catch(() => {});
  }

  return (
    <section className="wm" aria-label="Calls with Saanika">
      <h2 className="hand">calls with Saanika 💻</h2>
      {list.map((m) => {
        const live = Date.parse(m.start) - Date.now() < 15 * 60_000;
        return (
          <article key={m.id} className="wm-card">
            <div>
              <b>{m.title}</b>
              <small>
                {when(m.start)} your time · {milan(m.start)} in Milano · with {m.friends.map((f) => f.name.split(' ')[0]).join(', ')}
              </small>
            </div>
            <div className="wm-rsvp" role="group" aria-label="Are you coming?">
              {(['yes', 'maybe', 'no'] as Rsvp[]).map((r) => (
                <button key={r} type="button" aria-pressed={m.mine === r} onClick={() => answer(m, r)} data-quiet>
                  {r === 'yes' ? '🎉 I’m in' : r === 'maybe' ? '🤞 Maybe' : '💗 Can’t'}
                </button>
              ))}
            </div>
            {m.meetLink && (
              <a className={`wm-join${live ? ' live' : ''}`} href={m.meetLink} target="_blank" rel="noreferrer">
                {live ? '🔴 Join now' : 'Join on Google Meet'}
              </a>
            )}
          </article>
        );
      })}
    </section>
  );
}
