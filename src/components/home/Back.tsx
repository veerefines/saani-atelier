import Link from 'next/link';

/** Header for each corner of the dashboard. */
export default function PageHead({ title, sub, kicker, back = '/home', backLabel = 'Your desk' }: { title: string; sub?: string; kicker?: string; back?: string; backLabel?: string }) {
  return (
    <header className="h-pagehead">
      <Link href={back} className="h-back">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{backLabel}</span>
      </Link>
      {kicker && <p className="hand h-kicker">{kicker}</p>}
      {title && <h1 className="h-title">{title}</h1>}
      {sub && <p className="whisper h-sub">{sub}</p>}
    </header>
  );
}
