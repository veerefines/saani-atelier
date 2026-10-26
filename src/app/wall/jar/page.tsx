import PageHead from '@/components/home/Back';
import Composer from '@/components/wall/Composer';
import JarGauge from '@/components/wall/JarGauge';
import Keepsakes from '@/components/Keepsakes';
import { getSession } from '@/lib/auth';
import { listJar } from '@/lib/data';
import { getMine } from '@/lib/wall';
import { moods } from '@/content/home';

export default async function WallJar() {
  const [mine, all] = await Promise.all([getMine((await getSession())!), listJar()]);
  // how full each mood is, from everyone; not which ones she's pulled out
  const counts = Object.fromEntries(moods.map((m) => [m.id, all.filter((n) => n.mood === m.id).length]));
  return (
    <main className="h-page w-page">
      <Keepsakes set="jar" />
      <PageHead back="/wall" kicker="shake it gently" title="Khushiyon ka Pitara!" sub="When she tells the jar how she feels, it hands her a note for that mood. Make sure every mood has plenty." />
      <JarGauge counts={counts} />
      <Composer mine={mine} only={['jar']} />
    </main>
  );
}
