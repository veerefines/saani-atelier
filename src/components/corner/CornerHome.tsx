'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATEGORIES, type Category, type Project } from '@/lib/corner-model';
import { api, mediaUrl } from '@/lib/upload-client';
import { sfx } from '@/lib/sound';

export const CATEGORY_LOOK: Record<Category, { emoji: string; tint: string }> = {
  'Fashion Collection': { emoji: '👗', tint: '#fbd6e2' },
  'Brand Strategy': { emoji: '🏷️', tint: '#e6dcf7' },
  'Fashion Research': { emoji: '🔎', tint: '#d3e9f6' },
  'Marketing Campaign': { emoji: '📣', tint: '#ffe0c4' },
  'University Assignment': { emoji: '🎓', tint: '#d4efdf' },
  'Personal Inspiration': { emoji: '✨', tint: '#fff1c7' },
};

export function edited(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'edited just now';
  if (m < 60) return `edited ${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `edited ${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `edited ${d}d ago`;
  return `edited ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

function CreateForm({ onDone, onCancel }: { onDone: (p: Project) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Fashion Collection');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="cn-dialog" role="dialog" aria-modal="true" aria-label="New project" onClick={onCancel}>
      <form
        className="cn-create"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr('');
          try {
            onDone(await api<Project>('/api/corner/projects', 'POST', { title, description, category }));
          } catch (x) {
            sfx('nope');
            setErr((x as Error).message);
            setBusy(false);
          }
        }}
      >
        <h2 className="cn-h2">New project</h2>
        <label>
          <span>Title</span>
          <input className="h-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. SS27 capsule: Navigli at dusk" autoFocus required />
        </label>
        <label>
          <span>Description</span>
          <textarea className="h-input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} placeholder="What is it, and what should it become?" />
        </label>
        <div className="cn-cats" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={category === c} onClick={() => setCategory(c)} style={{ ['--tint' as string]: CATEGORY_LOOK[c].tint }}>
              {CATEGORY_LOOK[c].emoji} {c}
            </button>
          ))}
        </div>
        {err && <p className="h-err">{err}</p>}
        <div className="cn-row">
          <button className="cn-btn primary" disabled={busy || !title.trim()}>
            {busy ? 'Creating…' : 'Create project'}
          </button>
          <button type="button" className="cn-btn ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Card({ p, onChange, onRemove, onCopy }: { p: Project; onChange: (p: Project) => void; onRemove: (id: string) => void; onCopy: (p: Project) => void }) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(p.title);
  const [err, setErr] = useState('');
  const box = useRef<HTMLElement>(null);
  const look = CATEGORY_LOOK[p.category];
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => (e instanceof KeyboardEvent ? e.key === 'Escape' && setMenu(false) : !box.current?.contains(e.target as Node) && setMenu(false));
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
    };
  }, [menu]);
  const patch = async (body: Record<string, unknown>) => {
    setErr('');
    try {
      onChange(await api<Project>(`/api/corner/projects/${p.id}`, 'PATCH', body));
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
  };
  const act = async (fn: () => Promise<void>) => {
    setMenu(false);
    setErr('');
    try {
      await fn();
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
  };
  return (
    <article ref={box} className={`cn-card${p.archived ? ' archived' : ''}`}>
      <Link href={`/home/corner/${p.id}`} className="cn-cover" style={{ ['--tint' as string]: look.tint }} aria-label={`Open ${p.title}`}>
        {p.coverMediaId ? <img src={mediaUrl(p.coverMediaId)} alt="" loading="lazy" /> : <span aria-hidden="true">{look.emoji}</span>}
        {p.favourite && (
          <i className="cn-fav" aria-label="Favourite">
            ♥
          </i>
        )}
        <span className="cn-chip cn-cover-chip" style={{ ['--tint' as string]: look.tint }}>
          {look.emoji} {p.category}
        </span>
      </Link>
      <div className="cn-body">
        {renaming ? (
          <form
            className="cn-rename"
            onSubmit={async (e) => {
              e.preventDefault();
              await patch({ title });
              setRenaming(false);
            }}
          >
            <input className="h-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus aria-label="Project title" />
            <button className="cn-btn primary">Save</button>
          </form>
        ) : (
          <Link href={`/home/corner/${p.id}`} className="cn-title">
            {p.title}
          </Link>
        )}
        {p.description && <p className="cn-desc">{p.description}</p>}
        <p className="cn-meta">
          <small>{edited(p.updatedAt)}</small>
          {p.archived && <small>· archived</small>}
        </p>
        {err && <p className="h-err">{err}</p>}
      </div>
      <button type="button" className="cn-more" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={`More for ${p.title}`}>
        ⋯
      </button>
      {menu && (
        <div className="cn-menu" role="menu">
          <button role="menuitem" onClick={() => (setMenu(false), setRenaming(true))}>
            ✎ Rename
          </button>
          <button role="menuitem" onClick={() => act(async () => onCopy(await api<Project>(`/api/corner/projects/${p.id}/duplicate`, 'POST')))}>
            ⧉ Duplicate
          </button>
          <button role="menuitem" onClick={() => act(() => patch({ favourite: !p.favourite }))}>
            {p.favourite ? '♡ Unfavourite' : '♥ Favourite'}
          </button>
          <button role="menuitem" onClick={() => act(() => patch({ archived: !p.archived }))}>
            {p.archived ? '↩ Unarchive' : '🗄 Archive'}
          </button>
          <button
            role="menuitem"
            className="danger"
            onClick={() =>
              act(async () => {
                if (!confirm(`Delete “${p.title}” and everything in it? This can’t be undone.`)) return;
                sfx('paper');
                await api(`/api/corner/projects/${p.id}`, 'DELETE');
                onRemove(p.id);
              })
            }
          >
            🗑 Delete
          </button>
        </div>
      )}
    </article>
  );
}

type Filter = 'all' | 'favourites' | 'archived';

/** My Corner's front page: her projects, a search, and a way to start something new. */
export default function CornerHome({ initial }: { initial: Project[] }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list
      .filter((p) => (filter === 'archived' ? p.archived : !p.archived && (filter === 'all' || p.favourite)))
      .filter((p) => !needle || p.title.toLowerCase().includes(needle))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [list, q, filter]);
  const recent = useMemo(
    () =>
      [...list]
        .filter((p) => !p.archived)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 3),
    [list],
  );

  const change = (p: Project) => setList((l) => l.map((x) => (x.id === p.id ? p : x)));
  const remove = (id: string) => setList((l) => l.filter((x) => x.id !== id));
  const copy = (p: Project) => setList((l) => [p, ...l]);

  return (
    <>
      <div className="cn-tools">
        <button type="button" className="cn-btn primary" onClick={() => setCreating(true)}>
          + Create New Project
        </button>
        <input className="h-input cn-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects by title" aria-label="Search projects by title" />
      </div>
      {creating && createPortal(<CreateForm onCancel={() => setCreating(false)} onDone={(p) => router.push(`/home/corner/${p.id}`)} />, document.body)}

      {list.length === 0 && !creating && (
        <div className="cn-empty">
          <p className="hand">your first project starts here</p>
          <p className="whisper">A collection, a brand idea, a research project or an assignment. Everything for it lives in one place.</p>
        </div>
      )}

      {recent.length > 0 && !q && filter === 'all' && (
        <section className="cn-recent" aria-label="Recently edited">
          <h2 className="cn-label">Recently edited</h2>
          <div className="cn-recent-row">
            {recent.map((p) => (
              <Link key={p.id} href={`/home/corner/${p.id}`} className="cn-recent-item" style={{ ['--tint' as string]: CATEGORY_LOOK[p.category].tint }}>
                <span aria-hidden="true">{CATEGORY_LOOK[p.category].emoji}</span>
                <b>{p.title}</b>
                <small>{edited(p.updatedAt)}</small>
              </Link>
            ))}
          </div>
        </section>
      )}

      {list.length > 0 && (
        <div className="cn-filters" role="tablist" aria-label="Show">
          {(
            [
              ['all', 'All projects'],
              ['favourites', '♥ Favourites'],
              ['archived', '🗄 Archived'],
            ] as const
          ).map(([f, label]) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
              {label}
            </button>
          ))}
        </div>
      )}
      {list.length > 0 && !shown.length && (
        <p className="h-empty whisper">{q ? `No projects called “${q}”.` : filter === 'archived' ? 'Nothing archived.' : 'No favourites yet. Tap ⋯ on a project to add one.'}</p>
      )}
      <div className="cn-grid">
        {shown.map((p) => (
          <Card key={p.id} p={p} onChange={change} onRemove={remove} onCopy={copy} />
        ))}
      </div>
    </>
  );
}
