'use client';

import { useState } from 'react';
import { activity, costingSummary } from '@/lib/corner-model';
import { Status, useAction, type Ctx } from './shared';
import { edited } from './CornerHome';

const eur = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);

/** Overview: what the project is, where it stands, quick ways in, and what changed lately. */
export default function Overview({ ctx }: { ctx: Ctx }) {
  const { project: p, items } = ctx;
  const [desc, setDesc] = useState(p.description);
  const { busy, err, ok, run } = useAction();
  const recent = activity(p, items);
  const count = (k: string) => items.filter((i) => i.kind === k).length;
  const quick = [
    { tab: 'documents', icon: '📄', label: 'Documents', n: count('doc') },
    { tab: 'inspiration', icon: '💡', label: 'Inspiration', n: count('drop') },
    { tab: 'moodboard', icon: '🎨', label: 'Moodboard', n: count('board') },
    { tab: 'elements', icon: '🧵', label: 'Design elements', n: count('palette') + count('type') + count('fabric') },
    { tab: 'management', icon: '📊', label: 'Brief & costing', n: null },
    { tab: 'assistant', icon: '✨', label: 'Assistant', n: null },
  ] as const;
  const b = p.brief;
  const briefDone = [b.audience, b.positioning, b.objectives, b.budget].filter((x) => x.trim()).length;
  const cost = costingSummary(p.costing);
  const hasCost = p.costing.sellingPrice > 0 || cost.unit > 0;

  return (
    <div className="cn-panel cn-two">
      <div className="cn-col">
        <section className="cn-section">
          <h3 className="cn-h">About</h3>
          <textarea
            className="h-input"
            rows={4}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={1000}
            placeholder="What is it, who is it for, what should it feel like?"
            aria-label="Project description"
          />
          {desc !== p.description && (
            <div className="cn-row">
              <button type="button" className="cn-btn primary" disabled={Boolean(busy)} onClick={() => run('Saving…', () => ctx.patchProject({ description: desc }), 'Saved ✓')}>
                {busy || 'Save'}
              </button>
              <button type="button" className="cn-btn ghost" onClick={() => setDesc(p.description)}>
                Cancel
              </button>
            </div>
          )}
          <Status err={err} ok={ok} />
        </section>

        <section className="cn-section">
          <h3 className="cn-h">At a glance</h3>
          <dl className="cn-glance">
            <div>
              <dt>Brief</dt>
              <dd>{briefDone ? `${briefDone}/4 done` : 'not started'}</dd>
            </div>
            <div>
              <dt>Unit cost</dt>
              <dd>{hasCost ? eur(cost.unit) : '–'}</dd>
            </div>
            <div>
              <dt>Gross margin</dt>
              <dd>{hasCost && cost.marginPct !== null ? `${cost.marginPct}%` : '–'}</dd>
            </div>
          </dl>
          {b.audience && (
            <p className="cn-quote">
              <span>For</span> {b.audience}
            </p>
          )}
          <button type="button" className="cn-btn ghost" onClick={() => ctx.goTo('management')}>
            {briefDone || hasCost ? 'Open brief & costing →' : 'Start the brief →'}
          </button>
        </section>
      </div>

      <div className="cn-col">
        <section className="cn-section">
          <h3 className="cn-h">Jump to</h3>
          <div className="cn-quick">
            {quick.map((q) => (
              <button key={q.tab} type="button" onClick={() => ctx.goTo(q.tab)}>
                <span aria-hidden="true">{q.icon}</span>
                <b>{q.label}</b>
                {q.n !== null && <small>{q.n}</small>}
              </button>
            ))}
          </div>
        </section>
        <section className="cn-section">
          <h3 className="cn-h">Recent activity</h3>
          <ul className="cn-activity">
            {recent.map((a, i) => (
              <li key={i}>
                <span>{a.what}</span>
                <small>{edited(a.at).replace('edited ', '')}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
