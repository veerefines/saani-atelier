import WellDesk from '@/components/wall/WellDesk';
import Keepsakes from '@/components/Keepsakes';
import { getSession } from '@/lib/auth';
import { getBingo } from '@/lib/data';
import { addDays, listDiary, listLook, listOccasions, listPages, listSongs, listStamps, milanDay } from '@/lib/extras';
import { getMine } from '@/lib/wall';
import { bingo, milano } from '@/content/home';

export default async function Wall() {
  const session = (await getSession())!;
  const [mine, board, songs, pages, look, diary, stamps, occasions] = await Promise.all([
    getMine(session),
    getBingo(),
    listSongs(),
    listPages(),
    listLook(),
    listDiary(),
    listStamps(),
    listOccasions(),
  ]);
  // her next special day, if it's today or within its reminder window
  const today = milanDay();
  const next = occasions.find((o) => o.date >= today && addDays(o.date, -Math.max(o.remindDays, 0)) <= today);
  const soon = next ? { title: next.title, emoji: next.emoji, days: Math.round((new Date(`${next.date}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86_400_000) } : null;
  // friends see which squares she's ticked, never her photo proofs
  const doneIds = new Set(Object.keys(board.done));
  return (
    <WellDesk
      name={session.name}
      counts={{
        posts: mine.posts.length,
        reacted: mine.posts.filter((p) => p.reactions.length).length,
        letters: mine.letters.length,
        opened: mine.letters.filter((l) => l.openedAt).length,
        jar: mine.jar.length,
        read: mine.jar.filter((n) => n.drawnAt).length,
        bingoDone: doneIds.size,
        bingoTotal: bingo.length,
        dares: mine.dares.length,
        tips: mine.tips.length,
        tipsDone: mine.tips.filter((t) => t.done).length,
        songs: songs.filter((x) => x.authorId === session.id).length,
        pages: pages.length,
        herShared: look.filter((x) => x.shared).length + diary.filter((d) => d.shared).length,
        stamps: stamps.length,
      }}
      bingoDone={bingo.map((q) => doneIds.has(q.id))}
      preview={mine.posts.slice(0, 3).map((p) => ({ id: p.id, kind: p.kind, text: p.text ?? '', mediaId: p.mediaId }))}
      milano={milano}
      decor={<Keepsakes set="desk" />}
      admin={Boolean(session.admin)}
      soon={soon}
      me={session.id}
    />
  );
}
