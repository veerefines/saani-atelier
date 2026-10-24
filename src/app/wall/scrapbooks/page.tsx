import Link from 'next/link';
import PageHead from '@/components/home/Back';
import { getSession } from '@/lib/auth';
import { listPages } from '@/lib/extras';
import { getMine } from '@/lib/wall';

export default async function WallScrapbooks() {
  const [pages, mine] = await Promise.all([listPages(), getMine((await getSession())!)]);
  return (
    <main className="h-page w-page">
      <PageHead back="/wall" kicker="made together" title="Scrapbook pages" sub="Pages everyone adds to for a moment in her life. She sees the whole page; you see your own pieces." />
      <div className="sb-list">
        {pages.map((p) => {
          const n = mine.posts.filter((x) => x.pageId === p.id).length;
          return (
            <Link key={p.id} href={`/wall/scrapbook/${p.id}`} className="sb-item">
              <span className="sb-emoji" aria-hidden="true">
                {p.emoji}
              </span>
              <b>{p.title}</b>
              <small>{n ? `you’ve added ${n}` : 'add your piece'}</small>
            </Link>
          );
        })}
      </div>
      {!pages.length && <p className="h-empty whisper">No scrapbook pages yet.</p>}
    </main>
  );
}
