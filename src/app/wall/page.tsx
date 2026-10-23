import WellDesk from '@/components/wall/WellDesk';
import Keepsakes from '@/components/Keepsakes';
import { getSession } from '@/lib/auth';
import { getBingo } from '@/lib/data';
import { getMine } from '@/lib/wall';
import { bingo, milano } from '@/content/home';

export default async function Wall() {
  const session = (await getSession())!;
  const [mine, board] = await Promise.all([getMine(session), getBingo()]);
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
      }}
      bingoDone={bingo.map((q) => doneIds.has(q.id))}
      preview={mine.posts.slice(0, 3).map((p) => ({ id: p.id, kind: p.kind, text: p.text ?? '', mediaId: p.mediaId }))}
      milano={milano}
      decor={<Keepsakes set="desk" />}
    />
  );
}
