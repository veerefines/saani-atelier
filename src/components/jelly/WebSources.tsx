import type { Chat } from '@/lib/corner-model';

/** Under an answer Jelly looked up on Google: what she searched for, and where the facts came from. */
export default function WebSources({ web }: { web: NonNullable<Chat['turns'][number]['web']> }) {
  return (
    <div className="jp-web">
      <span className="jp-web-tag">🔎 searched Google</span>
      {web.sources.slice(0, 3).map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
          {s.title}
        </a>
      ))}
    </div>
  );
}
