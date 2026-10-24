'use client';

import { useEffect, useState } from 'react';
import type { Post } from '@/lib/data';
import { PostBody } from './LoveWall';

const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** On her desk: one thing her people sent, brought back at random. Tap for another. */
export default function Memory() {
  const [post, setPost] = useState<Post | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = (not?: string) => {
    setBusy(true);
    fetch(`/api/memory${not ? `?not=${encodeURIComponent(not)}` : ''}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { post: Post | null; total: number } | null) => {
        if (d) {
          setPost(d.post);
          setTotal(d.total);
        }
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  useEffect(() => load(), []);

  if (!post || total < 2) return null; // with just one thing it's already on top of her wall
  return (
    <section className="memory" aria-label="A little memory">
      <div className="memory-head">
        <span className="hand">a little memory</span>
        <small>
          from {post.authorName.split(' ')[0]} · {when(post.showAt ?? post.createdAt)}
        </small>
      </div>
      <div className="memory-body" key={post.id}>
        <PostBody p={post} />
      </div>
      <button type="button" className="today-more" onClick={() => load(post.id)} disabled={busy}>
        another one ↻
      </button>
    </section>
  );
}
