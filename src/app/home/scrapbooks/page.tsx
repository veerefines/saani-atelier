import Link from 'next/link';
import PageHead from '@/components/home/Back';
import { listPages } from '@/lib/extras';
import { pagePosts } from '@/lib/data';

export default async function Scrapbooks() {
  const pages = await listPages();
  const counts = await Promise.all(pages.map((p) => pagePosts(p.id).then((x) => x.length)));
  return (
    <main className="h-page">
      <PageHead kicker="made by your people" title="Scrapbooks" sub="Pages your people made together, for the moments that matter." />
      <div className="sb-list">
        {pages.map((p, i) => (
          <Link key={p.id} href={`/home/scrapbook/${p.id}`} className="sb-item">
            <span className="sb-emoji" aria-hidden="true">
              {p.emoji}
            </span>
            <b>{p.title}</b>
            <small>{counts[i] ? `${counts[i]} ${counts[i] === 1 ? 'piece' : 'pieces'}` : 'being made…'}</small>
          </Link>
        ))}
      </div>
      {!pages.length && <p className="h-empty whisper">Your people are making you something. It’ll appear here.</p>}
    </main>
  );
}
