'use client';

import { sfx } from '@/lib/sound';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { JarNote, Letter, Post } from '@/lib/data';
import { letterTitles, moods } from '@/content/home';
import { api, mediaUrl, uploadFile } from '@/lib/upload-client';
import { PostBody, when } from '@/components/home/LoveWall';
import { LiveCam, mmss, useObjectUrl, useRecorder } from './recorder';

export type Tab = 'message' | 'voice' | 'video' | 'letter' | 'jar';
const TABS: { id: Tab; label: string; emoji: string; hint: string }[] = [
  { id: 'message', label: 'Message & photos', emoji: '💌', hint: 'A note, a memory, or a whole little album. It goes into her Yaadon ka Samandar.' },
  { id: 'voice', label: 'Voice note', emoji: '🎙️', hint: 'Record something she can play when she misses your voice.' },
  { id: 'video', label: 'Video', emoji: '🎬', hint: 'Record a little film right here, or upload one. Keep it short and sweet.' },
  { id: 'letter', label: 'Likhe Jo Khat Tujhe', emoji: '✉️', hint: 'Sealed for a particular moment. You can lock it until a date.' },
  { id: 'jar', label: 'Jar note', emoji: '🫙', hint: 'A tiny note she’ll pull out of her jar when she feels a certain way.' },
];

const MAX_PHOTOS = 10;

export type Mine = { posts: Post[]; letters: Letter[]; jar: JarNote[] };


function Thumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useObjectUrl(file);
  return (
    <span className="w-thumb">
      {url && <img src={url} alt="" />}
      <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}>
        ×
      </button>
    </span>
  );
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

export function SentPosts({ posts, onDelete }: { posts: Post[]; onDelete: (id: string) => void }) {
  return (
    <>
      {posts.map((p) => {
        const later = p.showAt && new Date(p.showAt).getTime() > Date.now();
        return (
          <article key={p.id} className="love-card">
            <PostBody p={p} />
            <div className="w-mine-meta">
              <span>
                {later ? `🎁 Arrives ${fmtDay(p.showAt!)}` : p.reactions.length ? `Saanika sent ${p.reactions.join(' ')}` : when(p.showAt ?? p.createdAt)}
                {p.pageId ? ' · on a scrapbook page' : ''}
              </span>
              <button onClick={() => onDelete(p.id)}>Delete</button>
            </div>
            {p.replies?.map((r) => (
              <div key={r.at} className="w-reply">
                <span className="hand">Saanika replied</span>
                {r.emoji && <span className="w-reply-emoji">{r.emoji}</span>}
                {r.text && <p>{r.text}</p>}
                {r.mediaId && <audio controls preload="none" src={mediaUrl(r.mediaId)} />}
              </div>
            ))}
          </article>
        );
      })}
    </>
  );
}

export function SentLetters({ letters, onDelete }: { letters: Letter[]; onDelete: (id: string) => void }) {
  return (
    <>
      {letters.map((l) => (
        <article key={l.id} className="love-card">
          <div className="love-note look-2">
            <strong className="hand" style={{ fontSize: 22, color: 'var(--burgundy)' }}>
              ✉️ {l.title}
            </strong>
            {'\n'}
            {l.body}
          </div>
          <div className="w-mine-meta">
            <span>{l.openedAt ? 'She opened it 💗' : l.unlockAt ? `Sealed until ${new Date(l.unlockAt).toLocaleDateString('en-GB')}` : 'Waiting to be opened'}</span>
            <button onClick={() => onDelete(l.id)}>Delete</button>
          </div>
        </article>
      ))}
    </>
  );
}

export function SentJar({ jar, onDelete }: { jar: JarNote[]; onDelete: (id: string) => void }) {
  return (
    <>
      {jar.map((n) => (
        <article key={n.id} className="love-card">
          <div className={`love-note look-${n.color % 6}`}>
            🫙 {n.text}
            <span className="love-from">for when she’s {moods.find((m) => m.id === n.mood)?.label}</span>
          </div>
          <div className="w-mine-meta">
            <span>{n.drawnAt ? 'She’s read it 💗' : 'In the jar'}</span>
            <button onClick={() => onDelete(n.id)}>Delete</button>
          </div>
        </article>
      ))}
    </>
  );
}

/** Delete one of your own things, after a quick check. */
export async function deleteMine(kind: 'posts' | 'letters' | 'jar' | 'dares' | 'tips' | 'songs', id: string) {
  if (!confirm('Delete this? She won’t see it any more.')) return false;
  await api(`/api/${kind}/${id}`, 'DELETE');
  return true;
}

type OccasionChip = { date: string; title: string; emoji: string };

/** "YYYY-MM-DD" for tomorrow, so a scheduled delivery is always in the future. */
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export default function Composer({
  mine: initial,
  only,
  children,
  pageId,
  occasions = [],
}: {
  mine: Mine;
  only: Tab[];
  children?: React.ReactNode;
  /** everything sent here goes onto this group scrapbook page */
  pageId?: string;
  /** upcoming festivals and special days (all of them), for "seal it for…" and "deliver it on…" */
  occasions?: OccasionChip[];
}) {
  const tabs = TABS.filter((t) => only.includes(t.id));
  const [tab, setTab] = useState<Tab>(tabs[0].id);
  const [mine, setMine] = useState(initial);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState(letterTitles[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [unlock, setUnlock] = useState('');
  /** a scheduled surprise: the day it should reach her */
  const [deliver, setDeliver] = useState('');
  const [mood, setMood] = useState(moods[0].id);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [step, setStep] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState('');
  const audio = useRecorder('audio');
  const video = useRecorder('video');
  const fileInput = useRef<HTMLInputElement>(null);
  const file = files[0] ?? null;
  const fileUrl = useObjectUrl(tab === 'video' ? file : null);
  const audioUrl = useObjectUrl(audio.blob);
  const videoUrl = useObjectUrl(video.blob);

  function switchTab(t: Tab) {
    setTab(t);
    setErr('');
    setFiles([]);
    audio.reset();
    video.reset();
  }

  function done(msg: string) {
    setText('');
    setFiles([]);
    setCustomTitle('');
    setUnlock('');
    setDeliver('');
    audio.reset();
    video.reset();
    setPct(0);
    setStep('');
    setSent(msg);
    sfx('whoosh');
    setTimeout(() => sfx('chime'), 350);
    setTimeout(() => setSent(''), 3200);
  }

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/'));
    setFiles((cur) => {
      const next = [...cur, ...picked];
      if (next.length > MAX_PHOTOS) setErr(`Up to ${MAX_PHOTOS} photos in one message. The rest can go in another.`);
      return next.slice(0, MAX_PHOTOS);
    });
  }

  // where a post goes, and when it should reach her
  const extra = { ...(pageId ? { pageId } : {}), ...(deliver ? { showAt: `${deliver}T05:00:00Z` } : {}) };

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (tab === 'message') {
        if (!text.trim() && !files.length) throw new Error('Write something or add a photo.');
        const ids: string[] = [];
        for (let i = 0; i < files.length; i++) {
          if (files.length > 1) setStep(`Photo ${i + 1} of ${files.length}`);
          ids.push(await uploadFile(files[i], (p) => setPct(Math.round(((i + p / 100) / files.length) * 100))));
        }
        const p = await api<Post>('/api/posts', 'POST', { kind: ids.length ? 'photo' : 'text', text, mediaIds: ids.length ? ids : undefined, ...extra });
        setMine((m) => ({ ...m, posts: [p, ...m.posts] }));
        done(deliver ? 'Scheduled for her 🎁' : pageId ? 'Added to the page 📒' : ids.length > 1 ? `Album pinned to her wall 📸` : 'Pinned to her wall 💌');
      } else if (tab === 'voice') {
        const blob = audio.blob ?? file;
        if (!blob) throw new Error('Record or choose a voice note first.');
        const mediaId = await uploadFile(blob, setPct);
        const p = await api<Post>('/api/posts', 'POST', { kind: 'voice', text: text || 'A voice note', mediaId, ...extra });
        setMine((m) => ({ ...m, posts: [p, ...m.posts] }));
        done(deliver ? 'Scheduled for her 🎁' : 'Voice note sent 🎙️');
      } else if (tab === 'video') {
        const blob = video.blob ?? file;
        if (!blob) throw new Error('Record or choose a video first.');
        const mediaId = await uploadFile(blob, setPct);
        const p = await api<Post>('/api/posts', 'POST', { kind: 'video', text, mediaId, ...extra });
        setMine((m) => ({ ...m, posts: [p, ...m.posts] }));
        done(deliver ? 'Scheduled for her 🎁' : 'Video sent 🎬');
      } else if (tab === 'letter') {
        const t = title === 'custom' ? customTitle : title;
        const l = await api<Letter>('/api/letters', 'POST', { title: t, body: text, unlockAt: unlock || null });
        setMine((m) => ({ ...m, letters: [l, ...m.letters] }));
        done('Letter sealed ✉️');
      } else {
        const n = await api<JarNote>('/api/jar', 'POST', { mood, text });
        setMine((m) => ({ ...m, jar: [n, ...m.jar] }));
        done('Dropped into her jar 🫙');
      }
    } catch (e) {
      setErr((e as Error).message);
      setStep('');
    }
    setBusy(false);
  }

  async function del(kind: 'posts' | 'letters' | 'jar', id: string) {
    try {
      if (!(await deleteMine(kind, id))) return;
      setMine((m) => ({ ...m, [kind]: (m[kind] as { id: string }[]).filter((x) => x.id !== id) }));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const current = tabs.find((t) => t.id === tab)!;
  const showPosts = only.some((t) => t === 'message' || t === 'voice' || t === 'video');
  const total = (showPosts ? mine.posts.length : 0) + (only.includes('letter') ? mine.letters.length : 0) + (only.includes('jar') ? mine.jar.length : 0);
  const recording = ['recording', 'stopping'].includes(audio.state) || ['recording', 'stopping'].includes(video.state);

  return (
    <>
      {tabs.length > 1 && (
        <div className="w-tabs" role="tablist" aria-label="What would you like to send?">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="w-tab" onClick={() => switchTab(t.id)}>
              <span aria-hidden="true">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <motion.form key={tab} className="w-card" onSubmit={send} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <img className="h-tape" src="/reveal/washi.webp" alt="" />
        <p className="whisper w-hint">{pageId ? 'A photo, a note, a voice note or a little film for this scrapbook page. She’ll see the whole page; you’ll see your own pieces.' : current.hint}</p>

        {tab === 'letter' && (
          <>
            <label className="w-label" htmlFor="lt">
              Title
            </label>
            <select id="lt" className="h-select" value={title} onChange={(e) => setTitle(e.target.value)}>
              {letterTitles.map((t) => (
                <option key={t}>{t}</option>
              ))}
              <option value="custom">Write my own…</option>
            </select>
            {title === 'custom' && (
              <input className="h-input" style={{ marginTop: 8 }} value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Open when…" aria-label="Your own title" />
            )}
          </>
        )}

        {tab === 'jar' && (
          <>
            <p className="w-label">She’ll read this when she feels…</p>
            <div className="h-chips" style={{ justifyContent: 'flex-start' }}>
              {moods.map((m) => (
                <button type="button" key={m.id} className="h-chip" aria-pressed={mood === m.id} onClick={() => setMood(m.id)}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'voice' && (
          <div className="w-rec">
            {audio.state !== 'done' && audio.state !== 'stopping' && (
              <button
                type="button"
                className={`w-recbtn${audio.state === 'recording' ? ' on' : ''}`}
                onClick={audio.state === 'recording' ? audio.stop : audio.start}
                disabled={audio.state === 'starting'}
                aria-label={audio.state === 'recording' ? 'Stop recording' : 'Start recording'}
              >
                <span />
              </button>
            )}
            {audio.state === 'recording' && (
              <button type="button" className="w-stop" onClick={audio.stop}>
                ■ Stop recording
              </button>
            )}
            <p className="hand w-rec-label">
              {audio.state === 'recording'
                ? `recording… ${mmss(audio.secs)}`
                : audio.state === 'stopping'
                  ? 'saving your voice note…'
                  : audio.state === 'failed'
                    ? 'That recording didn’t save. Tap to try again, or upload a file below.'
                : audio.state === 'done'
                  ? `recorded ${mmss(audio.secs)}`
                  : audio.state === 'denied'
                    ? 'Allow microphone access in your browser settings, or upload a file below.'
                    : `tap to record (up to ${audio.max / 60} minutes)`}
            </p>
            {audioUrl && (
              <>
                <audio controls src={audioUrl} />
                <button type="button" className="ghost-btn" onClick={audio.reset} style={{ padding: '0 18px' }}>
                  Record again
                </button>
              </>
            )}
            {audio.state !== 'recording' && !audio.blob && (
              <button type="button" className="w-link" onClick={() => fileInput.current?.click()}>
                {file ? `Chosen: ${file.name}` : 'or upload an audio file'}
              </button>
            )}
          </div>
        )}

        {tab === 'video' && (
          <div className="w-rec">
            {video.stream && <LiveCam stream={video.stream} />}
            {videoUrl && <video src={videoUrl} className="w-preview" controls playsInline />}
            {!videoUrl && fileUrl && <video src={fileUrl} className="w-preview" controls playsInline />}
            {!file && video.state !== 'done' && video.state !== 'stopping' && (
              <button
                type="button"
                className={`w-recbtn w-recbtn-cam${video.state === 'recording' ? ' on' : ''}`}
                onClick={video.state === 'recording' ? video.stop : video.start}
                disabled={video.state === 'starting'}
                aria-label={video.state === 'recording' ? 'Stop recording' : 'Record a video'}
              >
                <span />
              </button>
            )}
            {video.state === 'recording' && (
              <button type="button" className="w-stop" onClick={video.stop}>
                ■ Stop recording
              </button>
            )}
            <p className="hand w-rec-label">
              {video.state === 'recording'
                ? `recording… ${mmss(video.secs)} of ${mmss(video.max)}`
                : video.state === 'stopping'
                  ? 'saving your film…'
                  : video.state === 'failed'
                    ? 'That recording didn’t save on this phone. Tap to try again, or upload a video below.'
                    : video.state === 'starting'
                  ? 'opening your camera…'
                  : video.state === 'done'
                    ? `recorded ${mmss(video.secs)}`
                    : video.state === 'denied'
                      ? 'Allow camera and microphone access in your browser settings, or upload a video below.'
                      : file
                        ? `Chosen: ${file.name}`
                        : `tap to record with your camera (up to ${video.max} seconds)`}
            </p>
            {video.blob && (
              <button type="button" className="ghost-btn" onClick={video.reset} style={{ padding: '0 18px' }}>
                Record again
              </button>
            )}
            {!recording && !video.blob && (
              <div className="w-drop" style={{ justifyContent: 'center' }}>
                <button type="button" className="w-link" onClick={() => fileInput.current?.click()}>
                  {file ? 'Choose a different video' : 'or upload a video'}
                </button>
                {file && (
                  <button type="button" className="w-link" onClick={() => setFiles([])}>
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'message' && (
          <div className="w-album">
            {files.length > 0 && (
              <div className="w-thumbs">
                {files.map((f, i) => (
                  <Thumb key={`${f.name}${f.size}${i}`} file={f} onRemove={() => setFiles((cur) => cur.filter((_, k) => k !== i))} />
                ))}
              </div>
            )}
            <div className="w-drop">
              <button type="button" className="ghost-btn" onClick={() => fileInput.current?.click()} style={{ padding: '0 18px' }} disabled={files.length >= MAX_PHOTOS}>
                {files.length ? `Add more photos (${files.length}/${MAX_PHOTOS})` : 'Add photos (optional, up to 10)'}
              </button>
              {files.length > 0 && (
                <button type="button" className="w-link" onClick={() => setFiles([])}>
                  Remove all
                </button>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          hidden
          multiple={tab === 'message'}
          accept={tab === 'video' ? 'video/*' : tab === 'voice' ? 'audio/*' : 'image/*'}
          onChange={(e) => {
            if (tab === 'message') addPhotos(e.target.files);
            else setFiles(e.target.files?.[0] ? [e.target.files[0]] : []);
            e.target.value = '';
          }}
        />

        <label className="w-label" htmlFor="tx">
          {tab === 'message' ? 'Your message' : tab === 'letter' ? 'The letter' : tab === 'jar' ? 'The note' : 'A caption (optional)'}
        </label>
        <textarea
          id="tx"
          className={tab === 'voice' || tab === 'video' ? 'h-input' : 'h-textarea'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            tab === 'message'
              ? `Dear Saanika…`
              : tab === 'letter'
                ? 'Write it like she’s reading it at exactly that moment.'
                : tab === 'jar'
                  ? 'Short and sweet.'
                  : 'e.g. “Our song, sort of”'
          }
          rows={tab === 'voice' || tab === 'video' ? 1 : 6}
        />

        {(tab === 'message' || tab === 'voice' || tab === 'video') && (
          <details className="w-later" open={Boolean(deliver)}>
            <summary>🎁 Make it a surprise for a later day</summary>
            {occasions.length > 0 && (
              <>
                <p className="w-label">Deliver it on a special day</p>
                <div className="h-chips w-occasions" style={{ justifyContent: 'flex-start' }}>
                  {occasions.map((o) => (
                    <button type="button" key={o.date + o.title} className="h-chip" aria-pressed={deliver === o.date} onClick={() => setDeliver(deliver === o.date ? '' : o.date)}>
                      {o.emoji} {o.title}
                      <small> · {new Date(`${o.date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
            <label className="w-label" htmlFor="dl">
              Deliver it on
            </label>
            <input id="dl" type="date" className="h-input" min={tomorrow()} value={deliver} onChange={(e) => setDeliver(e.target.value)} />
            {deliver && (
              <p className="w-later-note">
                She won’t see it until the morning of {new Date(`${deliver}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}, and she’ll get a ping when it arrives.{' '}
                <button type="button" className="w-link" onClick={() => setDeliver('')}>
                  Send it now instead
                </button>
              </p>
            )}
          </details>
        )}

        {tab === 'letter' && (
          <>
            {occasions.length > 0 && (
              <>
                <p className="w-label">Seal it for a special day</p>
                <div className="h-chips" style={{ justifyContent: 'flex-start' }}>
                  {occasions.map((o) => (
                    <button
                      type="button"
                      key={o.date + o.title}
                      className="h-chip"
                      aria-pressed={unlock === o.date}
                      onClick={() => {
                        setUnlock(o.date);
                        setTitle('custom');
                        setCustomTitle(`Open on ${o.title} ${o.emoji}`);
                      }}
                    >
                      {o.emoji} {o.title}
                      <small> · {new Date(`${o.date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
            <label className="w-label" htmlFor="ul">
              Keep it sealed until (optional)
            </label>
            <input id="ul" type="date" className="h-input" value={unlock} onChange={(e) => setUnlock(e.target.value)} />
          </>
        )}

        {busy && pct > 0 && pct < 100 && (
          <div className="bingo-bar" style={{ width: '100%', margin: '14px 0 0' }} aria-label={`Uploading ${pct}%`}>
            <span style={{ width: `${pct}%` }} />
          </div>
        )}
        {err && <p className="h-err">{err}</p>}

        <div className="w-send">
          <button className="cta" type="submit" disabled={busy || recording}>
            {busy
              ? pct && pct < 100
                ? `${step ? `${step} · ` : 'Uploading '}${pct}%`
                : 'Sending…'
              : tab === 'letter'
                ? 'Seal the letter'
                : tab === 'jar'
                  ? 'Drop it in the jar'
                  : 'Send to Saanika'}
          </button>
        </div>

        <AnimatePresence>
          {sent && (
            <motion.p className="hand w-sent" initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} role="status">
              {sent}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.form>

      {children}

      <section className="w-mine" aria-label="What you’ve sent">
        <h2 className="hand">{total ? `What you’ve sent (${total})` : 'Nothing sent yet'}</h2>
        <div className="love-wall">
          {showPosts && <SentPosts posts={mine.posts} onDelete={(id) => del('posts', id)} />}
          {only.includes('letter') && <SentLetters letters={mine.letters} onDelete={(id) => del('letters', id)} />}
          {only.includes('jar') && <SentJar jar={mine.jar} onDelete={(id) => del('jar', id)} />}
        </div>
      </section>
    </>
  );
}
