'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import Bouquet, { type BouquetState } from './PhotoBouquet';
import GiftTag, { type Unlocked } from './GiftTag';
import NoteCard, { type Note } from './NoteCard';
import ThreadOverlay from './ThreadOverlay';
import Petals from './Petals';

type Stage = 'locked' | 'tied' | 'untying' | 'open' | 'thread' | 'note';
type Pt = { x: number; y: number };

export default function GiftScene({
  initialStage,
  note,
  error,
}: {
  initialStage: 'locked' | 'tied';
  note: Note;
  error?: string;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>(initialStage);
  const [petals, setPetals] = useState(false);
  const [threadPts, setThreadPts] = useState<{ from: Pt; to: Pt } | null>(null);
  const bouquetBox = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);

  const bouquetState: BouquetState =
    stage === 'locked' || stage === 'tied' ? 'tied' : stage === 'untying' ? 'untying' : 'open';

  // untying -> open -> thread
  useEffect(() => {
    const next: Partial<Record<Stage, [number, Stage]>> = {
      untying: [850, 'open'],
      open: [2300, 'thread'],
    };
    const step = next[stage];
    if (!step) return;
    const id = window.setTimeout(() => setStage(step[1]), step[0]);
    return () => window.clearTimeout(id);
  }, [stage]);

  // petals drift for a few seconds once the paper opens
  useEffect(() => {
    if (stage !== 'open' || reduce) return;
    setPetals(true);
    const id = window.setTimeout(() => setPetals(false), 6500);
    return () => window.clearTimeout(id);
  }, [stage, reduce]);

  // measure where the thread starts (the centre tulip) and ends (the note spot)
  useEffect(() => {
    if (stage !== 'thread') return;
    const b = bouquetBox.current?.getBoundingClientRect();
    const s = slot.current?.getBoundingClientRect();
    if (!b || !s) {
      setStage('note');
      return;
    }
    setThreadPts({
      from: { x: b.left + b.width * 0.5, y: b.top + b.height * 0.3 },
      to: { x: s.left + s.width / 2, y: s.top + 36 },
    });
  }, [stage]);

  const untie = useCallback(() => {
    setStage(reduce ? 'note' : 'untying');
  }, [reduce]);

  const unlocked = useCallback(
    (who: Unlocked) => {
      if (who.role === 'wellwisher') {
        router.push('/wall');
        return;
      }
      setStage('tied');
    },
    [router],
  );

  const finish = useCallback(() => {
    document.cookie = 'sa_seen=1; path=/; max-age=31536000; samesite=lax';
    router.push('/journey');
  }, [router]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="scene">
        <div ref={bouquetBox} style={{ position: 'relative' }}>
          <Bouquet
            state={bouquetState}
            showString={stage === 'locked'}
            interactive={stage === 'tied'}
            onUntie={untie}
            small={stage === 'note'}
            big={stage !== 'locked' && stage !== 'note'}
          />
          {petals && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
              <Petals />
            </div>
          )}
        </div>

        <div className="slot" ref={slot}>
          <AnimatePresence>
            {stage === 'locked' && <GiftTag key="tag" initialError={error} onUnlocked={unlocked} />}
          </AnimatePresence>

          <AnimatePresence>
            {stage === 'tied' && (
              <motion.p
                key="hint"
                className="whisper hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={{ duration: 0.8, delay: 0.9 }}
                aria-live="polite"
              >
                Tap the bow to untie it.
              </motion.p>
            )}
          </AnimatePresence>

          {stage === 'note' && <NoteCard note={note} onContinue={finish} />}
        </div>

        <AnimatePresence>
          {stage === 'thread' && threadPts && (
            <ThreadOverlay key="thread" from={threadPts.from} to={threadPts.to} onDone={() => setStage('note')} />
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
