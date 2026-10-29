'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { dayInfo, hourIn, useNow } from './Clock';
import { mediaUrl } from '@/lib/upload-client';
import { site } from '@/content/site';
import { bingo as BINGO } from '@/content/home';
import NotifyToggle from './NotifyToggle';
import TodayCard from './TodayCard';
import MorningBrief from './MorningBrief';
import WorldClocks from './WorldClocks';
import { LoveBack, NudgeInbox } from './Nudges';
import { MoodPicker } from './Mood';
import { ShareMoment, type Friend } from './Moments';
import Memory from './Memory';
import AtelierMark from './AtelierMark';
import Corners, { type CornerCounts } from './Corners';
import SoundSettings from './SoundSettings';
import OccasionBanner from './OccasionBanner';

type Preview = { id: string; kind: string; text: string; mediaId?: string; authorName: string };
type Counts = { posts: number; newPosts: number; ready: number; sealed: number; jar: number; bingoDone: number; bingoTotal: number };
type MilanoInfo = { arrival: string; homeCity: string; homeZone: string; milanZone: string; laCity: string; laZone: string };

const drop: Variants = {
  hidden: { opacity: 0, y: -40, rotate: 0 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: { type: 'spring', stiffness: 120, damping: 14, delay: 0.15 + i * 0.09 },
  }),
};

function greeting(now: Date | null, zone: string) {
  if (!now) return 'Ciao';
  const h = hourIn(now, zone);
  if (h < 5) return 'Still up';
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export function Tile({
  href,
  i,
  className,
  tilt,
  children,
  label,
}: {
  href: string;
  i: number;
  className: string;
  tilt: number;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <motion.div custom={i} variants={drop} className={`h-tile ${className}`} style={{ ['--tilt' as string]: `${tilt}deg` }}>
      <Link href={href} className="h-tile-link" aria-label={label}>
        {children}
      </Link>
    </motion.div>
  );
}

/** A string of fairy lights across the top of the memories board. */
export function FairyLights() {
  const bulbs = [6, 15, 24, 33, 42, 51, 60, 69, 78, 87, 95];
  const colors = ['#ffd27a', '#ffb3c8', '#cdb4f0', '#bfe6f5', '#ffe8a3'];
  return (
    <svg className="t-lights" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 2 Q 25 12 50 6 T 100 3" fill="none" stroke="rgba(90, 60, 40, 0.45)" strokeWidth="0.5" />
      {bulbs.map((x, i) => {
        // on the wire: the two curves of the path above (x stands in for the curve's t)
        const t = x < 50 ? x / 50 : (x - 50) / 50;
        const y = x < 50 ? (1 - t) ** 2 * 2 + 2 * (1 - t) * t * 12 + t * t * 6 : (1 - t) ** 2 * 6 + t * t * 3;
        return <ellipse key={x} className="bulb" cx={x} cy={y + 1.6} rx="1.1" ry="1.6" fill={colors[i % colors.length]} style={{ animationDelay: `${(i % 4) * 0.45}s` }} />;
      })}
    </svg>
  );
}

/** Milano's skyline in pastel: the Duomo's spires, the Galleria and a little tram. */
export function Skyline() {
  return (
    <svg className="t-skyline" viewBox="0 0 200 60" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <circle cx="168" cy="16" r="9" fill="#ffd9a8" opacity="0.8" />
      <path d="M0 60 V44 h14 v-6 h10 v6 h12 V40 h16 v20z" fill="#f2c9b8" />
      <g fill="#e9b7c6">
        <path d="M56 60 V34 h44 v26z" />
        {[58, 64, 70, 76, 82, 88, 94].map((x) => (
          <path key={x} d={`M${x} 34 l2 -12 l2 12z`} />
        ))}
        <path d="M76 34 l2 -26 l2 26z" />
        <circle cx="78" cy="7" r="1.6" fill="#f2c84b" />
      </g>
      <path d="M100 60 V38 q14 -14 28 0 v22z" fill="#d9c3ea" />
      <path d="M106 60 V46 q8 -8 16 0 v14z" fill="#f6eefc" />
      <path d="M128 60 V42 h22 v18z M150 60 V48 h50 v12z" fill="#f2c9b8" />
      <g>
        <rect x="140" y="50" width="30" height="8" rx="2" fill="#f2c84b" />
        <rect x="143" y="52" width="5" height="3" rx="0.6" fill="#fff8e6" />
        <rect x="151" y="52" width="5" height="3" rx="0.6" fill="#fff8e6" />
        <rect x="159" y="52" width="5" height="3" rx="0.6" fill="#fff8e6" />
        <path d="M155 50 v-5 l-3 -3" stroke="#8a6a4a" strokeWidth="0.8" fill="none" />
      </g>
    </svg>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="h-seal">{children}</span>;
}

/** The little glass jar full of paper hearts. */
export function JarArt() {
  return (
    <svg className="t-jar-svg" viewBox="0 0 120 140" aria-hidden="true">
      <defs>
        <linearGradient id="glass" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <rect x="34" y="8" width="52" height="16" rx="4" fill="#c99a68" />
      <rect x="34" y="8" width="52" height="5" rx="2.5" fill="#dcb385" />
      <path d="M30 26 h60 q6 0 6 8 v84 q0 14 -14 14 h-44 q-14 0 -14 -14 v-84 q0 -8 6 -8z" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
      {[
        [44, 112, '#f4a6c0', -15],
        [62, 116, '#f7e3a1', 10],
        [80, 110, '#cdb4f0', 25],
        [52, 96, '#ffd0dc', 30],
        [72, 94, '#bfe0d6', -20],
        [60, 80, '#f27ca2', 5],
        [46, 72, '#fff1f4', -30],
        [78, 76, '#f7c9a8', 15],
      ].map(([x, y, c, r], k) => (
        <g key={k} transform={`translate(${x} ${y}) rotate(${r})`} className="t-heart">
          <path d="M0 4 C -9 -3 -6 -11 0 -6 C 6 -11 9 -3 0 4 Z" fill={c as string} stroke="rgba(120,40,70,0.25)" strokeWidth="0.8" />
        </g>
      ))}
      <path d="M30 26 h60 q6 0 6 8 v84 q0 14 -14 14 h-44 q-14 0 -14 -14 v-84 q0 -8 6 -8z" fill="url(#glass)" />
      <path d="M36 36 q-2 30 0 70" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" fill="none" />
    </svg>
  );
}

const STORY_FILL = ['/reveal/tulips.webp', '/reveal/carn-pink-3.webp', '/reveal/carn-white-1.webp', '/reveal/bow.webp'];

export default function Dashboard({
  counts,
  bingoDone,
  preview,
  milano,
  decor,
  corners,
  occasion,
  friends = [],
  story = [],
}: {
  counts: Counts;
  bingoDone: boolean[];
  preview: Preview[];
  milano: MilanoInfo;
  decor?: React.ReactNode;
  corners: CornerCounts;
  /** today's festival or special day, if any */
  occasion?: { title: string; emoji: string; note?: string; letters: number } | null;
  /** her people, for choosing who gets a moment */
  friends?: Friend[];
  /** the best photos from her journey, for the film strip */
  story?: string[];
}) {
  const now = useNow();
  const day = dayInfo(now, milano.arrival);

  return (
    <main className="h-desk">
      {decor}
      <header className="h-hello">
        <AtelierMark />
        <WorldClocks />
        <p className="whisper h-greet" suppressHydrationWarning>
          {greeting(now, milano.milanZone)},
        </p>
        <h1 className="chrome h-name">Saanika</h1>
        <p className="hand h-day" suppressHydrationWarning>
          {day.label || ' '}
        </p>
      </header>

      {occasion && <OccasionBanner occasion={occasion} />}
      {/* on a laptop these sit side by side under the header */}
      <div className="desk-top desk-top-her">
        <div className="desk-left">
          <div className="desk-col">
            <MoodPicker />
            <div className="love-back-row">
              <LoveBack />
            </div>
          </div>
          <ShareMoment friends={friends} />
        </div>
        <NudgeInbox />
      </div>
      <MorningBrief />
      <TodayCard />

      <motion.section className="h-grid" initial="hidden" animate="show" aria-label="Your desk">
        {/* wall of love */}
        <Tile href="/home/love" i={0} className="t-love" tilt={-1.2} label={`Yaadon ka Samandar, ${counts.newPosts} new`}>
          <FairyLights />
          {counts.newPosts > 0 && <Badge>{counts.newPosts} new</Badge>}
          <div className="t-love-board" aria-hidden="true">
            {preview.length === 0 && (
              <>
                <span className="t-mini note n0">soon…</span>
                <span className="t-mini polaroid n1" />
                <span className="t-mini note n2">♡</span>
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
                <span key={p.id} className={`t-mini film n${k}`}>
                  {p.mediaId && <video src={`${mediaUrl(p.mediaId)}#t=0.1`} muted playsInline preload="metadata" tabIndex={-1} />}
                  <b>▶</b>
                </span>
              ) : (
                <span key={p.id} className={`t-mini note n${k}`}>
                  {p.text.slice(0, 40) || '♡'}
                </span>
              ),
            )}
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Yaadon ka Samandar!</h2>
            <p className="whisper">
              {counts.posts ? `${counts.posts} ${counts.posts === 1 ? 'message' : 'messages'} from your people` : 'messages from your people land here'}
            </p>
          </div>
        </Tile>

        {/* open when */}
        <Tile href="/home/letters" i={1} className="t-letters" tilt={1.5} label="Likhe Jo Khat Tujhe letters">
          {counts.ready > 0 && <Badge>{counts.ready} to open</Badge>}
          <span className="t-airmail" aria-hidden="true" />
          <div className="t-envelopes" aria-hidden="true">
            <span className="env e2" />
            <span className="env e1" />
            <span className="env e0">
              <span className="wax" />
              <span className="env-stamp" />
            </span>
            <span className="t-heartfloat h1">♡</span>
            <span className="t-heartfloat h2">♡</span>
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Likhe Jo Khat Tujhe!</h2>
            <p className="whisper">{counts.sealed ? `${counts.sealed} still sealed` : 'letters for the right moment'}</p>
          </div>
        </Tile>

        {/* message jar */}
        <Tile href="/home/jar" i={2} className="t-jar" tilt={-2} label="Khushiyon ka Pitara">
          <div className="t-jar-stage" aria-hidden="true">
            <span className="t-jar-glow" />
            <JarArt />
            <span className="t-jar-float f1">♥</span>
            <span className="t-jar-float f2">♥</span>
            <span className="t-jar-float f3">✦</span>
            <span className="t-jar-tag">{counts.jar ? `${counts.jar} notes` : 'notes'}</span>
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Khushiyon ka Pitara!</h2>
            <p className="whisper">for whatever you’re feeling</p>
          </div>
        </Tile>

        {/* bingo */}
        <Tile href="/home/bingo" i={3} className="t-bingo" tilt={1} label={`Milano bingo, ${counts.bingoDone} of ${counts.bingoTotal} done`}>
          <div className="t-bingo-grid" aria-hidden="true">
            {bingoDone.map((d, k) => (
              <span key={k} className={d ? 'done' : ''} style={{ ['--d' as string]: `${(k % 5) * 0.06 + Math.floor(k / 5) * 0.06}s` }}>
                <i>{d ? '🌷' : (BINGO[k]?.icon ?? '')}</i>
              </span>
            ))}
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Milano bingo</h2>
            <p className="whisper">
              {counts.bingoDone} of {counts.bingoTotal} done
            </p>
            <span className="t-progress" aria-hidden="true">
              <span style={{ width: `${(counts.bingoDone / Math.max(1, counts.bingoTotal)) * 100}%` }} />
            </span>
          </div>
        </Tile>

        {/* milano */}
        <Tile href="/home/milano" i={4} className="t-milano" tilt={-1.5} label="Milano Mei Milo">
          <div className="t-postcard" aria-hidden="true">
            <span className="t-stamp">
              <img src="/reveal/carn-white-1.webp" alt="" />
            </span>
            <span className="t-postmark">MILANO</span>
            <span className="t-waves" />
            <span className="t-ciao">Ciao from</span>
            <span className="hand t-day" suppressHydrationWarning>
              {day.before ? `${day.n} days to go` : day.n ? `Day ${day.n}` : ''}
            </span>
            <span className="t-lines" />
          </div>
          <Skyline />
          <div className="h-tile-text">
            <h2 className="hand">Milano Mei Milo!</h2>
            <p className="whisper">clocks, days and your wishlist</p>
          </div>
        </Tile>

        {/* journey */}
        <Tile href="/journey" i={5} className="t-journey" tilt={0.8} label="Replay your story">
          <div className="t-filmstrip" aria-hidden="true">
            {/* her best journey photos; flowers fill in until there are enough */}
            {[...story, ...STORY_FILL].slice(0, 4).map((src) => (
              <span key={src} className={STORY_FILL.includes(src) ? undefined : 'photo'}>
                <img src={src} alt="" loading="lazy" />
              </span>
            ))}
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Your story</h2>
            <p className="whisper">follow the thread again</p>
          </div>
        </Tile>
      </motion.section>

      <Memory />
      <Corners counts={corners} />
      <SoundSettings />

      <NotifyToggle />

      <footer className="h-foot">
        <Link href="/?replay=1">Replay the gift</Link>
        <a href="/api/logout">Sign out</a>
      </footer>

    </main>
  );
}
