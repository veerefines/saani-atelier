import type { Chat } from '@/lib/corner-model';

type Turn = Chat['turns'][number];

/** Under an answer Jelly looked up on Google (and where the facts came from), or that Gemini wrote while Groq rested. */
export default function WebSources({ web, via }: { web?: Turn['web']; via?: Turn['via'] }) {
  return (
    <div className="jp-web">
      {via === 'gemini' && <span className="jp-web-tag">✨ answered by Gemini</span>}
      {web && <span className="jp-web-tag">🔎 searched Google</span>}
      {web?.sources.slice(0, 3).map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
          {s.title}
        </a>
      ))}
    </div>
  );
}
