'use client';

import { useEffect } from 'react';
import type { Chat } from '@/lib/corner-model';

/**
 * Floating Jelly and the "Jelly Got This!" tab show the same chats. When one of them changes a chat,
 * it says so here and the other updates, without a reload.
 */
type Change = { chat: Chat } | { removed: string };
const EVENT = 'jelly:chat';

export const announce = (c: Change) => window.dispatchEvent(new CustomEvent<Change>(EVENT, { detail: c }));

/** Apply a change to a list of chats, newest first. */
export function applyChange(l: Chat[], c: Change) {
  if ('removed' in c) return l.filter((x) => x.id !== c.removed);
  const next = l.some((x) => x.id === c.chat.id) ? l.map((x) => (x.id === c.chat.id ? c.chat : x)) : [c.chat, ...l];
  return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function useJellyChats(on: (c: Change) => void) {
  useEffect(() => {
    const h = (e: Event) => on((e as CustomEvent<Change>).detail);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, [on]);
}
