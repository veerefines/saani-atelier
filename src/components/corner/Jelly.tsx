'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/upload-client';
import type { Chat } from '@/lib/corner-model';
import { Answer } from './Assistant';
import { FACTS } from './jelly-facts';

type Brief = { id: string; title: string; updatedAt: string; archived: boolean };
type State = { ready: boolean; chat: Chat | null; projects: Brief[] };
type Bubble = { label: string; text: string; ask: string };

const QUIET = 3 * 60 * 60_000; // at most one unprompted hello every 3 hours
const SECOND = 10 * 60_000; // and one more if she stays a while

// remembered on this device only; Jelly still works if storage is blocked
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

/** A "Did you know?" she hasn't seen lately. */
function nextFact(): Bubble {
  let seen: number[] = [];
  try {
    seen = JSON.parse(store.get('jelly-seen') ?? '[]');
  } catch {}
  let left = FACTS.map((_, i) => i).filter((i) => !seen.includes(i));
  if (!left.length) (seen = []), (left = FACTS.map((_, i) => i));
  const i = pick(left);
  store.set('jelly-seen', JSON.stringify([...seen, i]));
  const f = FACTS[i];
  return { label: f.topic === 'Italy' ? 'Did you know? 🇮🇹' : 'Did you know? 👗', text: f.text, ask: f.ask };
}

/** A little check-in, from the time of day and her projects. */
function checkIn(projects: Brief[]): Bubble {
  const h = new Date().getHours();
  const live = projects.filter((p) => !p.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const options: Bubble[] = [];
  const hi = h >= 5 && h < 12 ? 'Buongiorno! ☀️' : h >= 12 && h < 17 ? 'Ciao, ciao! 🫧' : h >= 17 && h < 23 ? 'Buonasera! 🌙' : null;
  if (!hi) options.push({ label: 'Psst…', text: 'It’s really late! 🌙 Even the best designers need their beauty sleep, okay?', ask: 'Give me a tiny wind-down routine for tonight' });
  const resting = live.find((p) => daysSince(p.updatedAt) >= 4);
  if (resting) options.push({ label: hi ?? 'Hey you', text: `“${resting.title}” has been floating on its own for ${daysSince(resting.updatedAt)} days. Shall we take a peek together?`, ask: `Help me pick up “${resting.title}” again: where did I leave it?` });
  if (live[0]) options.push({ label: hi ?? 'Hey you', text: `How’s “${live[0].title}” coming along? I’d love to hear! 🪼`, ask: `What’s a good next step for “${live[0].title}”?` });
  if (live.length >= 2) options.push({ label: hi ?? 'Hey you', text: 'Not sure where to start today? I can look across all your projects and pick one with you.', ask: 'What should I work on today?' });
  if (!live.length) options.push({ label: hi ?? 'Hey you', text: 'Your studio is all empty and sparkly ✨ Want to dream up a first project together?', ask: 'Help me brainstorm a first project' });
  options.push(
    { label: hi ?? 'Hey you', text: 'Have you had some water today? Designers need hydration too 💧', ask: 'Give me a few healthy study-break ideas' },
    { label: 'Just saying', text: 'I’m really proud of you, you know? Moving to Milano to chase this is brave. 💗', ask: 'Give me a little pep talk for today' },
  );
  return pick(options);
}

/** Jelly: her jellyfish friend who floats around My Corner, checks in, and answers anything about her projects. */
export default function Jelly() {
  const path = usePathname();
  const projectId = path.match(/^\/home\/corner\/([^/?#]+)/)?.[1] ?? null;
  const [data, setData] = useState<State | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [squish, setSquish] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const pet = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    api<State>('/api/corner/jelly', 'GET')
      .then(setData)
      .catch(() => setData({ ready: false, chat: null, projects: [] }));
  }, []);

  // say hello now and then: a check-in or a fact, taking turns
  const projects = useRef<Brief[]>([]);
  projects.current = data?.projects ?? [];
  const loaded = data !== null;
  const say = useCallback(() => {
    const n = Number(store.get('jelly-n') ?? 0);
    store.set('jelly-n', String(n + 1));
    store.set('jelly-last', String(Date.now()));
    setBubble(n % 2 ? nextFact() : checkIn(projects.current));
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const due = Date.now() - Number(store.get('jelly-last') ?? 0) > QUIET;
    const first = due ? setTimeout(say, 4000) : undefined;
    const second = setTimeout(say, SECOND);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, [loaded, say]);

  // close on Escape or a tap outside, and hand focus back to Jelly
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return;
        setOpen(false);
        pet.current?.focus();
      } else if (!panel.current?.contains(e.target as Node) && !pet.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', close);
    window.addEventListener('pointerdown', close);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('pointerdown', close);
    };
  }, [open]);

  const turns = data?.chat?.turns ?? [];
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: 'end' });
  }, [open, busy, turns.length]);

  const here = projectId ? data?.projects.find((p) => p.id === projectId) : undefined;

  async function ask(question: string) {
    setOpen(true);
    setBubble(null);
    if (!data?.ready || busy) return;
    setBusy(question);
    setErr('');
    try {
      const r = await api<{ chat: Chat }>('/api/corner/jelly', 'POST', { question, projectId });
      setData((d) => (d ? { ...d, chat: r.chat } : d));
      setQ('');
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy('');
  }
  async function fresh() {
    setErr('');
    try {
      await api('/api/corner/jelly', 'DELETE');
      setData((d) => (d ? { ...d, chat: null } : d));
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  const tap = () => {
    setSquish(true);
    setTimeout(() => setSquish(false), 450);
    setBubble(null);
    setOpen((o) => !o);
  };

  const starters = [here ? `Summarise “${here.title}” for me` : 'What should I work on today?', 'Compare my projects', 'Tell me a fun fact about Milano 🇮🇹', 'What’s trending in fashion this season?'];
  const last = turns[turns.length - 1];

  // on <body>: the page transition's transform would otherwise pin her to the page, not the screen
  if (!mounted) return null;
  return createPortal(
    <div className="jelly">
      {bubble && !open && (
        <div className="jelly-bubble" role="status">
          <button type="button" className="jelly-x" onClick={() => setBubble(null)} aria-label="Dismiss">
            ×
          </button>
          <b>{bubble.label}</b>
          <p>{bubble.text}</p>
          {data?.ready && (
            <button type="button" className="jelly-more" onClick={() => ask(bubble.ask)}>
              Tell me more →
            </button>
          )}
        </div>
      )}

      {open && (
        <div ref={panel} className="jelly-panel" role="dialog" aria-label="Chat with Jelly">
          <header className="jelly-head">
            <img src="/corner/jelly.png" alt="" width={44} height={43} />
            <div>
              <b>Jelly</b>
              <small>{!data ? 'waking up…' : data.ready ? 'your studio friend · knows all your projects' : 'napping right now'}</small>
            </div>
            {turns.length > 0 && (
              <button type="button" className="cn-btn ghost" onClick={fresh} disabled={Boolean(busy)}>
                New chat
              </button>
            )}
            <button
              type="button"
              className="jelly-close"
              onClick={() => {
                setOpen(false);
                pet.current?.focus();
              }}
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div className="jelly-thread">
            {!data?.ready ? (
              <p className="jelly-say">Blub… I’m asleep until the assistant is switched on (GROQ_API_KEY in Vercel). I can still tell you fun facts though! 🫧</p>
            ) : (
              <>
                {!turns.length && !busy && <p className="jelly-say">Ciao Saani! 🪼 Ask me anything about any of your projects, or about Milano and fashion. I’m all ears (well… all tentacles).</p>}
                {turns.map((t) => (
                  <div key={t.id} className="jelly-turn">
                    <p className="jelly-q">{t.q}</p>
                    <div className="jelly-a">
                      <Answer text={t.a} />
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="jelly-turn">
                    <p className="jelly-q">{busy}</p>
                    <p className="jelly-thinking">Jelly is thinking… 🫧</p>
                  </div>
                )}
              </>
            )}
            {err && <p className="h-err">{err}</p>}
            <div ref={end} />
          </div>

          {data?.ready && (
            <>
              <div className="jelly-chips">
                {(last && !busy ? last.suggestions : turns.length ? [] : starters).map((s) => (
                  <button key={s} type="button" disabled={Boolean(busy)} onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
              {here && <p className="jelly-about">Looking at: “{here.title}”</p>}
              <form
                className="jelly-ask"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (q.trim()) ask(q.trim());
                }}
              >
                <input ref={input} className="h-input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} placeholder="Ask Jelly anything…" aria-label="Your question for Jelly" />
                <button className="cn-btn primary" disabled={Boolean(busy) || !q.trim()}>
                  Ask
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <button ref={pet} type="button" className={`jelly-pet${squish ? ' squish' : ''}${bubble && !open ? ' chatty' : ''}`} onClick={tap} aria-expanded={open} aria-label={open ? 'Close Jelly' : 'Talk to Jelly'}>
        <span className="jelly-bubbles" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <img src="/corner/jelly.png" alt="" width={88} height={86} draggable={false} />
      </button>
    </div>,
    document.body,
  );
}
