'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MOMENT_REACTIONS, type Moment, type MomentKind } from '@/content/moments';
import { api, mediaUrl, uploadFile } from '@/lib/upload-client';
import { mmss, useObjectUrl, useRecorder } from '@/components/wall/recorder';

export type Friend = { id: string; name: string };

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/** The photo, film or voice note itself. */
export function MomentMedia({ m }: { m: Moment }) {
  const src = mediaUrl(m.mediaId);
  if (m.kind === 'photo') return <img className="mo-img" src={src} alt={m.caption || 'A moment from Saanika'} />;
  if (m.kind === 'video') return <video className="mo-img" src={src} controls playsInline preload="metadata" />;
  return (
    <div className="mo-voice">
      <span aria-hidden="true">🎙️</span>
      <audio src={src} controls preload="none" />
    </div>
  );
}

/** Reactions grouped by emoji: "💗 Vee, Manya". */
function Reactions({ m }: { m: Moment }) {
  if (!m.reactions.length) return <small className="mo-none">No reactions yet</small>;
  const by = new Map<string, string[]>();
  for (const r of m.reactions) by.set(r.emoji, [...(by.get(r.emoji) ?? []), r.name.split(' ')[0]]);
  return (
    <p className="mo-reacts">
      {[...by].map(([e, names]) => (
        <span key={e}>
          {e} {names.join(', ')}
        </span>
      ))}
    </p>
  );
}

/** On her desk: send her people a photo, a little video or a voice note. */
export function ShareMoment({ friends, onSent }: { friends: Friend[]; onSent?: (m: Moment) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<MomentKind | null>(null);
  const [caption, setCaption] = useState('');
  const [everyone, setEveryone] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const voice = useRecorder('audio');
  const preview = useObjectUrl(file);
  const voiceUrl = useObjectUrl(voice.blob);

  const choose = (f: File | undefined) => {
    if (!f) return;
    const k: MomentKind | null = f.type.startsWith('image/') ? 'photo' : f.type.startsWith('video/') ? 'video' : null;
    if (!k) return setErr('Choose a photo or a video.');
    voice.reset();
    setErr('');
    setMsg('');
    setFile(f);
    setKind(k);
  };
  const clear = () => {
    setFile(null);
    setKind(null);
    setCaption('');
    voice.reset();
  };

  async function send() {
    const blob = kind === 'voice' ? voice.blob : file;
    if (!blob || !kind) return;
    if (!everyone && !picked.length) return setErr('Pick at least one person, or send it to everyone.');
    setErr('');
    try {
      setBusy('Uploading…');
      const mediaId = await uploadFile(blob, (p) => setBusy(`Uploading ${p}%`));
      setBusy('Sending…');
      const m = await api<Moment>('/api/moments', 'POST', { kind, mediaId, caption, to: everyone ? 'all' : picked });
      onSent?.(m);
      clear();
      setMsg(everyone ? 'Sent to everyone 💗' : `Sent to ${friends.filter((f) => picked.includes(f.id)).map((f) => f.name.split(' ')[0]).join(', ')} 💗`);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy('');
  }

  const ready = (kind === 'voice' && voice.blob) || (kind !== 'voice' && file);
  return (
    <section className="mo-share" aria-label="Share a moment">
      <div className="mo-share-head">
        <span className="hand">share a moment</span>
        <Link href="/home/moments" className="w-link">
          sent &amp; reactions →
        </Link>
      </div>

      {!kind && <p className="mo-hint">A photo, a little video or a voice note, for everyone or just a few.</p>}
      {!kind && (
        <div className="mo-pick">
          <label className="mo-btn">
            📷 Photo or video
            <input type="file" accept="image/*,video/*" hidden onChange={(e) => (choose(e.target.files?.[0]), (e.target.value = ''))} />
          </label>
          <button
            type="button"
            className="mo-btn"
            onClick={() => {
              setMsg('');
              setKind('voice');
              voice.start();
            }}
          >
            🎙️ Voice note
          </button>
        </div>
      )}

      {kind === 'voice' && (
        <div className="mo-rec">
          {voice.state === 'recording' || voice.state === 'starting' ? (
            <button type="button" className="w-stop" onClick={voice.stop}>
              ■ Stop recording · {mmss(voice.secs)}
            </button>
          ) : voice.state === 'stopping' ? (
            <p className="mo-none">saving…</p>
          ) : voice.state === 'denied' ? (
            <p className="h-err">Allow the microphone to record a voice note.</p>
          ) : voice.state === 'failed' ? (
            <p className="h-err">That recording didn’t save. Try again.</p>
          ) : null}
          {voiceUrl && <audio src={voiceUrl} controls />}
        </div>
      )}
      {kind === 'photo' && preview && <img className="mo-preview" src={preview} alt="" />}
      {kind === 'video' && preview && <video className="mo-preview" src={preview} controls playsInline />}

      {kind && (
        <>
          <input className="h-input" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={140} placeholder="A caption (optional)" aria-label="Caption" />
          <div className="mo-to" role="group" aria-label="Send to">
            <button type="button" aria-pressed={everyone} onClick={() => setEveryone(true)}>
              Everyone
            </button>
            {friends.map((f) => {
              const on = !everyone && picked.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setEveryone(false);
                    setPicked((p) => (p.includes(f.id) ? p.filter((x) => x !== f.id) : [...p, f.id]));
                  }}
                >
                  {f.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
          <div className="mo-actions">
            <button type="button" className="cta h-small-btn" disabled={!ready || Boolean(busy)} onClick={send}>
              {busy || 'Send 💌'}
            </button>
            <button type="button" className="w-link" onClick={clear} disabled={Boolean(busy)}>
              Cancel
            </button>
          </div>
        </>
      )}
      {err && <p className="h-err">{err}</p>}
      {msg && <p className="nudge-ok">{msg}</p>}
    </section>
  );
}

/** Her moments page: everything she's sent, who it went to, and the reactions. */
export function MySentMoments({ initial, friends }: { initial: Moment[]; friends: Friend[] }) {
  const [list, setList] = useState(initial);
  const [err, setErr] = useState('');
  const nameOf = (id: string) => friends.find((f) => f.id === id)?.name.split(' ')[0] ?? 'someone';
  const remove = async (id: string) => {
    if (!confirm('Take this moment back? It disappears for everyone.')) return;
    try {
      await api(`/api/moments/${id}`, 'DELETE');
      setList((l) => l.filter((m) => m.id !== id));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <>
      <ShareMoment friends={friends} onSent={(m) => setList((l) => [m, ...l])} />
      {err && <p className="h-err">{err}</p>}
      {!list.length && <p className="h-empty whisper">Nothing sent yet. Your people would love a little peek at Milano.</p>}
      <div className="mo-list">
        {list.map((m) => (
          <article key={m.id} className="mo-card">
            <MomentMedia m={m} />
            {m.caption && <p className="hand mo-cap">{m.caption}</p>}
            <small className="mo-meta">
              {ago(m.createdAt)} · to {m.to === 'all' ? 'everyone' : m.to.map(nameOf).join(', ')}
            </small>
            <Reactions m={m} />
            <button type="button" className="w-link" onClick={() => remove(m.id)}>
              Take it back
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

function ReactRow({ m, me, onChange }: { m: Moment; me: string; onChange: (m: Moment) => void }) {
  const [err, setErr] = useState('');
  const react = async (emoji: string) => {
    setErr('');
    try {
      onChange(await api<Moment>(`/api/moments/${m.id}/react`, 'POST', { emoji }));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <>
      <div className="mo-react" role="group" aria-label="React">
        {MOMENT_REACTIONS.map((e) => (
          <button key={e} type="button" aria-pressed={m.reactions.some((r) => r.by === me && r.emoji === e)} onClick={() => react(e)} aria-label={`React ${e}`}>
            {e}
          </button>
        ))}
      </div>
      {err && <p className="h-err">{err}</p>}
    </>
  );
}

/** On a friend's desk: her latest moment for them, Locket-style. Nothing shows until she's sent one. */
export function LatestMoment({ me }: { me: string }) {
  const [list, setList] = useState<Moment[] | null>(null);
  useEffect(() => {
    fetch('/api/moments')
      .then((r) => (r.ok ? r.json() : []))
      .then(setList)
      .catch(() => setList([]));
  }, []);
  const m = list?.[0];
  if (!m) return null;
  return (
    <section className="dk-card mo-tile" aria-label="From Saanika">
      <div className="dk-head">
        <span className="hand">from Saanika</span>
        <small>{ago(m.createdAt)}</small>
      </div>
      <MomentMedia m={m} />
      {m.caption && <p className="hand mo-cap">{m.caption}</p>}
      <ReactRow m={m} me={me} onChange={(n) => setList((l) => (l ?? []).map((x) => (x.id === n.id ? n : x)))} />
      {list.length > 1 && (
        <Link href="/wall/moments" className="w-link">
          all {list.length} moments →
        </Link>
      )}
    </section>
  );
}

/** A friend's page of every moment she's sent them. */
export function FriendMoments({ initial, me }: { initial: Moment[]; me: string }) {
  const [list, setList] = useState(initial);
  if (!list.length) return <p className="h-empty whisper">Nothing yet. When Saanika shares a moment with you, it lands here.</p>;
  return (
    <div className="mo-list">
      {list.map((m) => (
        <article key={m.id} className="mo-card">
          <MomentMedia m={m} />
          {m.caption && <p className="hand mo-cap">{m.caption}</p>}
          <small className="mo-meta">{ago(m.createdAt)}</small>
          <ReactRow m={m} me={me} onChange={(n) => setList((l) => l.map((x) => (x.id === n.id ? n : x)))} />
        </article>
      ))}
    </div>
  );
}
