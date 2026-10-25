'use client';

import { useState } from 'react';
import { mediaUrl } from '@/lib/upload-client';
import { PinterestEmbed, usePinterest } from '@/components/home/LookGrid';
import { FileButton, Status, uploadCorner, useAction, type Ctx } from './shared';

type Mode = 'image' | 'link' | 'pinterest' | 'note';
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
};

/** Inspiration drops: images, links, Pinterest pins and boards, and short notes, as a gallery. */
export default function Inspiration({ ctx }: { ctx: Ctx }) {
  const drops = ctx.items.filter((i) => i.kind === 'drop').reverse();
  const [mode, setMode] = useState<Mode>('image');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const { busy, err, ok, run } = useAction();
  usePinterest([drops.map((d) => d.id).join(',')]);

  const reset = () => {
    setUrl('');
    setNote('');
  };
  const addLink = () => run('Saving…', async () => (await ctx.add({ kind: 'drop', drop: mode, url, note }), reset()), 'Saved ✓');

  return (
    <div className="cn-panel">
      <div className="cn-adder">
        <div className="cn-seg" role="tablist" aria-label="Add">
          {(
            [
              ['image', '🖼 Image'],
              ['link', '🔗 Link'],
              ['pinterest', '📌 Pinterest'],
              ['note', '📝 Note'],
            ] as const
          ).map(([m, label]) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>
              {label}
            </button>
          ))}
        </div>
        {mode === 'image' && (
          <div className="cn-row">
            <input className="h-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="A note about it (optional)" aria-label="Note" />
            <FileButton
              label={busy || 'Choose image'}
              accept="image/*"
              disabled={Boolean(busy)}
              onFile={(f) =>
                run(
                  'Uploading…',
                  async () => {
                    const mediaId = await uploadCorner(f);
                    await ctx.add({ kind: 'drop', drop: 'image', mediaId, note });
                    reset();
                  },
                  'Added ✓',
                )
              }
            />
          </div>
        )}
        {(mode === 'link' || mode === 'pinterest') && (
          <form
            className="cn-row"
            onSubmit={(e) => {
              e.preventDefault();
              addLink();
            }}
          >
            <input
              className="h-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              inputMode="url"
              placeholder={mode === 'pinterest' ? 'Paste a Pinterest pin or board link' : 'https://…'}
              aria-label="Link"
              required
            />
            <input className="h-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Why it matters (optional)" aria-label="Note" />
            <button className="cn-btn primary" disabled={Boolean(busy) || !url.trim()}>
              {busy || 'Save'}
            </button>
          </form>
        )}
        {mode === 'note' && (
          <form
            className="cn-row"
            onSubmit={(e) => {
              e.preventDefault();
              run('Saving…', async () => (await ctx.add({ kind: 'drop', drop: 'note', note }), reset()), 'Saved ✓');
            }}
          >
            <textarea className="h-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="A thought, a reference, a feeling" aria-label="Note" required />
            <button className="cn-btn primary" disabled={Boolean(busy) || !note.trim()}>
              {busy || 'Save'}
            </button>
          </form>
        )}
        <Status err={err} ok={ok} />
      </div>

      {!drops.length && <p className="cn-empty-note">Nothing saved yet. Drop in anything that sparks the idea.</p>}
      <div className="cn-gallery">
        {drops.map((d) => {
          if (d.kind !== 'drop') return null;
          return (
            <article key={d.id} className={`cn-drop cn-drop-${d.drop}`}>
              {d.drop === 'image' && <img src={mediaUrl(d.mediaId)} alt={d.note || 'Inspiration'} loading="lazy" />}
              {d.drop === 'pinterest' && <PinterestEmbed url={d.url} board={!/\/pin\//.test(d.url)} />}
              {d.drop === 'link' && (
                <a className="cn-link" href={d.url} target="_blank" rel="noreferrer">
                  <span aria-hidden="true">🔗</span>
                  <b>{host(d.url)}</b>
                  <small>{d.url}</small>
                </a>
              )}
              {d.note && <p className={d.drop === 'note' ? 'hand cn-note' : 'cn-caption'}>{d.note}</p>}
              <button type="button" className="cn-x" onClick={() => run('Removing…', () => ctx.removeItem(d.id))} aria-label="Remove">
                ×
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
