'use client';

import { useMemo, useState } from 'react';
import type { JourneyExtra, Occasion, Page, RevealNote } from '@/lib/extras';
import { api, mediaUrl, uploadFile } from '@/lib/upload-client';

type Friend = { id: string; name: string; role: string; admin: boolean; managed: boolean; link: string };
type ChapterRef = { id: string; title: string };
type Word = { key: string; group: string; label: string; value: string; original: string; long?: boolean };
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

type Section = 'activity' | 'friends' | 'occasions' | 'pages' | 'journey' | 'keepsakes' | 'note';
type Keepsake = { name: string; what: string; mediaId: string | null };
const SECTIONS: [Section, string][] = [
  ['activity', '💗 How she’s doing'],
  ['friends', '👯 Friends'],
  ['occasions', '🗓️ Special days'],
  ['pages', '📒 Scrapbook pages'],
  ['journey', '🎞️ Journey media'],
  ['keepsakes', '🌸 Keepsake images'],
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

/** The big buttons at the top: what Vee most often comes here to do. */
const START: { id: Section; icon: string; title: string; sub: string }[] = [
  { id: 'journey', icon: '🎞️', title: 'Upload journey photos, video & music', sub: 'replace the placeholders in her story' },
  { id: 'keepsakes', icon: '🌸', title: 'Upload keepsake PNGs', sub: 'sunglasses, iced coffee, peonies…' },
  { id: 'friends', icon: '👯', title: 'Add or remove a friend', sub: 'and copy their sign-in links' },
  { id: 'occasions', icon: '🗓️', title: 'Add her birthday & special days', sub: 'friends get reminded before' },
  { id: 'pages', icon: '📒', title: 'Start a scrapbook page', sub: 'everyone adds to it' },
  { id: 'note', icon: '✉️', title: 'Edit the reveal note', sub: 'the card at the end of the gift' },
];

export default function Admin(props: { me: string; journeyChapters: ChapterRef[]; extras: JourneyExtra[]; words: Word[]; friends: Friend[]; occasions: Occasion[]; pages: Page[]; slots: Slot[]; note: RevealNote; activity: Activity; keepsakes: Keepsake[] }) {
  const [section, setSection] = useState<Section>('activity');
  const open = (id: Section) => {
    setSection(id);
    requestAnimationFrame(() => document.getElementById('atl-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  return (
    <>
      <section className="atl-start" aria-label="What would you like to do?">
        <h2 className="hand">what would you like to do?</h2>
        <div className="atl-start-grid">
          {START.map((x) => (
            <button key={x.id} className={`atl-start-btn${section === x.id ? ' on' : ''}`} onClick={() => open(x.id)}>
              <span aria-hidden="true">{x.icon}</span>
              <b>{x.title}</b>
              <small>{x.sub}</small>
            </button>
          ))}
        </div>
      </section>

      <div id="atl-section" className="w-tabs atl-tabs" role="tablist" aria-label="Admin sections">
        {SECTIONS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={section === id} className="w-tab" onClick={() => setSection(id)}>
            {label}
          </button>
        ))}
      </div>
      {section === 'activity' && <ActivityView a={props.activity} />}
      {section === 'friends' && <Friends initial={props.friends} me={props.me} />}
      {section === 'occasions' && <Occasions initial={props.occasions} />}
      {section === 'pages' && <Pages initial={props.pages} />}
      {section === 'journey' && <Journey initial={props.slots} chapterRefs={props.journeyChapters} extras={props.extras} words={props.words} />}
      {section === 'keepsakes' && <Keepsakes initial={props.keepsakes} />}
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
    <section className="atl-stats">
      {stats.map(([k, v]) => (
        <div key={k} className="atl-stat">
          <b>{v}</b>
          <span>{k}</span>
        </div>
      ))}
      <p className="atl-note">Only what she’s done is shown here, never the contents of her private lookbook, diary or list.</p>
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

function Friends({ initial, me }: { initial: Friend[]; me: string }) {
  const [list, setList] = useState(initial);
  const [name, setName] = useState('');
  const [copied, setCopied] = useState('');
  const [done, setDone] = useState('');
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
    <section className="atl-sec">
      <form
        className="atl-form"
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
      {done && <p className="atl-note">{done}</p>}
      <ul className="atl-list">
        {list.map((f) => (
          <li key={f.id}>
            <span className="atl-main">
              <b>{f.name}</b>
              <small>
                {f.role === 'saanika' ? 'Saanika' : 'friend'}
                {f.admin ? ' · admin' : ''}
                {f.managed ? ' · added here' : ''}{f.id === me ? ' · you' : ''}
              </small>
            </span>
            <button className="pc-btn" onClick={() => copy(f)}>
              {copied === f.id ? 'Copied ✓' : 'Copy link'}
            </button>
            {f.role !== 'saanika' && f.id !== me && (
              <button
                className="pc-btn atl-danger"
                onClick={() =>
                  confirm(
                    `Remove ${f.name}?\n\nTheir link stops working straight away, and everything they’ve shared (messages, photos, videos, voice notes, letters, jar notes, songs, tips, nudges, scrapbook pieces) is deleted for good.`,
                  ) &&
                  run(async () => {
                    const r = await api<{ removed: number }>(`/api/admin/friends/${f.id}`, 'DELETE');
                    setList((l) => l.filter((x) => x.id !== f.id));
                    setDone(`${f.name} is removed${r.removed ? `, along with ${r.removed} ${r.removed === 1 ? 'thing' : 'things'} they’d shared` : ''}.`);
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
    <section className="atl-sec">
      <form
        className="atl-grid-form"
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
        <input className="h-input atl-wide" value={form.title} onChange={set('title')} placeholder="e.g. Saanika’s birthday, First exam" aria-label="Title" required />
        <label className="atl-inline">
          remind friends
          <input className="h-input" type="number" min={0} max={30} value={form.remindDays} onChange={set('remindDays')} aria-label="Days before" />
          days before
        </label>
        <input className="h-input atl-wide" value={form.note} onChange={set('note')} placeholder="A line for her on the day (optional)" aria-label="Note" maxLength={280} />
        <div className="atl-actions">
          <button className="cta h-small-btn">{form.id ? 'Save changes' : 'Add special day'}</button>
          {form.id && (
            <button type="button" className="w-link" onClick={() => setForm(EMPTY_OCC)}>
              Cancel
            </button>
          )}
        </div>
      </form>
      {err && <p className="h-err">{err}</p>}
      <ul className="atl-list">
        {sorted.map((o) => (
          <li key={o.id}>
            <span className="atl-main">
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
              className="pc-btn atl-danger"
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
    <section className="atl-sec">
      <form
        className="atl-grid-form"
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
        <input className="h-input atl-wide" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Her first week in Milano" aria-label="Page title" required />
        <input className="h-input atl-wide" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should friends add? (optional)" aria-label="Note" maxLength={200} />
        <div className="atl-actions">
          <button className="cta h-small-btn">Create page</button>
        </div>
      </form>
      {err && <p className="h-err">{err}</p>}
      <ul className="atl-list">
        {list.map((p) => (
          <li key={p.id}>
            <span className="atl-main">
              <b>
                {p.emoji} {p.title}
              </b>
              <small>{p.note || 'friends add from Scrapbook pages on their desk'}</small>
            </span>
            <button
              className="pc-btn atl-danger"
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
      {!list.length && <p className="atl-note">No pages yet. Create one and friends will see it under Scrapbook pages.</p>}
    </section>
  );
}

function Journey({ initial, chapterRefs, extras: initialExtras, words }: { initial: Slot[]; chapterRefs: ChapterRef[]; extras: JourneyExtra[]; words: Word[] }) {
  const [slots, setSlots] = useState(initial);
  const [extras, setExtras] = useState(initialExtras);
  const [busy, setBusy] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const { err, run } = useErr();
  // every chapter (even one with no fixed slots, so extras can go anywhere), then the music
  const chapters = [...new Set([...chapterRefs.map((r) => r.title), ...slots.map((s) => s.chapter)])];
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
    <section className="atl-sec">
      <p className="atl-note">
        Upload her real photos, the studio video, voice notes and the music. Each one replaces its placeholder in the journey straight away. Under each chapter you can also add as many
        more photos, videos and voice notes as you like.
      </p>
      {err && <p className="h-err">{err}</p>}
      <Words title="the opening screen" fields={words.filter((w) => w.group === 'Opening')} />
      {chapters.map((c) => (
        <div key={c} className="atl-chapter">
          <h3 className="hand">{c}</h3>
          <Words title="this chapter" fields={words.filter((w) => w.group === c)} />
          <div className="atl-slots">
            {slots
              .filter((s) => s.chapter === c)
              .map((s) => (
                <div key={s.slot} className={`atl-slot${s.mediaId ? ' has' : ''}`}>
                  <div className="atl-slot-preview">
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
                  <div className="atl-slot-actions">
                    <label className="pc-btn atl-upload">
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
          {chapterRefs.find((r) => r.title === c) && (
            <ChapterExtras
              chapter={chapterRefs.find((r) => r.title === c)!}
              items={extras.filter((x) => x.chapter === chapterRefs.find((r) => r.title === c)!.id)}
              onAdd={(x) => setExtras((l) => [...l, x])}
              onRemove={(id) => setExtras((l) => l.filter((x) => x.id !== id))}
            />
          )}
        </div>
      ))}
    </section>
  );
}

/** The journey's words for one chapter: edit any of them; clearing one goes back to the original. */
function Words({ title, fields }: { title: string; fields: Word[] }) {
  if (!fields.length) return null;
  return (
    <details className="atl-words">
      <summary>✎ Edit the words in {title}</summary>
      {fields.map((f) => (
        <WordField key={f.key} f={f} />
      ))}
    </details>
  );
}

function WordField({ f }: { f: Word }) {
  const [value, setValue] = useState(f.value);
  const [saved, setSaved] = useState(f.value);
  const [state, setState] = useState<'' | 'saving' | 'saved'>('');
  const { err, run } = useErr();
  const save = (v = value) =>
    run(async () => {
      setState('saving');
      try {
        const r = await api<{ value: string | null }>('/api/admin/journey/text', 'POST', { key: f.key, value: v });
        const now = r.value ?? f.original;
        setValue(now);
        setSaved(now);
        setState('saved');
        setTimeout(() => setState(''), 1500);
      } catch (e) {
        setState('');
        throw e;
      }
    });
  const Input = f.long ? 'textarea' : 'input';
  return (
    <label className="atl-word">
      <span>
        {f.label}
        {state === 'saving' ? ' · saving…' : state === 'saved' ? ' · saved ✓' : value !== saved ? ' · not saved' : ''}
      </span>
      <Input className="h-input" value={value} maxLength={600} rows={f.long ? 3 : undefined} placeholder={f.original} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setValue(e.target.value)} onBlur={() => value !== saved && save()} />
      {value !== f.original && (
        <button type="button" className="w-link" onClick={() => save('')}>
          Back to the original
        </button>
      )}
      {err && <p className="h-err">{err}</p>}
    </label>
  );
}

/** "Add more to this chapter": any number of photos (four or more become a film strip), a video, or a voice note. */
function ChapterExtras({ chapter, items, onAdd, onRemove }: { chapter: ChapterRef; items: JourneyExtra[]; onAdd: (x: JourneyExtra) => void; onRemove: (id: string) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [from, setFrom] = useState('');
  const [busy, setBusy] = useState('');
  const { err, run } = useErr();
  const audio = files.length === 1 && files[0].type.startsWith('audio/');

  const add = () =>
    run(async () => {
      try {
        const ids: string[] = [];
        for (const [i, f] of files.entries()) {
          setBusy(`Uploading ${i + 1} of ${files.length}…`);
          ids.push(await uploadFile(f, (p) => setBusy(`Uploading ${i + 1} of ${files.length} · ${p}%`)));
        }
        setBusy('Adding to the journey…');
        onAdd(await api<JourneyExtra>('/api/admin/journey/extras', 'POST', { chapter: chapter.id, mediaIds: ids, caption, from }));
        setFiles([]);
        setCaption('');
        setFrom('');
      } finally {
        setBusy('');
      }
    });

  return (
    <div className="atl-extras">
      <b className="atl-extras-title">More in “{chapter.title}”</b>
      {items.length > 0 && (
        <ul className="atl-extra-list">
          {items.map((x) => (
            <li key={x.id}>
              <span className="atl-extra-thumb">
                {x.kind === 'photo' ? <img src={mediaUrl(x.mediaIds[0])} alt="" /> : <span aria-hidden="true">{x.kind === 'video' ? '🎬' : '🎙️'}</span>}
              </span>
              <span className="atl-main">
                <b>{x.caption || (x.kind === 'photo' ? 'photos' : x.kind === 'video' ? 'a video' : 'a voice note')}</b>
                <small>
                  {x.kind === 'photo' ? `${x.mediaIds.length} ${x.mediaIds.length === 1 ? 'photo' : 'photos'}${x.mediaIds.length >= 4 ? ' · film strip' : ''}` : x.kind}
                  {x.from ? ` · from ${x.from}` : ''}
                </small>
              </span>
              <button
                className="pc-btn atl-danger"
                onClick={() =>
                  confirm('Take this out of the journey?') &&
                  run(async () => {
                    await api(`/api/admin/journey/extras/${x.id}`, 'DELETE');
                    onRemove(x.id);
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="atl-extra-add">
        <label className="pc-btn atl-upload">
          {files.length ? `${files.length} ${files.length === 1 ? 'file' : 'files'} chosen` : '+ Choose photos, a video or a voice note'}
          <input type="file" multiple accept="image/*,video/*,audio/*" hidden disabled={Boolean(busy)} onChange={(e) => (setFiles([...(e.target.files ?? [])]), (e.target.value = ''))} />
        </label>
        {files.length > 0 && (
          <>
            <input className="h-input" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} placeholder={audio ? 'Title, e.g. “Good luck, beta”' : 'Caption (optional)'} aria-label="Caption" />
            {audio && <input className="h-input" value={from} onChange={(e) => setFrom(e.target.value)} maxLength={40} placeholder="From (e.g. Mum & Dad)" aria-label="From" />}
            <button className="cta h-small-btn" disabled={Boolean(busy)} onClick={add}>
              {busy || 'Add to the journey'}
            </button>
          </>
        )}
      </div>
      {err && <p className="h-err">{err}</p>}
    </div>
  );
}

function Keepsakes({ initial }: { initial: Keepsake[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const { err, run } = useErr();

  const upload = (k: Keepsake, file: File) =>
    run(async () => {
      setBusy(k.name);
      setPct(0);
      try {
        const mediaId = await uploadFile(file, setPct);
        await api('/api/admin/keepsakes', 'POST', { name: k.name, mediaId });
        setItems((xs) => xs.map((x) => (x.name === k.name ? { ...x, mediaId } : x)));
      } finally {
        setBusy(null);
      }
    });
  const remove = (k: Keepsake) =>
    run(async () => {
      await api('/api/admin/keepsakes', 'DELETE', { name: k.name });
      setItems((xs) => xs.map((x) => (x.name === k.name ? { ...x, mediaId: null } : x)));
    });

  return (
    <section className="atl-sec">
      <p className="atl-note">
        The little things she loves, tucked around her desk, the journey and Milano Mei Milo. Transparent PNGs look best (about 800px on the long side). Each one goes live
        on every page it belongs to as soon as it’s uploaded. {items.filter((k) => k.mediaId).length} of {items.length} uploaded.
      </p>
      {err && <p className="h-err">{err}</p>}
      <div className="atl-slots">
        {items.map((k) => (
          <div key={k.name} className={`atl-slot${k.mediaId ? ' has' : ''}`}>
            <div className="atl-slot-preview atl-checker">{k.mediaId ? <img src={mediaUrl(k.mediaId)} alt="" style={{ objectFit: 'contain' }} /> : <span>🌸 empty</span>}</div>
            <b>{k.what}</b>
            <small>{k.name}.png</small>
            <div className="atl-slot-actions">
              <label className="pc-btn atl-upload">
                {busy === k.name ? `Uploading ${pct}%` : k.mediaId ? 'Replace' : 'Upload'}
                <input type="file" accept="image/png,image/webp,image/gif,image/jpeg" hidden disabled={busy !== null} onChange={(e) => (e.target.files?.[0] && upload(k, e.target.files[0]), (e.target.value = ''))} />
              </label>
              {k.mediaId && (
                <button className="w-link" onClick={() => remove(k)}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
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
    <section className="atl-sec">
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
