import * as db from './db';
import { deleteMedia, getMedia } from './data';
import type { Session } from './session';
import { CATEGORIES, isHex, type Brief, type Category, type Chat, type ChatTurn, type Costing, type Item, type NewItem, type Project } from './corner-model';

export * from './corner-model';

/**
 * My Corner: Saanika's private fashion and project workspace.
 * Projects and everything inside them live in two doc-store collections; every item belongs to one
 * project. Swap this file to move storage elsewhere — the API routes and UI only use these functions.
 */

const P = 'cornerProjects';
const I = 'cornerItems';
const C = 'cornerChats';
const now = () => new Date().toISOString();
const EMPTY_BRIEF: Brief = { audience: '', positioning: '', objectives: '', budget: '' };
const EMPTY_COSTING: Costing = { fabric: 0, labour: 0, trims: 0, other: 0, sellingPrice: 0 };

/* ---------- validation helpers (shared by the API routes) ---------- */

export function cleanUrl(u: unknown): string | null {
  try {
    const url = new URL(String(u ?? '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
export const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const money = (v: unknown) => {
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : null;
};

/** A media id she uploaded and finished uploading, or null. */
export async function ownMedia(s: Session, id: unknown) {
  const m = await getMedia(String(id ?? ''));
  return m && m.ready && m.ownerId === s.id ? m : null;
}

/* ---------- projects ---------- */

export const listProjects = async () => (await db.list<Project>(P)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export const getProject = (id: string) => db.get<Project>(P, id);

export async function createProject(p: { title: string; description: string; category: Category }) {
  const at = now();
  return db.put<Project>(P, { id: db.newId('pr_'), createdAt: at, updatedAt: at, ...p, favourite: false, archived: false, brief: { ...EMPTY_BRIEF }, costing: { ...EMPTY_COSTING } });
}

export type ProjectPatch = Partial<Pick<Project, 'title' | 'description' | 'category' | 'favourite' | 'archived' | 'coverMediaId'>> & { brief?: Partial<Brief>; costing?: Partial<Costing> };

/** Checks and cleans a change from the browser; returns an error message, or the clean patch. */
export function cleanPatch(raw: Record<string, unknown>): string | ProjectPatch {
  const out: ProjectPatch = {};
  if ('title' in raw) {
    const t = text(raw.title, 80);
    if (!t) return 'Give the project a title.';
    out.title = t;
  }
  if ('description' in raw) out.description = text(raw.description, 1000);
  if ('category' in raw) {
    if (!CATEGORIES.includes(raw.category as Category)) return 'Pick one of the categories.';
    out.category = raw.category as Category;
  }
  if ('favourite' in raw) out.favourite = Boolean(raw.favourite);
  if ('archived' in raw) out.archived = Boolean(raw.archived);
  if ('brief' in raw) {
    const b = (raw.brief ?? {}) as Record<string, unknown>;
    out.brief = {};
    for (const k of ['audience', 'positioning', 'objectives', 'budget'] as const) if (k in b) out.brief[k] = text(b[k], 2000);
  }
  if ('costing' in raw) {
    const c = (raw.costing ?? {}) as Record<string, unknown>;
    out.costing = {};
    for (const k of ['fabric', 'labour', 'trims', 'other', 'sellingPrice'] as const) {
      if (!(k in c)) continue;
      const n = money(c[k]);
      if (n === null) return 'Costs and prices are amounts from 0 upwards.';
      out.costing[k] = n;
    }
  }
  return out;
}

export async function updateProject(id: string, patch: ProjectPatch) {
  return db.update<Project>(P, id, (p) => ({
    ...p,
    ...patch,
    brief: { ...p.brief, ...(patch.brief ?? {}) },
    costing: { ...p.costing, ...(patch.costing ?? {}) },
    updatedAt: now(),
  }));
}

const touch = (id: string) => db.update<Project>(P, id, (p) => ({ ...p, updatedAt: now() }));

/** Files are only deleted once nothing in My Corner points at them any more (duplicates share files). */
async function dropFilesIfUnused(ids: (string | undefined)[]) {
  const wanted = ids.filter(Boolean) as string[];
  if (!wanted.length) return;
  const [projects, items] = await Promise.all([db.list<Project>(P), db.list<Item>(I)]);
  const inUse = new Set<string>([...projects.map((p) => p.coverMediaId), ...items.map((i) => ('mediaId' in i ? i.mediaId : undefined))].filter(Boolean) as string[]);
  for (const m of wanted) if (!inUse.has(m)) await deleteMedia(m).catch(() => {});
}

export async function deleteProject(id: string) {
  const p = await getProject(id);
  if (!p) return false;
  const items = await listItems(id);
  for (const it of items) await db.remove(I, it.id);
  for (const c of await listChats(id)) await db.remove(C, c.id);
  await db.remove(P, id);
  await dropFilesIfUnused([p.coverMediaId, ...items.map((i) => ('mediaId' in i ? i.mediaId : undefined))]);
  return true;
}

export async function duplicateProject(id: string) {
  const p = await getProject(id);
  if (!p) return null;
  const at = now();
  const copy = await db.put<Project>(P, { ...p, id: db.newId('pr_'), title: `${p.title} (copy)`.slice(0, 80), favourite: false, archived: false, createdAt: at, updatedAt: at });
  for (const it of await listItems(id)) await db.put<Item>(I, { ...it, id: db.newId('ci_'), projectId: copy.id, createdAt: at, updatedAt: at });
  return copy;
}

/* ---------- items ---------- */

export const listItems = async (projectId: string) => (await db.list<Item>(I)).filter((i) => i.projectId === projectId).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
export const getItem = (id: string) => db.get<Item>(I, id);
/** Every item and every saved chat, across all projects (for Jelly's achievements). */
export const listAllItems = () => db.list<Item>(I);
export const listAllChats = () => db.list<Chat>(C);

export async function addItem(projectId: string, item: NewItem) {
  const existing = await listItems(projectId);
  const at = now();
  const order = existing.filter((i) => i.kind === item.kind).reduce((m, i) => Math.max(m, i.order), -1) + 1;
  const saved = await db.put<Item>(I, { ...(item as Item), id: db.newId('ci_'), projectId, order, createdAt: at, updatedAt: at });
  await touch(projectId);
  return saved;
}

export async function updateItem(id: string, fields: Record<string, unknown>) {
  const it = await db.update<Item>(I, id, (i) => ({ ...i, ...fields, updatedAt: now() }) as Item);
  if (it) await touch(it.projectId);
  return it;
}

export async function deleteItem(id: string) {
  const it = await getItem(id);
  if (!it) return false;
  await db.remove(I, id);
  await touch(it.projectId);
  await dropFilesIfUnused(['mediaId' in it ? it.mediaId : undefined]);
  return true;
}

/** New order for one kind of item (the moodboard): ids in the order she arranged them. */
export async function reorderItems(projectId: string, ids: string[]) {
  const items = await listItems(projectId);
  const known = new Set(items.map((i) => i.id));
  if (ids.some((id) => !known.has(id))) return false;
  for (const [order, id] of ids.entries()) await db.update<Item>(I, id, (i) => ({ ...i, order }));
  await touch(projectId);
  return true;
}

/* ---------- checking new items ---------- */

const DOC_MIMES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'];

/** Checks a new item from the browser; returns an error message, or the item to save. */
export async function cleanItem(s: Session, raw: Record<string, unknown>, pinterest: (u: string) => Promise<{ url: string } | null>): Promise<string | NewItem> {
  const image = async (id: unknown) => {
    const m = await ownMedia(s, id);
    return m && m.mime.startsWith('image/') ? m : null;
  };
  switch (raw.kind) {
    case 'doc': {
      const m = await ownMedia(s, raw.mediaId);
      if (!m || !m.private || !DOC_MIMES.includes(m.mime)) return 'Upload a PDF, DOCX, PPTX or TXT file first.';
      return { kind: 'doc', mediaId: m.id, filename: m.filename || 'document', mime: m.mime, size: m.size };
    }
    case 'drop': {
      const note = text(raw.note, 1000) || undefined;
      if (raw.drop === 'image') {
        const m = await image(raw.mediaId);
        return m ? { kind: 'drop', drop: 'image', mediaId: m.id, note } : 'Upload the image first.';
      }
      if (raw.drop === 'link' || raw.drop === 'pinterest') {
        const url = cleanUrl(raw.url);
        if (!url) return 'Paste a full link, starting with https://';
        if (raw.drop === 'pinterest') {
          const pin = await pinterest(url);
          if (!pin) return 'That doesn’t look like a Pinterest pin or board link.';
          return { kind: 'drop', drop: 'pinterest', url: pin.url, note };
        }
        return { kind: 'drop', drop: 'link', url, note };
      }
      if (raw.drop === 'note') return note ? { kind: 'drop', drop: 'note', note } : 'Write a note first.';
      return 'Choose an image, a link, a Pinterest pin or a note.';
    }
    case 'board': {
      if (raw.board === 'image') {
        const m = await image(raw.mediaId);
        return m ? { kind: 'board', board: 'image', mediaId: m.id, caption: text(raw.caption, 200) || undefined } : 'Upload the image first.';
      }
      if (raw.board === 'note') {
        const t = text(raw.text, 500);
        return t ? { kind: 'board', board: 'note', text: t } : 'Write the note first.';
      }
      if (raw.board === 'swatch') return isHex(raw.hex) ? { kind: 'board', board: 'swatch', hex: raw.hex.toLowerCase(), label: text(raw.label, 40) || undefined } : 'Pick a colour (like #F4A6C0).';
      return 'Add an image, a note or a colour swatch.';
    }
    case 'palette': {
      const name = text(raw.name, 60);
      const hexes = Array.isArray(raw.hexes) ? raw.hexes : [];
      if (!name) return 'Give the palette a name.';
      if (!hexes.length || hexes.length > 12 || !hexes.every(isHex)) return 'Add 1 to 12 colours as HEX values (like #F4A6C0).';
      return { kind: 'palette', name, hexes: hexes.map((h: string) => h.toLowerCase()) };
    }
    case 'type': {
      const font = text(raw.font, 60);
      return font ? { kind: 'type', font, note: text(raw.note, 500) || undefined } : 'Add the font’s name.';
    }
    case 'fabric': {
      const name = text(raw.name, 80);
      if (!name) return 'Give the fabric a name.';
      let mediaId: string | undefined;
      if (raw.mediaId) {
        const m = await image(raw.mediaId);
        if (!m) return 'Upload the fabric photo first.';
        mediaId = m.id;
      }
      return { kind: 'fabric', name, description: text(raw.description, 1000) || undefined, mediaId };
    }
    default:
      return 'Unknown kind of item.';
  }
}

/** Fields an existing item may change (its kind and files stay put). */
export function cleanItemEdit(it: Item, raw: Record<string, unknown>): string | Record<string, unknown> {
  const out: Record<string, unknown> = {};
  switch (it.kind) {
    case 'drop':
      if ('note' in raw) out.note = text(raw.note, 1000) || undefined;
      break;
    case 'board':
      if (it.board === 'note' && 'text' in raw) {
        const t = text(raw.text, 500);
        if (!t) return 'The note can’t be empty.';
        out.text = t;
      }
      if (it.board === 'image' && 'caption' in raw) out.caption = text(raw.caption, 200) || undefined;
      if (it.board === 'swatch' && 'label' in raw) out.label = text(raw.label, 40) || undefined;
      break;
    case 'palette':
      if ('name' in raw) {
        const n = text(raw.name, 60);
        if (!n) return 'Give the palette a name.';
        out.name = n;
      }
      if ('hexes' in raw) {
        const h = Array.isArray(raw.hexes) ? raw.hexes : [];
        if (!h.length || h.length > 12 || !h.every(isHex)) return 'Add 1 to 12 colours as HEX values (like #F4A6C0).';
        out.hexes = h.map((x: string) => x.toLowerCase());
      }
      break;
    case 'type':
      if ('font' in raw) {
        const f = text(raw.font, 60);
        if (!f) return 'Add the font’s name.';
        out.font = f;
      }
      if ('note' in raw) out.note = text(raw.note, 500) || undefined;
      break;
    case 'fabric':
      if ('name' in raw) {
        const n = text(raw.name, 80);
        if (!n) return 'Give the fabric a name.';
        out.name = n;
      }
      if ('description' in raw) out.description = text(raw.description, 1000) || undefined;
      break;
  }
  return out;
}

/* ---------- assistant conversations (saved per project; a duplicate starts with none) ---------- */

export const listChats = async (projectId: string) => (await db.list<Chat>(C)).filter((c) => c.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export async function getChat(projectId: string, id: string) {
  const c = await db.get<Chat>(C, id);
  return c && c.projectId === projectId ? c : null;
}
/** Add a question and its answer: to an existing conversation, or as the start of a new one. */
export async function saveTurn(projectId: string, chatId: string | null, turn: Omit<ChatTurn, 'id' | 'at'>) {
  const at = now();
  const t: ChatTurn = { ...turn, id: db.newId('ct_'), at };
  const existing = chatId ? await getChat(projectId, chatId) : null;
  const chat = existing
    ? await db.put<Chat>(C, { ...existing, turns: [...existing.turns, t].slice(-60), updatedAt: at })
    : await db.put<Chat>(C, { id: db.newId('ch_'), projectId, title: turn.q.slice(0, 80), turns: [t], createdAt: at, updatedAt: at });
  return { chat, turn: t };
}
export const renameChat = (projectId: string, id: string, title: string) => db.update<Chat>(C, id, (c) => (c.projectId === projectId ? { ...c, title } : c));
/** Any saved chat by its id (Jelly's or a project's). */
export const getChatAny = (id: string) => (id ? db.get<Chat>(C, id) : Promise.resolve(null));
export const pinChat = (projectId: string, id: string, pinned: boolean) => db.update<Chat>(C, id, (c) => (c.projectId === projectId ? { ...c, pinned } : c));
export async function deleteChat(projectId: string, id: string) {
  if (!(await getChat(projectId, id))) return false;
  await db.remove(C, id);
  return true;
}
