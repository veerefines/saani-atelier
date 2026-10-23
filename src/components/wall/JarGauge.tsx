import { moods } from '@/content/home';

/** How full each mood's jar is, so friends can top up the emptier ones. */
export default function JarGauge({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(5, ...Object.values(counts));
  const lowest = moods.reduce((a, b) => ((counts[b.id] ?? 0) < (counts[a.id] ?? 0) ? b : a));
  const even = moods.every((m) => (counts[m.id] ?? 0) === (counts[lowest.id] ?? 0));
  return (
    <section className="w-gauge" aria-label="How full each mood is">
      {moods.map((m) => (
        <div key={m.id} className="w-gauge-row">
          <span>
            {m.emoji} {m.label}
          </span>
          <i>
            <b style={{ width: `${((counts[m.id] ?? 0) / max) * 100}%` }} />
          </i>
          <em>{counts[m.id] ?? 0}</em>
        </div>
      ))}
      <p className="hand">{even ? 'every jar could use a few more' : `the “${lowest.label}” jar could use a few more`}</p>
    </section>
  );
}
