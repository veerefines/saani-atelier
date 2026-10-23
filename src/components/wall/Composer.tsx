'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { JarNote, Letter, Post } from '@/lib/data';
import { letterTitles, moods } from '@/content/home';
import { api, uploadFile } from '@/lib/upload-client';
import { PostBody, when } from '@/components/home/LoveWall';

type Tab = 'message' | 'voice' | 'video' | 'letter' | 'jar';
const TABS: { id: Tab; label: string; emoji: string; hint: string }[] = [
  { id: 'message', label: 'Message', emoji: '💌', hint: 'A note, a memory, a photo. It goes on her wall of love.' },
  { id: 'voice', label: 'Voice note', emoji: '🎙️', hint: 'Record something she can play when she misses your voice.' },
  { id: 'video', label: 'Video', emoji: '🎬', hint: 'A little film for her wall. Keep it short and sweet.' },
  { id: 'letter', label: 'Open-when letter', emoji: '✉️', hint: 'Sealed for a particular moment. You can lock it until a date.' },
  { id: 'jar', label: 'Jar note', emoji: '🫙', hint: 'A tiny note she’ll pull out of her jar when she feels a certain way.' },
];

type Mine = { posts: Post[]; letters: Letter[]; jar: JarNote[] };

function useRecorder() {
  const [state, setState] = useState<'idle' | 'recording' | 'done' | 'denied'>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [secs, setSecs] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>(0);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setBlob(new Blob(chunks.current, { type: (r.mimeType || 'audio/webm').split(';')[0] }));
        setState('done');
        clearInterval(timer.current);
      };
      r.start(250);
      rec.current = r;
      setSecs(0);
      setState('recording');
      timer.current = window.setInterval(() => {
        setSecs((s) => {
          if (s + 1 >= 180) r.state === 'recording' && r.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setState('denied');
    }
  }
  const stop = () => rec.current?.state === 'recording' && rec.current.stop();
  const reset = () => {
    setBlob(null);
    setState('idle');
    setSecs(0);
  };
  useEffect(() => () => clearInterval(timer.current), []);
  return { state, blob, secs, start, stop, reset };
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Composer({ name, mine: initial }: { name: string; mine: Mine }) {
  const [tab, setTab] = useState<Tab>('message');
  const [mine, setMine] = useState(initial);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [title, setTitle] = useState(letterTitles[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [unlock, setUnlock] = useState('');
  const [mood, setMood] = useState(moods[0].id);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState('');
  const rec = useRecorder();
  const fileInput = useRef<HTMLInputElement>(null);
  const first = name.split(' ')[0];

  useEffect(() => {
    if (!file) return setPreview('');
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  function switchTab(t: Tab) {
    setTab(t);
    setErr('');
    setFile(null);
    rec.reset();
  }

  function done(msg: string) {
    setText('');
    setFile(null);
    setCustomTitle('');
    setUnlock('');
    rec.reset();
    setPct(0);
    setSent(msg);
    setTimeout(() => setSent(''), 3200);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (tab === 'message') {
        if (!text.trim() && !file) throw new Error('Write something or add a photo.');
        const mediaId = file ? await uploadFile(file, setPct) : undefined;
        const p = await api<Post>('/api/posts', 'POST', { kind: file ? 'photo' : 'text', text, mediaId });
        setMine((m) => ({ ...m, posts: [p, ...m.posts] }));
        done('Pinned to her wall 💌');
      } else if (tab === 'voice') {
        const blob = rec.blob ?? file;
        if (!blob) throw new Error('Record or choose a voice note first.');
        const mediaId = await uploadFile(blob, setPct);
        const p = await api<Post>('/api/posts', 'POST', { kind: 'voice', text: text || 'A voice note', mediaId });
        setMine((m) => ({ ...m, posts: [p, ...m.posts] }));
        done('Voice note sent 🎙️');
      } else if (tab === 'video') {
        if (!file) throw new Error('Choose a video first.');
        const mediaId = await uploadFile(file, setPct);
        const p = await api<Post>('/api/posts', 'POST', { kind: 'video', text, mediaId });
        setMine((m) => ({ ...m, posts: [p, ...m.posts] }));
        done('Video sent 🎬');
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
    }
    setBusy(false);
  }

  async function del(kind: 'posts' | 'letters' | 'jar', id: string) {
    if (!confirm('Delete this? She won’t see it any more.')) return;
    const url = kind === 'posts' ? `/api/posts/${id}` : kind === 'letters' ? `/api/letters/${id}` : `/api/jar/${id}`;
    try {
      await api(url, 'DELETE');
      setMine((m) => ({ ...m, [kind]: (m[kind] as { id: string }[]).filter((x) => x.id !== id) }));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const current = TABS.find((t) => t.id === tab)!;
  const total = mine.posts.length + mine.letters.length + mine.jar.length;

  return (
    <main className="h-page w-page">
      <header className="h-pagehead">
        <p className="hand h-kicker">psst, it’s a surprise</p>
        <h1 className="chrome w-hi">Hi {first}</h1>
        <p className="whisper h-sub">Leave something for Saanika. She’ll find it in Milan.</p>
      </header>

      <div className="w-tabs" role="tablist" aria-label="What would you like to send?">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="w-tab" onClick={() => switchTab(t.id)}>
            <span aria-hidden="true">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      <motion.form key={tab} className="w-card" onSubmit={send} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <img className="h-tape" src="/reveal/washi.webp" alt="" />
        <p className="whisper w-hint">{current.hint}</p>

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
            {rec.state !== 'done' && (
              <button
                type="button"
                className={`w-recbtn${rec.state === 'recording' ? ' on' : ''}`}
                onClick={rec.state === 'recording' ? rec.stop : rec.start}
                aria-label={rec.state === 'recording' ? 'Stop recording' : 'Start recording'}
              >
                <span />
              </button>
            )}
            <p className="hand w-rec-label">
              {rec.state === 'recording'
                ? `recording… ${mmss(rec.secs)} (tap to stop)`
                : rec.state === 'done'
                  ? `recorded ${mmss(rec.secs)}`
                  : rec.state === 'denied'
                    ? 'Allow microphone access in your browser settings, or upload a file below.'
                    : 'tap to record (up to 3 minutes)'}
            </p>
            {rec.blob && (
              <>
                <audio controls src={URL.createObjectURL(rec.blob)} />
                <button type="button" className="ghost-btn" onClick={rec.reset} style={{ padding: '0 18px' }}>
                  Record again
                </button>
              </>
            )}
            {rec.state !== 'recording' && !rec.blob && (
              <button type="button" className="w-link" onClick={() => fileInput.current?.click()}>
                {file ? `Chosen: ${file.name}` : 'or upload an audio file'}
              </button>
            )}
          </div>
        )}

        {(tab === 'message' || tab === 'video') && (
          <div className="w-drop">
            {preview && tab === 'message' && <img src={preview} alt="Your photo" className="w-preview" />}
            {preview && tab === 'video' && <video src={preview} className="w-preview" controls playsInline />}
            <button type="button" className="ghost-btn" onClick={() => fileInput.current?.click()} style={{ padding: '0 18px' }}>
              {file ? (tab === 'video' ? 'Choose a different video' : 'Choose a different photo') : tab === 'video' ? 'Choose a video' : 'Add a photo (optional)'}
            </button>
            {file && (
              <button type="button" className="w-link" onClick={() => setFile(null)}>
                Remove
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          hidden
          accept={tab === 'video' ? 'video/*' : tab === 'voice' ? 'audio/*' : 'image/*'}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
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

        {tab === 'letter' && (
          <>
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
          <button className="cta" type="submit" disabled={busy || rec.state === 'recording'}>
            {busy ? (pct && pct < 100 ? `Uploading ${pct}%` : 'Sending…') : tab === 'letter' ? 'Seal the letter' : tab === 'jar' ? 'Drop it in the jar' : 'Send to Saanika'}
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

      <section className="w-mine" aria-label="What you’ve sent">
        <h2 className="hand">{total ? `What you’ve sent (${total})` : 'Nothing sent yet'}</h2>
        <div className="love-wall">
          {mine.posts.map((p) => (
            <article key={p.id} className="love-card">
              <PostBody p={p} />
              <div className="w-mine-meta">
                <span>{p.reactions.length ? `Saanika sent ${p.reactions.join(' ')}` : when(p.createdAt)}</span>
                <button onClick={() => del('posts', p.id)}>Delete</button>
              </div>
            </article>
          ))}
          {mine.letters.map((l) => (
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
                <button onClick={() => del('letters', l.id)}>Delete</button>
              </div>
            </article>
          ))}
          {mine.jar.map((n) => (
            <article key={n.id} className="love-card">
              <div className={`love-note look-${n.color % 6}`}>
                🫙 {n.text}
                <span className="love-from">for when she’s {moods.find((m) => m.id === n.mood)?.label}</span>
              </div>
              <div className="w-mine-meta">
                <span>{n.drawnAt ? 'She’s read it 💗' : 'In the jar'}</span>
                <button onClick={() => del('jar', n.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="h-foot">
        <a href="/api/logout">Sign out</a>
      </footer>
    </main>
  );
}
