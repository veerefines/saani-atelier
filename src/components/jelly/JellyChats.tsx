'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/upload-client';
import type { Chat } from '@/lib/corner-model';
import type { JellyView } from '@/lib/jelly';
import { MOODS, moodHd, moodSrc, type JellyMood } from '@/lib/jelly-mood';
import { clock12 } from '@/lib/time';
import { Answer } from '@/components/corner/Assistant';
import { announce, applyChange, emit, useJellyChats } from './bus';
import WebSources from './WebSources';
import SpeakButton from './SpeakButton';
import { sfx } from '@/lib/sound';

const STARTERS = ['What should I do today?', 'What am I close to unlocking?', 'Plan me a cosy weekend in Milano', 'Tell me a fun fashion fact'];
const DAY = 86_400_000;

/** Which shelf a chat sits on in the list. */
function shelf(c: Chat) {
  if (c.pinned) return 'Pinned';
  const age = Date.now() - new Date(c.updatedAt).getTime();
  const today = new Date().toDateString() === new Date(c.updatedAt).toDateString();
  return today ? 'Today' : age < 7 * DAY ? 'This week' : 'Earlier';
}
const SHELVES = ['Pinned', 'Today', 'This week', 'Earlier'];
const when = (iso: string) => {
  const d = new Date(iso);
  return new Date().toDateString() === d.toDateString() ? clock12(d.getHours(), d.getMinutes()) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const lastMood = (c: Chat): JellyMood => c.turns[c.turns.length - 1]?.mood ?? 'content';
const sortChats = (l: Chat[]) => [...l].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt.localeCompare(a.updatedAt));

/** Jelly's Chats: every conversation with Jelly, to find, pin, rename, tidy up and carry on. */
export default function JellyChats({ initial, ready }: { initial: Chat[]; ready: boolean }) {
  const [chats, setChats] = useState(() => sortChats(initial));
  const [sel, setSel] = useState<string | null>(initial[0]?.id ?? null);
  const [mobileChat, setMobileChat] = useState(false);
  const [find, setFind] = useState('');
  const [only, setOnly] = useState<'all' | 'pinned'>('all');
  const [renaming, setRenaming] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);

  // chats with the floating Jelly (or the project tabs) show up here straight away
  useJellyChats(
    useCallback((c) => {
      setChats((l) => sortChats(applyChange(l, c)));
      if ('removed' in c) setSel((id) => (id === c.removed ? null : id));
    }, []),
  );
  const put = (c: Chat) => {
    setChats((l) => sortChats(applyChange(l, { chat: c })));
    announce({ chat: c });
  };

  const chat = chats.find((c) => c.id === sel) ?? null;
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [sel, busy, chat?.turns.length]);

  const shown = useMemo(() => {
    const n = find.trim().toLowerCase();
    return chats.filter((c) => (only === 'all' || c.pinned) && (!n || c.title.toLowerCase().includes(n) || c.turns.some((t) => t.q.toLowerCase().includes(n) || t.a.toLowerCase().includes(n))));
  }, [chats, find, only]);

  const run = async (fn: () => Promise<void>) => {
    setErr('');
    try {
      await fn();
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
  };
  const pin = (c: Chat) => run(async () => (sfx(c.pinned ? 'flip' : 'pop'), put(await api<Chat>(`/api/corner/jelly/chats/${c.id}`, 'PATCH', { pinned: !c.pinned }))));
  const rename = (c: Chat, title: string) => {
    setRenaming('');
    if (!title.trim() || title === c.title) return;
    run(async () => put(await api<Chat>(`/api/corner/jelly/chats/${c.id}`, 'PATCH', { title })));
  };
  const remove = (c: Chat) => {
    if (!confirm(`Delete “${c.title}”? This chat can’t be brought back.`)) return;
    sfx('paper');
    run(async () => {
      await api(`/api/corner/jelly/chats/${c.id}`, 'DELETE');
      setChats((l) => l.filter((x) => x.id !== c.id));
      announce({ removed: c.id });
      if (sel === c.id) {
        setSel(null);
        setMobileChat(false);
      }
    });
  };
  async function ask(question: string) {
    if (!ready || busy) return;
    setBusy(question);
    setErr('');
    try {
      const r = await api<{ chat: Chat; friend: JellyView }>('/api/corner/jelly', 'POST', { question, chatId: chat?.id ?? null, page: '/home/jelly' });
      put(r.chat);
      setSel(r.chat.id);
      sfx('message');
      emit('jelly:home', r.friend);
      setQ('');
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
    setBusy('');
  }
  const open = (id: string | null) => {
    setSel(id);
    setMobileChat(true);
  };

  const titleOf = (c: Chat) =>
    renaming === c.id ? (
      <form
        className="jx-rename"
        onSubmit={(e) => {
          e.preventDefault();
          rename(c, String(new FormData(e.currentTarget).get('t') ?? ''));
        }}
      >
        <input name="t" defaultValue={c.title} maxLength={80} autoFocus onBlur={(e) => rename(c, e.target.value)} aria-label="Chat name" />
      </form>
    ) : null;

  return (
    <section className={`jx${mobileChat ? ' reading' : ''}`} aria-label="Jelly’s chats">
      <aside className="jx-side">
        <div className="jx-side-head">
          <h3>Jelly’s chats</h3>
          <button type="button" className="jx-new" onClick={() => open(null)} disabled={Boolean(busy)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        </div>
        <label className="jx-find">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
        </label>
        <div className="jx-only" role="tablist" aria-label="Show">
          {(
            [
              ['all', `All · ${chats.length}`],
              ['pinned', `📌 Pinned · ${chats.filter((c) => c.pinned).length}`],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={only === id} onClick={() => setOnly(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="jx-list">
          {!shown.length && <p className="jx-none">{chats.length ? 'No chats match.' : 'No chats yet. Say hi to Jelly! 🫧'}</p>}
          {SHELVES.map((s) => {
            const list = shown.filter((c) => shelf(c) === s);
            if (!list.length) return null;
            return (
              <div key={s} className="jx-shelf">
                <h4>{s}</h4>
                <ul>
                  {list.map((c) => (
                    <li key={c.id} className={c.id === sel ? 'on' : ''}>
                      {titleOf(c) ?? (
                        <button type="button" className="jx-row" onClick={() => open(c.id)}>
                          <img src={moodSrc(lastMood(c))} alt="" width={44} height={44} loading="lazy" />
                          <span>
                            <b>{c.title}</b>
                            <small>
                              {when(c.updatedAt)} · {c.turns.length} {c.turns.length === 1 ? 'answer' : 'answers'}
                            </small>
                          </span>
                        </button>
                      )}
                      {renaming !== c.id && (
                        <span className="jx-acts">
                          <button type="button" onClick={() => pin(c)} aria-label={c.pinned ? 'Unpin' : 'Pin'} title={c.pinned ? 'Unpin' : 'Pin'} aria-pressed={Boolean(c.pinned)}>
                            📌
                          </button>
                          <button type="button" onClick={() => setRenaming(c.id)} aria-label="Rename" title="Rename">
                            ✎
                          </button>
                          <button type="button" onClick={() => remove(c)} aria-label="Delete" title="Delete">
                            🗑
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="jx-main">
        <header className="jx-main-head">
          <button type="button" className="jx-back" onClick={() => setMobileChat(false)} aria-label="All chats">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <img src={moodSrc(chat ? lastMood(chat) : 'content')} alt="" width={48} height={48} />
          <div>
            {chat ? (titleOf(chat) ?? <b onDoubleClick={() => setRenaming(chat.id)}>{chat.title}</b>) : <b>New chat</b>}
            <small>{chat ? `Started ${new Date(chat.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} · ${chat.turns.length} ${chat.turns.length === 1 ? 'answer' : 'answers'}` : 'Ask Jelly anything'}</small>
          </div>
          {chat && (
            <span className="jx-acts always">
              <button type="button" onClick={() => pin(chat)} aria-label={chat.pinned ? 'Unpin' : 'Pin'} title={chat.pinned ? 'Unpin' : 'Pin'} aria-pressed={Boolean(chat.pinned)}>
                📌
              </button>
              <button type="button" onClick={() => setRenaming(chat.id)} aria-label="Rename" title="Rename">
                ✎
              </button>
              <button type="button" onClick={() => remove(chat)} aria-label="Delete" title="Delete">
                🗑
              </button>
            </span>
          )}
        </header>

        <div className="jx-thread">
          {!chat && !busy && (
            <div className="jp-welcome">
              <img src={moodHd('joyful')} alt="" width={150} height={150} />
              <b>A fresh chat!</b>
              <p>{ready ? 'What’s on your mind, Saani? I know your whole Atelier and every project.' : 'I can’t chat until the assistant is switched on (GROQ_API_KEY in Vercel).'}</p>
              {ready && (
                <div className="jp-quick">
                  {STARTERS.map((s, i) => (
                    <button key={s} type="button" onClick={() => ask(s)}>
                      <span aria-hidden="true">{['✨', '🏆', '🇮🇹', '👗'][i]}</span>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {chat?.turns.map((t) => (
            <div key={t.id} className="jp-turn">
              <div className="jp-msg me">
                <p>{t.q}</p>
                <small>{when(t.at)}</small>
              </div>
              <div className="jp-msg her">
                <img className="jp-face" src={moodSrc(t.mood ?? 'idea')} alt="" title={`Jelly felt ${MOODS[t.mood ?? 'idea'].feeling}`} width={46} height={46} loading="lazy" />
                <div className="jp-bubble">
                  <Answer text={t.a} />
                  {(t.web || t.via) && <WebSources web={t.web} via={t.via} />}
                  {chat && <SpeakButton chatId={chat.id} turnId={t.id} text={t.a} />}
                  <button type="button" className="jx-copy" onClick={() => navigator.clipboard?.writeText(t.a)}>
                    Copy
                  </button>
                </div>
              </div>
            </div>
          ))}
          {busy && (
            <div className="jp-turn">
              <div className="jp-msg me">
                <p>{busy}</p>
              </div>
              <div className="jp-msg her">
                <img className="jp-face" src={moodSrc('studious')} alt="" width={46} height={46} />
                <div className="jp-bubble jp-typing" aria-label="Jelly is typing">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          )}
          {err && <p className="h-err jp-err">{err}</p>}
          <div ref={end} />
        </div>

        {ready && (
          <div className="jp-foot">
            {chat && !busy && (chat.turns[chat.turns.length - 1]?.suggestions ?? []).length > 0 && (
              <div className="jp-chips">
                {chat.turns[chat.turns.length - 1].suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)}>
                    ✨ {s}
                  </button>
                ))}
              </div>
            )}
            <form
              className="jp-compose"
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) ask(q.trim());
              }}
            >
              <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} placeholder={chat ? 'Carry on the chat…' : 'Message Jelly…'} aria-label="Your message for Jelly" enterKeyHint="send" />
              <button disabled={Boolean(busy) || !q.trim()} aria-label="Send">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
