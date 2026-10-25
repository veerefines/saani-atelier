'use client';

import { useState } from 'react';
import { inkOn, isHex } from '@/lib/corner-model';
import { mediaUrl } from '@/lib/upload-client';
import { FileButton, Status, uploadCorner, useAction, type Ctx } from './shared';

/** Names that are safe to show in their own font without loading anything (system and web-safe fonts). */
const LOCAL_FONTS = [
  'georgia',
  'times new roman',
  'garamond',
  'helvetica',
  'arial',
  'futura',
  'didot',
  'bodoni',
  'baskerville',
  'avenir',
  'gill sans',
  'palatino',
  'verdana',
  'courier',
  'optima',
  'hoefler text',
];

function Palettes({ ctx }: { ctx: Ctx }) {
  const palettes = ctx.items.filter((i) => i.kind === 'palette');
  const [name, setName] = useState('');
  const [hexes, setHexes] = useState<string[]>(['#f4a6c0', '#e6dcf7']);
  const [pick, setPick] = useState('#6b1e3a');
  const [copied, setCopied] = useState('');
  const { busy, err, ok, run } = useAction();
  const copy = async (h: string) => {
    try {
      await navigator.clipboard.writeText(h.toUpperCase());
      setCopied(h);
      setTimeout(() => setCopied(''), 1200);
    } catch {}
  };
  return (
    <section className="cn-section">
      <h3 className="cn-h">Colour palettes</h3>
      <form
        className="cn-adder"
        onSubmit={(e) => {
          e.preventDefault();
          run('Saving…', async () => (await ctx.add({ kind: 'palette', name, hexes }), setName('')), 'Palette saved ✓');
        }}
      >
        <input className="h-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Palette name, e.g. Navigli at dusk" aria-label="Palette name" required />
        <div className="cn-hexes">
          {hexes.map((h, i) => (
            <span key={`${h}${i}`} className="cn-hex" style={{ background: h, ...inkOn(h) }}>
              <b>{h.toUpperCase()}</b>
              <button type="button" onClick={() => setHexes(hexes.filter((_, k) => k !== i))} aria-label={`Remove ${h}`}>
                ×
              </button>
            </span>
          ))}
          {hexes.length < 12 && (
            <span className="cn-hex-add">
              <input type="color" className="cn-color" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Pick a colour" />
              <input className="h-input" value={pick} onChange={(e) => setPick(e.target.value)} maxLength={7} aria-label="HEX value" />
              <button type="button" className="cn-btn" disabled={!isHex(pick)} onClick={() => setHexes([...hexes, pick.toLowerCase()])}>
                + Add
              </button>
            </span>
          )}
        </div>
        <button className="cn-btn primary" disabled={Boolean(busy) || !name.trim() || !hexes.length}>
          {busy || 'Save palette'}
        </button>
        <Status err={err} ok={ok} />
      </form>
      {palettes.map((p) =>
        p.kind !== 'palette' ? null : (
          <div key={p.id} className="cn-palette">
            <div className="cn-palette-head">
              <b>{p.name}</b>
              <button type="button" className="w-link" onClick={() => run('Removing…', () => ctx.removeItem(p.id))}>
                Remove
              </button>
            </div>
            <div className="cn-chips">
              {p.hexes.map((h, i) => (
                <button key={`${h}${i}`} type="button" className="cn-chipswatch" style={{ background: h, ...inkOn(h) }} onClick={() => copy(h)} aria-label={`Copy ${h}`}>
                  <span>{copied === h ? 'copied' : h.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        ),
      )}
    </section>
  );
}

function Typography({ ctx }: { ctx: Ctx }) {
  const types = ctx.items.filter((i) => i.kind === 'type');
  const [font, setFont] = useState('');
  const [note, setNote] = useState('');
  const { busy, err, ok, run } = useAction();
  return (
    <section className="cn-section">
      <h3 className="cn-h">Typography</h3>
      <form
        className="cn-row"
        onSubmit={(e) => {
          e.preventDefault();
          run('Saving…', async () => (await ctx.add({ kind: 'type', font, note }), setFont(''), setNote('')), 'Saved ✓');
        }}
      >
        <input className="h-input" value={font} onChange={(e) => setFont(e.target.value)} maxLength={60} placeholder="Font name, e.g. Didot" aria-label="Font name" required />
        <input className="h-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Where it's used, why it fits" aria-label="Note" />
        <button className="cn-btn primary" disabled={Boolean(busy) || !font.trim()}>
          {busy || 'Save'}
        </button>
      </form>
      <Status err={err} ok={ok} />
      <div className="cn-types">
        {types.map((t) =>
          t.kind !== 'type' ? null : (
            <div key={t.id} className="cn-type">
              <p className="cn-type-sample" style={LOCAL_FONTS.includes(t.font.toLowerCase()) ? { fontFamily: `"${t.font}", serif` } : undefined}>
                {t.font}
              </p>
              {t.note && <small>{t.note}</small>}
              <button type="button" className="cn-x" onClick={() => run('Removing…', () => ctx.removeItem(t.id))} aria-label={`Remove ${t.font}`}>
                ×
              </button>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function Fabrics({ ctx }: { ctx: Ctx }) {
  const fabrics = ctx.items.filter((i) => i.kind === 'fabric');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const { busy, err, ok, run } = useAction();
  return (
    <section className="cn-section">
      <h3 className="cn-h">Fabrics &amp; materials</h3>
      <form
        className="cn-adder"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            'Saving…',
            async () => {
              const mediaId = file ? await uploadCorner(file) : undefined;
              await ctx.add({ kind: 'fabric', name, description, ...(mediaId ? { mediaId } : {}) });
              setName('');
              setDescription('');
              setFile(null);
            },
            'Saved ✓',
          );
        }}
      >
        <input className="h-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Name, e.g. Washed silk crepe de chine" aria-label="Fabric name" required />
        <textarea
          className="h-input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          placeholder="Weight, hand-feel, supplier, price per metre…"
          aria-label="Description"
        />
        <div className="cn-row">
          <FileButton label={file ? `📷 ${file.name.slice(0, 24)}` : '📷 Add a photo (optional)'} accept="image/*" disabled={Boolean(busy)} onFile={setFile} />
          <button className="cn-btn primary" disabled={Boolean(busy) || !name.trim()}>
            {busy || 'Save fabric'}
          </button>
        </div>
        <Status err={err} ok={ok} />
      </form>
      <div className="cn-fabrics">
        {fabrics.map((f) =>
          f.kind !== 'fabric' ? null : (
            <article key={f.id} className="cn-fabric">
              {f.mediaId ? (
                <img src={mediaUrl(f.mediaId)} alt={f.name} loading="lazy" />
              ) : (
                <span className="cn-fabric-ph" aria-hidden="true">
                  🧵
                </span>
              )}
              <b>{f.name}</b>
              {f.description && <small>{f.description}</small>}
              <button type="button" className="cn-x" onClick={() => run('Removing…', () => ctx.removeItem(f.id))} aria-label={`Remove ${f.name}`}>
                ×
              </button>
            </article>
          ),
        )}
      </div>
    </section>
  );
}

/** Design elements: named palettes, typography references, and fabrics. */
export default function Elements({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cn-panel cn-elements">
      <Palettes ctx={ctx} />
      <div className="cn-two">
        <Typography ctx={ctx} />
        <Fabrics ctx={ctx} />
      </div>
    </div>
  );
}
