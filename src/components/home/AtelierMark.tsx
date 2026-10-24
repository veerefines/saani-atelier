import { site } from '@/content/site';

/** The atelier's mark at the top of a desk: the logo, the name, and a little handwritten line. */
export default function AtelierMark() {
  return (
    <div className="mark" aria-label={`${site.title}, handmade with love`}>
      <img className="mark-logo" src="/icons/icon-512.png" alt="" width={84} height={84} />
      <p className="mark-name whisper">{site.title}</p>
      <p className="mark-line hand">
        handmade with love <span aria-hidden="true">♡</span>
      </p>
    </div>
  );
}
