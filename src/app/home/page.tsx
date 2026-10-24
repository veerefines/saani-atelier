import Dashboard from '@/components/home/Dashboard';
import Keepsakes from '@/components/Keepsakes';
import { getBingo, getSeen, isLocked, listJar, listLetters, wallPosts } from '@/lib/data';
import { getChecklist, listDiary, listLook, listOccasions, listPages, listSongs, listStamps, milanDay } from '@/lib/extras';
import { bingo, milano } from '@/content/home';
import { checklist } from '@/content/checklist';
import { places } from '@/content/milano';

export default async function HomePage() {
  const [posts, letters, jar, board, seen, look, stamps, diary, songs, check, pages, occasions] = await Promise.all([
    wallPosts(),
    listLetters(),
    listJar(),
    getBingo(),
    getSeen(),
    listLook(),
    listStamps(),
    listDiary(),
    listSongs(),
    getChecklist(),
    listPages(),
    listOccasions(),
  ]);
  const newPosts = posts.filter((p) => !seen.love || p.createdAt > seen.love).length;
  const ready = letters.filter((l) => !isLocked(l) && !l.openedAt).length;
  const sealed = letters.filter((l) => isLocked(l)).length;
  const preview = posts.slice(0, 3).map((p) => ({ id: p.id, kind: p.kind, text: p.text ?? '', mediaId: p.mediaId, authorName: p.authorName }));
  const doneIds = Object.keys(board.done);

  // a festival or special day today (Milano time), and the letters friends sealed for it
  const today = milanDay();
  const o = occasions.find((x) => x.date === today);
  const occasion = o
    ? { title: o.title, emoji: o.emoji, note: o.note, letters: letters.filter((l) => l.unlockAt && milanDay(new Date(l.unlockAt)) === today).length }
    : null;

  return (
    <Dashboard
      counts={{ posts: posts.length, newPosts, ready, sealed, jar: jar.length, bingoDone: doneIds.length, bingoTotal: bingo.length }}
      bingoDone={bingo.map((q) => doneIds.includes(q.id))}
      preview={preview}
      milano={milano}
      decor={<Keepsakes set="desk" />}
      occasion={occasion}
      corners={{
        look: look.length,
        stamps: stamps.length,
        places: places.length,
        days: new Set(diary.map((d) => d.day)).size,
        songs: songs.length,
        checklistDone: Object.keys(check.done).length,
        checklistTotal: checklist.length,
        pages: pages.length,
      }}
    />
  );
}
