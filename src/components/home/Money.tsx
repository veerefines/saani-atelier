'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '@/lib/upload-client';
import { sfx } from '@/lib/sound';
import { checkSoon } from '@/components/jelly/bus';
import { CATEGORIES, categoryOf, jellyLine, type Budget, type CategoryId, type Currency, type Expense, type MonthSummary } from '@/lib/money';
import type { Rate } from '@/lib/fx';

type Month = { month: string; expenses: Expense[]; summary: MonthSummary; budget: Budget };

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

/** Soldi: her spends in Milano, the budget, and euros in rupees at today's rate. */
export default function Money({ initial }: { initial: Month }) {
  const [m, setM] = useState<Month>(initial);
  const [rate, setRate] = useState<Rate | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const thisMonth = initial.month;

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
        <p className="soldi-jelly">
          <img src="/corner/jelly/joyful.webp" alt="" />
          <span>{jellyLine(m.summary)}</span>
        </p>
      </section>

      {m.month === thisMonth && <AddSpend rate={rate} onAdded={() => load()} />}

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
              <span>{eur(list.reduce((s, x) => s + x.eur, 0))}</span>
            </h3>
            <ul>
              <AnimatePresence initial={false}>
                {list.map((x) => {
                  const c = categoryOf(x.category);
                  return (
                    <motion.li key={x.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}>
                      <button type="button" className="soldi-item" onClick={() => (sfx('coin'), setEditing(x))} data-quiet aria-label={`Change ${c.label} ${eur(x.eur)}`}>
                        <span className="soldi-item-icon" aria-hidden="true">
                          {c.icon}
                        </span>
                        <span className="soldi-item-text">
                          <b>{x.note || c.label}</b>
                          {x.note && <small>{c.label}</small>}
                        </span>
                        <span className="soldi-item-amt">
                          <b>{x.currency === 'EUR' ? eur(x.eur) : inr(x.inr)}</b>
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
function AddSpend({ rate, onAdded }: { rate: Rate | null; onAdded: () => void }) {
  const [amount, setAmount] = useState('');
  const [cur, setCur] = useState<Currency>('EUR');
  const [cat, setCat] = useState<CategoryId>('groceries');
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
      await api('/api/expenses', 'POST', { amount: n, currency: cur, category: cat, note, day });
      sfx('kaching');
      checkSoon();
      setAmount('');
      setNote('');
      onAdded();
    } catch (x) {
      setErr((x as Error).message || 'Couldn’t save that. Try again?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="soldi-add" onSubmit={add}>
      <h2 className="hand">add a spend</h2>
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
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={cat === c.id} className={cat === c.id ? 'on' : ''} onClick={() => (sfx('coin'), setCat(c.id))} data-quiet>
            <span aria-hidden="true">{c.icon}</span> {c.label}
          </button>
        ))}
      </div>
      <div className="soldi-add-row">
        <input className="soldi-note" placeholder="What was it? (optional)" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
        <input className="soldi-date" type="date" value={day} max={todayIn()} onChange={(e) => setDay(e.target.value)} aria-label="Day" />
      </div>
      {err && <p className="soldi-err">{err}</p>}
      <button className="soldi-go" disabled={busy}>
        {busy ? 'Saving…' : 'Add it 🫧'}
      </button>
    </form>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div className="soldi-sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="soldi-sheet" role="dialog" aria-label={title} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <button type="button" className="soldi-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

function EditSpend({ x, onClose, onSaved, onDelete }: { x: Expense; onClose: () => void; onSaved: () => void; onDelete: () => void }) {
  const [amount, setAmount] = useState(String(x.amount));
  const [cat, setCat] = useState<CategoryId>(x.category);
  const [note, setNote] = useState(x.note);
  const [day, setDay] = useState(x.day);
  const [err, setErr] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/expenses/${x.id}`, 'PATCH', { amount: Number(amount.replace(',', '.')), category: cat, note, day });
      sfx('coin');
      onSaved();
    } catch (z) {
      setErr((z as Error).message);
    }
  }
  return (
    <Sheet title="Change this spend" onClose={onClose}>
      <form onSubmit={save} className="soldi-edit">
        <div className="soldi-add-row">
          <span className="soldi-sym">{x.currency === 'EUR' ? '€' : '₹'}</span>
          <input className="soldi-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} aria-label="Amount" />
        </div>
        <div className="soldi-chips" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
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
          {CATEGORIES.map((c) => (
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
