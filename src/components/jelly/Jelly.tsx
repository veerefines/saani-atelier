'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/upload-client';
import type { Chat } from '@/lib/corner-model';
import type { Gain, JellyView } from '@/lib/jelly';
import { MOODS, moodHd, moodSrc, timeMood, type JellyMood } from '@/lib/jelly-mood';
import { clock12 } from '@/lib/time';
import { useMoodCycle } from './moods';
import { Answer } from '@/components/corner/Assistant';
import { shortDate } from '@/components/corner/shared';
import { FACTS } from './facts';
import { BACK, CHECKINS, DIZZY, LEVEL_UP, MEET, MISSED, OUT_OF_PUFF, PETTED, SHY, SNORE, STILL_LIKE, WAKE, hello } from './lines';
import SpeakButton from './SpeakButton';
import { setSound, sfx, useSound, voice } from '@/lib/sound';
import { announce, applyChange, emit, useJelly, useJellyChats } from './bus';
import Celebration from './Celebration';
import './jelly.css';

type Brief = { id: string; title: string; updatedAt: string; archived: boolean };
type Friend = JellyView;
type State = { ready: boolean; mood: JellyMood; chats: Chat[]; projects: Brief[]; friend: Friend; away: number | null; gains?: Gain[] };
type Bubble = { kind: 'fact' | 'checkin' | 'hello'; label: string; text: string; ask?: string; mood: JellyMood; topic?: 'Italy' | 'Fashion' };

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

const QUIET = 90 * 60_000; // a hello when she arrives, if it's been a while
const EVERY = [12 * 60_000, 20 * 60_000]; // then a fact or a check-in every 12–20 minutes she's around
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
  return { kind: 'fact', topic: f.topic, label: 'Did you know?', text: f.text, ask: f.ask, mood: 'idea' };
}

/** A little check-in, from the time in Milano and her projects. */
function checkIn(projects: Brief[], mood: JellyMood): Bubble {
  const live = projects.filter((p) => !p.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const hi = mood === 'sleepy' ? 'Psst…' : mood === 'excited' ? 'Buongiorno! ☀️' : mood === 'calm' ? 'Buonasera! 🌙' : 'Ciao, ciao! 🫧';
  const options: Bubble[] = [];
  if (mood === 'sleepy') options.push({ kind: 'checkin', label: hi, text: CHECKINS.late, ask: 'Give me a tiny wind-down routine for tonight', mood: 'sleepy' });
  const resting = live.find((p) => daysSince(p.updatedAt) >= 4);
  if (resting) options.push({ kind: 'checkin', label: hi, text: `“${resting.title}” has been floating on its own for ${daysSince(resting.updatedAt)} days. Shall we take a peek together?`, ask: `Help me pick up “${resting.title}” again: where did I leave it?`, mood: 'curious' });
  if (live[0]) options.push({ kind: 'checkin', label: hi, text: `How’s “${live[0].title}” coming along? I’d love to hear! 🪼`, ask: `What’s a good next step for “${live[0].title}”?`, mood: 'wink' });
  if (live.length >= 2) options.push({ kind: 'checkin', label: hi, text: CHECKINS.start, ask: 'What should I work on today?', mood: 'idea' });
  if (!live.length) options.push({ kind: 'checkin', label: hi, text: CHECKINS.empty, ask: 'Help me brainstorm a first project', mood: 'excited' });
  options.push(
    { kind: 'checkin', label: hi, text: CHECKINS.water, ask: 'Give me a few healthy study-break ideas', mood: 'wink' },
    { kind: 'checkin', label: 'Just saying', text: CHECKINS.proud, ask: 'Give me a little pep talk for today', mood: 'love' },
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
  const [soundOn] = useSound();
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
    if (!voice(text)) sfx('blip');
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

  // left alone, she drifts through all her moods
  useMoodCycle(feel, Boolean(busy) || Boolean(reaction) || q.trim().length > 0);

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
        if (typeof d.friend.sound === 'boolean') setSound(d.friend.sound, true);
        setChatId(d.chats[0]?.id ?? null);
        if (d.gains?.length) setCheers(d.gains);
        emit('jelly:home', d.friend);
      })
      .catch(() => {});
  }, []);

  // a queue of celebrations: daily pearls and achievements, one at a time
  const [cheers, setCheers] = useState<Gain[]>([]);
  const celebrate = useCallback((gains: Gain[]) => gains.length && setCheers((c) => [...c, ...gains]), []);
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
  // mostly facts, sometimes a check-in, never two check-ins in a row
  const lastKind = useRef<Bubble['kind'] | null>(null);
  const showBubble = useCallback(
    (kind?: Bubble['kind']) => {
      store.set('jelly-last', String(Date.now()));
      const fact = kind === 'fact' || (kind !== 'checkin' && (lastKind.current === 'checkin' || Math.random() < 0.6));
      const b = fact ? nextFact() : checkIn(projects.current, baseRef.current);
      lastKind.current = b.kind;
      setBubble(b);
      if (!voice(b.kind === 'fact' ? `Did you know? ${b.text}` : b.text)) sfx('blip');
      feel(b.mood, 5000);
    },
    [feel],
  );
  useEffect(() => {
    if (!loaded) return;
    const later: number[] = [];
    const at = (ms: number, fn: () => void) => later.push(window.setTimeout(fn, ms));
    if (away === null) {
      // the very first time they meet
      at(1200, () => {
        store.set('jelly-last', String(Date.now()));
        setBubble({ kind: 'hello', label: 'Nice to meet you! 🪼', text: MEET, ask: 'Tell me about yourself, Jelly!', mood: 'surprised' });
        voice(MEET);
        feel('surprised', 4000);
      });
    } else if (away !== undefined && away > 2 * 86_400_000) {
      const days = Math.round(away / 86_400_000);
      at(1200, () => feel('sad', 3200, `You were gone for ${days} days… I missed you! 🥺`));
      at(4600, () => feel('love', 3000, MISSED));
    } else if (away !== undefined && away > 20 * 60_000) {
      at(1200, () => feel(baseRef.current === 'sleepy' ? 'sleepy' : 'joyful', 2600, hello(baseRef.current)));
    }
    const due = Date.now() - Number(store.get('jelly-last') ?? 0) > QUIET;
    if (due && away !== null) at(7000, () => showBubble());
    return () => later.forEach(clearTimeout);
  }, [loaded, away, feel, showBubble]);

  // while she's around, Jelly pipes up now and then (only when the page is in front of her)
  useEffect(() => {
    if (!loaded) return;
    let id = 0;
    const next = () => {
      id = window.setTimeout(() => {
        if (!document.hidden) showBubble();
        next();
      }, EVERY[0] + Math.random() * (EVERY[1] - EVERY[0]));
    };
    next();
    return () => clearTimeout(id);
  }, [loaded, showBubble]);

  // back from another tab or app: she noticed
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 60_000) feel('surprised', 2200, BACK);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [feel]);

  // nothing happening for a while: she peeks out (or dozes off at night)
  useEffect(() => {
    let id = 0;
    const reset = () => {
      clearTimeout(id);
      id = window.setTimeout(() => (baseRef.current === 'sleepy' ? say(SNORE) : feel('shy', 4500, pick(SHY))), IDLE);
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
        sfx('harp');
        feel('love', 4000, LEVEL_UP);
        for (let i = 0; i < 8; i++) setTimeout(() => heart('💗'), i * 90);
      }
      emit('jelly:home', f);
    } catch {}
  }, [feel, heart]);
  const petOnce = useCallback(() => {
    heart();
    sfx('pop');
    pending.current++;
    clearTimeout(flushAt.current);
    flushAt.current = window.setTimeout(flush, 1500);
    setBubble(null);
    const now = Date.now();
    recent.current = [...recent.current.filter((t) => now - t < 5000), now];
    if (recent.current.length > 24) {
      recent.current = [];
      feel('grumpy', 2800, pick(DIZZY));
      setTimeout(() => feel('shy', 2200, STILL_LIKE), 2900);
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
    sfx('whoosh');
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
    sfx('send');
    try {
      const r = await api<{ chat: Chat; turn: Chat['turns'][number]; friend: Friend }>('/api/corner/jelly', 'POST', { question, projectId, chatId, page: path });
      sfx('message');
      setData((d) => (d ? { ...d, chats: applyChange(d.chats, { chat: r.chat }) } : d));
      emit('jelly:home', r.friend);
      setChatId(r.chat.id);
      announce({ chat: r.chat });
      setQ('');
      if (r.friend.level > levelRef.current) (sfx('harp'), feel('love', 4000, LEVEL_UP));
      else feel(r.turn.mood ?? 'idea', 4200);
    } catch (e) {
      const m = (e as Error).message;
      setErr(m);
      if (/try again in/i.test(m)) feel('sleepy', 4500, OUT_OF_PUFF);
      else feel('sad', 3500);
    }
    setBusy('');
  }

  // celebrations come before check-ins and facts
  const shown = bubble;
  const dismiss = () => setBubble(null);

  if (!mounted) return null;
  const friend = data?.friend;
  const starters = startersFor(path, here?.title);
  const chips = busy ? [] : turns.length ? (turns[turns.length - 1].suggestions ?? []) : starters;
  const status = !data ? 'waking up…' : `feeling ${MOODS[mood].feeling} ${MOODS[mood].emoji}`;

  // on <body>: the page transition's transform would otherwise pin her to the page, not the screen
  return createPortal(
    <div className={`jelly${open ? ' open' : ''}`}>
      {open && <div className="jelly-scrim" aria-hidden="true" />}

      <Celebration queue={cheers} onDone={() => setCheers((c) => c.slice(1))} atHome={atHome} />

      {!open && shown && (
        <div className={`jelly-bubble kind-${shown.kind}`} role="status">
          <button type="button" className="jelly-x" onClick={dismiss} aria-label="Dismiss">
            ×
          </button>
          <span className="jb-top">
            <img src={moodSrc(shown.mood)} alt="" width={40} height={40} />
            <span className={`jb-chip ${shown.kind}`}>
              {shown.kind === 'fact' ? (shown.topic === 'Italy' ? '🇮🇹 Italy' : '👗 Fashion') : shown.kind === 'hello' ? '🪼 Hello' : '💌 Check-in'}
            </span>
            <b>{shown.label}</b>
          </span>
          <p>{shown.text}</p>
          <span className="jb-actions">
            {shown.ask && data?.ready && (
              <button type="button" className="jb-btn primary" onClick={() => ask(shown.ask!)}>
                {shown.kind === 'fact' ? 'Tell me more' : 'Let’s chat'}
              </button>
            )}
            {shown.kind === 'fact' && (
              <button type="button" className="jb-btn" onClick={() => showBubble('fact')}>
                Another one ✨
              </button>
            )}
          </span>
        </div>
      )}
      {!open && !shown && line && (
        <p className="jelly-line" aria-live="polite">
          {line}
        </p>
      )}

      {open && (
        <div ref={panel} className="jelly-panel" role="dialog" aria-label="Chat with Jelly">
          <header className="jp-head">
            <span className="jp-head-bubbles" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <button type="button" className={`jp-avatar mood-${mood}`} onClick={petOnce} aria-label="Pet Jelly" title="Tap to pet me!">
              <img key={mood} src={moodSrc(mood)} alt="" width={60} height={60} />
              <span className="jelly-hearts" aria-hidden="true">
                {hearts.map((h) => (
                  <i key={h.id} style={{ left: `${h.x}%` }}>
                    {h.c}
                  </i>
                ))}
              </span>
            </button>
            <div className="jp-who">
              <b>
                Jelly <span className="jp-online" aria-hidden="true" />
              </b>
              <span className="jp-mood" aria-live="polite">
                {status}
              </span>
              {friend && (
                <span className="jp-stats">
                  <span className="jp-level" title={`${friend.pets} pats · ${friend.chats} chats`}>
                    💗 Lv {friend.level}
                    <i style={{ ['--p' as string]: `${Math.round(friend.progress * 100)}%` }} />
                  </span>
                  <Link href="/home/jelly?tab=shop" className="jp-pearls" onClick={() => setOpen(false)} title="Pearls to spend in Jelly’s Corner">
                    <img src="/corner/pearl.webp" alt="" width={15} height={15} /> {friend.pearls}
                  </Link>
                </span>
              )}
            </div>
            <div className="jp-tools">
              <button type="button" onClick={() => setSound(!soundOn)} aria-pressed={!soundOn} aria-label={soundOn ? 'Turn voices and sounds off' : 'Turn voices and sounds on'} title={soundOn ? 'Sound on' : 'Sound off'}>
                {soundOn ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 9v6h4l5 4V5L8 9zM17 9l5 5M22 9l-5 5" />
                  </svg>
                )}
              </button>
              <button type="button" onClick={() => setView(view === 'history' ? 'chat' : 'history')} aria-pressed={view === 'history'} aria-label="Past chats" title="Past chats">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 7v5l3 2" />
                </svg>
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
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
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
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {!atHome && (
              <Link href="/home/jelly" className="jp-home" onClick={() => setOpen(false)}>
                <img src="/corner/home/items/shell-bed.webp" alt="" width={28} height={28} />
                <span>
                  <b>Visit my home</b>
                  <small>decorate · shop · achievements</small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </header>

          {line && (
            <p className="jp-line" aria-live="polite">
              {line}
            </p>
          )}

          {view === 'history' ? (
            <div className="jp-thread">
              <p className="jp-hint">Every chat is saved here, and in each project’s “Jelly Got This!” tab.</p>
              {!chats.length && <p className="jp-empty">No chats yet. Ask me something! 🫧</p>}
              <ul className="jp-history">
                {chats.map((c) => {
                  const lastMood = c.turns[c.turns.length - 1]?.mood ?? 'content';
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={c.id === chatId ? 'on' : ''}
                        onClick={() => {
                          setChatId(c.id);
                          setView('chat');
                        }}
                      >
                        <img src={moodSrc(lastMood)} alt="" width={40} height={40} loading="lazy" />
                        <span>
                          <b>{c.title}</b>
                          <small>
                            {shortDate(c.updatedAt)} · {c.turns.length} {c.turns.length === 1 ? 'answer' : 'answers'}
                          </small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="jp-thread">
              {!data?.ready ? (
                <div className="jp-welcome">
                  <img src={moodHd('sleepy')} alt="" width={120} height={120} />
                  <b>Blub… I’m napping</b>
                  <p>I can’t chat until the assistant is switched on (GROQ_API_KEY in Vercel). You can still give me pats, and I’ll share fun facts! 🫧</p>
                </div>
              ) : (
                <>
                  {!turns.length && !busy && (
                    <div className="jp-welcome">
                      <img key={mood} src={moodHd(mood)} alt="" width={120} height={120} />
                      <b>{base === 'sleepy' ? '*yawn* Hi, Saani 🌙' : 'Ciao, Saani!'}</b>
                      <p>Ask me anything about your projects, your Atelier, Milano or fashion. Psst: tap my face up top for pats!</p>
                      <div className="jp-quick">
                        {starters.slice(0, 4).map((s, i) => (
                          <button key={s} type="button" onClick={() => ask(s)}>
                            <span aria-hidden="true">{['✨', '🏆', '🇮🇹', '💗'][i]}</span>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {turns.map((t) => (
                    <div key={t.id} className="jp-turn">
                      <div className="jp-msg me">
                        <p>{t.q}</p>
                        <small>{clock12(new Date(t.at).getHours(), new Date(t.at).getMinutes())}</small>
                      </div>
                      <div className="jp-msg her">
                        <img className="jp-face" src={moodSrc(t.mood ?? 'idea')} alt="" title={`Jelly felt ${MOODS[t.mood ?? 'idea'].feeling}`} width={36} height={36} loading="lazy" />
                        <div className="jp-bubble">
                          <Answer text={t.a} />
                          {chat && <SpeakButton chatId={chat.id} turnId={t.id} text={t.a} />}
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
                        <img className="jp-face" src={moodSrc('studious')} alt="" width={36} height={36} />
                        <div className="jp-bubble jp-typing" aria-label="Jelly is typing">
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {err && <p className="h-err jp-err">{err}</p>}
              <div ref={end} />
            </div>
          )}

          {data?.ready && view === 'chat' && (
            <div className="jp-foot">
              {turns.length > 0 && chips.length > 0 && (
                <div className="jp-chips">
                  {chips.map((s) => (
                    <button key={s} type="button" onClick={() => ask(s)}>
                      ✨ {s}
                    </button>
                  ))}
                </div>
              )}
              {here && <p className="jp-about">📌 Looking at “{here.title}”</p>}
              <form
                className="jp-compose"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (q.trim()) ask(q.trim());
                }}
              >
                <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} placeholder="Message Jelly…" aria-label="Your message for Jelly" enterKeyHint="send" />
                <button disabled={Boolean(busy) || !q.trim()} aria-label="Send">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
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
