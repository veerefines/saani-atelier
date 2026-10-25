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
  const [hers, setHers] = useState<{ emoji: string; at: string } | null>(null);
  useEffect(() => {
    fetch('/api/nudges/back')
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => h && Date.now() - new Date(h.at).getTime() < 3 * 86_400_000 && setHers(h))
      .catch(() => {});
  }, []);

  return (
    <section className="dk-card nudge-mini" id="nudges" aria-label="Thinking of her">
      <div className="dk-head">
        <span className="hand">thinking of her?</span>
        <button type="button" className="nm-more" onClick={() => setMore(!more)} aria-expanded={more} aria-label="Pick an emoji or add a few words" title="Pick an emoji or add a few words">
          {more ? '×' : '✎'}
        </button>
      </div>
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
          <b>{sent ? 'Sent. She’ll feel it.' : `Tap to send her a little ${emoji}`}</b>
          <small>{sent ? 'Tap again any time.' : 'or ✎ to add a few words'}</small>
        </span>
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
      {hers && (
        <p className="nm-back">
          <span className="hand">Saanika</span> is thinking of you all {hers.emoji} <small>· {ago(hers.at)}</small>
        </p>
      )}
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

/** One nudge on her desk, kept small: a quick emoji back, a reply only if she wants one, and clear. */
function InboxItem({ n, onDone, onClear }: { n: Nudge; onDone: (n: Nudge) => void; onClear: () => void }) {
  const [replying, setReplying] = useState(false);
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
      setReplying(false);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <li className={n.answeredAt ? 'answered' : ''}>
      <div className="ni-top">
        <span className="nudge-e" aria-hidden="true">
          {n.emoji}
        </span>
        <span className="ni-who">
          <b>{first}</b> <small>· {ago(n.createdAt)}</small>
          {n.text && <span className="ni-text">“{n.text}”</span>}
        </span>
        <button type="button" className="ni-x" onClick={onClear} aria-label={`Clear ${first}’s nudge`} title="Clear">
          ×
        </button>
      </div>
      {n.answeredAt ? (
        <p className="ni-sent">
          you sent {n.reaction} {n.reply && `“${n.reply}”`}
        </p>
      ) : replying ? (
        <form
          className="nudge-reply"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send({ reply: text });
          }}
        >
          <input className="h-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder={`Reply to ${first}…`} aria-label={`Reply to ${first}`} autoFocus />
          <button className="cta h-small-btn" disabled={busy || !text.trim()}>
            Send
          </button>
        </form>
      ) : (
        <div className="ni-actions">
          {REACT_EMOJI.map((e) => (
            <button key={e} type="button" disabled={busy} onClick={() => send({ reaction: e })} aria-label={`Send ${e} to ${first}`}>
              {e}
            </button>
          ))}
          <button type="button" className="ni-reply" onClick={() => setReplying(true)}>
            Reply
          </button>
        </div>
      )}
      {err && <p className="h-err">{err}</p>}
    </li>
  );
}

/** On her desk: one tap sends all her people a "thinking of you all". */
export function LoveBack() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const send = async () => {
    setBusy(true);
    try {
      await api('/api/nudges/back', 'POST', { emoji: '💗' });
      setDone('Sent to everyone 💗');
    } catch (e) {
      setDone((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <button type="button" className="love-back" onClick={send} disabled={busy || Boolean(done)}>
      {done || 'Thinking of my people 💗'}
    </button>
  );
}

/** On her desk: who's been thinking of her. A few at a time; she clears them once she's seen them. */
export function NudgeInbox() {
  const [list, setList] = useNudges();
  const [all, setAll] = useState(false);
  const [err, setErr] = useState('');
  if (!list || !list.length) return null;
  const shown = all ? list : list.slice(0, 3);
  const update = (n: Nudge) => setList((l) => (l ?? []).map((x) => (x.id === n.id ? n : x)));
  const clear = async (ids: string[] | 'all') => {
    const before = list;
    setErr('');
    setList((l) => (ids === 'all' ? [] : (l ?? []).filter((x) => !ids.includes(x.id))));
    try {
      await api('/api/nudges/dismiss', 'POST', ids === 'all' ? { all: true } : { ids });
    } catch (e) {
      setList(before);
      setErr((e as Error).message);
    }
  };
  return (
    <section className="nudge nudge-in" id="nudges" aria-label="Thinking of you">
      <div className="ni-head">
        <span className="hand">thinking of you</span>
        {list.length > 1 && (
          <button type="button" className="w-link" onClick={() => clear('all')}>
            Clear all
          </button>
        )}
      </div>
      <ul>
        {shown.map((n) => (
          <InboxItem key={n.id} n={n} onDone={update} onClear={() => clear([n.id])} />
        ))}
      </ul>
      {list.length > 3 && (
        <button type="button" className="w-link ni-more" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `${list.length - 3} more`}
        </button>
      )}
      {err && <p className="h-err">{err}</p>}
    </section>
  );
}
