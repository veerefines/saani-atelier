/**
 * My Corner's shapes and the small calculations both the server and the browser use.
 * (No database code here, so client components can import it.)
 */

export const CATEGORIES = ['Fashion Collection', 'Brand Strategy', 'Fashion Research', 'Marketing Campaign', 'University Assignment', 'Personal Inspiration'] as const;
export type Category = (typeof CATEGORIES)[number];

export type Brief = { audience: string; positioning: string; objectives: string; budget: string };
export type Costing = { fabric: number; labour: number; trims: number; other: number; sellingPrice: number };

export type Project = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  category: Category;
  coverMediaId?: string;
  favourite: boolean;
  archived: boolean;
  brief: Brief;
  costing: Costing;
};

export type Base = { id: string; createdAt: string; updatedAt: string; projectId: string; order: number };
export type Item = Base &
  (
    | { kind: 'doc'; mediaId: string; filename: string; mime: string; size: number }
    | { kind: 'drop'; drop: 'image'; mediaId: string; note?: string }
    | { kind: 'drop'; drop: 'link' | 'pinterest'; url: string; note?: string }
    | { kind: 'drop'; drop: 'note'; note: string }
    | { kind: 'board'; board: 'image'; mediaId: string; caption?: string }
    | { kind: 'board'; board: 'note'; text: string }
    | { kind: 'board'; board: 'swatch'; hex: string; label?: string }
    | { kind: 'palette'; name: string; hexes: string[] }
    | { kind: 'type'; font: string; note?: string }
    | { kind: 'fabric'; name: string; description?: string; mediaId?: string }
  );
export type ItemKind = Item['kind'];
/** An item before it's saved (no id, project or dates yet); keeps each kind's own fields. */
export type NewItem = Item extends infer T ? (T extends unknown ? Omit<T, keyof Base> : never) : never;


export const isHex = (h: unknown): h is string => typeof h === 'string' && /^#[0-9a-fA-F]{6}$/.test(h);

/** "Recent activity": the latest changes in a project, newest first. */
export function activity(p: Project, items: Item[]) {
  const label = (i: Item) => {
    switch (i.kind) {
      case 'doc':
        return `Document: ${i.filename}`;
      case 'drop':
        return i.drop === 'note' ? 'Inspiration note' : i.drop === 'image' ? 'Inspiration image' : i.drop === 'pinterest' ? 'Pinterest pin' : 'Inspiration link';
      case 'board':
        return i.board === 'swatch' ? `Moodboard swatch ${i.hex}` : i.board === 'note' ? 'Moodboard note' : 'Moodboard image';
      case 'palette':
        return `Palette: ${i.name}`;
      case 'type':
        return `Typography: ${i.font}`;
      case 'fabric':
        return `Fabric: ${i.name}`;
    }
  };
  return [{ at: p.createdAt, what: 'Project created' }, ...items.map((i) => ({ at: i.updatedAt, what: label(i) }))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
}

/** Unit cost, margin and markup from the costing inputs. These are estimates. */
export function costingSummary(c: Costing) {
  const unit = Math.round((c.fabric + c.labour + c.trims + c.other) * 100) / 100;
  const margin = Math.round((c.sellingPrice - unit) * 100) / 100;
  return {
    unit,
    margin,
    marginPct: c.sellingPrice > 0 ? Math.round((margin / c.sellingPrice) * 1000) / 10 : null,
    markup: unit > 0 ? Math.round((c.sellingPrice / unit) * 100) / 100 : null,
  };
}

