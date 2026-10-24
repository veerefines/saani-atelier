import WellDesk from '@/components/wall/WellDesk';
import Keepsakes from '@/components/Keepsakes';
import { getSession } from '@/lib/auth';
import { getBingo } from '@/lib/data';
import { listDiary, listLook, listPages, listSongs, listStamps } from '@/lib/extras';
import { getMine } from '@/lib/wall';
import { bingo, milano } from '@/content/home';

export default async function Wall() {
  const session = (await getSession())!;
  const [mine, board, songs, pages, look, diary, stamps] = await Promise.all([getMine(session), getBingo(), listSongs(), listPages(), listLook(), listDiary(), listStamps()]);
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
    />
  );
}
