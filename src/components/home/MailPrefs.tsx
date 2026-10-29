'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/upload-client';
import { sfx } from '@/lib/sound';

type Prefs = { ready: boolean; inactive: boolean; achievements: boolean; low: boolean; digest: boolean; myEmail: string | null; friends: { total: number; withEmail: number; stopped: number } };
type Key = 'inactive' | 'achievements' | 'low' | 'digest';

const ROWS: { key: Key; title: string; sub: string }[] = [
  { key: 'inactive', title: 'A nudge if I haven’t visited in 2 weeks', sub: 'Jelly emails me what’s new on the Atelier.' },
  { key: 'achievements', title: 'Tell my friends when I do something big', sub: 'Only the big milestones, so they can cheer me on.' },
  { key: 'digest', title: 'A fortnightly update for my friends', sub: 'How I’m settling in and what’s coming up. Never my diary, money or chats.' },
  { key: 'low', title: 'Tell my friends if I’m having a hard time', sub: 'A gentle “she could use some love”, at most once a week. Off unless I switch it on.' },
];

/** What Jelly may email on Saani's behalf, each one a switch she controls. */
export default function MailPrefs() {
  const [p, setP] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Prefs>('/api/mail/prefs', 'GET').then(setP).catch(() => {});
  }, []);

  async function flip(key: Key) {
    if (!p || busy) return;
    setBusy(true);
    sfx('flip');
    try {
      setP(await api<Prefs>('/api/mail/prefs', 'PUT', { [key]: !p[key] }));
    } catch {
      sfx('nope');
    }
    setBusy(false);
  }

  if (!p) return null;
  return (
    <section className="mailprefs" aria-label="Jelly's emails">
      <h2 className="hand">Jelly’s emails 💌</h2>
      <p className="mailprefs-sub">
        {p.ready ? 'Jelly can send these on your behalf. Switch off whatever you like.' : 'Email isn’t switched on for the site yet, so nothing goes out for now.'}
        {p.myEmail ? ` Your nudges go to ${p.myEmail}.` : ' Connect Google on the Meetups page so Jelly knows where to reach you.'}
      </p>
      <ul>
        {ROWS.map((r) => (
          <li key={r.key}>
            <button type="button" role="switch" aria-checked={p[r.key]} onClick={() => flip(r.key)} className="mailprefs-row" data-quiet>
              <span className="mailprefs-text">
                <b>{r.title}</b>
                <small>{r.sub}</small>
              </span>
              <span className="mailprefs-switch" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mailprefs-sub">
        {p.friends.withEmail} of your {p.friends.total} friends have an email set, so Jelly can reach them{p.friends.stopped ? `, and ${p.friends.stopped} asked to stop` : ''}.
      </p>
    </section>
  );
}
