'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '@/lib/upload-client';
import { sfx } from '@/lib/sound';
import { moodHd } from '@/lib/jelly-mood';
import type { Fact } from '@/lib/jelly-memory';
import { checkSoon } from './bus';

const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** What Jelly remembers about Saani: read, change, forget, or tell her something new. */
export default function JellyMemory() {
  const [facts, setFacts] = useState<Fact[] | null>(null);
  const [text, setText] = useState('');
  const [edit, setEdit] = useState<{ id: string; text: string } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/jelly/memory')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setFacts(d.facts))
      .catch(() => setFacts([]));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const f = await api<Fact>('/api/jelly/memory', 'POST', { text });
      setFacts((l) => [f, ...(l ?? [])]);
      setText('');
      sfx('sparkle');
      checkSoon();
    } catch (x) {
      sfx('nope');
      setErr((x as Error).message);
    }
  }
  async function save() {
    if (!edit) return;
    try {
      const f = await api<Fact>('/api/jelly/memory', 'PATCH', edit);
      setFacts((l) => (l ?? []).map((x) => (x.id === f.id ? f : x)));
      setEdit(null);
      sfx('pop');
    } catch (x) {
      sfx('nope');
      setErr((x as Error).message);
    }
  }
  async function forget(id: string) {
    sfx('paper');
    setFacts((l) => (l ?? []).filter((x) => x.id !== id));
    await api('/api/jelly/memory', 'DELETE', { id }).catch(() => {});
  }

  return (
    <section className="jm" aria-label="Jelly remembers">
      <div className="jm-head">
        <img src={moodHd('love')} alt="" width={84} height={84} />
        <p>
          <b>Things Jelly remembers about you</b>
          <small>She picks these up when you chat, and brings them up now and then. Change or forget anything, anytime. She never keeps anything private like passwords or addresses.</small>
        </p>
      </div>
      <form className="jm-add" onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={160} placeholder="Tell Jelly something to remember… (my exam is on 12 Dec)" aria-label="Something for Jelly to remember" />
        <button disabled={text.trim().length < 4}>Remember 🫧</button>
      </form>
      {err && <p className="jh-toast bad">{err}</p>}
      {facts === null ? (
        <p className="jm-empty">Remembering…</p>
      ) : !facts.length ? (
        <p className="jm-empty">Nothing yet! Chat with Jelly about what you love, and she’ll keep little notes. 🪼</p>
      ) : (
        <ul className="jm-list">
          <AnimatePresence initial={false}>
            {facts.map((f) => (
              <motion.li key={f.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                <span className="jm-dot" aria-hidden="true">
                  {f.by === 'her' ? '✍️' : '🫧'}
                </span>
                {edit?.id === f.id ? (
                  <form
                    className="jm-edit"
                    onSubmit={(e) => {
                      e.preventDefault();
                      save();
                    }}
                  >
                    <input value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} maxLength={160} autoFocus aria-label="Change it" />
                    <button>Save</button>
                    <button type="button" onClick={() => setEdit(null)}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <p>
                      {f.text}
                      <small>
                        {f.by === 'her' ? 'you told her' : 'from a chat'} · {when(f.at)}
                      </small>
                    </p>
                    <span className="jm-tools">
                      <button type="button" onClick={() => setEdit({ id: f.id, text: f.text })} aria-label={`Change “${f.text}”`}>
                        ✎
                      </button>
                      <button type="button" onClick={() => forget(f.id)} aria-label={`Forget “${f.text}”`}>
                        ×
                      </button>
                    </span>
                  </>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
