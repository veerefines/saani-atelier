'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { CheckItem } from '@/content/checklist';
import { api } from '@/lib/upload-client';

/** Settling-in tasks with a tip each; her ticks are saved. */
export default function Checklist({ items, done: initial }: { items: CheckItem[]; done: Record<string, string> }) {
  const [done, setDone] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const count = items.filter((i) => done[i.id]).length;

  function toggle(id: string) {
    const next = !done[id];
    setDone((d) => {
      const c = { ...d };
      if (next) c[id] = new Date().toISOString();
      else delete c[id];
      return c;
    });
    api('/api/checklist', 'POST', { itemId: id, done: next }).catch(() => setDone(initial));
  }

  return (
    <>
      <div className="bingo-progress">
        <div className="bingo-bar" aria-hidden="true">
          <span style={{ width: `${(count / items.length) * 100}%` }} />
        </div>
        <span className="bingo-count">
          {count}/{items.length}
        </span>
      </div>
      <ul className="cl">
        {items.map((it, i) => (
          <motion.li key={it.id} className={done[it.id] ? 'done' : ''} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}>
            <button className="cl-check" onClick={() => toggle(it.id)} aria-pressed={Boolean(done[it.id])} aria-label={done[it.id] ? `Mark “${it.title}” not done` : `Mark “${it.title}” done`}>
              {done[it.id] ? '🌷' : ''}
            </button>
            <div className="cl-body">
              <button className="cl-title" onClick={() => setOpen(open === it.id ? null : it.id)} aria-expanded={open === it.id}>
                {it.title}
                <small>{it.when}</small>
              </button>
              {open === it.id && (
                <div className="cl-more">
                  <p>{it.tip}</p>
                  {it.links.length > 0 && (
                    <p className="cl-links">
                      {it.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                          {l.label} ↗
                        </a>
                      ))}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
      <p className="cl-note">Rules and offices change, so always check the official link before you go.</p>
    </>
  );
}
