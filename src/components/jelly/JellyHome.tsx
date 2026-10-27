'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { api } from '@/lib/upload-client';
import type { Gain, JellyView } from '@/lib/jelly';
import { ACHIEVEMENTS, BACKDROPS, ITEMS, KINDS, MAX_PLACED, backdropById, backdropUnlockedBy, goalOf, itemById, progressOf, unlockedBy, type AchGroup, type ItemKind, type Placed, type Stats } from '@/lib/jelly-catalog';
import { moodSrc, timeMood, type JellyMood } from '@/lib/jelly-mood';
import { emit, useJelly } from './bus';
import './jelly.css';

type Data = { home: JellyView; stats: Stats; gains: Gain[] };
type Tab = 'room' | 'shop' | 'awards';

const pick = <T,>(l: readonly T[]) => l[Math.floor(Math.random() * l.length)];
const LOVES = ['Ooh, for me?! 💗', 'It’s perfect there!', 'My home is getting so pretty ✨', 'Grazie, tesoro! 🫧', 'I love it, I love it!'];
const TAPS = ['That’s one of my favourites!', 'Hehe, careful, it’s fragile 🫧', 'Isn’t it cute?', 'I polish it every morning ✨'];
const GROUPS: AchGroup[] = ['Jelly', 'Milano', 'Settling in', 'Bingo', 'Your story', 'Your people', 'My Corner'];
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Jelly's Corner: her room to decorate, a shop paid in pearls, and every achievement across the Atelier. */
export default function JellyHome({ initial }: { initial: Data }) {
  const [home, setHome] = useState(initial.home);
  const [stats, setStats] = useState(initial.stats);
  const [tab, setTab] = useState<Tab>('room');
  const [placed, setPlaced] = useState<Placed[]>(initial.home.placed);
  const [backdrop, setBackdrop] = useState(initial.home.backdrop);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

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

  /* ---------- Jelly in her room ---------- */
  const [mood, setMood] = useState<JellyMood>('content');
  const [line, setLine] = useState('');
  const [hearts, setHearts] = useState<{ id: number; x: number; c: string }[]>([]);
  const timers = useRef<{ m?: number; l?: number; pet?: number }>({});
  useEffect(() => setMood(timeMood()), []);
  const feel = useCallback((m: JellyMood, text?: string, ms = 2600) => {
    clearTimeout(timers.current.m);
    setMood(m);
    timers.current.m = window.setTimeout(() => setMood(timeMood()), ms);
    if (text) {
      clearTimeout(timers.current.l);
      setLine(text);
      timers.current.l = window.setTimeout(() => setLine(''), Math.max(ms, 3000));
    }
  }, []);
  const pats = useRef(0);
  const pet = () => {
    const id = Math.random();
    setHearts((h) => [...h.slice(-12), { id, x: 20 + Math.random() * 60, c: pick(['💗', '💕', '🫧', '✨']) }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1300);
    feel('love', Math.random() < 0.25 ? pick(['Hehe, home pats are the best 💗', 'Blub blub!', 'Stay a little longer?']) : undefined, 1800);
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

  /* ---------- arranging her room ---------- */
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
    return Object.entries(home.owned)
      .map(([id, n]) => ({ id, left: n - (used[id] ?? 0) }))
      .filter((x) => x.left > 0 && itemById(x.id));
  }, [home.owned, placed]);
  const place = (item: string) => {
    if (placed.length >= MAX_PLACED) return setErr(`Jelly’s home fits up to ${MAX_PLACED} things.`);
    const p: Placed = { uid: `pl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, item, x: 30 + Math.random() * 40, y: 45 + Math.random() * 35, s: 1, flip: false };
    update([...placed, p]);
    setSel(p.uid);
    feel('joyful', pick(LOVES));
  };
  const change = (uid: string, fn: (p: Placed) => Placed | null) => update(placed.flatMap((p) => (p.uid === uid ? (fn(p) ?? []) : [p])));
  const chosen = placed.find((p) => p.uid === sel);

  const room = useRef<HTMLDivElement>(null);
  const drag = useRef<{ uid: string; moved: boolean } | null>(null);
  const onDown = (e: RPointerEvent<HTMLButtonElement>, p: Placed) => {
    if (!editing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { uid: p.uid, moved: false };
    setSel(p.uid);
  };
  const onMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const r = room.current?.getBoundingClientRect();
    if (!d || !r) return;
    d.moved = true;
    const x = Math.min(97, Math.max(3, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(96, Math.max(6, ((e.clientY - r.top) / r.height) * 100));
    setPlaced((l) => l.map((p) => (p.uid === d.uid ? { ...p, x, y } : p)));
  };
  const onUp = () => {
    if (drag.current?.moved) save(placed);
    drag.current = null;
  };
  /* ---------- the shop ---------- */
  const [kind, setKind] = useState<ItemKind | 'backdrops' | 'all'>('all');
  const [buying, setBuying] = useState('');
  async function buy(id: string, name: string) {
    setBuying(id);
    setErr('');
    setNote('');
    try {
      took(await api<Data>('/api/jelly/shop', 'POST', { id }));
      setNote(BACKDROPS.some((b) => b.id === id) ? `${name} is Jelly’s now. Pick it under Decorate.` : `${name} is in Jelly’s things. Tap Decorate to place it.`);
      feel('excited', pick(LOVES));
    } catch (e) {
      setErr((e as Error).message);
      feel('sad', undefined, 2000);
    }
    setBuying('');
  }

  const unlockedCount = Object.keys(home.unlocked).length;
  const bd = backdropById(backdrop);
  const ownedThings = Object.values(home.owned).reduce((a, b) => a + b, 0);

  return (
    <div className="jh">
      <div className="jh-stats" aria-label="Jelly’s Corner at a glance">
        <span title="Pearls to spend in the shop">
          <b>🫧 {home.pearls}</b> pearls
        </span>
        <span title={`${home.pets} pats · ${home.chats} chats`}>
          <b>💗 Lv {home.level}</b>
          <i className="jh-bar" style={{ ['--p' as string]: `${Math.round(home.progress * 100)}%` }} />
        </span>
        <span>
          <b>🏆 {unlockedCount}</b>/{ACHIEVEMENTS.length}
        </span>
        <span title="Days in a row">
          <b>🔥 {home.streak}</b> {home.streak === 1 ? 'day' : 'days'}
        </span>
      </div>

      <nav className="jh-tabs" role="tablist" aria-label="Jelly’s Corner">
        {(
          [
            ['room', '🏠 Her room'],
            ['shop', '🛍️ Shop'],
            ['awards', '🏆 Achievements'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {err && <p className="h-err jh-msg">{err}</p>}
      {note && !err && <p className="jh-note jh-msg">{note}</p>}

      {tab === 'room' && (
        <section aria-label="Jelly’s room">
          <div
            ref={room}
            className={`jh-room${editing ? ' editing' : ''}`}
            style={{ ['--sky' as string]: bd.sky, ['--floor' as string]: bd.floor }}
            onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}
          >
            <span className="jh-rays" aria-hidden="true" />
            <span className="jh-floor" aria-hidden="true" />
            <span className="jh-amb" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            {placed.map((p) => {
              const it = itemById(p.item);
              if (!it) return null;
              return (
                <button
                  key={p.uid}
                  type="button"
                  className={`jh-thing${sel === p.uid && editing ? ' on' : ''}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: Math.round(p.y), ['--s' as string]: p.s, ['--f' as string]: p.flip ? -1 : 1 }}
                  onPointerDown={(e) => onDown(e, p)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  onClick={() => (editing ? setSel(p.uid) : feel('joyful', `${it.emoji} ${pick(TAPS)}`))}
                  aria-label={editing ? `${it.name}: drag to move` : it.name}
                >
                  <span>{it.emoji}</span>
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
              <img key={mood} src={moodSrc(mood)} alt="" width={120} height={120} draggable={false} />
            </button>
            {line && (
              <p className="jh-line" aria-live="polite">
                {line}
              </p>
            )}
            {!placed.length && !editing && <p className="jh-empty">An empty little home… earn pearls all over your Atelier, buy her something in the shop, then tap Decorate. 🫧</p>}
          </div>

          <div className="jh-actions">
            <button type="button" className={`cn-btn${editing ? ' primary' : ''}`} onClick={() => (setEditing(!editing), setSel(null))} aria-pressed={editing}>
              {editing ? '✓ Done decorating' : '✏️ Decorate'}
            </button>
            <button type="button" className="cn-btn" onClick={() => emit('jelly:open', null)}>
              💬 Chat with Jelly
            </button>
            <button type="button" className="cn-btn ghost" onClick={pet}>
              🫶 Pet her
            </button>
          </div>

          {editing && (
            <div className="jh-edit">
              {chosen ? (
                <div className="jh-tools" aria-label={`${itemById(chosen.item)?.name} tools`}>
                  <b>
                    {itemById(chosen.item)?.emoji} {itemById(chosen.item)?.name}
                  </b>
                  <button type="button" className="cn-btn" onClick={() => change(chosen.uid, (p) => ({ ...p, s: Math.max(0.5, +(p.s - 0.2).toFixed(1)) }))} aria-label="Smaller">
                    ➖
                  </button>
                  <button type="button" className="cn-btn" onClick={() => change(chosen.uid, (p) => ({ ...p, s: Math.min(2.5, +(p.s + 0.2).toFixed(1)) }))} aria-label="Bigger">
                    ➕
                  </button>
                  <button type="button" className="cn-btn" onClick={() => change(chosen.uid, (p) => ({ ...p, flip: !p.flip }))} aria-label="Flip">
                    ↔️
                  </button>
                  <button
                    type="button"
                    className="cn-btn"
                    onClick={() => {
                      change(chosen.uid, () => null);
                      setSel(null);
                    }}
                  >
                    Put away
                  </button>
                </div>
              ) : (
                <p className="cn-hint">Drag things around the room. Tap one to resize, flip or put it away.</p>
              )}

              <h3 className="jh-h">Jelly’s things</h3>
              {spare.length ? (
                <div className="jh-tray">
                  {spare.map((x) => {
                    const it = itemById(x.id)!;
                    return (
                      <button key={x.id} type="button" onClick={() => place(x.id)} title={`Place ${it.name}`}>
                        <span>{it.emoji}</span>
                        <small>{it.name}</small>
                        {x.left > 1 && <i>×{x.left}</i>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="cn-hint">{ownedThings ? 'Everything she owns is already out. The shop has more!' : 'Nothing yet: buy something in the shop, or unlock rewards with achievements.'}</p>
              )}

              <h3 className="jh-h">Backdrop</h3>
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
                        feel('wink', 'Ooh, new walls!');
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
          <p className="cn-hint">
            Earn pearls by visiting every day, chatting with Jelly, giving her pats, and unlocking achievements all over your Atelier. Some treasures can’t be bought: they’re rewards.
          </p>
          <div className="jh-kinds" role="tablist" aria-label="Show">
            {([['all', 'All'], ...KINDS.map((k) => [k.id, k.label]), ['backdrops', '🖼️ Backdrops']] as [typeof kind, string][]).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={kind === id} onClick={() => setKind(id)}>
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
                  <article key={b.id} className={`jh-card${own ? ' owned' : ''}`}>
                    <span className="jh-swatch" style={{ ['--sky' as string]: b.sky, ['--floor' as string]: b.floor }} aria-hidden="true" />
                    <b>{b.name}</b>
                    {own ? (
                      <small className="jh-own">✓ Jelly’s</small>
                    ) : b.price ? (
                      <button type="button" className="cn-btn primary" disabled={home.pearls < b.price || buying === b.id} onClick={() => buy(b.id, b.name)}>
                        🫧 {b.price}
                      </button>
                    ) : (
                      <small className="jh-lock">🔒 {by ? by.title : 'a secret'}</small>
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
                  return (
                    <article key={it.id} className={`jh-card${n ? ' owned' : ''}${it.price === undefined && !n ? ' locked' : ''}`}>
                      <span className="jh-emoji" aria-hidden="true">
                        {it.emoji}
                      </span>
                      <b>{it.name}</b>
                      {n > 0 && <small className="jh-own">Jelly has {n}</small>}
                      {it.price !== undefined ? (
                        <button type="button" className="cn-btn primary" disabled={home.pearls < it.price || buying === it.id} onClick={() => buy(it.id, it.name)}>
                          🫧 {it.price}
                        </button>
                      ) : (
                        !n && <small className="jh-lock">🔒 {by ? by.title : 'a secret'}</small>
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
          <p className="cn-hint">
            {unlockedCount} of {ACHIEVEMENTS.length} unlocked · {home.earned} pearls earned so far. Everything you do around your Atelier counts.
          </p>
          {GROUPS.map((g) => (
            <div key={g} className="jh-group">
              <h3 className="jh-h">{g}</h3>
              <div className="jh-awards">
                {ACHIEVEMENTS.filter((a) => a.group === g).map((a) => {
                  const at = home.unlocked[a.id];
                  const goal = goalOf(a, stats);
                  const p = at ? 1 : progressOf(a, stats);
                  const reward = a.reward ? itemById(a.reward) : null;
                  return (
                    <article key={a.id} className={`jh-award${at ? ' done' : ''}`}>
                      <span className="jh-award-icon" aria-hidden="true">
                        {a.icon}
                      </span>
                      <div>
                        <b>{a.title}</b>
                        <small>{a.desc}</small>
                        <span className="jh-progress" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, stats[a.metric])}>
                          <i style={{ width: `${Math.round(p * 100)}%` }} />
                        </span>
                        <small className="jh-reward">
                          {at ? `✓ ${day(at)} · ` : `${Math.min(goal, stats[a.metric])}/${goal} · `}🫧 +{a.pearls}
                          {reward && ` · ${reward.emoji} ${reward.name}`}
                          {a.backdrop && ` · 🖼️ ${backdropById(a.backdrop).name}`}
                        </small>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
