'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { api } from '@/lib/upload-client';
import type { Gain, JellyView } from '@/lib/jelly';
import {
  ACHIEVEMENTS,
  BACKDROPS,
  ITEMS,
  KINDS,
  MAX_PLACED,
  backdropById,
  backdropUnlockedBy,
  goalOf,
  itemById,
  itemSrc,
  progressOf,
  unlockedBy,
  type AchGroup,
  type ItemKind,
  type Placed,
  type Stats,
} from '@/lib/jelly-catalog';
import { MOODS, moodHd, timeMood, type JellyMood } from '@/lib/jelly-mood';
import { emit, useJelly } from './bus';
import './jelly.css';

type Data = { home: JellyView; stats: Stats; gains: Gain[] };
type Tab = 'room' | 'shop' | 'awards';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'room', label: 'Her home', icon: '🏠' },
  { id: 'shop', label: 'Shop', icon: '🛍️' },
  { id: 'awards', label: 'Achievements', icon: '🏆' },
];

const pick = <T,>(l: readonly T[]) => l[Math.floor(Math.random() * l.length)];
const LOVES = ['Ooh, for me?! 💗', 'It’s perfect there!', 'My home is getting so pretty ✨', 'Grazie, tesoro! 🫧', 'I love it, I love it!'];
const TAPS = ['That’s one of my favourites!', 'Careful, it’s fragile 🫧', 'Isn’t it the cutest?', 'I polish it every morning ✨'];
const GROUPS: AchGroup[] = ['Jelly', 'Milano', 'Settling in', 'Bingo', 'Your story', 'Your people', 'My Corner'];
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** A number that rolls to its new value. */
function Rolling({ n }: { n: number }) {
  const [v, setV] = useState(n);
  const from = useRef(n);
  useEffect(() => {
    const a = from.current;
    if (a === n) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      setV(Math.round(a + (n - a) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = n;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <>{v}</>;
}

/** A circular progress ring with something in the middle. */
function Ring({ p, size = 56, stroke = 6, children, gold }: { p: number; size?: number; stroke?: number; children: React.ReactNode; gold?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={`jh-ring${gold ? ' gold' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="track" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, p)))} />
      </svg>
      <span>{children}</span>
    </span>
  );
}

const Pearl = ({ s = 18 }: { s?: number }) => <img className="jh-pearl" src="/corner/pearl.webp" alt="" width={s} height={s} />;

/** Jelly's Corner: her house to decorate, a shop paid in pearls, and every achievement across the Atelier. */
export default function JellyHome({ initial, initialTab }: { initial: Data; initialTab?: string }) {
  const [home, setHome] = useState(initial.home);
  const [stats, setStats] = useState(initial.stats);
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initialTab) ? (initialTab as Tab) : 'room');
  const [placed, setPlaced] = useState<Placed[]>(() => initial.home.placed.filter((p) => itemById(p.item)));
  const [backdrop, setBackdrop] = useState(initial.home.backdrop);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const go = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, '', t === 'room' ? window.location.pathname : `?tab=${t}`);
  };

  // celebrate what this visit earned (daily pearls, achievements)
  useEffect(() => {
    if (initial.gains.length) emit('jelly:gains', initial.gains);
    emit('jelly:home', initial.home);
  }, [initial]);
  useJelly(
    'jelly:home',
    useCallback((h: JellyView) => setHome(h), []),
  );
  const took = (d: Data) => {
    setHome(d.home);
    setStats(d.stats);
    emit('jelly:home', d.home);
    if (d.gains.length) emit('jelly:gains', d.gains);
  };

  /* ---------- Jelly at home ---------- */
  const [base, setBase] = useState<JellyMood>('content');
  const [react, setReact] = useState<JellyMood | null>(null);
  const [line, setLine] = useState('');
  const [hearts, setHearts] = useState<{ id: number; x: number; c: string }[]>([]);
  const timers = useRef<{ m?: number; l?: number; pet?: number }>({});
  useEffect(() => setBase(timeMood()), []);
  const mood = react ?? base;
  const feel = useCallback((m: JellyMood, text?: string, ms = 2600) => {
    clearTimeout(timers.current.m);
    setReact(m);
    timers.current.m = window.setTimeout(() => setReact(null), ms);
    if (text) {
      clearTimeout(timers.current.l);
      setLine(text);
      timers.current.l = window.setTimeout(() => setLine(''), Math.max(ms, 3200));
    }
  }, []);
  const pats = useRef(0);
  const pet = () => {
    const id = Math.random();
    setHearts((h) => [...h.slice(-12), { id, x: 20 + Math.random() * 60, c: pick(['💗', '💕', '🫧', '✨', '💖']) }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1300);
    feel('love', Math.random() < 0.3 ? pick(['Home pats are the best 💗', 'Blub blub!', 'Stay a little longer?', 'Mmm, cosy…']) : undefined, 1800);
    pats.current++;
    clearTimeout(timers.current.pet);
    timers.current.pet = window.setTimeout(async () => {
      const n = pats.current;
      pats.current = 0;
      try {
        emit('jelly:home', await api<JellyView>('/api/corner/jelly/pet', 'POST', { n }));
      } catch {}
    }, 1200);
  };

  /* ---------- arranging her home ---------- */
  const saveAt = useRef(0);
  const save = (next: Placed[], bd = backdrop) => {
    clearTimeout(saveAt.current);
    saveAt.current = window.setTimeout(async () => {
      setErr('');
      try {
        took(await api<Data>('/api/jelly/home', 'PUT', { placed: next, backdrop: bd }));
      } catch (e) {
        setErr((e as Error).message);
      }
    }, 600);
  };
  const update = (next: Placed[]) => {
    setPlaced(next);
    save(next);
  };
  const spare = useMemo(() => {
    const used: Record<string, number> = {};
    for (const p of placed) used[p.item] = (used[p.item] ?? 0) + 1;
    return ITEMS.map((it) => ({ it, left: (home.owned[it.id] ?? 0) - (used[it.id] ?? 0) })).filter((x) => x.left > 0);
  }, [home.owned, placed]);
  const place = (item: string) => {
    if (placed.length >= MAX_PLACED) return setErr(`Jelly’s home fits up to ${MAX_PLACED} things.`);
    const p: Placed = { uid: `pl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, item, x: 25 + Math.random() * 50, y: 55 + Math.random() * 30, s: 1, flip: false };
    update([...placed, p]);
    setSel(p.uid);
    feel('joyful', pick(LOVES));
  };
  const change = (uid: string, fn: (p: Placed) => Placed | null) => update(placed.flatMap((p) => (p.uid === uid ? (fn(p) ?? []) : [p])));
  const chosen = placed.find((p) => p.uid === sel);
  const chosenItem = chosen ? itemById(chosen.item) : null;

  const scene = useRef<HTMLDivElement>(null);
  const drag = useRef<{ uid: string; moved: boolean; dx: number; dy: number } | null>(null);
  const onDown = (e: RPointerEvent<HTMLButtonElement>, p: Placed) => {
    if (!editing) return;
    const r = scene.current?.getBoundingClientRect();
    if (!r) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // keep the grab point under her finger
    drag.current = { uid: p.uid, moved: false, dx: ((e.clientX - r.left) / r.width) * 100 - p.x, dy: ((e.clientY - r.top) / r.height) * 100 - p.y };
    setSel(p.uid);
  };
  const onMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const r = scene.current?.getBoundingClientRect();
    if (!d || !r) return;
    d.moved = true;
    const x = Math.min(98, Math.max(2, ((e.clientX - r.left) / r.width) * 100 - d.dx));
    const y = Math.min(98, Math.max(4, ((e.clientY - r.top) / r.height) * 100 - d.dy));
    setPlaced((l) => l.map((p) => (p.uid === d.uid ? { ...p, x, y } : p)));
  };
  const onUp = () => {
    if (drag.current?.moved) save(placed);
    drag.current = null;
  };

  /* ---------- the shop ---------- */
  const [kind, setKind] = useState<ItemKind | 'backdrops' | 'all'>('all');
  const [buying, setBuying] = useState('');
  const [bought, setBought] = useState('');
  async function buy(id: string, name: string) {
    setBuying(id);
    setErr('');
    setNote('');
    try {
      took(await api<Data>('/api/jelly/shop', 'POST', { id }));
      setBought(id);
      setTimeout(() => setBought(''), 900);
      setNote(BACKDROPS.some((b) => b.id === id) ? `${name} is Jelly’s now. Choose it while decorating.` : `${name} is in Jelly’s things. Tap Decorate to place it!`);
      feel('excited', pick(LOVES));
    } catch (e) {
      setErr((e as Error).message);
      feel('sad', undefined, 2000);
    }
    setBuying('');
  }

  /* ---------- achievements ---------- */
  const [show, setShow] = useState<'all' | 'done' | 'todo'>('all');

  const unlockedCount = Object.keys(home.unlocked).length;
  const bd = backdropById(backdrop);
  const ownedCount = Object.values(home.owned).reduce((a, b) => a + b, 0);
  const tabIndex = TABS.findIndex((t) => t.id === tab);

  return (
    <div className="jh">
      {/* who she is, and how they're doing */}
      <header className="jh-hero">
        <button type="button" className={`jh-me mood-${mood}`} onClick={pet} aria-label="Pet Jelly">
          <img key={mood} src={moodHd(mood)} alt="" width={96} height={96} />
        </button>
        <div className="jh-hello">
          <b>Jelly</b>
          <small>
            feeling {MOODS[mood].feeling} {MOODS[mood].emoji}
          </small>
        </div>
        <div className="jh-meters">
          <div className="jh-meter pearls" title="Pearls to spend in the shop">
            <Pearl s={30} />
            <span>
              <b>
                <Rolling n={home.pearls} />
              </b>
              <small>pearls</small>
            </span>
          </div>
          <div className="jh-meter" title={`${home.pets} pats · ${home.chats} chats`}>
            <Ring p={home.progress} size={46} stroke={5}>
              💗
            </Ring>
            <span>
              <b>Lv {home.level}</b>
              <small>friends</small>
            </span>
          </div>
          <div className="jh-meter" title="Achievements unlocked">
            <Ring p={unlockedCount / ACHIEVEMENTS.length} size={46} stroke={5} gold>
              🏆
            </Ring>
            <span>
              <b>
                {unlockedCount}/{ACHIEVEMENTS.length}
              </b>
              <small>unlocked</small>
            </span>
          </div>
          <div className="jh-meter" title="Days in a row">
            <span className="jh-flame" aria-hidden="true">
              🔥
            </span>
            <span>
              <b>{home.streak}</b>
              <small>{home.streak === 1 ? 'day streak' : 'days streak'}</small>
            </span>
          </div>
        </div>
      </header>

      <nav className="jh-seg" role="tablist" aria-label="Jelly’s Corner" style={{ ['--i' as string]: tabIndex }}>
        <span className="jh-seg-pill" aria-hidden="true" />
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => go(t.id)}>
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      {(err || note) && <p className={`jh-toast${err ? ' bad' : ''}`}>{err || note}</p>}

      {tab === 'room' && (
        <section className="jh-room-wrap" aria-label="Jelly’s home">
          <div
            ref={scene}
            className={`jh-scene${editing ? ' editing' : ''}`}
            style={{ ['--sky' as string]: bd.sky, ['--floor' as string]: bd.floor }}
            onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}
          >
            <span className="jh-caustics" aria-hidden="true" />
            <span className="jh-rays" aria-hidden="true" />
            <span className="jh-amb" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} />
              ))}
            </span>
            <span className="jh-sand" aria-hidden="true" />
            <img className="jh-house" src="/corner/home/house.webp" alt="Jelly’s house" draggable={false} />

            {placed.map((p) => {
              const it = itemById(p.item);
              if (!it) return null;
              return (
                <button
                  key={p.uid}
                  type="button"
                  className={`jh-thing${sel === p.uid && editing ? ' on' : ''}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: 20 + Math.round(p.y), ['--w' as string]: it.w * p.s, ['--f' as string]: p.flip ? -1 : 1 }}
                  onPointerDown={(e) => onDown(e, p)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  onClick={() => (editing ? setSel(p.uid) : feel('joyful', pick(TAPS)))}
                  aria-label={editing ? `${it.name}: drag to move` : it.name}
                >
                  <img src={itemSrc(it.id)} alt="" draggable={false} />
                </button>
              );
            })}

            <button type="button" className={`jh-jelly mood-${mood}`} onClick={pet} aria-label="Pet Jelly">
              <span className="jelly-hearts" aria-hidden="true">
                {hearts.map((h) => (
                  <i key={h.id} style={{ left: `${h.x}%` }}>
                    {h.c}
                  </i>
                ))}
              </span>
              <img key={mood} src={moodHd(mood)} alt="" draggable={false} />
            </button>
            {line && (
              <p className="jh-line" aria-live="polite">
                {line}
              </p>
            )}

            {editing && chosen && chosenItem && (
              <div className="jh-tools" aria-label={`${chosenItem.name} tools`}>
                <img src={itemSrc(chosenItem.id)} alt="" width={28} height={28} />
                <b>{chosenItem.name}</b>
                <button type="button" onClick={() => change(chosen.uid, (p) => ({ ...p, s: Math.max(0.5, +(p.s - 0.15).toFixed(2)) }))} aria-label="Smaller">
                  −
                </button>
                <button type="button" onClick={() => change(chosen.uid, (p) => ({ ...p, s: Math.min(2.5, +(p.s + 0.15).toFixed(2)) }))} aria-label="Bigger">
                  +
                </button>
                <button type="button" onClick={() => change(chosen.uid, (p) => ({ ...p, flip: !p.flip }))} aria-label="Flip">
                  ⇋
                </button>
                <button
                  type="button"
                  className="away"
                  onClick={() => {
                    change(chosen.uid, () => null);
                    setSel(null);
                  }}
                  aria-label="Put away"
                >
                  ↩︎
                </button>
              </div>
            )}

            {!placed.length && !editing && (
              <p className="jh-empty">
                Jelly’s house is waiting for its first treasures. Earn pearls all over your Atelier, pick something in the shop, then tap <b>Decorate</b>. 🫧
              </p>
            )}

            <div className="jh-dock">
              <button type="button" className={editing ? 'on' : ''} onClick={() => (setEditing(!editing), setSel(null))} aria-pressed={editing}>
                <span aria-hidden="true">{editing ? '✓' : '✏️'}</span>
                {editing ? 'Done' : 'Decorate'}
              </button>
              <button type="button" onClick={() => emit('jelly:open', null)}>
                <span aria-hidden="true">💬</span>Chat
              </button>
              <button type="button" onClick={pet}>
                <span aria-hidden="true">🫶</span>Pet
              </button>
            </div>
          </div>

          {editing && (
            <div className="jh-drawer">
              <div className="jh-drawer-head">
                <h3>Jelly’s things</h3>
                <small>{placed.length ? 'Drag things around. Tap one to resize, flip or put it away.' : 'Tap a thing to put it in her home.'}</small>
              </div>
              {spare.length ? (
                <div className="jh-tray">
                  {spare.map(({ it, left }) => (
                    <button key={it.id} type="button" onClick={() => place(it.id)} title={`Place ${it.name}`}>
                      <img src={itemSrc(it.id)} alt="" />
                      <small>{it.name}</small>
                      {left > 1 && <i>×{left}</i>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="jh-hint">
                  {ownedCount ? 'Everything she owns is already out. ' : 'Nothing to place yet. '}
                  <button type="button" className="jh-link" onClick={() => go('shop')}>
                    Visit the shop →
                  </button>
                </p>
              )}
              <div className="jh-drawer-head">
                <h3>Backdrop</h3>
              </div>
              <div className="jh-backdrops">
                {home.backdrops.map((id) => {
                  const b = backdropById(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={backdrop === id}
                      onClick={() => {
                        setBackdrop(id);
                        save(placed, id);
                        feel('wink', 'Ooh, new waters!');
                      }}
                      style={{ ['--sky' as string]: b.sky, ['--floor' as string]: b.floor }}
                    >
                      <span aria-hidden="true" />
                      <small>{b.name}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {tab === 'shop' && (
        <section aria-label="Shop">
          <div className="jh-shop-head">
            <p>Earn pearls by visiting every day, chatting with Jelly, giving her pats and unlocking achievements. Exclusive treasures can only be won.</p>
            <span className="jh-purse">
              <Pearl s={22} />
              <b>
                <Rolling n={home.pearls} />
              </b>
            </span>
          </div>
          <div className="jh-kinds" role="tablist" aria-label="Show">
            {([['all', 'Everything'], ...KINDS.map((k) => [k.id, k.label]), ['backdrops', 'Backdrops']] as [typeof kind, string][]).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={kind === id} onClick={() => setKind(id)}>
                {id !== 'all' && id !== 'backdrops' && <img src={itemSrc(ITEMS.find((i) => i.kind === id)!.id)} alt="" width={20} height={20} />}
                {label}
              </button>
            ))}
          </div>
          {kind === 'backdrops' ? (
            <div className="jh-shop">
              {BACKDROPS.filter((b) => b.id !== 'lagoon').map((b) => {
                const own = home.backdrops.includes(b.id);
                const by = backdropUnlockedBy(b.id);
                return (
                  <article key={b.id} className={`jh-card${own ? ' owned' : ''}${!b.price ? ' exclusive' : ''}${bought === b.id ? ' bought' : ''}`}>
                    {!b.price && <span className="jh-ribbon">Exclusive</span>}
                    <span className="jh-card-art swatch" style={{ ['--sky' as string]: b.sky, ['--floor' as string]: b.floor }} aria-hidden="true" />
                    <b>{b.name}</b>
                    {own ? (
                      <span className="jh-owned">✓ Jelly’s</span>
                    ) : b.price ? (
                      <button type="button" className="jh-buy" disabled={home.pearls < b.price || buying === b.id} onClick={() => buy(b.id, b.name)}>
                        <Pearl /> {b.price}
                      </button>
                    ) : (
                      <span className="jh-lock">🔒 {by ? by.title : 'a secret'}</span>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="jh-shop">
              {ITEMS.filter((i) => kind === 'all' || i.kind === kind)
                .sort((a, b) => (a.price === undefined ? 1 : 0) - (b.price === undefined ? 1 : 0) || (a.price ?? 0) - (b.price ?? 0))
                .map((it) => {
                  const n = home.owned[it.id] ?? 0;
                  const by = unlockedBy(it.id);
                  const exclusive = it.price === undefined;
                  return (
                    <article key={it.id} className={`jh-card k-${it.kind}${n ? ' owned' : ''}${exclusive ? ' exclusive' : ''}${exclusive && !n ? ' locked' : ''}${bought === it.id ? ' bought' : ''}`}>
                      {exclusive && <span className="jh-ribbon">Exclusive</span>}
                      {n > 0 && <span className="jh-count">×{n}</span>}
                      <span className="jh-card-art">
                        <img src={itemSrc(it.id)} alt="" loading="lazy" />
                      </span>
                      <b>{it.name}</b>
                      {!exclusive ? (
                        <button type="button" className="jh-buy" disabled={home.pearls < it.price! || buying === it.id} onClick={() => buy(it.id, it.name)}>
                          <Pearl /> {it.price}
                        </button>
                      ) : n ? (
                        <span className="jh-owned">✓ Won</span>
                      ) : (
                        <span className="jh-lock">🔒 {by ? by.title : 'a secret'}</span>
                      )}
                    </article>
                  );
                })}
            </div>
          )}
        </section>
      )}

      {tab === 'awards' && (
        <section aria-label="Achievements">
          <div className="jh-awards-hero">
            <Ring p={unlockedCount / ACHIEVEMENTS.length} size={92} stroke={9} gold>
              <b>{Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%</b>
            </Ring>
            <div>
              <b>
                {unlockedCount} of {ACHIEVEMENTS.length} achievements
              </b>
              <small>
                <Pearl s={16} /> {home.earned} pearls earned so far. Everything you do around your Atelier counts!
              </small>
            </div>
            <div className="jh-filter" role="tablist" aria-label="Show">
              {(
                [
                  ['all', 'All'],
                  ['todo', 'In progress'],
                  ['done', 'Unlocked'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={show === id} onClick={() => setShow(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {GROUPS.map((g) => {
            const list = ACHIEVEMENTS.filter((a) => a.group === g && (show === 'all' || (show === 'done') === Boolean(home.unlocked[a.id])));
            if (!list.length) return null;
            const got = ACHIEVEMENTS.filter((a) => a.group === g && home.unlocked[a.id]).length;
            const total = ACHIEVEMENTS.filter((a) => a.group === g).length;
            return (
              <div key={g} className="jh-group">
                <h3>
                  {g} <small>{got}/{total}</small>
                </h3>
                <div className="jh-badges">
                  {list.map((a) => {
                    const at = home.unlocked[a.id];
                    const goal = goalOf(a, stats);
                    const p = at ? 1 : progressOf(a, stats);
                    const reward = a.reward ? itemById(a.reward) : null;
                    return (
                      <article key={a.id} className={`jh-badge${at ? ' done' : ''}`}>
                        <Ring p={p} size={64} stroke={5} gold={Boolean(at)}>
                          <span className="jh-badge-icon">{a.icon}</span>
                        </Ring>
                        <div>
                          <b>{a.title}</b>
                          <small>{a.desc}</small>
                          <span className="jh-prizes">
                            <span className="jh-prize">
                              <Pearl s={14} />+{a.pearls}
                            </span>
                            {reward && (
                              <span className="jh-prize">
                                <img src={itemSrc(reward.id)} alt="" width={18} height={18} />
                                {reward.name}
                              </span>
                            )}
                            {a.backdrop && <span className="jh-prize">🖼️ {backdropById(a.backdrop).name}</span>}
                          </span>
                          <small className="jh-status">{at ? `✓ Unlocked ${day(at)}` : `${Math.min(goal, stats[a.metric])} of ${goal}`}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
