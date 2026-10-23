import type { Chapter, Item, Palette } from '@/content/journey';

export type ResolvedItem = Item & { missing?: boolean };
export type ResolvedChapter = Omit<Chapter, 'items'> & { items: ResolvedItem[] };
export type Intro = { name: string; title: string; line: string; palette: Palette };
export type Music = { src: string; label: string; missing: boolean };
