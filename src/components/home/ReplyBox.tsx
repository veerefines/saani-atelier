'use client';

import { useEffect, useRef, useState } from 'react';
import type { Post, Reply } from '@/lib/data';
import { api, mediaUrl, uploadFile } from '@/lib/upload-client';

const QUICK = ['🙏', '💗', '🌷', '🪡'];

/** Her thank-you on a post: a quick emoji, a line, or a voice note, sent back to whoever posted it. */
export default function ReplyBox({ post, onReplied }: { post: Post; onReplied: (p: Post) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rec, setRec] = useState<'idle' | 'on' | 'done'>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState('');
  const r = useRef<MediaRecorder | null>(null);
  const first = post.authorName.split(' ')[0];

  useEffect(() => {
    if (!blob) return setBlobUrl('');
    const u = URL.createObjectURL(blob);
    setBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  async function startRec() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t));
      const m = new MediaRecorder(s, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 96_000 });
      const chunks: Blob[] = [];
      m.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      m.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        setBlob(new Blob(chunks, { type: (m.mimeType || 'audio/webm').split(';')[0] }));
        setRec('done');
      };
      m.start(250);
      r.current = m;
      setRec('on');
      setTimeout(() => m.state === 'recording' && m.stop(), 60_000);
    } catch {
      setErr('Allow the microphone to record a voice note.');
    }
  }

  async function send(body: { emoji?: string; text?: string; voice?: boolean }) {
    setBusy(true);
    setErr('');
    try {
      const mediaId = body.voice && blob ? await uploadFile(blob) : undefined;
      const p = await api<Post>(`/api/posts/${post.id}/reply`, 'POST', { emoji: body.emoji, text: body.text, mediaId });
      onReplied(p);
      setText('');
      setBlob(null);
      setRec('idle');
      setOpen(false);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="reply">
      {post.replies?.map((x: Reply) => (
        <p key={x.at} className="reply-sent">
          <span className="hand">you replied</span> {x.emoji} {x.text}
          {x.mediaId && <audio controls preload="none" src={mediaUrl(x.mediaId)} />}
        </p>
      ))}
      {!open ? (
        <button className="reply-open" onClick={() => setOpen(true)}>
          Thank {first} 💌
        </button>
      ) : (
        <div className="reply-box">
          <div className="reply-quick">
            {QUICK.map((e) => (
              <button key={e} onClick={() => send({ emoji: e })} disabled={busy} aria-label={`Send ${e} to ${first}`}>
                {e}
              </button>
            ))}
          </div>
          <form
            className="reply-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) send({ text });
            }}
          >
            <input className="h-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Say something to ${first}…`} maxLength={500} aria-label="Your reply" />
            <button className="cta h-small-btn" disabled={busy || !text.trim()}>
              Send
            </button>
          </form>
          <div className="reply-voice">
            {rec === 'idle' && (
              <button type="button" className="ghost-btn" onClick={startRec}>
                🎙️ Record a voice note
              </button>
            )}
            {rec === 'on' && (
              <button type="button" className="ghost-btn reply-recording" onClick={() => r.current?.stop()}>
                ⏺ Recording… tap to stop
              </button>
            )}
            {rec === 'done' && blobUrl && (
              <>
                <audio controls src={blobUrl} />
                <button type="button" className="cta h-small-btn" disabled={busy} onClick={() => send({ voice: true })}>
                  {busy ? 'Sending…' : 'Send voice note'}
                </button>
                <button type="button" className="w-link" onClick={() => (setBlob(null), setRec('idle'))}>
                  Redo
                </button>
              </>
            )}
          </div>
          {err && <p className="h-err">{err}</p>}
          <button className="w-link" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
