'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { dayInfo, hourIn, useNow } from './Clock';
import { mediaUrl } from '@/lib/upload-client';
import { site } from '@/content/site';
import NotifyToggle from './NotifyToggle';
import TodayCard from './TodayCard';
import WorldClocks from './WorldClocks';
import { LoveBack, NudgeInbox } from './Nudges';
import { MoodPicker } from './Mood';
import Memory from './Memory';
import AtelierMark from './AtelierMark';
import Corners, { type CornerCounts } from './Corners';
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

export default function Dashboard({
  counts,
  bingoDone,
  preview,
  milano,
  decor,
  corners,
  occasion,
}: {
  counts: Counts;
  bingoDone: boolean[];
  preview: Preview[];
  milano: MilanoInfo;
  decor?: React.ReactNode;
  corners: CornerCounts;
  /** today's festival or special day, if any */
  occasion?: { title: string; emoji: string; note?: string; letters: number } | null;
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
      <MoodPicker />
      <div className="love-back-row">
        <LoveBack />
      </div>
      <NudgeInbox />
      <TodayCard />

      <motion.section className="h-grid" initial="hidden" animate="show" aria-label="Your desk">
        {/* wall of love */}
        <Tile href="/home/love" i={0} className="t-love" tilt={-1.2} label={`Wall of love, ${counts.newPosts} new`}>
          <img className="h-tape" src="/reveal/washi.webp" alt="" />
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
                <span key={p.id} className={`t-mini film n${k}`}>▶</span>
              ) : (
                <span key={p.id} className={`t-mini note n${k}`}>
                  {p.text.slice(0, 40) || '♡'}
                </span>
              ),
            )}
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Wall of love</h2>
            <p className="whisper">
              {counts.posts ? `${counts.posts} ${counts.posts === 1 ? 'message' : 'messages'} from your people` : 'messages from your people land here'}
            </p>
          </div>
        </Tile>

        {/* open when */}
        <Tile href="/home/letters" i={1} className="t-letters" tilt={1.5} label="Open when letters">
          {counts.ready > 0 && <Badge>{counts.ready} to open</Badge>}
          <div className="t-envelopes" aria-hidden="true">
            <span className="env e2" />
            <span className="env e1" />
            <span className="env e0">
              <span className="wax" />
            </span>
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Open when…</h2>
            <p className="whisper">{counts.sealed ? `${counts.sealed} still sealed` : 'letters for the right moment'}</p>
          </div>
        </Tile>

        {/* message jar */}
        <Tile href="/home/jar" i={2} className="t-jar" tilt={-2} label="Message jar">
          <JarArt />
          <div className="h-tile-text">
            <h2 className="hand">Message jar</h2>
            <p className="whisper">for whatever you’re feeling</p>
          </div>
        </Tile>

        {/* bingo */}
        <Tile href="/home/bingo" i={3} className="t-bingo" tilt={1} label={`Milano bingo, ${counts.bingoDone} of ${counts.bingoTotal} done`}>
          <div className="t-bingo-grid" aria-hidden="true">
            {bingoDone.map((d, k) => (
              <span key={k} className={d ? 'done' : ''}>
                {d ? '🌷' : ''}
              </span>
            ))}
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Milano bingo</h2>
            <p className="whisper">
              {counts.bingoDone} of {counts.bingoTotal} done
            </p>
          </div>
        </Tile>

        {/* milano */}
        <Tile href="/home/milano" i={4} className="t-milano" tilt={-1.5} label="Milano corner">
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
            <h2 className="hand">Milano corner</h2>
            <p className="whisper">clocks, days and your wishlist</p>
          </div>
        </Tile>

        {/* journey */}
        <Tile href="/journey" i={5} className="t-journey" tilt={0.8} label="Replay your story">
          <div className="t-filmstrip" aria-hidden="true">
            <span>
              <img src="/reveal/tulips.webp" alt="" />
            </span>
            <span>
              <img src="/reveal/carn-pink-3.webp" alt="" />
            </span>
            <span>
              <img src="/reveal/carn-white-1.webp" alt="" />
            </span>
            <span>
              <img src="/reveal/bow.webp" alt="" />
            </span>
          </div>
          <div className="h-tile-text">
            <h2 className="hand">Your story</h2>
            <p className="whisper">follow the thread again</p>
          </div>
        </Tile>
      </motion.section>

      <Memory />
      <Corners counts={corners} />

      <NotifyToggle />

      <footer className="h-foot">
        <Link href="/?replay=1">Replay the gift</Link>
        <a href="/api/logout">Sign out</a>
      </footer>

    </main>
  );
}
