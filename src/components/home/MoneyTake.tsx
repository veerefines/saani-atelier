'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sfx } from '@/lib/sound';
import { BITS_COLOR, CATEGORIES } from '@/lib/money';
import type { Compare, Tip } from '@/lib/money-insights';

type Share = { id: string; label: string; icon: string; color: string; eur: number; pct: number };
type Take = {
  month: string;
  shares: Share[];
  compare: Compare[];
  beforeTotal: number;
  sameDay: number | null;
  change: { label: string; icon: string; now: number; before: number; isNew: boolean; gone: boolean; pct: number | null } | null;
  projected: number | null;
  spent: number;
  inEur: number;
  net: number;
  byIn: { id: string; label: string; icon: string; eur: number }[];
  headline: string;
  tips: Tip[];
  via: 'jelly' | 'quick';
};
type View = 'month' | 'compare' | 'flow';

const eur = (n: number) => `€${Math.round(n).toLocaleString('en-IE')}`;
const IN_COLOR = '#3e9d6c';
const OUT_COLOR = '#b2305f';
const BITS_AT = 3; // slices under 3% join the little bits

/** Jelly's take on the month: where it went as a pie, against last month, in against out, and her tips. */
export default function JellyTake({ month, sig }: { month: string; sig: string }) {
  const [t, setT] = useState<Take | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('month');

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetch(`/api/expenses/insights?month=${month}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => live && r && setT(r))
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [month, sig]);

  const views: [View, string][] = [
    ['month', 'Where it went'],
    ['compare', 'vs last month'],
    ...(t && t.inEur > 0 ? [['flow', 'In & out'] as [View, string]] : []),
  ];
  const shown = views.some(([v]) => v === view) ? view : 'month';
  const hasCharts = Boolean(t && (t.shares.length || t.inEur));

  return (
    <section className="soldi-take" aria-label="Jelly’s take on your month" aria-busy={loading}>
      <div className="soldi-take-head">
        <h2 className="hand">Jelly’s take</h2>
        {hasCharts && (
          <div className="cal3-seg" role="tablist" aria-label="Charts">
            {views.map(([v, label]) => (
              <button key={v} type="button" role="tab" aria-selected={shown === v} onClick={() => (sfx('flip'), setView(v))} data-quiet>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!t && loading && <p className="soldi-take-wait">Jelly’s studying your month… 🫧</p>}

      {t && hasCharts && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={shown + t.month} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {shown === 'month' && <Pie t={t} />}
            {shown === 'compare' && <VsLast t={t} />}
            {shown === 'flow' && <InOut t={t} />}
          </motion.div>
        </AnimatePresence>
      )}

      {t && (
        <div className={`soldi-tips${loading ? ' thinking' : ''}`}>
          <div className="soldi-tips-head">
            <img src="/corner/jelly/hd/idea.webp" alt="" />
            <p className="cal3-tip">{t.headline}</p>
          </div>
          {t.tips.length > 0 && (
            <ol>
              {t.tips.map((x, i) => (
                <motion.li key={x.text} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }}>
                  <span aria-hidden="true">{x.icon}</span>
                  <p>{x.text}</p>
                </motion.li>
              ))}
            </ol>
          )}
          {t.via === 'quick' && t.tips.length > 0 && <small className="soldi-rate-note">Jelly worked these out from your numbers.</small>}
        </div>
      )}
    </section>
  );
}

/* ---------- where it went: a pie, slices in a fixed order so each category keeps its colour ---------- */
type Slice = { id: string; label: string; icon: string; color: string; eur: number; pct: number; parts?: string[] };

function slicesOf(shares: Share[]): Slice[] {
  const order = CATEGORIES.map((c) => c.id as string);
  const main: Slice[] = [];
  const bits: Share[] = [];
  for (const s of shares) (s.color === BITS_COLOR || s.pct < BITS_AT ? bits : main).push(s);
  main.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  if (bits.length) {
    const e = bits.reduce((t, b) => t + b.eur, 0);
    main.push({ id: 'bits', label: bits.length === 1 ? bits[0].label : 'Little bits', icon: bits.length === 1 ? bits[0].icon : '✨', color: BITS_COLOR, eur: e, pct: bits.reduce((t, b) => t + b.pct, 0), parts: bits.length > 1 ? bits.map((b) => `${b.icon} ${b.label} ${eur(b.eur)}`) : undefined });
  }
  return main;
}

function Pie({ t }: { t: Take }) {
  const [on, setOn] = useState<string | null>(null);
  const slices = slicesOf(t.shares);
  const total = slices.reduce((s, x) => s + x.eur, 0);
  const R = 46;
  const C = 2 * Math.PI * R;
  const GAP = slices.length > 1 ? 2.2 : 0; // a sliver of paper between slices
  let at = 0;
  const pick = slices.find((s) => s.id === on);
  const legend = [...slices].sort((a, b) => b.eur - a.eur);
  if (!total) return <p className="soldi-empty">No spends to chart yet this month.</p>;
  return (
    <div className="soldi-pie">
      <div className="soldi-pie-chart">
        <svg viewBox="0 0 120 120" role="img" aria-label={`Where it went: ${legend.map((s) => `${s.label} ${s.pct}%`).join(', ')}`}>
          <circle cx="60" cy="60" r={R} className="soldi-pie-track" />
          {slices.map((s, i) => {
            const len = (s.eur / total) * C;
            const start = at;
            at += len;
            return (
              <motion.circle
                key={s.id}
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={on === s.id ? 22 : 18}
                strokeDashoffset={-start}
                initial={{ strokeDasharray: `0 ${C}` }}
                animate={{ strokeDasharray: `${Math.max(0.01, len - GAP)} ${C}`, opacity: on && on !== s.id ? 0.35 : 1 }}
                transition={{ duration: 0.7, delay: 0.06 * i, ease: 'easeOut' }}
                onMouseEnter={() => setOn(s.id)}
                onMouseLeave={() => setOn(null)}
                onClick={() => (sfx('coin'), setOn(on === s.id ? null : s.id))}
                style={{ cursor: 'pointer', transition: 'stroke-width .2s' }}
              />
            );
          })}
        </svg>
        <div className="soldi-pie-mid" aria-live="polite">
          {pick ? (
            <>
              <span aria-hidden="true">{pick.icon}</span>
              <b>{eur(pick.eur)}</b>
              <small>
                {pick.pct}% · {pick.label}
              </small>
            </>
          ) : (
            <>
              <small>spent</small>
              <b>{eur(total)}</b>
              <small>{slices.length === 1 ? '1 kind' : `${t.shares.length} kinds`}</small>
            </>
          )}
        </div>
      </div>
      <ul className="soldi-legend">
        {legend.map((s) => (
          <li key={s.id}>
            <button type="button" className={on === s.id ? 'on' : ''} onClick={() => (sfx('coin'), setOn(on === s.id ? null : s.id))} onMouseEnter={() => setOn(s.id)} onMouseLeave={() => setOn(null)} data-quiet>
              <i style={{ background: s.color }} aria-hidden="true" />
              <span>
                {s.icon} {s.label}
                {s.parts && <small>{s.parts.join(' · ')}</small>}
              </span>
              <b>{eur(s.eur)}</b>
              <em>{s.pct}%</em>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- against last month: paired bars, same scale ---------- */
function VsLast({ t }: { t: Take }) {
  const rows = t.compare.slice(0, 7);
  if (!t.beforeTotal) return <p className="soldi-empty">Nothing logged last month to compare with yet. Next month, Jelly will show you how they stack up!</p>;
  const max = Math.max(...rows.flatMap((r) => [r.now, r.before]), 1);
  const diff = t.spent - t.beforeTotal;
  return (
    <div className="soldi-vs">
      <p className="soldi-vs-total">
        <b>{eur(t.spent)}</b> this month against <b>{eur(t.beforeTotal)}</b> {t.sameDay ? `by day ${t.sameDay} of last month` : 'last month'}
        <span className={diff > 0 ? 'up' : 'down'}>
          {diff > 0 ? '▲' : '▼'} {eur(Math.abs(diff))}
        </span>
      </p>
      <div className="soldi-vs-key" aria-hidden="true">
        <span>
          <i className="now" /> this month
        </span>
        <span>
          <i className="before" /> last month
        </span>
      </div>
      <ul>
        {rows.map((r, i) => (
          <li key={r.id}>
            <span className="soldi-vs-label">
              {r.icon} {r.label}
            </span>
            <span className="soldi-vs-bars">
              <motion.i className="now" style={{ background: r.color === BITS_COLOR ? '#8f8389' : r.color }} initial={{ width: 0 }} animate={{ width: `${(r.now / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.04 }} />
              <motion.i className="before" initial={{ width: 0 }} animate={{ width: `${(r.before / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.04 + 0.1 }} />
            </span>
            <span className="soldi-vs-nums">
              <b>{eur(r.now)}</b>
              <small>{eur(r.before)}</small>
            </span>
          </li>
        ))}
      </ul>
      {t.change && (
        <p className="soldi-vs-change">
          Biggest change: {t.change.icon} <b>{t.change.label}</b> {t.change.isNew ? `is new (${eur(t.change.now)})` : t.change.gone ? `dropped to nothing (was ${eur(t.change.before)})` : `${t.change.now > t.change.before ? 'up' : 'down'} ${Math.abs(t.change.pct ?? 0)}%`}
        </p>
      )}
    </div>
  );
}

/* ---------- money in against money out ---------- */
function InOut({ t }: { t: Take }) {
  const max = Math.max(t.inEur, t.spent, 1);
  const rows = [
    { label: 'Money in', eur: t.inEur, color: IN_COLOR },
    { label: 'Spent', eur: t.spent, color: OUT_COLOR },
  ];
  return (
    <div className="soldi-flow">
      <p className={`soldi-flow-net ${t.net >= 0 ? 'up' : 'down'}`}>
        <small>net this month</small>
        <b>
          {t.net >= 0 ? '+' : '−'}
          {eur(Math.abs(t.net))}
        </b>
      </p>
      <ul>
        {rows.map((r) => (
          <li key={r.label}>
            <span>{r.label}</span>
            <span className="soldi-flow-bar">
              <motion.i style={{ background: r.color }} initial={{ width: 0 }} animate={{ width: `${(r.eur / max) * 100}%` }} transition={{ duration: 0.7 }} />
            </span>
            <b>{eur(r.eur)}</b>
          </li>
        ))}
      </ul>
      {t.byIn.length > 0 && <p className="soldi-flow-from">From: {t.byIn.map((c) => `${c.icon} ${c.label} ${eur(c.eur)}`).join(' · ')}</p>}
    </div>
  );
}
