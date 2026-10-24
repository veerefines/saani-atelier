'use client';

import { useMemo, useState } from 'react';
import type { Occasion, Page, RevealNote } from '@/lib/extras';
import { api, mediaUrl, uploadFile } from '@/lib/upload-client';

type Friend = { id: string; name: string; role: string; admin: boolean; managed: boolean; link: string };
type Slot = { slot: string; kind: 'photo' | 'video' | 'voice' | 'music'; label: string; chapter: string; mediaId: string | null };
type Activity = {
  lastSeen: string | null;
  letters: { opened: number; total: number };
  jar: { read: number; total: number };
  wall: { reacted: number; total: number; replies: number; scheduled: number };
  bingo: { done: number; total: number };
  stamps: { done: number; total: number };
  checklist: { done: number; total: number };
  fromPeople: number;
};

type Section = 'activity' | 'friends' | 'occasions' | 'pages' | 'journey' | 'note';
const SECTIONS: [Section, string][] = [
  ['activity', '💗 How she’s doing'],
  ['friends', '👯 Friends'],
  ['occasions', '🗓️ Special days'],
  ['pages', '📒 Scrapbook pages'],
  ['journey', '🎞️ Journey media'],
  ['note', '✉️ Reveal note'],
];

const ago = (iso: string | null) => {
  if (!iso) return 'not yet';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Admin(props: { friends: Friend[]; occasions: Occasion[]; pages: Page[]; slots: Slot[]; note: RevealNote; activity: Activity }) {
  const [section, setSection] = useState<Section>('activity');
  return (
    <>
      <div className="w-tabs ad-tabs" role="tablist" aria-label="Admin sections">
        {SECTIONS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={section === id} className="w-tab" onClick={() => setSection(id)}>
            {label}
          </button>
        ))}
      </div>
      {section === 'activity' && <ActivityView a={props.activity} />}
      {section === 'friends' && <Friends initial={props.friends} />}
      {section === 'occasions' && <Occasions initial={props.occasions} />}
      {section === 'pages' && <Pages initial={props.pages} />}
      {section === 'journey' && <Journey initial={props.slots} />}
      {section === 'note' && <NoteEditor initial={props.note} />}
    </>
  );
}

function ActivityView({ a }: { a: Activity }) {
  const stats = [
    ['Last on the atelier', ago(a.lastSeen)],
    ['Letters opened', `${a.letters.opened} of ${a.letters.total}`],
    ['Jar notes read', `${a.jar.read} of ${a.jar.total}`],
    ['Wall posts she reacted to', `${a.wall.reacted} of ${a.wall.total}`],
    ['Thank-you replies sent', String(a.wall.replies)],
    ['Surprises still scheduled', String(a.wall.scheduled)],
    ['Bingo squares', `${a.bingo.done} of ${a.bingo.total}`],
    ['Passport stamps', `${a.stamps.done} of ${a.stamps.total}`],
    ['Settling-in tasks', `${a.checklist.done} of ${a.checklist.total}`],
    ['Things from her people', String(a.fromPeople)],
  ];
  return (
    <section className="ad-stats">
      {stats.map(([k, v]) => (
        <div key={k} className="ad-stat">
          <b>{v}</b>
          <span>{k}</span>
        </div>
      ))}
      <p className="ad-note">Only what she’s done is shown here, never the contents of her private lookbook, diary or list.</p>
    </section>
  );
}

function useErr() {
  const [err, setErr] = useState('');
  const run = async (fn: () => Promise<void>) => {
    setErr('');
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return { err, run };
}

function Friends({ initial }: { initial: Friend[] }) {
  const [list, setList] = useState(initial);
  const [name, setName] = useState('');
  const [copied, setCopied] = useState('');
  const { err, run } = useErr();

  const copy = async (f: Friend) => {
    try {
      await navigator.clipboard.writeText(f.link);
      setCopied(f.id);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      prompt('Copy this link:', f.link);
    }
  };

  return (
    <section className="ad-sec">
      <form
        className="ad-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const f = await api<Friend & { code: string }>('/api/admin/friends', 'POST', { name });
            setList((l) => [...l, { id: f.id, name: f.name, role: 'wellwisher', admin: false, managed: true, link: f.link }]);
            setName('');
          });
        }}
      >
        <input className="h-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a friend: their name" maxLength={40} aria-label="Friend’s name" />
        <button className="cta h-small-btn" disabled={!name.trim()}>
          Add
        </button>
      </form>
      {err && <p className="h-err">{err}</p>}
      <ul className="ad-list">
        {list.map((f) => (
          <li key={f.id}>
            <span className="ad-main">
              <b>{f.name}</b>
              <small>
                {f.role === 'saanika' ? 'Saanika' : 'friend'}
                {f.admin ? ' · admin' : ''}
                {f.managed ? ' · added here' : ' · in Vercel settings'}
              </small>
            </span>
            <button className="pc-btn" onClick={() => copy(f)}>
              {copied === f.id ? 'Copied ✓' : 'Copy link'}
            </button>
            {f.managed && (
              <button
                className="pc-btn ad-danger"
                onClick={() =>
                  confirm(`Remove ${f.name}? Their link stops working straight away.`) &&
                  run(async () => {
                    await api(`/api/admin/friends/${f.id}`, 'DELETE');
                    setList((l) => l.filter((x) => x.id !== f.id));
                  })
                }
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const EMPTY_OCC = { id: '', date: '', title: '', emoji: '🎉', remindDays: 3, note: '' };

function Occasions({ initial }: { initial: Occasion[] }) {
  const [list, setList] = useState(initial);
  const [form, setForm] = useState(EMPTY_OCC);
  const { err, run } = useErr();
  const sorted = useMemo(() => [...list].sort((a, b) => (a.date < b.date ? -1 : 1)), [list]);
  const set = (k: keyof typeof EMPTY_OCC) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: k === 'remindDays' ? Number(e.target.value) : e.target.value }));

  return (
    <section className="ad-sec">
      <form
        className="ad-grid-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const o = await api<Occasion>('/api/admin/occasions', 'POST', { ...form, id: form.id || undefined });
            setList((l) => [...l.filter((x) => x.id !== o.id), o]);
            setForm(EMPTY_OCC);
          });
        }}
      >
        <input className="h-input" type="date" value={form.date} onChange={set('date')} aria-label="Date" required />
        <input className="h-input" value={form.emoji} onChange={set('emoji')} aria-label="Emoji" maxLength={8} />
        <input className="h-input ad-wide" value={form.title} onChange={set('title')} placeholder="e.g. Saanika’s birthday, First exam" aria-label="Title" required />
        <label className="ad-inline">
          remind friends
          <input className="h-input" type="number" min={0} max={30} value={form.remindDays} onChange={set('remindDays')} aria-label="Days before" />
          days before
        </label>
        <input className="h-input ad-wide" value={form.note} onChange={set('note')} placeholder="A line for her on the day (optional)" aria-label="Note" maxLength={280} />
        <div className="ad-actions">
          <button className="cta h-small-btn">{form.id ? 'Save changes' : 'Add special day'}</button>
          {form.id && (
            <button type="button" className="w-link" onClick={() => setForm(EMPTY_OCC)}>
              Cancel
            </button>
          )}
        </div>
      </form>
      {err && <p className="h-err">{err}</p>}
      <ul className="ad-list">
        {sorted.map((o) => (
          <li key={o.id}>
            <span className="ad-main">
              <b>
                {o.emoji} {o.title}
              </b>
              <small>
                {fmtDate(o.date)} · reminders {o.remindDays} days before{o.note ? ` · “${o.note}”` : ''}
              </small>
            </span>
            <button className="pc-btn" onClick={() => setForm({ id: o.id, date: o.date, title: o.title, emoji: o.emoji, remindDays: o.remindDays, note: o.note ?? '' })}>
              Edit
            </button>
            <button
              className="pc-btn ad-danger"
              onClick={() =>
                confirm(`Remove ${o.title}?`) &&
                run(async () => {
                  await api(`/api/admin/occasions/${o.id}`, 'DELETE');
                  setList((l) => l.filter((x) => x.id !== o.id));
                })
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pages({ initial }: { initial: Page[] }) {
  const [list, setList] = useState(initial);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📒');
  const [note, setNote] = useState('');
  const { err, run } = useErr();
  return (
    <section className="ad-sec">
      <form
        className="ad-grid-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const p = await api<Page>('/api/admin/pages', 'POST', { title, emoji, note });
            setList((l) => [...l, p]);
            setTitle('');
            setNote('');
          });
        }}
      >
        <input className="h-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" maxLength={8} />
        <input className="h-input ad-wide" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Her first week in Milano" aria-label="Page title" required />
        <input className="h-input ad-wide" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should friends add? (optional)" aria-label="Note" maxLength={200} />
        <div className="ad-actions">
          <button className="cta h-small-btn">Create page</button>
        </div>
      </form>
      {err && <p className="h-err">{err}</p>}
      <ul className="ad-list">
        {list.map((p) => (
          <li key={p.id}>
            <span className="ad-main">
              <b>
                {p.emoji} {p.title}
              </b>
              <small>{p.note || 'friends add from Scrapbook pages on their desk'}</small>
            </span>
            <button
              className="pc-btn ad-danger"
              onClick={() =>
                confirm(`Remove “${p.title}”? Friends keep their pieces in their sent box.`) &&
                run(async () => {
                  await api(`/api/admin/pages/${p.id}`, 'DELETE');
                  setList((l) => l.filter((x) => x.id !== p.id));
                })
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {!list.length && <p className="ad-note">No pages yet. Create one and friends will see it under Scrapbook pages.</p>}
    </section>
  );
}

function Journey({ initial }: { initial: Slot[] }) {
  const [slots, setSlots] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const { err, run } = useErr();
  const chapters = [...new Set(slots.map((s) => s.chapter))];
  const accept = (k: Slot['kind']) => (k === 'photo' ? 'image/*' : k === 'video' ? 'video/*' : 'audio/*');

  const upload = (slot: Slot, file: File) =>
    run(async () => {
      setBusy(slot.slot);
      setPct(0);
      try {
        const mediaId = await uploadFile(file, setPct);
        await api('/api/admin/journey', 'POST', { slot: slot.slot, mediaId });
        setSlots((s) => s.map((x) => (x.slot === slot.slot ? { ...x, mediaId } : x)));
      } finally {
        setBusy(null);
      }
    });
  const revert = (slot: Slot) =>
    run(async () => {
      await api('/api/admin/journey', 'DELETE', { slot: slot.slot });
      setSlots((s) => s.map((x) => (x.slot === slot.slot ? { ...x, mediaId: null } : x)));
    });

  return (
    <section className="ad-sec">
      <p className="ad-note">Upload her real photos, the studio video, voice notes and the music. Each one replaces its placeholder in the journey straight away.</p>
      {err && <p className="h-err">{err}</p>}
      {chapters.map((c) => (
        <div key={c} className="ad-chapter">
          <h3 className="hand">{c}</h3>
          <div className="ad-slots">
            {slots
              .filter((s) => s.chapter === c)
              .map((s) => (
                <div key={s.slot} className={`ad-slot${s.mediaId ? ' has' : ''}`}>
                  <div className="ad-slot-preview">
                    {s.mediaId ? (
                      s.kind === 'photo' ? (
                        <img src={mediaUrl(s.mediaId)} alt="" />
                      ) : s.kind === 'video' ? (
                        <video src={mediaUrl(s.mediaId)} controls playsInline preload="metadata" />
                      ) : (
                        <audio src={mediaUrl(s.mediaId)} controls preload="none" />
                      )
                    ) : (
                      <span>{s.kind === 'photo' ? '📷' : s.kind === 'video' ? '🎬' : s.kind === 'music' ? '💿' : '🎙️'} placeholder</span>
                    )}
                  </div>
                  <b>{s.label}</b>
                  <small>{s.slot.split('/').pop()}</small>
                  <div className="ad-slot-actions">
                    <label className="pc-btn ad-upload">
                      {busy === s.slot ? `Uploading ${pct}%` : s.mediaId ? 'Replace' : 'Upload'}
                      <input type="file" accept={accept(s.kind)} hidden disabled={busy !== null} onChange={(e) => (e.target.files?.[0] && upload(s, e.target.files[0]), (e.target.value = ''))} />
                    </label>
                    {s.mediaId && (
                      <button className="w-link" onClick={() => revert(s)}>
                        Use placeholder
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function NoteEditor({ initial }: { initial: RevealNote }) {
  const [greeting, setGreeting] = useState(initial.greeting);
  const [body, setBody] = useState(initial.lines.join('\n\n'));
  const [signoff, setSignoff] = useState(initial.signoff);
  const [saved, setSaved] = useState(false);
  const { err, run } = useErr();
  return (
    <section className="ad-sec">
      <form
        className="w-card"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await api('/api/admin/note', 'PUT', { greeting, lines: body, signoff });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
          });
        }}
      >
        <p className="whisper w-hint">The handwritten note at the end of the gift reveal. Separate paragraphs with a blank line.</p>
        <label className="w-label" htmlFor="ng">
          Greeting
        </label>
        <input id="ng" className="h-input" value={greeting} onChange={(e) => setGreeting(e.target.value)} />
        <label className="w-label" htmlFor="nb">
          The note
        </label>
        <textarea id="nb" className="h-textarea" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        <label className="w-label" htmlFor="ns">
          Sign-off
        </label>
        <textarea id="ns" className="h-textarea" rows={2} style={{ minHeight: 70 }} value={signoff} onChange={(e) => setSignoff(e.target.value)} />
        {err && <p className="h-err">{err}</p>}
        <div className="w-send">
          <button className="cta">{saved ? 'Saved ✓' : 'Save the note'}</button>
        </div>
      </form>
    </section>
  );
}
