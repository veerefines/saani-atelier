'use client';

import { useState } from 'react';
import { api } from '@/lib/upload-client';
import type { Ctx } from './shared';

type Reply = { text: string; read: string[]; notRead: string[] };
type Turn = { q: string; a: string; read: string[]; notRead: string[] };

const QUICK = [
  { mode: 'summary', label: 'Summarise the project' },
  { mode: 'feedback', label: 'Feedback on the creative direction' },
  { mode: 'moodboard', label: 'Improve the moodboard & brand concept' },
  { mode: 'next', label: 'What’s missing & next steps' },
] as const;

/** Very small formatting for replies: headings, bullets and bold, without rendering any HTML from the reply. */
function Answer({ text }: { text: string }) {
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part));
  return (
    <div className="cn-answer">
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (/^#{1,4}\s/.test(t)) return <h4 key={i}>{bold(t.replace(/^#{1,4}\s/, ''))}</h4>;
        if (/^[-*•]\s/.test(t))
          return (
            <p key={i} className="cn-bullet">
              • {bold(t.replace(/^[-*•]\s/, ''))}
            </p>
          );
        return <p key={i}>{bold(t)}</p>;
      })}
    </div>
  );
}

/** The project-aware assistant. Works only when it's been switched on (GROQ_API_KEY on the server). */
export default function Assistant({ ctx, ready }: { ctx: Ctx; ready: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

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

  async function ask(mode: string, label: string, question = '') {
    setBusy(label);
    setErr('');
    try {
      const r = await api<Reply>(`/api/corner/projects/${ctx.project.id}/assistant`, 'POST', { mode, question, history: turns.slice(-2).map(({ q, a }) => ({ q, a })) });
      setTurns((t) => [...t, { q: label, a: r.text, read: r.read, notRead: r.notRead }]);
      if (mode === 'question') setQ('');
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy('');
  }

  return (
    <div className="cn-panel">
      <section className="cn-section">
        <h3 className="cn-h">Ask about this project</h3>
        <div className="cn-quick">
          {QUICK.map((x) => (
            <button key={x.mode} type="button" disabled={Boolean(busy)} onClick={() => ask(x.mode, x.label)}>
              {x.label}
            </button>
          ))}
        </div>
        <form
          className="cn-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) ask('question', q.trim(), q.trim());
          }}
        >
          <input className="h-input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} placeholder="Or ask anything about what’s saved here…" aria-label="Your question" />
          <button className="cn-btn primary" disabled={Boolean(busy) || !q.trim()}>
            Ask
          </button>
        </form>
        <p className="cn-hint">
          It only uses what’s saved in this project, and says what it couldn’t read. It runs on a free model, so it reads the start of long documents and a couple of images at a time, and may ask you to wait a minute between
          questions.
        </p>
        {busy && <p className="cn-thinking">Reading your project and thinking… ({busy})</p>}
        {err && <p className="h-err">{err}</p>}
      </section>
      {[...turns].reverse().map((t, i) => (
        <section key={turns.length - i} className="cn-section cn-turn">
          <p className="cn-q">{t.q}</p>
          <Answer text={t.a} />
          <p className="cn-used">
            <b>Read:</b> {t.read.join(', ')}
            {t.notRead.length > 0 && (
              <>
                <br />
                <b>Not read:</b> {t.notRead.join('; ')}
              </>
            )}
          </p>
        </section>
      ))}
    </div>
  );
}
