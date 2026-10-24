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

/** Nudges, kept fresh: checked again every 20 seconds and whenever the page comes back into view. */
function useNudges() {
  const [list, setList] = useState<Nudge[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/nudges')
        .then((r) => (r.ok ? r.json() : null))
        .then((l: Nudge[] | null) => alive && l && setList(l))
        .catch(() => {});
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 20_000);
    const onShow = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);
  return [list, setList] as const;
}

/** On a friend's desk: a small, one-tap "thinking of you", with an emoji and a few words if they like. */
export function NudgeSend() {
  const [list, setList] = useNudges();
  const [emoji, setEmoji] = useState(NUDGE_EMOJI[0]);
  const [text, setText] = useState('');
  const [more, setMore] = useState(false);
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
      setMore(false);
      setSent((k) => k + 1);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  const answered = list?.find((n) => n.reaction || n.reply);

  return (
    <section className="nudge-mini" id="nudges" aria-label="Thinking of her">
      <div className="nm-row">
        <button type="button" className="nm-send" onClick={send} disabled={busy} aria-label={`Send ${emoji} to Saanika`}>
          <span>{emoji}</span>
          <AnimatePresence>
            {sent > 0 && (
              <motion.i key={sent} initial={{ opacity: 1, y: 0, scale: 0.8 }} animate={{ opacity: 0, y: -46, scale: 1.4 }} transition={{ duration: 1 }} aria-hidden="true">
                {emoji}
              </motion.i>
            )}
          </AnimatePresence>
        </button>
        <span className="nm-text">
          <b>{sent ? 'Sent. She’ll feel it.' : 'Thinking of her?'}</b>
          <small>{sent ? 'Tap again any time.' : 'Tap to send her a little ' + emoji}</small>
        </span>
        <button type="button" className="nm-more" onClick={() => setMore(!more)} aria-expanded={more} aria-label="Pick an emoji or add a few words">
          {more ? '×' : '✎'}
        </button>
      </div>
      {more && (
        <div className="nm-extra">
          <div className="nudge-emoji" role="radiogroup" aria-label="Emoji">
            {NUDGE_EMOJI.map((e) => (
              <button key={e} type="button" role="radio" aria-checked={emoji === e} onClick={() => setEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
          <form
            className="nudge-reply"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input className="h-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={80} placeholder="A few words (optional)" aria-label="A few words" list="nudge-lines" />
            <datalist id="nudge-lines">
              {LINES.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
            <button className="cta h-small-btn" disabled={busy}>
              Send {emoji}
            </button>
          </form>
        </div>
      )}
      {err && <p className="h-err">{err}</p>}
      {answered && (
        <p className="nm-back">
          <span className="hand">Saanika</span> {answered.reaction} {answered.reply && `“${answered.reply}”`}
          <small>
            {' '}
            to your {answered.emoji} · {ago(answered.answeredAt ?? answered.createdAt)}
          </small>
        </p>
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
