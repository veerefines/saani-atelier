import Dashboard from '@/components/home/Dashboard';
import Keepsakes from '@/components/Keepsakes';
import { getBingo, getSeen, isLocked, listJar, listLetters, listPosts } from '@/lib/data';
import { bingo, milano } from '@/content/home';

export default async function HomePage() {
  const [posts, letters, jar, board, seen] = await Promise.all([listPosts(), listLetters(), listJar(), getBingo(), getSeen()]);
  const newPosts = posts.filter((p) => !seen.love || p.createdAt > seen.love).length;
  const ready = letters.filter((l) => !isLocked(l) && !l.openedAt).length;
  const sealed = letters.filter((l) => isLocked(l)).length;
  const preview = posts.slice(0, 3).map((p) => ({ id: p.id, kind: p.kind, text: p.text ?? '', mediaId: p.mediaId, authorName: p.authorName }));
  const doneIds = Object.keys(board.done);
  return (
    <Dashboard
      counts={{ posts: posts.length, newPosts, ready, sealed, jar: jar.length, bingoDone: doneIds.length, bingoTotal: bingo.length }}
      bingoDone={bingo.map((q) => doneIds.includes(q.id))}
      preview={preview}
      milano={milano}
      decor={<Keepsakes set="desk" />}
    />
  );
}
