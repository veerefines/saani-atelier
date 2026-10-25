'use client';

import { useState } from 'react';
import { activity } from '@/lib/corner-model';
import { mediaUrl } from '@/lib/upload-client';
import { FileButton, Status, uploadCorner, useAction, type Ctx } from './shared';
import { edited } from './CornerHome';

/** Overview: the description, the cover, recent activity, and quick ways to add things. */
export default function Overview({ ctx }: { ctx: Ctx }) {
  const { project: p, items } = ctx;
  const [desc, setDesc] = useState(p.description);
  const { busy, err, ok, run } = useAction();
  const recent = activity(p, items);
  const counts = {
    documents: items.filter((i) => i.kind === 'doc').length,
    inspiration: items.filter((i) => i.kind === 'drop').length,
    moodboard: items.filter((i) => i.kind === 'board').length,
    elements: items.filter((i) => i.kind === 'palette' || i.kind === 'type' || i.kind === 'fabric').length,
  };
  return (
    <div className="cn-panel cn-overview">
      <section className="cn-section">
        <h3 className="hand">about this project</h3>
        <textarea className="h-input" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} placeholder="What is it, who is it for, what should it feel like?" aria-label="Project description" />
        <div className="cn-row">
          <button type="button" className="cta h-small-btn" disabled={Boolean(busy) || desc === p.description} onClick={() => run('Saving…', () => ctx.patchProject({ description: desc }), 'Saved ✓')}>
            {busy === 'Saving…' ? busy : 'Save description'}
          </button>
          <FileButton
            label={busy.startsWith('Uploading') ? busy : p.coverMediaId ? 'Change cover image' : 'Add a cover image'}
            accept="image/*"
            disabled={Boolean(busy)}
            onFile={(f) =>
              run(
                'Uploading…',
                async () => {
                  const id = await uploadCorner(f);
                  await ctx.patchProject({ coverMediaId: id });
                },
                'Cover updated ✓',
              )
            }
          />
          {p.coverMediaId && (
            <button type="button" className="w-link" onClick={() => run('Removing…', () => ctx.patchProject({ coverMediaId: null }))}>
              Remove cover
            </button>
          )}
        </div>
        {p.coverMediaId && <img className="cn-cover-preview" src={mediaUrl(p.coverMediaId)} alt="Project cover" />}
        <Status err={err} ok={ok} />
      </section>

      <section className="cn-section">
        <h3 className="hand">add to it</h3>
        <div className="cn-quick">
          <button type="button" onClick={() => ctx.goTo('documents')}>
            📄 Documents <small>{counts.documents}</small>
          </button>
          <button type="button" onClick={() => ctx.goTo('inspiration')}>
            💡 Inspiration <small>{counts.inspiration}</small>
          </button>
          <button type="button" onClick={() => ctx.goTo('moodboard')}>
            🎨 Moodboard <small>{counts.moodboard}</small>
          </button>
          <button type="button" onClick={() => ctx.goTo('elements')}>
            🧵 Design elements <small>{counts.elements}</small>
          </button>
          <button type="button" onClick={() => ctx.goTo('management')}>
            📊 Brief &amp; costing
          </button>
          <button type="button" onClick={() => ctx.goTo('assistant')}>
            ✨ Ask the assistant
          </button>
        </div>
      </section>

      <section className="cn-section">
        <h3 className="hand">recent activity</h3>
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
  );
}
