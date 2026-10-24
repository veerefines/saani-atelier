import PageHead from '@/components/home/Back';
import PrintButton from '@/components/home/PrintButton';
import { isLocked, listJar, listLetters, postMedia, wallPosts } from '@/lib/data';
import { listDiary, listSongs } from '@/lib/extras';
import { moods } from '@/content/home';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDay = (d: string) => fmt(`${d}T12:00:00Z`);

/** Everything she's received, laid out to print or save as a PDF. Sealed letters stay sealed. */
export default async function BookPage() {
  const [posts, letters, jar, songs, diary] = await Promise.all([wallPosts(), listLetters(), listJar(), listSongs(), listDiary()]);
  const openLetters = letters.filter((l) => !isLocked(l));
  const read = jar.filter((n) => n.drawnAt);
  return (
    <main className="h-page book">
      <div className="book-screen-only">
        <PageHead kicker="a keepsake" title="Your book" sub="Everything your people have given you so far, ready to save as a PDF or print. Sealed letters stay sealed until their day." />
        <PrintButton />
      </div>

      <header className="book-cover">
        <p className="whisper">Saani’s Atelier</p>
        <h1 className="chrome">Saanika</h1>
        <p className="hand">from your people, with love · {fmt(new Date().toISOString())}</p>
      </header>

      {posts.length > 0 && (
        <section className="book-sec">
          <h2 className="hand">Your wall of love</h2>
          <div className="book-grid">
            {posts.map((p) => {
              const photos = postMedia(p);
              return (
                <article key={p.id} className="book-item">
                  {p.kind === 'photo' && photos.length > 0 && (
                    <div className="book-photos">
                      {photos.slice(0, 4).map((m) => (
                        <img key={m} src={`/api/media/${m}`} alt="" />
                      ))}
                    </div>
                  )}
                  {p.kind === 'voice' && <p className="book-media">🎙️ a voice note</p>}
                  {p.kind === 'video' && <p className="book-media">🎬 a little film</p>}
                  {p.text && <p className="book-text">{p.text}</p>}
                  <p className="book-from">
                    {p.authorName} · {fmt(p.showAt ?? p.createdAt)}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {openLetters.length > 0 && (
        <section className="book-sec">
          <h2 className="hand">Letters</h2>
          {openLetters.map((l) => (
            <article key={l.id} className="book-letter">
              <h3 className="whisper">{l.title}</h3>
              <p className="book-text">{l.body}</p>
              <p className="book-from">{l.authorName}</p>
            </article>
          ))}
        </section>
      )}

      {read.length > 0 && (
        <section className="book-sec">
          <h2 className="hand">From your jar</h2>
          <div className="book-grid">
            {read.map((n) => (
              <article key={n.id} className="book-item">
                <p className="book-text">{n.text}</p>
                <p className="book-from">
                  {n.authorName} · for when you’re {moods.find((m) => m.id === n.mood)?.label}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {songs.length > 0 && (
        <section className="book-sec">
          <h2 className="hand">Songs for you</h2>
          <ul className="book-songs">
            {songs.map((s) => (
              <li key={s.id}>
                🎶 {s.note ? `“${s.note}”` : 'a song'} · {s.authorName} <span className="book-url">{s.url}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {diary.length > 0 && (
        <section className="book-sec">
          <h2 className="hand">Your chapter</h2>
          <div className="book-grid">
            {diary.map((d) => (
              <article key={d.id} className="book-item">
                {d.mediaId && (
                  <div className="book-photos">
                    <img src={`/api/media/${d.mediaId}`} alt="" />
                  </div>
                )}
                {d.text && <p className="book-text">{d.text}</p>}
                <p className="book-from">
                  {fmtDay(d.day)} {d.mood}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
