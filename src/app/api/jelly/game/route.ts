import { addEvent, addGame, isGame } from '@/lib/jelly';
import { checkIn } from '@/lib/jelly-world';
import { requireSession, isResponse, json, fail } from '@/lib/api';

// the scores that count for the special daily quests
const QUEST_SCORE = { catch: ['catch20', 20], pop: ['pop30', 30], says: ['says5', 5] } as const;

/** A game with Jelly just ended: its score, pearls (up to 15 a day from games) and a best. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const b = await req.json().catch(() => ({}));
  const game = b.game;
  if (!isGame(game)) return fail('Unknown game.');
  const score = Number(b.score);
  const ms = Number(b.ms);
  if (!Number.isFinite(score) || score < 0 || !Number.isFinite(ms) || ms < 0) return fail('That score doesn’t look right.');
  const r = await addGame(game, score, ms);
  const [ev, need] = QUEST_SCORE[game];
  if (r.score >= need) await addEvent(ev);
  return json({ score: r.score, pearls: r.pearls, best: r.best, ...(await checkIn()) });
}
