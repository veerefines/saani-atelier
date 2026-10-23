import { listDares, listJar, listLetters, listPosts, listWishes } from './data';
import type { Session } from './session';

/** Everything one friend has sent, for their own pages. Never anyone else's. */
export async function getMine(s: Session) {
  const [posts, letters, jar, dares, wishes] = await Promise.all([listPosts(), listLetters(), listJar(), listDares(), listWishes()]);
  const own = <T extends { authorId: string }>(xs: T[]) => xs.filter((x) => x.authorId === s.id);
  return {
    posts: own(posts),
    letters: own(letters),
    jar: own(jar),
    dares: own(dares),
    tips: wishes.filter((w) => w.fromId === s.id),
  };
}
