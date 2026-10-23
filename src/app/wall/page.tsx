import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { listJar, listLetters, listPosts } from '@/lib/data';
import Composer from '@/components/wall/Composer';
import '@/components/journey/journey.css';
import '@/components/home/home.css';
import '@/components/wall/wall.css';

export const dynamic = 'force-dynamic';

export default async function Wall() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role === 'saanika') redirect('/home/love');

  const [posts, letters, jar] = await Promise.all([listPosts(), listLetters(), listJar()]);
  const mine = {
    posts: posts.filter((p) => p.authorId === session.id),
    letters: letters.filter((l) => l.authorId === session.id),
    jar: jar.filter((n) => n.authorId === session.id),
  };
  return <Composer name={session.name} mine={mine} />;
}
