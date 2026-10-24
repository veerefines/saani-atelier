'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NUDGE_EMOJI, REACT_EMOJI, type Nudge } from '@/content/nudges';
import { api } from '@/lib/upload-client';

const LINES = ['Miss you!', 'You’ve got this', 'So proud of you', 'Eat something nice', 'Call me later?'];

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function useNudges() {
  const [list, setList] = useState<Nudge[] | null>(null);
  useEffect(() => {
    fetch('/api/nudges')
      .then((r) => (r.ok ? r.json() : []))
      .then(setList)
      .catch(() => setList([]));
  }, []);
  return [list, setList] as const;
}

/** On a friend's desk: one tap to tell her you're thinking of her, with an emoji and a few words. */
export function NudgeSend() {
  const [list, setList] = useNudges();
  const [emoji, setEmoji] = useState(NUDGE_EMOJI[0]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(0);
  const [err, setErr] = useState('');

  async function send() {
    setBusy(true);
    setErr('');
    try {
      const n = await api<Nudge>('/api/nudges', 'POST', { emoji, text });
      setList((l) => [n, ...(l ?? [])]);
      setText('');
      setSent((k) => k + 1);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <section className="nudge" id="nudges" aria-label="Thinking of her">
      <span className="hand">thinking of her?</span>
      <div className="nudge-row">
        <button type="button" className="nudge-big" onClick={send} disabled={busy} aria-label={`Send ${emoji} to Saanika`}>
          <span>{emoji}</span>
          <AnimatePresence>
            {sent > 0 && (
              <motion.i key={sent} initial={{ opacity: 1, y: 0, scale: 0.8 }} animate={{ opacity: 0, y: -70, scale: 1.6 }} transition={{ duration: 1.1 }} aria-hidden="true">
                {emoji}
              </motion.i>
            )}
          </AnimatePresence>
        </button>
        <div className="nudge-pick">
          <div className="nudge-emoji" role="radiogroup" aria-label="Emoji">
            {NUDGE_EMOJI.map((e) => (
              <button key={e} type="button" role="radio" aria-checked={emoji === e} onClick={() => setEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
          <input className="h-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={80} placeholder="A few words (optional)" aria-label="A few words" />
          <div className="nudge-lines">
            {LINES.map((l) => (
              <button key={l} type="button" onClick={() => setText(l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button type="button" className="cta nudge-send" onClick={send} disabled={busy}>
        {busy ? 'Sending…' : sent ? `Sent ${emoji} Send another` : `Send ${emoji} to Saanika`}
      </button>
      {err && <p className="h-err">{err}</p>}
      {sent > 0 && !err && <p className="nudge-ok">She’ll get a little buzz on her phone.</p>}

      {list && list.length > 0 && (
        <ul className="nudge-mine" aria-label="Your nudges">
          {list.slice(0, 4).map((n) => (
            <li key={n.id}>
              <span className="nudge-e">{n.emoji}</span>
              <span className="nudge-body">
                {n.text ? <b>{n.text}</b> : <b>thinking of you</b>}
                <small>{ago(n.createdAt)}</small>
                {(n.reaction || n.reply) && (
                  <span className="nudge-back">
                    <span className="hand">Saanika</span> {n.reaction} {n.reply && `“${n.reply}”`}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Answer({ n, onDone }: { n: Nudge; onDone: (n: Nudge) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const first = n.authorName.split(' ')[0];
  const send = async (body: { reaction?: string; reply?: string }) => {
    setBusy(true);
    setErr('');
    try {
      onDone(await api<Nudge>(`/api/nudges/${n.id}`, 'POST', body));
      setText('');
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <>
      <div className="nudge-react" role="group" aria-label={`React to ${first}`}>
        {REACT_EMOJI.map((e) => (
          <button key={e} type="button" disabled={busy} aria-pressed={n.reaction === e} onClick={() => send({ reaction: e })}>
            {e}
          </button>
        ))}
      </div>
      <form
        className="nudge-reply"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send({ reply: text });
        }}
      >
        <input className="h-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder={`Reply to ${first}…`} aria-label={`Reply to ${first}`} />
        <button className="cta h-small-btn" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
      {err && <p className="h-err">{err}</p>}
    </>
  );
}

/** On her desk: who's been thinking of her, to react to or answer. */
export function NudgeInbox() {
  const [list, setList] = useNudges();
  const [all, setAll] = useState(false);
  if (!list || !list.length) return null;
  const shown = all ? list : list.slice(0, 3);
  const update = (n: Nudge) => setList((l) => (l ?? []).map((x) => (x.id === n.id ? n : x)));
  return (
    <section className="nudge nudge-in" id="nudges" aria-label="Thinking of you">
      <span className="hand">thinking of you</span>
      <ul>
        {shown.map((n) => (
          <li key={n.id} className={n.answeredAt ? 'answered' : ''}>
            <div className="nudge-head">
              <span className="nudge-e">{n.emoji}</span>
              <span className="nudge-body">
                <b>
                  {n.text ? `${n.authorName.split(' ')[0]}: “${n.text}”` : `${n.authorName.split(' ')[0]} is thinking of you`}
                </b>
                <small>{ago(n.createdAt)}</small>
                {(n.reaction || n.reply) && (
                  <span className="nudge-back">
                    you sent {n.reaction} {n.reply && `“${n.reply}”`}
                  </span>
                )}
              </span>
            </div>
            <Answer n={n} onDone={update} />
          </li>
        ))}
      </ul>
      {list.length > 3 && (
        <button type="button" className="w-link" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${list.length}`}
        </button>
      )}
    </section>
  );
}
