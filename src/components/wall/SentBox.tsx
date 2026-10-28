'use client';

import { useState } from 'react';
import type { Dare, JarNote, Letter, Post, Wish } from '@/lib/data';
import type { Square } from '@/content/home';
import { SentJar, SentLetters, SentPosts, deleteMine } from './Composer';
import { sfx } from '@/lib/sound';

type Box = { posts: Post[]; letters: Letter[]; jar: JarNote[]; dares: Dare[]; tips: Wish[] };
type Kind = keyof Box;

const SECTIONS: { id: Kind; label: string; empty: string; href: string }[] = [
  { id: 'posts', label: '💌 On her wall', empty: 'Nothing pinned yet.', href: '/wall/love' },
  { id: 'letters', label: '✉️ Letters', empty: 'No letters yet.', href: '/wall/letters' },
  { id: 'jar', label: '🫙 Jar notes', empty: 'No jar notes yet.', href: '/wall/jar' },
  { id: 'dares', label: '🌷 Bingo dares', empty: 'No dares yet.', href: '/wall/bingo' },
  { id: 'tips', label: '📮 Milano tips', empty: 'No tips yet.', href: '/wall/milano' },
];

/** Everything this friend has sent, with what she's done with it. */
export default function SentBox({ box: initial, squares }: { box: Box; squares: Square[] }) {
  const [box, setBox] = useState(initial);
  const [err, setErr] = useState('');

  async function del(kind: Kind, id: string) {
    try {
      if (!(await deleteMine(kind, id))) return;
      setBox((b) => ({ ...b, [kind]: (b[kind] as { id: string }[]).filter((x) => x.id !== id) }));
    } catch (e) {
      sfx('nope');
      setErr((e as Error).message);
    }
  }

  const label = (id: string) => squares.find((s) => s.id === id)?.label ?? 'a square';

  return (
    <>
      {err && <p className="h-err">{err}</p>}
      {SECTIONS.map((s) => (
        <section key={s.id} className="w-mine w-sent-sec" aria-label={s.label}>
          <h2 className="hand">
            {s.label} <span>({box[s.id].length})</span>
          </h2>
          {!box[s.id].length ? (
            <p className="w-empty">
              {s.empty} <a href={s.href}>Add one</a>
            </p>
          ) : s.id === 'posts' ? (
            <div className="love-wall">
              <SentPosts posts={box.posts} onDelete={(id) => del('posts', id)} />
            </div>
          ) : s.id === 'letters' ? (
            <div className="love-wall">
              <SentLetters letters={box.letters} onDelete={(id) => del('letters', id)} />
            </div>
          ) : s.id === 'jar' ? (
            <div className="love-wall">
              <SentJar jar={box.jar} onDelete={(id) => del('jar', id)} />
            </div>
          ) : s.id === 'dares' ? (
            <ul className="w-tips">
              {box.dares.map((d) => (
                <li key={d.id}>
                  <span className="w-tip-mark" aria-hidden="true">
                    💌
                  </span>
                  <span className="w-tip-text">
                    {d.text}
                    <small>on “{label(d.squareId)}”</small>
                  </span>
                  <button onClick={() => del('dares', d.id)}>Delete</button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="w-tips">
              {box.tips.map((t) => (
                <li key={t.id} className={t.done ? 'done' : ''}>
                  <span className="w-tip-mark" aria-hidden="true">
                    {t.done ? '🌷' : '📮'}
                  </span>
                  <span className="w-tip-text">
                    {t.text}
                    <small>{t.done ? 'She’s been!' : 'On her list'}</small>
                  </span>
                  <button onClick={() => del('tips', t.id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}
