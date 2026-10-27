'use client';

import { useEffect } from 'react';
import type { Chat } from '@/lib/corner-model';
import type { JellyView, Gain } from '@/lib/jelly';

/**
 * Floating Jelly, the "Jelly Got This!" tab and Jelly's Corner share one Jelly. When one of them
 * changes something, it says so here and the others update without a reload.
 */
type Change = { chat: Chat } | { removed: string };
type Events = {
  'jelly:chat': Change;
  /** her home and friendship changed (pearls, pats, things) */
  'jelly:home': JellyView;
  /** pearls and achievements just earned, for Jelly to celebrate */
  'jelly:gains': Gain[];
  /** open the chat (from Jelly's Corner, where she floats in her room instead) */
  'jelly:open': null;
  /** she was petted somewhere else on the page */
  'jelly:pet': null;
};

export function emit<K extends keyof Events>(name: K, detail: Events[K]) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
export function useJelly<K extends keyof Events>(name: K, on: (d: Events[K]) => void) {
  useEffect(() => {
    const h = (e: Event) => on((e as CustomEvent<Events[K]>).detail);
    window.addEventListener(name, h);
    return () => window.removeEventListener(name, h);
  }, [name, on]);
}

export const announce = (c: Change) => emit('jelly:chat', c);
export const useJellyChats = (on: (c: Change) => void) => useJelly('jelly:chat', on);

/** Apply a change to a list of chats, newest first. */
export function applyChange(l: Chat[], c: Change) {
  if ('removed' in c) return l.filter((x) => x.id !== c.removed);
  const next = l.some((x) => x.id === c.chat.id) ? l.map((x) => (x.id === c.chat.id ? c.chat : x)) : [c.chat, ...l];
  return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
