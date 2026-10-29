'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '@/lib/upload-client';
import { sfx } from '@/lib/sound';
import { checkSoon } from '@/components/jelly/bus';
import { PICK_ORDER, categoryOf, fallbackFor, jellyLine, kindOf, listFor, type Budget, type Currency, type Expense, type Kind, type MonthSummary } from '@/lib/money';
import type { Draft } from '@/lib/money-parse';
import type { Rate } from '@/lib/fx';
import JellyTake from './MoneyTake';
import MoneyReport from './MoneyReport';
import Sheet from './MoneySheet';

type Month = { month: string; expenses: Expense[]; summary: MonthSummary; budget: Budget };
type Cat = { id: string; icon: string; label: string; color: string };
/** The categories she picks from, spends in her usual order. */
const pickList = (kind: Kind): Cat[] => (kind === 'in' ? [...listFor('in')] : PICK_ORDER.map((id) => categoryOf(id)));


const eur = (n: number, dp = 2) => `€${n.toLocaleString('en-IE', { minimumFractionDigits: n % 1 ? dp : 0, maximumFractionDigits: dp })}`;
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayName = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const shift = (m: string, n: number) => {
  const d = new Date(`${m}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const todayIn = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
const outOf = (l: Expense[]) => l.filter((x) => kindOf(x) === 'out').reduce((s, x) => s + x.eur, 0);
const inOf = (l: Expense[]) => l.filter((x) => kindOf(x) === 'in').reduce((s, x) => s + x.eur, 0);

/** Soldi: her spends in Milano, the budget, and euros in rupees at today's rate. */
export default function Money({ initial }: { initial: Month }) {
  const [m, setM] = useState<Month>(initial);
  const [rate, setRate] = useState<Rate | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [byHand, setByHand] = useState(false);
  const thisMonth = initial.month;
  // when anything in the month changes, Jelly takes another look
  const sig = `${m.month}:${m.expenses.length}:${m.summary.spent}:${m.summary.inEur}:${m.budget.monthly}`;

  useEffect(() => {
    fetch('/api/fx')
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => r && setRate(r))
      .catch(() => {});
  }, []);

  const load = (month = m.month) =>
    fetch(`/api/expenses?month=${month}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setM)
      .catch(() => {});

  // crossing the budget line gets a kind "uh-oh"; a month back under it, a shower of coins
  const wasOver = useRef(initial.summary.left !== null && initial.summary.left < 0);
  useEffect(() => {
    const over = m.summary.left !== null && m.summary.left < 0;
    if (m.month !== thisMonth) return;
    if (over && !wasOver.current) setTimeout(() => sfx('oops'), 900);
    if (!over && wasOver.current) setTimeout(() => sfx('coins'), 600);
    wasOver.current = over;
  }, [m.summary.left, m.month, thisMonth]);

  const byDay = useMemo(() => {
    const g: Record<string, Expense[]> = {};
    for (const x of m.expenses) (g[x.day] ??= []).push(x);
    return Object.entries(g).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [m.expenses]);

  async function remove(x: Expense) {
    sfx('paper');
    setM((p) => ({ ...p, expenses: p.expenses.filter((e) => e.id !== x.id) }));
    await api(`/api/expenses/${x.id}`, 'DELETE').catch(() => {});
    load();
  }

  return (
    <div className="soldi">
      <section className="soldi-hero" aria-label="Jelly’s word on your money">
        <img src="/corner/jelly/hd/finance.webp" alt="Jelly in round glasses, doing the sums with a calculator, a laptop and a budget notebook" width={880} height={733} />
        <p className="cal3-tip">{jellyLine(m.summary)}</p>
      </section>
      <RateCard rate={rate} />
      <section className="soldi-month" aria-label="This month">
        <div className="soldi-monthbar">
          <button type="button" onClick={() => (sfx('page'), load(shift(m.month, -1)))} aria-label="Previous month" data-quiet>
            ‹
          </button>
          <b>{monthName(m.month)}</b>
          <button type="button" onClick={() => (sfx('page'), load(shift(m.month, 1)))} disabled={m.month >= thisMonth} aria-label="Next month" data-quiet>
            ›
          </button>
        </div>
        <Ring s={m.summary} rate={rate} onBudget={() => setBudgetOpen(true)} />
      </section>

      {m.month === thisMonth && <TellJelly onAdded={() => load()} />}

      <JellyTake month={m.month} sig={sig} />

      <MoneyReport month={m.month} thisMonth={thisMonth} />

      {m.month === thisMonth &&
        (byHand ? (
          <AddSpend rate={rate} onAdded={() => load()} onClose={() => setByHand(false)} />
        ) : (
          <button type="button" className="soldi-byhand" onClick={() => (sfx('page'), setByHand(true))}>
            ✍️ Add by hand instead
          </button>
        ))}

      {m.summary.byCat.length > 0 && (
        <section className="soldi-cats" aria-label="By category">
          <h2 className="hand">where it went</h2>
          {m.summary.byCat.map((c) => {
            const max = c.cap ?? Math.max(...m.summary.byCat.map((x) => x.eur));
            const pct = Math.min(100, max ? (c.eur / max) * 100 : 0);
            return (
              <div key={c.id} className={`soldi-cat${c.cap && c.eur > c.cap ? ' over' : ''}`}>
                <span aria-hidden="true">{c.icon}</span>
                <b>{c.label}</b>
                <small>
                  {eur(c.eur)}
                  {c.cap ? ` of ${eur(c.cap, 0)}` : ''}
                </small>
                <i aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </i>
              </div>
            );
          })}
        </section>
      )}

      <section className="soldi-list" aria-label="Spends">
        <h2 className="hand">spends</h2>
        {!byDay.length && <p className="soldi-empty">Nothing logged in {monthName(m.month)} yet.</p>}
        {byDay.map(([day, list]) => (
          <div key={day} className="soldi-day">
            <h3>
              {dayName(day)}
              <span>
                {outOf(list) > 0 && eur(outOf(list))}
                {inOf(list) > 0 && <em> +{eur(inOf(list))} in</em>}
              </span>
            </h3>
            <ul>
              <AnimatePresence initial={false}>
                {list.map((x) => {
                  const c = categoryOf(x.category, kindOf(x));
                  const plus = kindOf(x) === 'in' ? '+' : '';
                  return (
                    <motion.li key={x.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}>
                      <button type="button" className={`soldi-item${plus ? ' in' : ''}`} onClick={() => (sfx('coin'), setEditing(x))} data-quiet aria-label={`Change ${c.label} ${eur(x.eur)}`}>
                        <span className="soldi-item-icon" aria-hidden="true">
                          {c.icon}
                        </span>
                        <span className="soldi-item-text">
                          <b>{x.note || c.label}</b>
                          {x.note && <small>{c.label}</small>}
                        </span>
                        <span className="soldi-item-amt">
                          <b>
                            {plus}
                            {x.currency === 'EUR' ? eur(x.eur) : inr(x.inr)}
                          </b>
                          <small>{x.currency === 'EUR' ? inr(x.inr) : eur(x.eur)}</small>
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
        ))}
      </section>

      <AnimatePresence>
        {editing && (
          <EditSpend
            x={editing}
            onClose={() => setEditing(null)}
            onDelete={() => {
              remove(editing);
              setEditing(null);
            }}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        )}
        {budgetOpen && (
          <BudgetEditor
            b={m.budget}
            onClose={() => setBudgetOpen(false)}
            onSaved={() => {
              setBudgetOpen(false);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- today's rate, its month, and a converter ---------- */
function RateCard({ rate }: { rate: Rate | null }) {
  const [side, setSide] = useState<Currency>('EUR');
  const [val, setVal] = useState('10');
  const n = Number(val.replace(',', '.'));
  const out = rate && Number.isFinite(n) ? (side === 'EUR' ? inr(n * rate.inr) : eur(n / rate.inr)) : '…';
  const t = rate?.trend ?? [];
  const first = t[0]?.inr;
  const change = rate && first ? ((rate.inr - first) / first) * 100 : null;
  return (
    <section className="soldi-rate" aria-label="Euro to rupee">
      <div className="soldi-rate-top">
        <span className="hand">oggi</span>
        <p>
          <b>€1</b> = <b>{rate ? `₹${rate.inr.toFixed(2)}` : '…'}</b>
        </p>
        {change !== null && (
          <small className={change >= 0 ? 'up' : 'down'}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% this month {change >= 0 ? '(your euros buy more ₹)' : '(the rupee’s a little stronger)'}
          </small>
        )}
      </div>
      {t.length > 2 && <Spark points={t.map((x) => x.inr)} />}
      <div className="soldi-conv">
        <label>
          <span>{side === 'EUR' ? '€' : '₹'}</span>
          <input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d.,]/g, ''))} aria-label={side === 'EUR' ? 'Euros' : 'Rupees'} />
        </label>
        <button type="button" className="soldi-swap" onClick={() => (sfx('flip'), setSide(side === 'EUR' ? 'INR' : 'EUR'))} data-quiet aria-label="Swap currencies">
          ⇄
        </button>
        <output>{out}</output>
      </div>
      {rate && (
        <small className="soldi-rate-note">
          {rate.source === 'saved' ? 'Couldn’t reach the rates just now, showing the last one we had.' : `${rate.source === 'ECB' ? 'European Central Bank' : 'ExchangeRate-API'} rate for ${dayName(rate.day)} · updates once each working day`}
        </small>
      )}
    </section>
  );
}

function Spark({ points }: { points: number[] }) {
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const W = 300;
  const H = 46;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * W, H - 4 - ((p - lo) / (hi - lo || 1)) * (H - 8)]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg className="soldi-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Last month: from ₹${points[0].toFixed(1)} to ₹${points[points.length - 1].toFixed(1)}`}>
      <path d={`${d} L${W},${H} L0,${H} Z`} className="fill" />
      <path d={d} className="line" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="3.5" />
    </svg>
  );
}

/* ---------- spent against the budget ---------- */
function Ring({ s, rate, onBudget }: { s: MonthSummary; rate: Rate | null; onBudget: () => void }) {
  const pct = s.budget ? Math.min(1, s.spent / s.budget) : 0;
  const over = s.left !== null && s.left < 0;
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="soldi-ring-wrap">
      <svg className={`soldi-ring${over ? ' over' : ''}`} viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={R} className="track" />
        <motion.circle cx="64" cy="64" r={R} className="fill" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <div className="soldi-ring-text">
        {s.budget ? (
          <>
            <small>{over ? 'over by' : 'left'}</small>
            <b>{eur(Math.abs(s.left ?? 0), 0)}</b>
            {rate && <small>{inr(Math.abs(s.left ?? 0) * rate.inr)}</small>}
          </>
        ) : (
          <>
            <small>spent</small>
            <b>{eur(s.spent, 0)}</b>
          </>
        )}
      </div>
      <div className="soldi-ring-side">
        <p>
          <b>{eur(s.spent)}</b> spent
          <small>{inr(s.spentInr)}</small>
        </p>
        {s.inEur > 0 && (
          <p className="soldi-in-line">
            <b>+{eur(s.inEur)}</b> in
            <small>
              net {s.net >= 0 ? '+' : '−'}
              {eur(Math.abs(s.net))}
            </small>
          </p>
        )}
        {s.budget ? (
          <p>
            of <b>{eur(s.budget, 0)}</b>
            <small>{s.daysLeft ? `${s.daysLeft} days to go` : 'month done'}</small>
          </p>
        ) : null}
        <button type="button" className="soldi-ghost" onClick={onBudget}>
          {s.budget ? 'Change budget' : 'Set a budget'}
        </button>
      </div>
    </div>
  );
}

/* ---------- adding a spend ---------- */
function KindSeg({ kind, onKind }: { kind: Kind; onKind: (k: Kind) => void }) {
  return (
    <div className="cal3-seg soldi-kind" role="tablist" aria-label="Money out or in">
      {(['out', 'in'] as Kind[]).map((k) => (
        <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => (sfx('flip'), onKind(k))} data-quiet>
          {k === 'out' ? 'Spent' : 'Money in'}
        </button>
      ))}
    </div>
  );
}

function AddSpend({ rate, onAdded, onClose }: { rate: Rate | null; onAdded: () => void; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [cur, setCur] = useState<Currency>('EUR');
  const [kind, setKind] = useState<Kind>('out');
  const [cat, setCat] = useState<string>('groceries');
  const [note, setNote] = useState('');
  const [day, setDay] = useState(todayIn());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const n = Number(amount.replace(',', '.'));
  const other = rate && n > 0 ? (cur === 'EUR' ? inr(n * rate.inr) : eur(n / rate.inr)) : null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!(n > 0)) return setErr('How much was it?');
    setBusy(true);
    setErr('');
    try {
      await api('/api/expenses', 'POST', { kind, amount: n, currency: cur, category: cat, note, day });
      sfx('kaching');
      checkSoon();
      setAmount('');
      setNote('');
      onAdded();
    } catch (x) {
      sfx('nope');
      setErr((x as Error).message || 'Couldn’t save that. Try again?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="soldi-add" onSubmit={add}>
      <div className="soldi-add-head">
        <h2 className="hand">add by hand</h2>
        <KindSeg
          kind={kind}
          onKind={(k) => {
            setKind(k);
            setCat(k === 'in' ? 'home' : 'groceries');
          }}
        />
        <button type="button" className="soldi-close soldi-add-x" onClick={onClose} aria-label="Close" data-quiet>
          ×
        </button>
      </div>
      <div className="soldi-add-row">
        <div className="soldi-cur" role="group" aria-label="Currency">
          {(['EUR', 'INR'] as Currency[]).map((c) => (
            <button key={c} type="button" className={cur === c ? 'on' : ''} aria-pressed={cur === c} onClick={() => (sfx('flip'), setCur(c))} data-quiet>
              {c === 'EUR' ? '€' : '₹'}
            </button>
          ))}
        </div>
        <input className="soldi-amt" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} aria-label="Amount" />
        {other && <span className="soldi-other">≈ {other}</span>}
      </div>
      <div className="soldi-chips" role="radiogroup" aria-label="Category">
        {pickList(kind).map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={cat === c.id} className={cat === c.id ? 'on' : ''} onClick={() => (sfx('coin'), setCat(c.id))} data-quiet>
            <span aria-hidden="true">{c.icon}</span> {c.label}
          </button>
        ))}
      </div>
      <div className="soldi-add-row">
        <input className="soldi-note" placeholder={kind === 'in' ? 'Who from? (optional)' : 'What was it? (optional)'} maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
        <input className="soldi-date" type="date" value={day} max={todayIn()} onChange={(e) => setDay(e.target.value)} aria-label="Day" />
      </div>
      {err && <p className="soldi-err">{err}</p>}
      <button className="soldi-go" disabled={busy}>
        {busy ? 'Saving…' : kind === 'in' ? 'Add money in 💚' : 'Add it 🫧'}
      </button>
    </form>
  );
}

/* ---------- telling Jelly in plain words ---------- */
const whenName = (d: string) => {
  const t = todayIn();
  const y = new Date(`${t}T12:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  return d === t ? '' : d === y.toISOString().slice(0, 10) ? 'yesterday' : dayName(d);
};

function TellJelly({ onAdded }: { onAdded: () => void }) {
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function read(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api<{ drafts: Draft[] }>('/api/expenses/parse', 'POST', { text });
      if (!r.drafts.length) setErr('Jelly couldn’t find an amount in that. Try “pizza 12” or “mamma sent ₹10000”.');
      else (sfx('pop'), setDrafts(r.drafts));
    } catch (x) {
      sfx('nope');
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addAll() {
    if (!drafts?.length) return;
    setBusy(true);
    try {
      await api('/api/expenses/batch', 'POST', { items: drafts });
      sfx('kaching');
      checkSoon();
      setDrafts(null);
      setText('');
      onAdded();
    } catch (x) {
      sfx('nope');
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const change = (i: number, d: Partial<Draft>) => setDrafts((l) => l && l.map((x, j) => (j === i ? { ...x, ...d } : x)));
  const cycle = (i: number) => {
    const x = drafts![i];
    const l = pickList(x.kind);
    const at = l.findIndex((c) => c.id === x.category);
    sfx('coin');
    change(i, { category: l[(at + 1) % l.length].id as Draft['category'] });
  };

  return (
    <section className="soldi-tell" aria-label="Tell Jelly what you spent">
      <div className="soldi-tell-head">
        <img src="/corner/jelly/curious.webp" alt="" />
        <p className="cal3-tip">What did you spend, cara? Say it how you’d text it, Jelly sorts it out.</p>
      </div>
      <form onSubmit={read} className="soldi-tell-form">
        <input value={text} onChange={(e) => (setText(e.target.value), setDrafts(null))} placeholder="esselunga 23,40 and metro 2,20 · mamma sent ₹10000" maxLength={500} aria-label="What you spent, in your own words" enterKeyHint="send" />
        <button className="soldi-go" disabled={busy || !text.trim()}>
          {busy && !drafts ? 'Reading…' : 'Tell Jelly'}
        </button>
      </form>
      {err && <p className="soldi-err">{err}</p>}
      <AnimatePresence>
        {drafts && (
          <motion.div className="soldi-drafts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <ul>
              {drafts.map((d, i) => {
                const c = categoryOf(d.category, d.kind);
                return (
                  <motion.li key={i} layout className={d.kind === 'in' ? 'in' : ''} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                    <button type="button" className="soldi-draft-cat" onClick={() => cycle(i)} aria-label={`${c.label}, tap to change`} title="Tap to change the category" data-quiet>
                      <span aria-hidden="true">{c.icon}</span>
                      <small>{c.label}</small>
                    </button>
                    <span className="soldi-draft-text">
                      <b>{d.note || c.label}</b>
                      <small>
                        {d.kind === 'in' ? 'money in' : 'spent'}
                        {whenName(d.day) && ` · ${whenName(d.day)}`}
                      </small>
                    </span>
                    <button type="button" className="soldi-draft-amt" onClick={() => (sfx('flip'), change(i, { currency: d.currency === 'EUR' ? 'INR' : 'EUR' }))} aria-label="Swap € and ₹" data-quiet>
                      {d.kind === 'in' ? '+' : ''}
                      {d.currency === 'EUR' ? eur(d.amount) : inr(d.amount)}
                    </button>
                    <button type="button" className="soldi-draft-x" onClick={() => setDrafts((l) => (l && l.length > 1 ? l.filter((_, j) => j !== i) : null))} aria-label="Leave this one out" data-quiet>
                      ×
                    </button>
                  </motion.li>
                );
              })}
            </ul>
            <div className="soldi-sheet-actions">
              <small className="soldi-rate-note">Tap an icon to change the category, or an amount to switch € and ₹.</small>
              <button type="button" className="soldi-go" onClick={addAll} disabled={busy}>
                {busy ? 'Saving…' : drafts.length > 1 ? `Add all ${drafts.length} 🫧` : 'Add it 🫧'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function EditSpend({ x, onClose, onSaved, onDelete }: { x: Expense; onClose: () => void; onSaved: () => void; onDelete: () => void }) {
  const [amount, setAmount] = useState(String(x.amount));
  const [kind, setKind] = useState<Kind>(kindOf(x));
  const [cat, setCat] = useState<string>(x.category);
  const [note, setNote] = useState(x.note);
  const [day, setDay] = useState(x.day);
  const [err, setErr] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/expenses/${x.id}`, 'PATCH', { kind, amount: Number(amount.replace(',', '.')), category: cat, note, day });
      sfx('coin');
      onSaved();
    } catch (z) {
      sfx('nope');
      setErr((z as Error).message);
    }
  }
  return (
    <Sheet title={kind === 'in' ? 'Change this money in' : 'Change this spend'} onClose={onClose}>
      <form onSubmit={save} className="soldi-edit">
        <KindSeg
          kind={kind}
          onKind={(k) => {
            setKind(k);
            setCat(fallbackFor(k));
          }}
        />
        <div className="soldi-add-row">
          <span className="soldi-sym">{x.currency === 'EUR' ? '€' : '₹'}</span>
          <input className="soldi-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} aria-label="Amount" />
        </div>
        <div className="soldi-chips" role="radiogroup" aria-label="Category">
          {pickList(kind).map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={cat === c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>
              <span aria-hidden="true">{c.icon}</span> {c.label}
            </button>
          ))}
        </div>
        <div className="soldi-add-row">
          <input className="soldi-note" placeholder="What was it?" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
          <input className="soldi-date" type="date" value={day} max={todayIn()} onChange={(e) => setDay(e.target.value)} aria-label="Day" />
        </div>
        <small className="soldi-rate-note">Kept at the rate from when you added it: €1 = ₹{x.rate.toFixed(2)}</small>
        {err && <p className="soldi-err">{err}</p>}
        <div className="soldi-sheet-actions">
          <button type="button" className="soldi-ghost danger" onClick={onDelete}>
            Delete
          </button>
          <button className="soldi-go">Save</button>
        </div>
      </form>
    </Sheet>
  );
}

function BudgetEditor({ b, onClose, onSaved }: { b: Budget; onClose: () => void; onSaved: () => void }) {
  const [monthly, setMonthly] = useState(b.monthly ? String(b.monthly) : '');
  const [caps, setCaps] = useState<Record<string, string>>(Object.fromEntries(Object.entries(b.caps).map(([k, v]) => [k, String(v)])));
  const [err, setErr] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/expenses/budget', 'PUT', { monthly: Number(monthly || 0), caps: Object.fromEntries(Object.entries(caps).map(([k, v]) => [k, Number(v)])) });
      sfx('coins');
      onSaved();
    } catch (z) {
      sfx('nope');
      setErr((z as Error).message);
    }
  }
  return (
    <Sheet title="Your monthly budget" onClose={onClose}>
      <form onSubmit={save} className="soldi-edit">
        <div className="soldi-add-row">
          <span className="soldi-sym">€</span>
          <input className="soldi-amt" inputMode="decimal" placeholder="e.g. 900" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^\d.]/g, ''))} aria-label="Monthly budget in euros" />
          <span className="soldi-other">a month</span>
        </div>
        <p className="soldi-sub">Caps per category (optional)</p>
        <div className="soldi-caps">
          {pickList('out').map((c) => (
            <label key={c.id}>
              <span aria-hidden="true">{c.icon}</span>
              <span>{c.label}</span>
              <input inputMode="decimal" placeholder="€" value={caps[c.id] ?? ''} onChange={(e) => setCaps({ ...caps, [c.id]: e.target.value.replace(/[^\d.]/g, '') })} aria-label={`${c.label} cap`} />
            </label>
          ))}
        </div>
        {err && <p className="soldi-err">{err}</p>}
        <div className="soldi-sheet-actions">
          <button className="soldi-go">Save budget</button>
        </div>
      </form>
    </Sheet>
  );
}
