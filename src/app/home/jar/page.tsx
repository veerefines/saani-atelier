import PageHead from '@/components/home/Back';
import Keepsakes from '@/components/Keepsakes';
import Jar from '@/components/home/Jar';
import { listJar } from '@/lib/data';
import { moods } from '@/content/home';

export default async function JarPage() {
  const notes = await listJar();
  const counts = Object.fromEntries(moods.map((m) => [m.id, notes.filter((n) => n.mood === m.id).length]));
  return (
    <main className="h-page">
      <Keepsakes set="jar" />
      <PageHead kicker="shake it gently" title="Khushiyon ka Pitara!" sub="Tell the jar how you feel. It knows what to say." />
      <Jar counts={counts} />
    </main>
  );
}
