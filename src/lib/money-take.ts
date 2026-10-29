import { createHash } from 'crypto';
import * as db from './db';
import { assistantReady, groqJson } from './assistant';
import { kindOf, milanDay, monthOf, type Budget, type Expense } from './money';
import { factSheet, facts, tips, type Facts, type Tip } from './money-insights';

/**
 * Jelly's take on a month (a headline and a few tips), shared by the Soldi screen and WhatsApp. It's
 * saved per month and only worked out again when that month's numbers change, to spare the free Groq
 * tier; when Jelly can't answer, the rule-based tips stand in.
 */
type Saved = { id: string; createdAt: string; key: string; headline: string; tips: Tip[]; via: 'jelly' | 'quick' };
export type Take = Pick<Saved, 'headline' | 'tips' | 'via'>;

const SYSTEM = `SOLDI-INSIGHTS. You are Jelly, Saanika's bubbly pet jellyfish and friend. She's a fashion management student living in Milan, on a student budget. You've studied her month of spending in Soldi, her money tracker; the facts are in the message.

Write a short headline (one sentence, under 22 words) and 3 or 4 tips. Each tip is specific to her numbers (name the category and the euros), practical for a student in Milan, and kind: never shame or lecture, celebrate what's going well too. At most one emoji in the headline; each tip gets one fitting emoji as its icon. A sweet Italian word now and then (cara, brava) is welcome. Don't invent numbers that aren't in the facts.

Reply with JSON only: {"headline":"…","tips":[{"icon":"☕","text":"…"}]}`;

const QUICK_TTL = 30 * 60_000; // try Jelly again after a while if she was busy

export async function jellyTake(all: Expense[], budget: Budget, month: string, today = milanDay()): Promise<{ f: Facts; take: Take }> {
  const f = facts(all, budget, month, today);
  const mine = all.filter((x) => monthOf(x.day) === month).map((x) => [x.id, x.eur, x.category, x.day, kindOf(x)]);
  // a month in progress changes as the days pass, so today is part of what's cached
  const key = createHash('sha1').update(JSON.stringify([mine, budget.monthly, budget.caps, f.beforeTotal, f.current ? today : ''])).digest('hex');
  const id = `insights-${month}`;
  const saved = await db.get<Saved>('money', id);
  let take: Take | null = saved && saved.key === key && (saved.via === 'jelly' || Date.now() - Date.parse(saved.createdAt) < QUICK_TTL) ? saved : null;

  if (!take) {
    take = { ...tips(f), via: 'quick' };
    if (assistantReady() && f.summary.count + f.summary.inCount > 0) {
      try {
        const r = await groqJson<{ headline?: unknown; tips?: unknown }>(SYSTEM, factSheet(f), 450);
        const list = Array.isArray(r?.tips)
          ? (r.tips as { icon?: unknown; text?: unknown }[])
              .filter((t) => t && typeof t.text === 'string' && t.text.trim())
              .slice(0, 4)
              .map((t) => ({ icon: typeof t.icon === 'string' && t.icon.length <= 8 ? t.icon : '✨', text: (t.text as string).trim().slice(0, 240) }))
          : [];
        if (typeof r?.headline === 'string' && r.headline.trim() && list.length) take = { headline: r.headline.trim().slice(0, 200), tips: list, via: 'jelly' };
      } catch {
        // busy or offline: the rule-based tips stand in
      }
    }
    await db.put<Saved>('money', { id, createdAt: new Date().toISOString(), key, ...take });
  }
  return { f, take: { headline: take.headline, tips: take.tips, via: take.via } };
}
