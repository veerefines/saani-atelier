'use client';

import { motion } from 'framer-motion';
import { site } from '@/content/site';
import { mediaUrl } from '@/lib/upload-client';
import { dayInfo, hourIn, useNow } from '@/components/home/Clock';
import Link from 'next/link';
import { Badge, JarArt, Tile } from '@/components/home/Dashboard';
import NotifyToggle from '@/components/home/NotifyToggle';
import WorldClocks from '@/components/home/WorldClocks';
import AtelierMark from '@/components/home/AtelierMark';
import CallPlanner from '@/components/home/CallPlanner';
import { NudgeSend } from '@/components/home/Nudges';
import { MoodStatus } from '@/components/home/Mood';
import { LatestMoment } from '@/components/home/Moments';

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
  songs: number;
  pages: number;
  herShared: number;
  stamps: number;
};
type MilanoInfo = { arrival: string; homeCity: string; homeZone: string; milanZone: string; laCity: string; laZone: string };

/** Greets each friend in their own time, wherever they're signed in from. */
function hello(now: Date | null, fallbackZone: string) {
  if (!now) return 'Ciao';
  const h = hourIn(now, Intl.DateTimeFormat().resolvedOptions().timeZone || fallbackZone);
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
  admin = false,
  soon = null,
  me = '',
}: {
  name: string;
  counts: Counts;
  bingoDone: boolean[];
  preview: Preview[];
  milano: MilanoInfo;
  decor?: React.ReactNode;
  admin?: boolean;
  /** her next special day, when it's close */
  soon?: { title: string; emoji: string; days: number } | null;
  /** the signed-in friend's id (to show their own reactions) */
  me?: string;
}) {
  const now = useNow();
  const day = dayInfo(now, milano.arrival);
  const first = name.split(' ')[0];
  const sent = counts.posts + counts.letters + counts.jar + counts.dares + counts.tips;

  return (
    <main className="h-desk">
      {decor}
      <header className="h-hello">
        <AtelierMark />
        <WorldClocks />
        <p className="whisper h-greet" suppressHydrationWarning>
          {hello(now, milano.homeZone)},
        </p>
        <h1 className="chrome h-name w-name">{first}</h1>
        <p className="hand h-day" suppressHydrationWarning>
          {!now ? ' ' : day.before ? `${plural(day.n, 'sleep')} until Saanika lands in Milano` : `Saanika’s day ${day.n} in Milano`}
        </p>
        <p className="whisper w-desk-sub">psst, it’s a surprise. Leave her something to find.</p>
      </header>

      {/* on a laptop these sit side by side under the header */}
      <div className="desk-top wall-top">
        <LatestMoment me={me} />
        <div className="wall-right">
          {soon && (
            <section className="dk-card w-soon" aria-label="Coming up">
              <div className="dk-head">
                <span className="hand">coming up</span>
                <small>{soon.days === 0 ? 'today' : soon.days === 1 ? 'tomorrow' : `in ${soon.days} days`}</small>
              </div>
              <p className="dk-line">
                <span className="dk-emoji" aria-hidden="true">
                  {soon.emoji}
                </span>
                <span>
                  {soon.days === 0 ? (
                    <>
                      It’s <b>{soon.title}</b> for Saanika today.
                    </>
                  ) : (
                    <>
                      <b>{soon.title}</b> is {soon.days === 1 ? 'tomorrow' : `in ${soon.days} days`}.
                    </>
                  )}
                </span>
              </p>
              <Link href="/wall/letters" className="w-link dk-link">
                {soon.days === 0 ? 'Send her something →' : 'Seal her a letter for the day →'}
              </Link>
            </section>
          )}
          <MoodStatus />
          <NudgeSend />
        </div>
      </div>

      <section className="today call-card" aria-label="Good time to call Saanika">
        <CallPlanner firstName={first} />
      </section>

      <motion.section className="h-grid" initial="hidden" animate="show" aria-label="Things to leave for Saanika">
        {/* wall of love */}
        <Tile href="/wall/love" i={0} className="t-love" tilt={-1.2} label="Pin something to Yaadon ka Samandar">
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
            <h2 className="hand">Yaadon ka Samandar!</h2>
            <p className="whisper">{counts.posts ? `${plural(counts.posts, 'thing')} pinned · photos, voice notes, films` : 'messages, photo albums, voice notes and little films'}</p>
          </div>
        </Tile>

        {/* open when */}
        <Tile href="/wall/letters" i={1} className="t-letters" tilt={1.5} label="Write her a letter for Likhe Jo Khat Tujhe">
          {counts.opened > 0 && <Badge>{counts.opened} opened</Badge>}
          <div className="t-envelopes" aria-hidden="true">
            <span className="env e2" />
            <span className="env e1" />
            <span className="env e0">
              <span className="wax" />
            </span>
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Likhe Jo Khat Tujhe!</h2>
            <p className="whisper">{counts.letters ? `${plural(counts.letters, 'letter')} sealed by you` : 'seal a letter for the right moment'}</p>
          </div>
        </Tile>

        {/* jar */}
        <Tile href="/wall/jar" i={2} className="t-jar" tilt={-2} label="Drop notes into her Khushiyon ka Pitara">
          {counts.read > 0 && <Badge>{counts.read} read</Badge>}
          <JarArt />
          <div className="h-tile-text">
            <h2 className="hand">Khushiyon ka Pitara!</h2>
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
            <h2 className="hand">Milano Mei Milo!</h2>
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

      <section className="corners" aria-label="More">
        <h2 className="hand corners-title">more ways to show up</h2>
        <div className="corners-grid">
          {[
            { href: '/journey', icon: '✨', title: 'Her story', sub: 'the journey so far', tint: '#fde3ea' },
            { href: '/wall/songs', icon: '🎶', title: 'Dedicate a song', sub: counts.songs ? `${counts.songs} from you` : 'for her playlist', tint: '#e6dcf7' },
            { href: '/wall/scrapbooks', icon: '📒', title: 'Scrapbook pages', sub: counts.pages ? `${counts.pages} to add to` : 'made together', tint: '#ffe0c4' },
            { href: '/wall/her', icon: '🛂', title: 'Her Milano life', sub: `${counts.stamps} stamps · ${counts.herShared} shared`, tint: '#d3e9f6' },
            ...(admin ? [{ href: '/admin', icon: '🧵', title: 'Atelier admin', sub: 'friends, dates, journey', tint: '#f8ebbf' }] : []),
          ].map((k) => (
            <Link key={k.href} href={k.href} className="corner" style={{ ['--tint' as string]: k.tint }}>
              <span className="corner-icon" aria-hidden="true">
                {k.icon}
              </span>
              <b>{k.title}</b>
              <small>{k.sub}</small>
            </Link>
          ))}
        </div>
      </section>

      <NotifyToggle offLabel="Remind me before her special days" onLabel="You’ll get reminders and her replies" />

      <footer className="h-foot">
        <a href="/api/logout">Sign out</a>
      </footer>
    </main>
  );
}
