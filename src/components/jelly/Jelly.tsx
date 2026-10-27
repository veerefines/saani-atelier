'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/upload-client';
import type { Chat } from '@/lib/corner-model';
import type { Gain, JellyView } from '@/lib/jelly';
import { itemById } from '@/lib/jelly-catalog';
import { MOODS, moodSrc, timeMood, type JellyMood } from '@/lib/jelly-mood';
import { Answer } from '@/components/corner/Assistant';
import { shortDate } from '@/components/corner/shared';
import { FACTS } from './facts';
import { announce, applyChange, emit, useJelly, useJellyChats } from './bus';
import './jelly.css';

type Brief = { id: string; title: string; updatedAt: string; archived: boolean };
type Friend = JellyView;
type State = { ready: boolean; mood: JellyMood; chats: Chat[]; projects: Brief[]; friend: Friend; away: number | null; gains?: Gain[] };
type Bubble = { label: string; text: string; ask?: string; href?: string; mood: JellyMood };

/** Ready-made questions that fit the page she's on. */
function startersFor(path: string, project?: string): string[] {
  const page: [RegExp, string[]][] = [
    [/^\/home\/corner\/./, [`Summarise “${project ?? 'this project'}” for me`, 'What’s missing from this project?']],
    [/^\/home\/corner/, ['Which project should I work on today?', 'Compare my projects']],
    [/^\/home\/checklist/, ['What’s next on my settling-in list?', 'Help me with the trickiest task']],
    [/^\/home\/passport/, ['Which place should I stamp next?', 'Plan me a Saturday of stamps']],
    [/^\/home\/milano/, ['Where should I go this weekend?', 'Find me a cosy café to study in']],
    [/^\/home\/bingo/, ['Which bingo square should I do next?', 'How close am I to a bingo?']],
    [/^\/home\/chapter/, ['Give me a prompt for today’s chapter', 'What have I written about lately?']],
    [/^\/home\/lookbook/, ['Style me an outfit for tomorrow', 'What’s my style, from my lookbook?']],
    [/^\/home\/(letters|love|jar|songs|scrapbook)/, ['Who’s been sending me love lately?', 'Help me write a thank-you note']],
    [/^\/home\/jelly/, ['How do I earn more pearls?', 'What should I buy for your home?']],
  ];
  const own = page.find(([re]) => re.test(path))?.[1] ?? ['What should I do today?', 'What am I close to unlocking?'];
  return [...own, 'Tell me a fun fact about Milano 🇮🇹', 'How are you feeling, Jelly?'];
}

/** A pearl or achievement, as Jelly announces it. */
function cheer(g: Gain): Bubble {
  if (g.kind === 'daily') return { label: 'Daily pearls 🫧', text: `+${g.pearls} pearls for coming by today${g.streak > 1 ? ` · ${g.streak}-day streak 🔥` : ''}!`, href: '/home/jelly', mood: 'excited' };
  const thing = g.reward ? itemById(g.reward) : null;
  return {
    label: 'Achievement unlocked! 🏆',
    text: `${g.icon} ${g.title} · +${g.pearls} 🫧${thing ? ` · new for my home: ${thing.emoji} ${thing.name}` : ''}${g.backdrop ? ' · and a new backdrop!' : ''}`,
    href: '/home/jelly',
    mood: 'surprised',
  };
}

const QUIET = 3 * 60 * 60_000; // at most one unprompted hello every 3 hours
const SECOND = 10 * 60_000; // and one more if she stays a while
const IDLE = 2 * 60_000; // Jelly peeks out if nothing happens for a while

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

const pick = <T,>(l: readonly T[]) => l[Math.floor(Math.random() * l.length)];
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

/* ---------- what she says ---------- */
const PETTED = ['Hehe, that tickles! 💗', 'Blub blub… more please 🫧', 'Mmm, best pats in all of Milano', 'I’m melting… in a good way 🪼', 'You’re my favourite human, you know?', 'Purr… wait, jellyfish don’t purr. Blub!'];
const DIZZY = ['Okay okay, I’m getting dizzy! 😵‍💫', 'Too many pats! My tentacles are in a knot 😤', 'Hey! Gentle, I’m made of jelly!'];
const SHY = ['…are you still there? 👀', '*peeks out* Just checking on you 🍃', 'I’ll be right here when you need me'];
const WAKE = ['Huh?! Oh… I was dreaming of gelato 🍨', '*yawn* …oh, hi Saani! I wasn’t sleeping, promise', 'Mmh? Five more minutes… okay, I’m up!'];

function hello(mood: JellyMood) {
  switch (mood) {
    case 'sleepy':
      return '*yawn* It’s late in Milano… hi Saani 🌙';
    case 'excited':
      return 'Buongiorno! ☀️ I’m full of bubbles today!';
    case 'joyful':
      return 'Ciao, ciao! So happy you’re here 🫧';
    case 'calm':
      return 'Buonasera, Saani 🌸 Cosy studio time?';
    default:
      return 'Hi you! Tap me to chat, or rub me for pats 💗';
  }
}

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
  return { label: f.topic === 'Italy' ? 'Did you know? 🇮🇹' : 'Did you know? 👗', text: f.text, ask: f.ask, mood: 'idea' };
}

/** A little check-in, from the time in Milano and her projects. */
function checkIn(projects: Brief[], mood: JellyMood): Bubble {
  const live = projects.filter((p) => !p.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const hi = mood === 'sleepy' ? 'Psst…' : mood === 'excited' ? 'Buongiorno! ☀️' : mood === 'calm' ? 'Buonasera! 🌙' : 'Ciao, ciao! 🫧';
  const options: Bubble[] = [];
  if (mood === 'sleepy') options.push({ label: hi, text: 'It’s really late in Milano! 🌙 Even the best designers need their beauty sleep, okay?', ask: 'Give me a tiny wind-down routine for tonight', mood: 'sleepy' });
  const resting = live.find((p) => daysSince(p.updatedAt) >= 4);
  if (resting) options.push({ label: hi, text: `“${resting.title}” has been floating on its own for ${daysSince(resting.updatedAt)} days. Shall we take a peek together?`, ask: `Help me pick up “${resting.title}” again: where did I leave it?`, mood: 'curious' });
  if (live[0]) options.push({ label: hi, text: `How’s “${live[0].title}” coming along? I’d love to hear! 🪼`, ask: `What’s a good next step for “${live[0].title}”?`, mood: 'wink' });
  if (live.length >= 2) options.push({ label: hi, text: 'Not sure where to start today? I can look across all your projects and pick one with you.', ask: 'What should I work on today?', mood: 'idea' });
  if (!live.length) options.push({ label: hi, text: 'Your studio is all empty and sparkly ✨ Want to dream up a first project together?', ask: 'Help me brainstorm a first project', mood: 'excited' });
  options.push(
    { label: hi, text: 'Have you had some water today? Designers need hydration too 💧', ask: 'Give me a few healthy study-break ideas', mood: 'wink' },
    { label: 'Just saying', text: 'I’m really proud of you, you know? Moving to Milano to chase this is brave. 💗', ask: 'Give me a little pep talk for today', mood: 'love' },
  );
  return pick(options);
}

/** Jelly: her jellyfish friend who floats around My Corner, has moods, loves pats, and answers anything about her projects. */
export default function Jelly() {
  const path = usePathname();
  const projectId = path.match(/^\/home\/corner\/([^/?#]+)/)?.[1] ?? null;
  // in Jelly's Corner she's floating around her room instead
  const atHome = path.startsWith('/home/jelly');
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<State | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [line, setLine] = useState('');
  const [base, setBase] = useState<JellyMood>('content');
  const [reaction, setReaction] = useState<JellyMood | null>(null);
  const [hearts, setHearts] = useState<{ id: number; x: number; c: string }[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const pet = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const timers = useRef<{ react?: number; line?: number }>({});

  const mood: JellyMood = busy ? 'studious' : (reaction ?? (q.trim() && open ? 'curious' : base));

  /* ---------- feelings ---------- */
  const say = useCallback((text: string, ms = 3400) => {
    clearTimeout(timers.current.line);
    setLine(text);
    timers.current.line = window.setTimeout(() => setLine(''), ms);
  }, []);
  const feel = useCallback(
    (m: JellyMood, ms = 2600, text?: string) => {
      clearTimeout(timers.current.react);
      setReaction(m);
      timers.current.react = window.setTimeout(() => setReaction(null), ms);
      if (text) say(text, Math.max(ms, 3000));
    },
    [say],
  );

  // her everyday mood follows the clock in Milano
  useEffect(() => {
    setBase(timeMood());
    const id = setInterval(() => setBase(timeMood()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setMounted(true);
    // every face ready, so a mood change never flickers
    for (const m of Object.keys(MOODS) as JellyMood[]) new Image().src = moodSrc(m);
    api<State>('/api/corner/jelly', 'GET')
      .then((d) => {
        setData(d);
        setChatId(d.chats[0]?.id ?? null);
        if (d.gains?.length) setCheers(d.gains.map(cheer));
        emit('jelly:home', d.friend);
      })
      .catch(() => {});
  }, []);

  // a queue of celebrations: daily pearls and achievements, one at a time
  const [cheers, setCheers] = useState<Bubble[]>([]);
  const celebrate = useCallback((gains: Gain[]) => gains.length && setCheers((c) => [...c, ...gains.map(cheer)]), []);
  useJelly('jelly:gains', celebrate);
  useJelly(
    'jelly:home',
    useCallback((f: JellyView) => setData((d) => (d ? { ...d, friend: f } : d)), []),
  );
  useJelly(
    'jelly:open',
    useCallback(() => {
      setOpen(true);
      setView('chat');
    }, []),
  );

  // after she moves around the site, check for anything she just unlocked
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const id = setTimeout(() => {
      api<{ home: JellyView; gains: Gain[] }>('/api/jelly/check', 'POST')
        .then((r) => {
          celebrate(r.gains);
          emit('jelly:home', r.home);
        })
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(id);
  }, [path, celebrate]);

  // the same chats as the "Jelly Got This!" tab
  useJellyChats(
    useCallback((c) => {
      setData((d) => (d ? { ...d, chats: applyChange(d.chats, c) } : d));
      if ('removed' in c) setChatId((id) => (id === c.removed ? null : id));
    }, []),
  );

  /* ---------- saying hello ---------- */
  const projects = useRef<Brief[]>([]);
  projects.current = data?.projects ?? [];
  const baseRef = useRef(base);
  baseRef.current = base;
  const loaded = data !== null;
  const away = data?.away;
  const showBubble = useCallback(() => {
    const n = Number(store.get('jelly-n') ?? 0);
    store.set('jelly-n', String(n + 1));
    store.set('jelly-last', String(Date.now()));
    const b = n % 2 ? nextFact() : checkIn(projects.current, baseRef.current);
    setBubble(b);
    feel(b.mood, 5000);
  }, [feel]);
  useEffect(() => {
    if (!loaded) return;
    const later: number[] = [];
    const at = (ms: number, fn: () => void) => later.push(window.setTimeout(fn, ms));
    if (away === null) {
      // the very first time they meet
      at(1200, () => {
        store.set('jelly-last', String(Date.now()));
        setBubble({ label: 'Nice to meet you! 🪼', text: 'I’m Jelly, your new studio friend. Tap me to chat about any project, or rub me (or press and hold) for pats!', ask: 'Tell me about yourself, Jelly!', mood: 'surprised' });
        feel('surprised', 4000);
      });
    } else if (away !== undefined && away > 2 * 86_400_000) {
      const days = Math.round(away / 86_400_000);
      at(1200, () => feel('sad', 3200, `You were gone for ${days} days… I missed you! 🥺`));
      at(4600, () => feel('love', 3000, 'But you’re here now 💗'));
    } else if (away !== undefined && away > 20 * 60_000) {
      at(1200, () => feel(baseRef.current === 'sleepy' ? 'sleepy' : 'joyful', 2600, hello(baseRef.current)));
    }
    const due = Date.now() - Number(store.get('jelly-last') ?? 0) > QUIET;
    if (due && away !== null) at(6000, showBubble);
    at(SECOND, showBubble);
    return () => later.forEach(clearTimeout);
  }, [loaded, away, feel, showBubble]);

  // back from another tab or app: she noticed
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 60_000) feel('surprised', 2200, 'You’re back! I kept the bubbles warm 🫧');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [feel]);

  // nothing happening for a while: she peeks out (or dozes off at night)
  useEffect(() => {
    let id = 0;
    const reset = () => {
      clearTimeout(id);
      id = window.setTimeout(() => (baseRef.current === 'sleepy' ? say('zzz… 💤') : feel('shy', 4500, pick(SHY))), IDLE);
    };
    reset();
    const evs = ['pointerdown', 'keydown', 'scroll'] as const;
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(id);
      evs.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [feel, say]);

  /* ---------- pats ---------- */
  const pending = useRef(0);
  const flushAt = useRef(0);
  const recent = useRef<number[]>([]);
  const woke = useRef(false);
  const levelRef = useRef(1);
  levelRef.current = data?.friend.level ?? 1;
  const heart = useCallback((c = pick(['💗', '💕', '🫧', '✨', '💖'])) => {
    const id = Math.random();
    setHearts((h) => [...h.slice(-14), { id, x: 15 + Math.random() * 70, c }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1300);
  }, []);
  const flush = useCallback(async () => {
    const n = pending.current;
    if (!n) return;
    pending.current = 0;
    try {
      const f = await api<Friend>('/api/corner/jelly/pet', 'POST', { n });
      if (f.level > levelRef.current) {
        feel('love', 4000, `We’re friendship level ${f.level} now! 💗✨`);
        for (let i = 0; i < 8; i++) setTimeout(() => heart('💗'), i * 90);
      }
      emit('jelly:home', f);
    } catch {}
  }, [feel, heart]);
  const petOnce = useCallback(() => {
    heart();
    pending.current++;
    clearTimeout(flushAt.current);
    flushAt.current = window.setTimeout(flush, 1500);
    setBubble(null);
    const now = Date.now();
    recent.current = [...recent.current.filter((t) => now - t < 5000), now];
    if (recent.current.length > 24) {
      recent.current = [];
      feel('grumpy', 2800, pick(DIZZY));
      setTimeout(() => feel('shy', 2200, '…but I still like you 🍃'), 2900);
      return;
    }
    if (baseRef.current === 'sleepy' && !woke.current) {
      woke.current = true;
      feel('surprised', 2200, pick(WAKE));
      return;
    }
    feel('love', 2000);
    if (recent.current.length % 6 === 1) say(pick(PETTED), 2600);
  }, [feel, flush, heart, say]);

  /* ---------- chat ---------- */
  const chats = data?.chats ?? [];
  const chat = chats.find((c) => c.id === chatId) ?? null;
  const turns = chat?.turns ?? [];
  const here = projectId ? data?.projects.find((p) => p.id === projectId) : undefined;

  const toggle = () => {
    setBubble(null);
    setOpen((o) => !o);
    if (!open) {
      setView('chat');
      feel(baseRef.current === 'sleepy' ? 'sleepy' : 'wink', 1600);
    }
  };

  // a quick tap opens the chat; rubbing her, or pressing and holding, is petting
  const touch = useRef({ down: false, x: 0, y: 0, moved: 0, acc: 0, petting: false, hold: 0, repeat: 0, hover: 0 });
  const stopHold = () => {
    clearTimeout(touch.current.hold);
    clearInterval(touch.current.repeat);
  };
  const onDown = (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = touch.current;
    Object.assign(t, { down: true, x: e.clientX, y: e.clientY, moved: 0, acc: 0, petting: false });
    stopHold();
    t.hold = window.setTimeout(() => {
      t.petting = true;
      petOnce();
      t.repeat = window.setInterval(petOnce, 420);
    }, 450);
  };
  const onMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const t = touch.current;
    const d = Math.hypot(e.clientX - t.x, e.clientY - t.y);
    t.x = e.clientX;
    t.y = e.clientY;
    if (t.down) {
      t.moved += d;
      t.acc += d;
      if (t.moved > 16 && !t.petting) {
        t.petting = true;
        stopHold();
      }
      if (t.petting && t.acc > 40) {
        t.acc = 0;
        petOnce();
      }
    } else if (e.pointerType === 'mouse') {
      // stroking her with the mouse, no click needed
      t.hover += d;
      if (t.hover > 160) {
        t.hover = 0;
        petOnce();
      }
    }
  };
  const onUp = () => {
    const t = touch.current;
    stopHold();
    if (t.down && !t.petting) toggle();
    t.down = false;
  };
  const onCancel = () => {
    stopHold();
    touch.current.down = false;
  };

  // close on Escape or a tap outside, and hand focus back to Jelly
  useEffect(() => {
    if (!open) return;
    // on phones the keyboard would cover the chat, so only focus the box with a mouse
    if (window.matchMedia('(pointer: fine)').matches) input.current?.focus();
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

  useEffect(() => {
    if (open && view === 'chat') end.current?.scrollIntoView({ block: 'end' });
  }, [open, view, busy, turns.length]);

  async function ask(question: string) {
    setOpen(true);
    setView('chat');
    setBubble(null);
    if (!data?.ready || busy) return;
    setBusy(question);
    setErr('');
    try {
      const r = await api<{ chat: Chat; turn: Chat['turns'][number]; friend: Friend }>('/api/corner/jelly', 'POST', { question, projectId, chatId, page: path });
      setData((d) => (d ? { ...d, chats: applyChange(d.chats, { chat: r.chat }) } : d));
      emit('jelly:home', r.friend);
      setChatId(r.chat.id);
      announce({ chat: r.chat });
      setQ('');
      if (r.friend.level > levelRef.current) feel('love', 4000, `We’re friendship level ${r.friend.level} now! 💗✨`);
      else feel(r.turn.mood ?? 'idea', 4200);
    } catch (e) {
      const m = (e as Error).message;
      setErr(m);
      if (/try again in/i.test(m)) feel('sleepy', 4500, 'I’m all out of puff… give me a minute? 😮‍💨');
      else feel('sad', 3500);
    }
    setBusy('');
  }

  // celebrations come before check-ins and facts
  const shown = cheers[0] ?? bubble;
  const dismiss = () => (cheers.length ? setCheers((c) => c.slice(1)) : setBubble(null));

  if (!mounted) return null;
  const friend = data?.friend;
  const starters = startersFor(path, here?.title);
  const chips = busy ? [] : turns.length ? (turns[turns.length - 1].suggestions ?? []) : starters;
  const status = !data ? 'waking up…' : `feeling ${MOODS[mood].feeling} ${MOODS[mood].emoji}`;

  // on <body>: the page transition's transform would otherwise pin her to the page, not the screen
  return createPortal(
    <div className={`jelly${open ? ' open' : ''}`}>
      {open && <div className="jelly-scrim" aria-hidden="true" />}

      {!open && shown && (
        <div className={`jelly-bubble${cheers.length ? ' cheer' : ''}`} role="status">
          <button type="button" className="jelly-x" onClick={dismiss} aria-label="Dismiss">
            ×
          </button>
          <b>{shown.label}</b>
          <p>{shown.text}</p>
          {shown.href && !atHome ? (
            <Link href={shown.href} className="jelly-more" onClick={dismiss}>
              See Jelly’s Corner →
            </Link>
          ) : shown.ask && data?.ready ? (
            <button type="button" className="jelly-more" onClick={() => ask(shown.ask!)}>
              Tell me more →
            </button>
          ) : null}
        </div>
      )}
      {!open && !shown && line && (
        <p className="jelly-line" aria-live="polite">
          {line}
        </p>
      )}

      {open && (
        <div ref={panel} className="jelly-panel" role="dialog" aria-label="Chat with Jelly">
          <header className="jelly-head">
            <button type="button" className={`jelly-avatar mood-${mood}`} onClick={petOnce} aria-label="Pet Jelly" title="Pet Jelly">
              <img key={mood} src={moodSrc(mood)} alt="" width={56} height={56} />
              <span className="jelly-hearts" aria-hidden="true">
                {hearts.map((h) => (
                  <i key={h.id} style={{ left: `${h.x}%` }}>
                    {h.c}
                  </i>
                ))}
              </span>
            </button>
            <div className="jelly-who">
              <b>Jelly</b>
              <small aria-live="polite">{status}</small>
              {friend && (
                <span className="jelly-friend" title={`${friend.pets} pats · ${friend.chats} chats`}>
                  <span>💗 Lv {friend.level}</span>
                  <i style={{ ['--p' as string]: `${Math.round(friend.progress * 100)}%` }} />
                  <Link href="/home/jelly" className="jelly-pearls" onClick={() => setOpen(false)} title="Pearls to spend in Jelly’s Corner">
                    🫧 {friend.pearls}
                  </Link>
                </span>
              )}
            </div>
            <div className="jelly-tools">
              <button type="button" onClick={() => setView(view === 'history' ? 'chat' : 'history')} aria-pressed={view === 'history'} aria-label="Past chats" title="Past chats">
                🕘
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatId(null);
                  setView('chat');
                  feel('excited', 1500);
                }}
                disabled={Boolean(busy) || !chat}
                aria-label="New chat"
                title="New chat"
              >
                ＋
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  pet.current?.focus();
                }}
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>
          </header>

          {line && (
            <p className="jelly-line in-panel" aria-live="polite">
              {line}
            </p>
          )}

          {view === 'history' ? (
            <div className="jelly-thread">
              <p className="jelly-hint">Every chat is saved here, and in each project’s “Jelly Got This!” tab.</p>
              {!chats.length && <p className="jelly-say">No chats yet. Ask me something! 🫧</p>}
              <ul className="jelly-history">
                {chats.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={c.id === chatId ? 'on' : ''}
                      onClick={() => {
                        setChatId(c.id);
                        setView('chat');
                      }}
                    >
                      <b>{c.title}</b>
                      <small>
                        {shortDate(c.updatedAt)} · {c.turns.length} {c.turns.length === 1 ? 'answer' : 'answers'}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="jelly-thread">
              {!data?.ready ? (
                <p className="jelly-say">Blub… I can’t chat until the assistant is switched on (GROQ_API_KEY in Vercel). You can still give me pats, and I’ll share fun facts! 🫧</p>
              ) : (
                <>
                  {!turns.length && !busy && (
                    <p className="jelly-say">
                      {base === 'sleepy' ? '*yawn* Hi Saani 🌙 ' : 'Ciao Saani! 🪼 '}
                      Ask me anything about any of your projects, or about Milano and fashion. I’m all ears (well… all tentacles). Psst: tap my face up here, or rub me, for pats!
                    </p>
                  )}
                  {turns.map((t) => (
                    <div key={t.id} className="jelly-turn">
                      <p className="jelly-q">{t.q}</p>
                      <div className="jelly-a">
                        <img className="jelly-a-face" src={moodSrc(t.mood ?? 'idea')} alt="" title={`Jelly felt ${MOODS[t.mood ?? 'idea'].feeling}`} width={34} height={34} loading="lazy" />
                        <Answer text={t.a} />
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <div className="jelly-turn">
                      <p className="jelly-q">{busy}</p>
                      <p className="jelly-thinking">Jelly is reading… 📖🫧</p>
                    </div>
                  )}
                </>
              )}
              {err && <p className="h-err">{err}</p>}
              <div ref={end} />
            </div>
          )}

          {data?.ready && view === 'chat' && (
            <div className="jelly-foot">
              {chips.length > 0 && (
                <div className="jelly-chips">
                  {chips.map((s) => (
                    <button key={s} type="button" onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {here && <p className="jelly-about">Looking at: “{here.title}”</p>}
              <form
                className="jelly-ask"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (q.trim()) ask(q.trim());
                }}
              >
                <input ref={input} className="h-input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} placeholder="Ask Jelly anything…" aria-label="Your question for Jelly" enterKeyHint="send" />
                <button className="cn-btn primary" disabled={Boolean(busy) || !q.trim()}>
                  Ask
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <button
        ref={pet}
        type="button"
        className={`jelly-pet mood-${mood}${shown && !open ? ' chatty' : ''}${atHome ? ' away' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onPointerLeave={() => (touch.current.hover = 0)}
        onPointerEnter={(e) => e.pointerType === 'mouse' && !reaction && !open && feel('curious', 1400)}
        onClick={(e) => e.detail === 0 && toggle()}
        onContextMenu={(e) => e.preventDefault()}
        aria-expanded={open}
        aria-label={open ? 'Close Jelly' : `Talk to Jelly (she’s feeling ${MOODS[mood].feeling})`}
      >
        <span className="jelly-hearts" aria-hidden="true">
          {hearts.map((h) => (
            <i key={h.id} style={{ left: `${h.x}%` }}>
              {h.c}
            </i>
          ))}
        </span>
        <span className="jelly-bubbles" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <img key={mood} src={moodSrc(mood)} alt="" width={96} height={96} draggable={false} />
      </button>
    </div>,
    document.body,
  );
}
