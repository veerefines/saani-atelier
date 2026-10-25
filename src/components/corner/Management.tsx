'use client';

import { useState } from 'react';
import { costingSummary, type Brief, type Costing } from '@/lib/corner-model';
import { Status, useAction, type Ctx } from './shared';

const eur = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

const BRIEF: { key: keyof Brief; label: string; hint: string }[] = [
  { key: 'audience', label: 'Target audience', hint: 'Who is it for? Age, lifestyle, where they shop, what they value.' },
  { key: 'positioning', label: 'Brand positioning', hint: 'Where it sits: price tier, competitors, what makes it different.' },
  { key: 'objectives', label: 'Objectives', hint: 'What success looks like: a grade, a launch, sales, awareness…' },
  { key: 'budget', label: 'Budget', hint: 'What there is to spend, and on what.' },
];
const COSTS: { key: keyof Costing; label: string }[] = [
  { key: 'fabric', label: 'Fabric' },
  { key: 'labour', label: 'Labour' },
  { key: 'trims', label: 'Trims & packaging' },
  { key: 'other', label: 'Other' },
];

/** Fashion management: a simple project brief, and a product costing calculator (estimates). */
export default function Management({ ctx }: { ctx: Ctx }) {
  const p = ctx.project;
  const [brief, setBrief] = useState<Brief>(p.brief);
  const [cost, setCost] = useState<Record<keyof Costing, string>>(() => Object.fromEntries(Object.entries(p.costing).map(([k, v]) => [k, v ? String(v) : ''])) as Record<keyof Costing, string>);
  const b = useAction();
  const c = useAction();

  const nums = Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, Math.max(0, Number(v) || 0)])) as Costing;
  const sum = costingSummary(nums);
  const briefChanged = BRIEF.some((f) => brief[f.key] !== p.brief[f.key]);
  const costChanged = (Object.keys(nums) as (keyof Costing)[]).some((k) => nums[k] !== p.costing[k]);

  return (
    <div className="cn-panel cn-mgmt">
      <section className="cn-section">
        <h3 className="hand">project brief</h3>
        {BRIEF.map((f) => (
          <label key={f.key} className="cn-field">
            <span>{f.label}</span>
            <textarea className="h-input" rows={2} value={brief[f.key]} onChange={(e) => setBrief({ ...brief, [f.key]: e.target.value })} maxLength={2000} placeholder={f.hint} />
          </label>
        ))}
        <button type="button" className="cta h-small-btn" disabled={Boolean(b.busy) || !briefChanged} onClick={() => b.run('Saving…', () => ctx.patchProject({ brief }), 'Brief saved ✓')}>
          {b.busy || 'Save brief'}
        </button>
        <Status err={b.err} ok={b.ok} />
      </section>

      <section className="cn-section">
        <h3 className="hand">product costing</h3>
        <p className="cn-hint">Per unit, in euros.</p>
        <div className="cn-costs">
          {COSTS.map((f) => (
            <label key={f.key} className="cn-field">
              <span>{f.label}</span>
              <input className="h-input" type="number" inputMode="decimal" min={0} step="0.01" value={cost[f.key]} onChange={(e) => setCost({ ...cost, [f.key]: e.target.value })} placeholder="0" />
            </label>
          ))}
          <label className="cn-field">
            <span>Selling price</span>
            <input className="h-input" type="number" inputMode="decimal" min={0} step="0.01" value={cost.sellingPrice} onChange={(e) => setCost({ ...cost, sellingPrice: e.target.value })} placeholder="0" />
          </label>
        </div>
        <dl className="cn-sum" aria-live="polite">
          <div>
            <dt>Unit cost</dt>
            <dd>{eur(sum.unit)}</dd>
          </div>
          <div>
            <dt>Selling price</dt>
            <dd>{eur(nums.sellingPrice)}</dd>
          </div>
          <div className={sum.margin < 0 ? 'neg' : ''}>
            <dt>Gross margin</dt>
            <dd>
              {eur(sum.margin)}
              {sum.marginPct !== null && <small> ({sum.marginPct}%)</small>}
            </dd>
          </div>
          <div>
            <dt>Markup</dt>
            <dd>{sum.markup !== null ? `${sum.markup}×` : '–'}</dd>
          </div>
        </dl>
        <p className="cn-assume">
          <b>Estimates only.</b> Gross margin = selling price − unit cost. These figures leave out duties, shipping, VAT, retailer margins and overheads, so the real margin will be lower.
        </p>
        <button type="button" className="cta h-small-btn" disabled={Boolean(c.busy) || !costChanged} onClick={() => c.run('Saving…', () => ctx.patchProject({ costing: nums }), 'Costing saved ✓')}>
          {c.busy || 'Save costing'}
        </button>
        <Status err={c.err} ok={c.ok} />
      </section>
    </div>
  );
}
