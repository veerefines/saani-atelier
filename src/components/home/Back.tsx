import Link from 'next/link';

/** Header for each corner of the dashboard. */
export default function PageHead({ title, sub, kicker }: { title: string; sub?: string; kicker?: string }) {
  return (
    <header className="h-pagehead">
      <Link href="/home" className="h-back">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Your desk</span>
      </Link>
      {kicker && <p className="hand h-kicker">{kicker}</p>}
      <h1 className="h-title">{title}</h1>
      {sub && <p className="whisper h-sub">{sub}</p>}
    </header>
  );
}
