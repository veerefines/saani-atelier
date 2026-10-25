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


/** Readable text on a colour: dark ink on light colours, white on dark ones. */
export function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? { color: '#3a2a32', textShadow: 'none' } : { color: '#fff' };
}

/* ---------- the assistant ---------- */

/** The studio's ready-made questions, from a designer's and a fashion manager's point of view. */
export const STUDIO = [
  { id: 'feedback', lens: 'designer', icon: '✂️', label: 'Critique the direction', hint: 'What’s working, what isn’t, and why', ask: 'Give honest, specific feedback on the creative direction as a design tutor would: what is working, what feels unclear or inconsistent, and why. Point to the exact pieces of the project you mean.' },
  { id: 'moodboard', lens: 'designer', icon: '🎨', label: 'Strengthen the moodboard', hint: 'Gaps, clashes and what to add', ask: 'Suggest how to strengthen the moodboard and the brand concept: gaps, contradictions, and concrete images, textures or references to add.' },
  { id: 'palette', lens: 'designer', icon: '🌈', label: 'Build a colour story', hint: 'A palette with HEX codes to save', ask: 'Propose a colour story of 5 to 7 colours that fits this direction. For each colour give a name, its HEX code written exactly like #A1B2C3, and one line on where it goes in the collection (hero, accent, base). Build on any colours already in the project.' },
  { id: 'fabrics', lens: 'designer', icon: '🧵', label: 'Fabrics & materials', hint: 'What to source, and why', ask: 'Suggest fabrics and materials for this direction: composition, weight, hand-feel, and how each suits the season, the silhouette and the price point. Flag sustainable options and any that would push the cost up.' },
  { id: 'range', lens: 'designer', icon: '👗', label: 'Plan the range', hint: 'Looks, silhouettes, hero pieces', ask: 'Draft a compact range plan of 6 to 10 pieces: for each, the garment, silhouette, fabric, colour, and its role (hero, core or basic). Keep it consistent with the brief and the moodboard.' },
  { id: 'trends', lens: 'designer', icon: '🔍', label: 'Trend & research check', hint: 'Distinctive or derivative?', ask: 'Compare the creative direction with the research and trend material in this project. What feels distinctive, what feels derivative, and what could make it more her own?' },
  { id: 'summary', lens: 'manager', icon: '📋', label: 'Summarise the project', hint: 'Brief, research, where it stands', ask: 'Summarise this project: the brief, the research and documents, and where the creative direction stands.' },
  { id: 'costing', lens: 'manager', icon: '💶', label: 'Costing & pricing review', hint: 'Margins, markup, price ladder', ask: 'Review the costing and pricing: unit cost, margin and markup against typical fashion benchmarks for this positioning (wholesale and retail markups), suggest a price architecture (entry, core, hero), and list the cost lines that are missing.' },
  { id: 'customer', lens: 'manager', icon: '🙋‍♀️', label: 'Customer & positioning', hint: 'A persona and the competition', ask: 'Build a short target-customer persona from the brief (who she is, where she shops, what she pays) and sharpen the brand positioning against two or three comparable brands.' },
  { id: 'launch', lens: 'manager', icon: '🚀', label: 'Go-to-market plan', hint: 'Channels, timeline, KPIs', ask: 'Draft a go-to-market plan within the budget: channels, a simple timeline, one campaign idea, and three KPIs to track.' },
  { id: 'swot', lens: 'manager', icon: '🧭', label: 'SWOT', hint: 'Strengths, weaknesses, threats', ask: 'Write a SWOT analysis of this project as it stands, with one action for each weakness and threat.' },
  { id: 'next', lens: 'manager', icon: '✅', label: 'What’s missing & next', hint: 'The most useful next steps', ask: 'What information is missing from this project, and what are the most useful next steps, in order?' },
] as const;
export type StudioId = (typeof STUDIO)[number]['id'];
export type Mode = StudioId | 'question';

export type ChatTurn = { id: string; at: string; mode: Mode; q: string; a: string; read: string[]; notRead: string[]; suggestions: string[] };
export type Chat = { id: string; createdAt: string; updatedAt: string; projectId: string; title: string; turns: ChatTurn[] };

/** HEX colours mentioned in an answer, so a suggested palette can be saved in one tap. */
export const hexesIn = (s: string) => [...new Set((s.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((h) => h.toLowerCase()))].slice(0, 12);
