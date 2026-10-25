'use client';

import { useState } from 'react';
import type { Item, Project } from '@/lib/corner-model';
import { api } from '@/lib/upload-client';
import { CATEGORY_LOOK, edited } from './CornerHome';
import type { Ctx, Tab } from './shared';
import Overview from './Overview';
import Documents from './Documents';
import Inspiration from './Inspiration';
import Moodboard from './Moodboard';
import Elements from './Elements';
import Management from './Management';
import Assistant from './Assistant';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'inspiration', label: 'Inspiration' },
  { id: 'moodboard', label: 'Moodboard' },
  { id: 'elements', label: 'Design elements' },
  { id: 'management', label: 'Fashion management' },
  { id: 'assistant', label: '✨ Assistant' },
];

/** One project's workspace: its tabs share the project and its items, and save straight to the server. */
export default function Workspace({ initial, aiReady }: { initial: { project: Project; items: Item[] }; aiReady: boolean }) {
  const [project, setProject] = useState(initial.project);
  const [items, setItems] = useState(initial.items);
  const [tab, setTab] = useState<Tab>('overview');
  const base = `/api/corner/projects/${project.id}`;
  const bump = () => setProject((p) => ({ ...p, updatedAt: new Date().toISOString() }));

  const ctx: Ctx = {
    project,
    items,
    add: async (body) => {
      const it = await api<Item>(`${base}/items`, 'POST', body);
      setItems((l) => [...l, it]);
      bump();
      return it;
    },
    patchItem: async (id, body) => {
      const it = await api<Item>(`${base}/items/${id}`, 'PATCH', body);
      setItems((l) => l.map((x) => (x.id === id ? it : x)));
      bump();
    },
    removeItem: async (id) => {
      await api(`${base}/items/${id}`, 'DELETE');
      setItems((l) => l.filter((x) => x.id !== id));
      bump();
    },
    reorder: async (ids) => {
      await api(`${base}/items/reorder`, 'POST', { ids });
      setItems((l) => l.map((x) => (ids.includes(x.id) ? { ...x, order: ids.indexOf(x.id) } : x)));
      bump();
    },
    patchProject: async (body) => setProject(await api<Project>(base, 'PATCH', body)),
    goTo: (t) => {
      setTab(t);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  };

  const look = CATEGORY_LOOK[project.category];
  return (
    <>
      <header className="cn-head">
        <span className="cn-chip" style={{ ['--tint' as string]: look.tint }}>
          {look.emoji} {project.category}
        </span>
        <h1 className="whisper cn-h1">{project.title}</h1>
        <small>
          {edited(project.updatedAt)}
          {project.favourite ? ' · ♥ favourite' : ''}
          {project.archived ? ' · archived' : ''}
        </small>
      </header>
      <nav className="cn-tabs" role="tablist" aria-label="Project sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'overview' && <Overview ctx={ctx} />}
      {tab === 'documents' && <Documents ctx={ctx} />}
      {tab === 'inspiration' && <Inspiration ctx={ctx} />}
      {tab === 'moodboard' && <Moodboard ctx={ctx} />}
      {tab === 'elements' && <Elements ctx={ctx} />}
      {tab === 'management' && <Management ctx={ctx} />}
      {tab === 'assistant' && <Assistant ctx={ctx} ready={aiReady} />}
    </>
  );
}
