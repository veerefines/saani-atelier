'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { api } from '@/lib/upload-client';
import { hexesIn, inkOn, STUDIO, type Chat, type ChatTurn, type Mode } from '@/lib/corner-model';
import { shortDate, type Ctx } from './shared';

type Lens = 'designer' | 'manager';
const LENSES: { id: Lens; label: string }[] = [
  { id: 'designer', label: '🎨 Designer' },
  { id: 'manager', label: '📊 Manager' },
];

/** Very small formatting for replies: headings, bullets, bold and colour dots, without rendering any HTML from the reply. */
function Answer({ text }: { text: string }) {
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
      setErr((e as Error).message);
    }
  };
  return (
    <article className="cn-turn">
      <p className="cn-q">{t.q}</p>
      <div className="cn-a">
        <Answer text={t.a} />
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
          <small>{new Date(t.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
        </div>
        {err && <p className="h-err">{err}</p>}
        <details className="cn-used">
          <summary>What it read{t.notRead.length ? ` · ${t.notRead.length} not read` : ''}</summary>
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

type Props = { ctx: Ctx; ready: boolean; chats: Chat[]; setChats: Dispatch<SetStateAction<Chat[]>>; chatId: string | null; setChatId: (id: string | null) => void };

/** The studio assistant: ready-made designer and manager questions, saved conversations, and answers she can keep. */
export default function Assistant({ ctx, ready, chats, setChats, chatId, setChatId }: Props) {
  const [lens, setLens] = useState<Lens>('designer');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [renaming, setRenaming] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const base = `/api/corner/projects/${ctx.project.id}/assistant`;
  const chat = chats.find((c) => c.id === chatId) ?? null;

  useEffect(() => {
    if (busy || chat?.turns.length) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [busy, chat?.turns.length]);

  if (!ready)
    return (
      <div className="cn-panel">
        <section className="cn-section cn-setup">
          <h3 className="cn-h">The assistant isn’t switched on yet</h3>
          <p>It reads this project (the brief, notes, links, palettes, fabrics, moodboard, PDFs and images) and helps you think it through. Everything else in My Corner works without it.</p>
          <ol>
            <li>Create a free API key at console.groq.com (API Keys).</li>
            <li>
              In Vercel, open the project → Settings → Environment Variables, and add <code>GROQ_API_KEY</code> with that key.
            </li>
            <li>Redeploy (or push any change). This tab then turns into the assistant.</li>
          </ol>
        </section>
      </div>
    );

  async function ask(mode: Mode, label: string, question = '') {
    setBusy(label);
    setErr('');
    try {
      const r = await api<{ chat: Chat }>(base, 'POST', { mode, question, chatId: chat?.id ?? null });
      setChats((l) => [r.chat, ...l.filter((c) => c.id !== r.chat.id)]);
      setChatId(r.chat.id);
      if (mode === 'question') setQ('');
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy('');
  }
  const askText = (text: string) => ask('question', text, text);

  async function rename(c: Chat, title: string) {
    setRenaming('');
    if (!title.trim() || title === c.title) return;
    try {
      const n = await api<Chat>(`${base}/chats/${c.id}`, 'PATCH', { title });
      setChats((l) => l.map((x) => (x.id === c.id ? n : x)));
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function remove(c: Chat) {
    if (!confirm(`Delete “${c.title}”? This conversation can’t be brought back.`)) return;
    try {
      await api(`${base}/chats/${c.id}`, 'DELETE');
      setChats((l) => l.filter((x) => x.id !== c.id));
      if (chatId === c.id) setChatId(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

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
        {!chats.length && <p className="cn-hint">Every conversation is saved here, so you can pick it up again.</p>}
        <ul className="cn-chats">
          {chats.map((c) => (
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
      </aside>

      <section className="cn-section cn-ai-main" aria-label={chat ? chat.title : 'New conversation'}>
        {!chat ? (
          <>
            <h3 className="cn-h">What would you like to work on?</h3>
            <p className="cn-hint">Pick a lens and a question, or ask your own below. It only uses what’s saved in this project.</p>
            {studio(false)}
          </>
        ) : (
          <>
            <h3 className="cn-h cn-ai-title">{chat.title}</h3>
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
            <p className="cn-thinking">Reading your project and thinking…</p>
          </div>
        )}
        <div ref={end} />
        {err && <p className="h-err">{err}</p>}
        {chat && (
          <details className="cn-ai-more">
            <summary>More from the studio</summary>
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
          <input className="h-input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} placeholder={chat ? 'Ask a follow-up…' : 'Or ask anything about what’s saved here…'} aria-label="Your question" />
          <button className="cn-btn primary" disabled={Boolean(busy) || !q.trim()}>
            Ask
          </button>
        </form>
        <p className="cn-hint">
          Runs on a free model: it reads the start of long documents and a couple of images at a time, and may ask you to wait a minute between questions. Conversations are saved with this project.
        </p>
      </section>
    </div>
  );
}
