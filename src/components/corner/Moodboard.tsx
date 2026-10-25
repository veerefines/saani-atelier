'use client';

import { useEffect, useState } from 'react';
import type { Item } from '@/lib/corner-model';
import { mediaUrl } from '@/lib/upload-client';
import { FileButton, Status, uploadCorner, useAction, type Ctx } from './shared';

type Board = Extract<Item, { kind: 'board' }>;

function Piece({ it, i, n, move, remove }: { it: Board; i: number; n: number; move: (from: number, to: number) => void; remove: () => void }) {
  return (
    <div className={`cn-piece cn-piece-${it.board}`}>
      {it.board === 'image' && <img src={mediaUrl(it.mediaId)} alt={it.caption || 'Moodboard image'} draggable={false} />}
      {it.board === 'note' && <p className="hand">{it.text}</p>}
      {it.board === 'swatch' && (
        <span className="cn-swatch" style={{ background: it.hex }}>
          <b>{it.label || it.hex.toUpperCase()}</b>
          {it.label && <small>{it.hex.toUpperCase()}</small>}
        </span>
      )}
      {it.board === 'image' && it.caption && <small className="cn-caption">{it.caption}</small>}
      {/* buttons as well as dragging, for touch screens and keyboards */}
      <div className="cn-piece-tools">
        <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move earlier">
          ←
        </button>
        <button type="button" onClick={() => move(i, i + 1)} disabled={i === n - 1} aria-label="Move later">
          →
        </button>
        <button type="button" onClick={remove} aria-label="Remove">
          ×
        </button>
      </div>
    </div>
  );
}

/** Moodboard: images, notes and colour swatches, arranged by dragging (or the arrows). Saved as she goes. */
export default function Moodboard({ ctx }: { ctx: Ctx }) {
  const fromServer = ctx.items.filter((i): i is Board => i.kind === 'board');
  const [order, setOrder] = useState<Board[]>(fromServer);
  const [text, setText] = useState('');
  const [hex, setHex] = useState('#f4a6c0');
  const [label, setLabel] = useState('');
  const { busy, err, ok, run } = useAction();
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  // keep in step with additions and removals
  useEffect(() => {
    setOrder((cur) => {
      const ids = new Set(fromServer.map((b) => b.id));
      const kept = cur.filter((b) => ids.has(b.id)).map((b) => fromServer.find((x) => x.id === b.id)!);
      const added = fromServer.filter((b) => !cur.some((c) => c.id === b.id));
      return [...kept, ...added];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromServer.map((b) => `${b.id}:${b.updatedAt}`).join(',')]);

  const save = (next: Board[]) => run('', () => ctx.reorder(next.map((b) => b.id)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [b] = next.splice(from, 1);
    next.splice(to, 0, b);
    setOrder(next);
    save(next);
  };

  return (
    <div className="cn-panel">
      <div className="cn-adder cn-board-add">
        <FileButton
          label={busy === 'Uploading…' ? busy : '🖼 Add image'}
          accept="image/*"
          disabled={Boolean(busy)}
          onFile={(f) =>
            run('Uploading…', async () => {
              const mediaId = await uploadCorner(f);
              await ctx.add({ kind: 'board', board: 'image', mediaId });
            })
          }
        />
        <form
          className="cn-row"
          onSubmit={(e) => {
            e.preventDefault();
            run('Adding…', async () => (await ctx.add({ kind: 'board', board: 'note', text }), setText('')));
          }}
        >
          <input className="h-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="📝 A note for the board" aria-label="Note" />
          <button className="pc-btn" disabled={Boolean(busy) || !text.trim()}>
            Add note
          </button>
        </form>
        <form
          className="cn-row"
          onSubmit={(e) => {
            e.preventDefault();
            run('Adding…', async () => (await ctx.add({ kind: 'board', board: 'swatch', hex, label }), setLabel('')));
          }}
        >
          <input type="color" className="cn-color" value={hex} onChange={(e) => setHex(e.target.value)} aria-label="Colour" />
          <input className="h-input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="Name it (optional), e.g. Navigli rose" aria-label="Colour name" />
          <button className="pc-btn" disabled={Boolean(busy)}>
            Add swatch
          </button>
        </form>
        <Status err={err} ok={ok} />
      </div>

      {!order.length ? (
        <p className="cn-empty-note">An empty board. Add images, notes and colours, then drag them into place.</p>
      ) : (
        <>
          <p className="cn-hint">Drag to arrange, or use the arrows. Your order saves automatically.</p>
          <div className="cn-board">
            {order.map((b, i) => (
              <div
                key={b.id}
                className={`cn-board-item${dragging === i ? ' dragging' : ''}${over === i && dragging !== i ? ' over' : ''}`}
                draggable
                onDragStart={(e) => {
                  setDragging(i);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(i);
                }}
                onDragLeave={() => setOver((o) => (o === i ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging !== null) move(dragging, i);
                  setDragging(null);
                  setOver(null);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
              >
                <Piece it={b} i={i} n={order.length} move={move} remove={() => run('Removing…', () => ctx.removeItem(b.id))} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
