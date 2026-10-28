'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { api } from '@/lib/upload-client';
import { hexesIn, inkOn, JELLY_CHATS, STUDIO, type Chat, type ChatTurn, type Mode } from '@/lib/corner-model';
import { MOODS, moodSrc, timeMood, type JellyMood } from '@/lib/jelly-mood';
import { announce, applyChange, useJellyChats } from '../jelly/bus';
import SpeakButton from '../jelly/SpeakButton';
import { shortDate, type Ctx } from './shared';
import { sfx } from '@/lib/sound';

type Lens = 'designer' | 'manager';
const LENSES: { id: Lens; label: string }[] = [
  { id: 'designer', label: '🎨 Designer' },
  { id: 'manager', label: '📊 Manager' },
];

/** Very small formatting for replies: headings, bullets, bold and colour dots, without rendering any HTML from the reply. */
export function Answer({ text }: { text: string }) {
  const rich = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|#[0-9a-fA-F]{6}\b)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <b key={i}>{part.slice(2, -2)}</b>
      ) : /^\*[^*].*\*$/.test(part) ? (
        <i key={i}>{part.slice(1, -1)}</i>
      ) : /^#[0-9a-fA-F]{6}$/.test(part) ? (
        <span key={i} className="cn-hexdot">
          <i style={{ background: part }} />
          {part}
        </span>
      ) : (
        part
      ),
    );
  return (
    <div className="cn-answer">
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (/^#{1,4}\s/.test(t)) return <h4 key={i}>{rich(t.replace(/^#{1,4}\s/, '').replace(/\*\*/g, ''))}</h4>;
        if (/^([-*•]|\d+[.)])\s/.test(t))
          return (
            <p key={i} className="cn-bullet">
              • {rich(t.replace(/^([-*•]|\d+[.)])\s/, ''))}
            </p>
          );
        return <p key={i}>{rich(t)}</p>;
      })}
    </div>
  );
}

/** One question and answer, with ways to keep what's useful. */
function Turn({ t, chat, ctx, last, busy, onAsk }: { t: ChatTurn; chat: Chat; ctx: Ctx; last: boolean; busy: boolean; onAsk: (q: string) => void }) {
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState('');
  const hexes = hexesIn(t.a);
  const keep = async (what: string, fn: () => Promise<unknown>) => {
    setErr('');
    try {
      await fn();
      setSaved((s) => ({ ...s, [what]: true }));
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
  };
  return (
    <article className="cn-turn">
      <p className="cn-q">{t.q}</p>
      <div className="cn-a">
        <img className="cn-a-face" src={moodSrc(t.mood ?? 'studious')} alt="" title={`Jelly felt ${MOODS[t.mood ?? 'studious'].feeling}`} width={66} height={66} loading="lazy" />
        <Answer text={t.a} />
        <SpeakButton chatId={chat.id} turnId={t.id} text={t.a} />
        {hexes.length >= 2 && (
          <div className="cn-swatches" aria-label="Colours in this answer">
            {hexes.map((h) => (
              <span key={h} style={{ background: h, ...inkOn(h) }}>
                {h}
              </span>
            ))}
          </div>
        )}
        <div className="cn-keep">
          {hexes.length >= 2 && (
            <button type="button" className="cn-btn" disabled={saved.palette} onClick={() => keep('palette', () => ctx.add({ kind: 'palette', name: STUDIO.some((x) => x.label === chat.title) ? 'Colour story' : chat.title.slice(0, 60), hexes }))}>
              {saved.palette ? 'Saved to palettes ✓' : '🎨 Save as palette'}
            </button>
          )}
          <button type="button" className="cn-btn" disabled={saved.note} onClick={() => keep('note', () => ctx.add({ kind: 'drop', drop: 'note', note: `✨ ${t.q}\n\n${t.a}`.slice(0, 1000) }))}>
            {saved.note ? 'Saved to inspiration ✓' : '📌 Save to inspiration'}
          </button>
          <button type="button" className="cn-btn ghost" onClick={() => keep('copy', () => navigator.clipboard.writeText(t.a))}>
            {saved.copy ? 'Copied ✓' : 'Copy'}
          </button>
          <small>{new Date(t.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\b(am|pm)\b/i, (x) => x.toUpperCase())}</small>
        </div>
        {err && <p className="h-err">{err}</p>}
        <details className="cn-used">
          <summary className="dd-summary">
            What it read{t.notRead.length ? ` · ${t.notRead.length} not read` : ''}
            <span className="dd-caret sm" aria-hidden="true">
              ▾
            </span>
          </summary>
          <b>Read:</b> {t.read.join(', ')}
          {t.notRead.length > 0 && (
            <>
              <br />
              <b>Not read:</b> {t.notRead.join('; ')}
            </>
          )}
        </details>
      </div>
      {last && t.suggestions.length > 0 && (
        <div className="cn-next" aria-label="Ask next">
          {t.suggestions.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => onAsk(s)}>
              {s} →
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

type Props = {
  ctx: Ctx;
  ready: boolean;
  chats: Chat[];
  setChats: Dispatch<SetStateAction<Chat[]>>;
  jellyChats: Chat[];
  setJellyChats: Dispatch<SetStateAction<Chat[]>>;
  chatId: string | null;
  setChatId: (id: string | null) => void;
};

/** "Jelly Got This!": Jelly in studio mode (ready-made designer and manager questions about this project), every chat with Jelly from anywhere in My Corner, and answers she can keep. */
export default function Assistant({ ctx, ready, chats, setChats, jellyChats, setJellyChats, chatId, setChatId }: Props) {
  const [lens, setLens] = useState<Lens>('designer');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [renaming, setRenaming] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const base = `/api/corner/projects/${ctx.project.id}/assistant`;
  const chat = chats.find((c) => c.id === chatId) ?? jellyChats.find((c) => c.id === chatId) ?? null;
  const withJelly = chat?.projectId === JELLY_CHATS;
  const [face, setFace] = useState<JellyMood>('content');
  useEffect(() => setFace(timeMood()), []);

  // chats with the floating Jelly show up here straight away
  useJellyChats(
    useCallback(
      (c) => {
        setJellyChats((l) => applyChange(l, c));
        if ('removed' in c && c.removed === chatId) setChatId(null);
      },
      [setJellyChats, chatId, setChatId],
    ),
  );

  useEffect(() => {
    if (busy || chat?.turns.length) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [busy, chat?.turns.length]);

  if (!ready)
    return (
      <div className="cn-panel">
        <section className="cn-section cn-setup">
          <img className="cn-jelly-face" src={moodSrc('sleepy')} alt="" width={112} height={112} />
          <h3 className="cn-h">Jelly is still asleep</h3>
          <p>Once she’s awake, Jelly reads this project (the brief, notes, links, palettes, fabrics, moodboard, PDFs and images) and helps you think it through. Everything else in My Corner works without her.</p>
          <ol>
            <li>Create a free API key at console.groq.com (API Keys).</li>
            <li>
              In Vercel, open the project → Settings → Environment Variables, and add <code>GROQ_API_KEY</code> with that key.
            </li>
            <li>Redeploy (or push any change). Jelly then wakes up right here.</li>
          </ol>
        </section>
      </div>
    );

  async function ask(mode: Mode, label: string, question = '') {
    setBusy(label);
    setErr('');
    try {
      if (withJelly && mode === 'question') {
        // carrying on a chat with Jelly, now looking at this project
        const r = await api<{ chat: Chat }>('/api/corner/jelly', 'POST', { question, chatId: chat!.id, projectId: ctx.project.id });
        setJellyChats((l) => applyChange(l, { chat: r.chat }));
        announce({ chat: r.chat });
        sfx('message');
        setQ('');
        setBusy('');
        return;
      }
      const r = await api<{ chat: Chat }>(base, 'POST', { mode, question, chatId: withJelly ? null : (chat?.id ?? null) });
      setChats((l) => [r.chat, ...l.filter((c) => c.id !== r.chat.id)]);
      setChatId(r.chat.id);
      sfx('message');
      if (mode === 'question') setQ('');
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
    setBusy('');
  }
  const askText = (text: string) => ask('question', text, text);

  async function rename(c: Chat, title: string) {
    setRenaming('');
    if (!title.trim() || title === c.title) return;
    sfx('tick');
    try {
      if (c.projectId === JELLY_CHATS) {
        const n = await api<Chat>(`/api/corner/jelly/chats/${c.id}`, 'PATCH', { title });
        setJellyChats((l) => applyChange(l, { chat: n }));
        announce({ chat: n });
        return;
      }
      const n = await api<Chat>(`${base}/chats/${c.id}`, 'PATCH', { title });
      setChats((l) => l.map((x) => (x.id === c.id ? n : x)));
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
  }
  async function remove(c: Chat) {
    if (!confirm(`Delete “${c.title}”? This conversation can’t be brought back.`)) return;
    sfx('paper');
    try {
      if (c.projectId === JELLY_CHATS) {
        await api(`/api/corner/jelly/chats/${c.id}`, 'DELETE');
        setJellyChats((l) => l.filter((x) => x.id !== c.id));
        announce({ removed: c.id });
      } else {
        await api(`${base}/chats/${c.id}`, 'DELETE');
        setChats((l) => l.filter((x) => x.id !== c.id));
      }
      if (chatId === c.id) setChatId(null);
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
  }

  const chatList = (list: Chat[]) => (
    <ul className="cn-chats">
      {list.map((c) => (
        <li key={c.id} className={c.id === chatId ? 'on' : ''}>
          {renaming === c.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                rename(c, String(new FormData(e.currentTarget).get('t') ?? ''));
              }}
            >
              <input name="t" className="h-input" defaultValue={c.title} maxLength={80} autoFocus onBlur={(e) => rename(c, e.target.value)} aria-label="Conversation name" />
            </form>
          ) : (
            <button type="button" className="cn-chat-open" onClick={() => setChatId(c.id)} disabled={Boolean(busy)}>
              <b>{c.title}</b>
              <small>
                {shortDate(c.updatedAt)} · {c.turns.length} {c.turns.length === 1 ? 'answer' : 'answers'}
              </small>
            </button>
          )}
          {c.id === chatId && renaming !== c.id && (
            <span className="cn-chat-tools">
              <button type="button" onClick={() => setRenaming(c.id)} aria-label="Rename" title="Rename">
                ✎
              </button>
              <button type="button" onClick={() => remove(c)} aria-label="Delete" title="Delete">
                ×
              </button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );

  const studio = (compact: boolean) => (
    <div className={`cn-studio${compact ? ' compact' : ''}`}>
      <div className="cn-lens" role="tablist" aria-label="Point of view">
        {LENSES.map((l) => (
          <button key={l.id} type="button" role="tab" aria-selected={lens === l.id} onClick={() => setLens(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="cn-prompts">
        {STUDIO.filter((x) => x.lens === lens).map((x) => (
          <button key={x.id} type="button" disabled={Boolean(busy)} onClick={() => ask(x.id, x.label)}>
            <span aria-hidden="true">{x.icon}</span>
            <b>{x.label}</b>
            {!compact && <small>{x.hint}</small>}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="cn-panel cn-ai">
      <aside className="cn-section cn-ai-side" aria-label="Conversations">
        <div className="cn-ai-side-head">
          <h3 className="cn-h">Conversations</h3>
          <button type="button" className="cn-btn primary" disabled={Boolean(busy)} onClick={() => setChatId(null)}>
            + New
          </button>
        </div>
        <h4 className="cn-ai-group">This project</h4>
        {!chats.length && <p className="cn-hint">Studio questions about this project are saved here, so you can pick them up again.</p>}
        {chatList(chats)}
        <h4 className="cn-ai-group">
          <img src={moodSrc('wink')} alt="" width={30} height={30} /> Chats with Jelly
        </h4>
        {!jellyChats.length ? <p className="cn-hint">Everything you ask the floating Jelly, anywhere in My Corner, is saved here too.</p> : chatList(jellyChats)}
      </aside>

      <section className="cn-section cn-ai-main" aria-label={chat ? chat.title : 'New conversation'}>
        {!chat ? (
          <>
            <div className="cn-jelly-hi">
              <img src={moodSrc(busy ? 'studious' : face)} alt="" width={112} height={112} />
              <div>
                <h3 className="cn-h">Jelly got this! What shall we work on?</h3>
                <p className="cn-hint">Pick a lens and a question, or ask your own below. In studio mode Jelly only uses what’s saved in this project.</p>
              </div>
            </div>
            {studio(false)}
          </>
        ) : (
          <>
            <h3 className="cn-h cn-ai-title">{chat.title}</h3>
            {withJelly && <p className="cn-hint">🪼 A chat with Jelly. Follow-ups here look at this project too.</p>}
            <div className="cn-thread">
              {chat.turns.map((t, i) => (
                <Turn key={t.id} t={t} chat={chat} ctx={ctx} last={i === chat.turns.length - 1} busy={Boolean(busy)} onAsk={askText} />
              ))}
            </div>
          </>
        )}
        {busy && (
          <div className="cn-turn">
            <p className="cn-q">{busy}</p>
            <p className="cn-thinking">
              <img src={moodSrc('studious')} alt="" width={52} height={52} /> Jelly is reading your project…
            </p>
          </div>
        )}
        <div ref={end} />
        {err && <p className="h-err">{err}</p>}
        {chat && (
          <details className="cn-ai-more">
            <summary className="dd-summary">
              More from the studio
              <span className="dd-caret sm" aria-hidden="true">
                ▾
              </span>
            </summary>
            {studio(true)}
          </details>
        )}
        <form
          className="cn-row cn-ask"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) askText(q.trim());
          }}
        >
          <input className="h-input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} placeholder={chat ? 'Ask Jelly a follow-up…' : 'Or ask Jelly anything about what’s saved here…'} aria-label="Your question" />
          <button className="cn-btn primary" disabled={Boolean(busy) || !q.trim()}>
            Ask
          </button>
        </form>
        <p className="cn-hint">
          Jelly runs on a free model: she reads the start of long documents and a couple of images at a time, and may ask you to wait a minute between questions. Every conversation is saved here.
        </p>
      </section>
    </div>
  );
}
