import PageHead from '@/components/home/Back';
import FriendBingo from '@/components/wall/FriendBingo';
import Keepsakes from '@/components/Keepsakes';
import { getSession } from '@/lib/auth';
import { getBingo } from '@/lib/data';
import { getMine } from '@/lib/wall';
import { bingo } from '@/content/home';

export default async function WallBingo() {
  const [mine, board] = await Promise.all([getMine((await getSession())!), getBingo()]);
  // only when she did each square; her photo proofs stay hers
  const doneAt = Object.fromEntries(Object.entries(board.done).map(([id, d]) => [id, d.at]));
  return (
    <main className="h-page">
      <Keepsakes set="bingo" />
      <PageHead back="/wall" kicker="twenty-five little adventures" title="Cheer her bingo" sub="See which squares she’s stitched, and pin a dare or a cheer to any of them. She’ll see it on that square." />
      <FriendBingo squares={bingo} doneAt={doneAt} dares={mine.dares} />
    </main>
  );
}
