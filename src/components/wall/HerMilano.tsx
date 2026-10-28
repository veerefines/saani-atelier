'use client';

import { sfx } from '@/lib/sound';
import { useState } from 'react';
import type { DiaryEntry, LookItem } from '@/lib/extras';
import { reactions } from '@/content/home';
import { api, mediaUrl } from '@/lib/upload-client';
import LookGrid from '@/components/home/LookGrid';

const fmtDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

type Tab = 'looks' | 'days' | 'passport';

/** For friends: only what she chose to share (looks and days), and her passport stamps as progress. */
export default function HerMilano({
  me,
  look: initial,
  days,
  stamps,
  totalPlaces,
}: {
  me: string;
  look: LookItem[];
  days: DiaryEntry[];
  stamps: { name: string; at: string }[];
  totalPlaces: number;
}) {
  const [tab, setTab] = useState<Tab>('looks');
  const [look, setLook] = useState(initial);

  async function react(x: LookItem, emoji: string) {
    sfx('pop');
    try {
      const next = await api<LookItem>(`/api/lookbook/${x.id}/react`, 'POST', { emoji });
      setLook((xs) => xs.map((y) => (y.id === x.id ? next : y)));
    } catch {}
  }

  return (
    <>
      <div className="w-tabs" role="tablist" aria-label="Her Milano">
        {(
          [
            ['looks', `👗 Looks (${look.length})`],
            ['days', `📔 Days (${days.length})`],
            ['passport', `🛂 Passport (${stamps.length})`],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} className="w-tab" onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'looks' &&
        (look.length ? (
          <LookGrid
            items={look}
            renderActions={(x) => (
              <div className="love-react" role="group" aria-label="React">
                {reactions.map((e) => (
                  <button key={e} aria-pressed={x.reactions.some((r) => r.by === me && r.emoji === e)} onClick={() => react(x, e)} aria-label={`React ${e}`}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          />
        ) : (
          <p className="h-empty whisper">She hasn’t shared any looks yet.</p>
        ))}

      {tab === 'days' &&
        (days.length ? (
          <section className="dy-list">
            {days.map((d) => (
              <article key={d.id} className="dy-entry">
                {d.mediaId && <img className="dy-photo" src={mediaUrl(d.mediaId)} alt="" loading="lazy" />}
                <div className="dy-text">
                  <p className="dy-day">
                    {fmtDay(d.day)} <span>{d.mood}</span>
                  </p>
                  {d.text && <p className="hand">{d.text}</p>}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <p className="h-empty whisper">She hasn’t shared any days yet.</p>
        ))}

      {tab === 'passport' && (
        <section className="pp-hero">
          <div className="pp-count">
            <b>{stamps.length}</b>
            <span>of {totalPlaces} stamps</span>
          </div>
          {stamps.length ? (
            <ul className="her-stamps">
              {stamps.map((s) => (
                <li key={s.name + s.at}>
                  🛂 {s.name} <small>{fmt(s.at)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pp-none">No stamps yet. She’ll start collecting once she’s exploring.</p>
          )}
        </section>
      )}
    </>
  );
}
