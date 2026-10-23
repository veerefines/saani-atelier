'use client';

import { motion } from 'framer-motion';
import { site } from '@/content/site';
import { mediaUrl } from '@/lib/upload-client';
import { ClockStamp, dayInfo, hourIn, useNow } from '@/components/home/Clock';
import { Badge, JarArt, Tile } from '@/components/home/Dashboard';

type Preview = { id: string; kind: string; text: string; mediaId?: string };
type Counts = {
  posts: number;
  reacted: number;
  letters: number;
  opened: number;
  jar: number;
  read: number;
  bingoDone: number;
  bingoTotal: number;
  dares: number;
  tips: number;
  tipsDone: number;
};
type MilanoInfo = { arrival: string; homeCity: string; homeZone: string; milanZone: string };

function hello(now: Date | null, zone: string) {
  if (!now) return 'Ciao';
  const h = hourIn(now, zone);
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A friend's desk: the same atelier as hers, set up for leaving things behind. */
export default function WellDesk({
  name,
  counts,
  bingoDone,
  preview,
  milano,
  decor,
}: {
  name: string;
  counts: Counts;
  bingoDone: boolean[];
  preview: Preview[];
  milano: MilanoInfo;
  decor?: React.ReactNode;
}) {
  const now = useNow();
  const day = dayInfo(now, milano.arrival);
  const first = name.split(' ')[0];
  const sent = counts.posts + counts.letters + counts.jar + counts.dares + counts.tips;

  return (
    <main className="h-desk">
      {decor}
      <header className="h-hello">
        <p className="h-label" aria-label={site.title}>
          <span className="whisper h-label-name">{site.brand.name}</span>
          <span className="h-label-word">{site.brand.word}</span>
          <span className="h-label-line">{site.brand.line}</span>
        </p>
        <div className="h-stamps">
          <ClockStamp city="Milano" zone={milano.milanZone} now={now} />
          <ClockStamp city={milano.homeCity} zone={milano.homeZone} now={now} />
        </div>
        <p className="whisper h-greet" suppressHydrationWarning>
          {hello(now, milano.homeZone)},
        </p>
        <h1 className="chrome h-name w-name">{first}</h1>
        <p className="hand h-day" suppressHydrationWarning>
          {!now ? ' ' : day.before ? `${plural(day.n, 'sleep')} until Saanika lands in Milano` : `Saanika’s day ${day.n} in Milano`}
        </p>
        <p className="whisper w-desk-sub">psst, it’s a surprise. Leave her something to find.</p>
      </header>

      <motion.section className="h-grid" initial="hidden" animate="show" aria-label="Things to leave for Saanika">
        {/* wall of love */}
        <Tile href="/wall/love" i={0} className="t-love" tilt={-1.2} label="Pin something to her wall of love">
          <img className="h-tape" src="/reveal/washi.webp" alt="" />
          {counts.reacted > 0 && <Badge>she loved {counts.reacted}</Badge>}
          <div className="t-love-board" aria-hidden="true">
            {preview.length === 0 && (
              <>
                <span className="t-mini note n0">Dear Saanika…</span>
                <span className="t-mini polaroid n1" />
                <span className="t-mini cass n2">
                  <i />
                  <i />
                </span>
              </>
            )}
            {preview.map((p, k) =>
              p.kind === 'photo' && p.mediaId ? (
                <span key={p.id} className={`t-mini polaroid n${k}`}>
                  <img src={mediaUrl(p.mediaId)} alt="" />
                </span>
              ) : p.kind === 'voice' ? (
                <span key={p.id} className={`t-mini cass n${k}`}>
                  <i />
                  <i />
                </span>
              ) : p.kind === 'video' ? (
                <span key={p.id} className={`t-mini film n${k}`}>▶</span>
              ) : (
                <span key={p.id} className={`t-mini note n${k}`}>
                  {p.text.slice(0, 40) || '♡'}
                </span>
              ),
            )}
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Pin to her wall</h2>
            <p className="whisper">{counts.posts ? `${plural(counts.posts, 'thing')} pinned · photos, voice notes, films` : 'messages, photo albums, voice notes and little films'}</p>
          </div>
        </Tile>

        {/* open when */}
        <Tile href="/wall/letters" i={1} className="t-letters" tilt={1.5} label="Write her an open-when letter">
          {counts.opened > 0 && <Badge>{counts.opened} opened</Badge>}
          <div className="t-envelopes" aria-hidden="true">
            <span className="env e2" />
            <span className="env e1" />
            <span className="env e0">
              <span className="wax" />
            </span>
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Open when…</h2>
            <p className="whisper">{counts.letters ? `${plural(counts.letters, 'letter')} sealed by you` : 'seal a letter for the right moment'}</p>
          </div>
        </Tile>

        {/* jar */}
        <Tile href="/wall/jar" i={2} className="t-jar" tilt={-2} label="Drop notes into her message jar">
          {counts.read > 0 && <Badge>{counts.read} read</Badge>}
          <JarArt />
          <div className="h-tile-text">
            <h2 className="hand">Fill her jar</h2>
            <p className="whisper">{counts.jar ? `${plural(counts.jar, 'note')} from you` : 'a note for every feeling'}</p>
          </div>
        </Tile>

        {/* bingo */}
        <Tile href="/wall/bingo" i={3} className="t-bingo" tilt={1} label={`Cheer her bingo, ${counts.bingoDone} of ${counts.bingoTotal} done`}>
          <div className="t-bingo-grid" aria-hidden="true">
            {bingoDone.map((d, k) => (
              <span key={k} className={d ? 'done' : ''}>
                {d ? '🌷' : ''}
              </span>
            ))}
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Cheer her bingo</h2>
            <p className="whisper">
              she’s done {counts.bingoDone} of {counts.bingoTotal}
              {counts.dares ? ` · ${plural(counts.dares, 'dare')} from you` : ''}
            </p>
          </div>
        </Tile>

        {/* milano tips */}
        <Tile href="/wall/milano" i={4} className="t-milano" tilt={-1.5} label="Give her Milano tips">
          {counts.tipsDone > 0 && <Badge>{counts.tipsDone} visited</Badge>}
          <div className="t-postcard" aria-hidden="true">
            <span className="t-stamp">
              <img src="/reveal/carn-white-1.webp" alt="" />
            </span>
            <span className="t-postmark">MILANO</span>
            <span className="hand t-day" suppressHydrationWarning>
              {day.before ? `${day.n}` : day.n ? `Day ${day.n}` : ''}
            </span>
            <span className="t-lines" />
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Milano tips</h2>
            <p className="whisper">{counts.tips ? `${plural(counts.tips, 'tip')} on her list` : 'tell her where to go'}</p>
          </div>
        </Tile>

        {/* sent box */}
        <Tile href="/wall/sent" i={5} className="t-journey t-sent" tilt={0.8} label={`Your sent box, ${sent} things`}>
          <div className="t-sentbox" aria-hidden="true">
            <span>
              <b>{counts.posts}</b>pinned
            </span>
            <span>
              <b>{counts.letters}</b>letters
            </span>
            <span>
              <b>{counts.jar}</b>jar notes
            </span>
            <span>
              <b>{counts.dares + counts.tips}</b>dares &amp; tips
            </span>
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Your sent box</h2>
            <p className="whisper">{sent ? 'see what she’s opened and loved' : 'everything you send lands here'}</p>
          </div>
        </Tile>
      </motion.section>

      <footer className="h-foot">
        <a href="/api/logout">Sign out</a>
      </footer>
    </main>
  );
}
