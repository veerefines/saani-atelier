import { headers } from 'next/headers';
import PageHead from '@/components/home/Back';
import Admin from '@/components/admin/Admin';
import { getInvites } from '@/lib/invites';
import { getBingo, listJar, listLetters, listPosts } from '@/lib/data';
import { getChecklist, getContent, getPresence, listKeepsakeMedia, listOccasions, listPages, listSlotMedia, listStamps } from '@/lib/extras';
import { keepsakeFiles } from '@/content/keepsakes';
import { journeySlots } from '@/lib/journey-slots';
import { site } from '@/content/site';
import { bingo } from '@/content/home';
import { checklist } from '@/content/checklist';
import { places } from '@/content/milano';

export default async function AdminPage() {
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const [invites, occasions, pages, slotMedia, content, letters, jar, posts, board, stamps, check, presence, keepsakeMedia] = await Promise.all([
    getInvites(),
    listOccasions(),
    listPages(),
    listSlotMedia(),
    getContent(),
    listLetters(),
    listJar(),
    listPosts(),
    getBingo(),
    listStamps(),
    getChecklist(),
    getPresence(),
    listKeepsakeMedia(),
  ]);
  const now = Date.now();
  const fromPeople = (a: { authorId: string }) => a.authorId !== 'seed';
  return (
    <main className="h-page h-page-wide">
      <PageHead back="/wall" kicker="behind the scenes" title="Atelier admin" sub="Friends, special days, scrapbook pages, the journey and the reveal note, and how she’s getting on." />
      <Admin
        friends={invites.map((i) => ({ id: i.id, name: i.name, role: i.role, admin: Boolean(i.admin), managed: Boolean(i.managed), link: `${origin}/hello/${i.code}` }))}
        occasions={occasions}
        pages={pages}
        slots={journeySlots().map((x) => ({ ...x, mediaId: slotMedia.find((m) => m.slot === x.slot)?.mediaId ?? null }))}
        note={content.note ?? site.note}
        keepsakes={Object.entries(keepsakeFiles).map(([name, what]) => ({ name, what, mediaId: keepsakeMedia.find((k) => k.name === name)?.mediaId ?? null }))}
        activity={{
          lastSeen: presence?.lastSeen ?? null,
          letters: { opened: letters.filter((l) => l.openedAt).length, total: letters.length },
          jar: { read: jar.filter((n) => n.drawnAt).length, total: jar.length },
          wall: {
            reacted: posts.filter((p) => !p.pageId && p.reactions.length).length,
            total: posts.filter((p) => !p.pageId && (!p.showAt || new Date(p.showAt).getTime() <= now)).length,
            replies: posts.reduce((n, p) => n + (p.replies?.length ?? 0), 0),
            scheduled: posts.filter((p) => p.showAt && new Date(p.showAt).getTime() > now).length,
          },
          bingo: { done: Object.keys(board.done).length, total: bingo.length },
          stamps: { done: stamps.length, total: places.length },
          checklist: { done: Object.keys(check.done).length, total: checklist.length },
          fromPeople: posts.filter(fromPeople).length + letters.filter(fromPeople).length + jar.filter(fromPeople).length,
        }}
      />
    </main>
  );
}
