import { createHash } from 'crypto';
import * as db from '@/lib/db';
import { assistantReady, groqJson } from '@/lib/assistant';
import { kindOf, milanDay, monthOf } from '@/lib/money';
import { factSheet, facts, tips, type Tip } from '@/lib/money-insights';
import { getBudget, listExpenses } from '@/lib/money-store';
import { requireSession, isResponse, json } from '@/lib/api';

type Saved = { id: string; createdAt: string; key: string; headline: string; tips: Tip[]; via: 'jelly' | 'quick' };

const SYSTEM = `SOLDI-INSIGHTS. You are Jelly, Saanika's bubbly pet jellyfish and friend. She's a fashion management student living in Milan, on a student budget. You've studied her month of spending in Soldi, her money tracker; the facts are in the message.

Write a short headline (one sentence, under 22 words) and 3 or 4 tips. Each tip is specific to her numbers (name the category and the euros), practical for a student in Milan, and kind: never shame or lecture, celebrate what's going well too. At most one emoji in the headline; each tip gets one fitting emoji as its icon. A sweet Italian word now and then (cara, brava) is welcome. Don't invent numbers that aren't in the facts.

Reply with JSON only: {"headline":"…","tips":[{"icon":"☕","text":"…"}]}`;

const QUICK_TTL = 30 * 60_000; // try Jelly again after a while if she was busy

/** Jelly's take on a month: the facts for the charts, plus her headline and tips (cached until the month changes). */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const q = new URL(req.url).searchParams.get('month');
  const today = milanDay();
  const month = q && /^\d{4}-\d{2}$/.test(q) ? q : monthOf(today);
  const [all, budget] = await Promise.all([listExpenses(), getBudget()]);
  const f = facts(all, budget, month, today);

  const mine = all.filter((x) => monthOf(x.day) === month).map((x) => [x.id, x.eur, x.category, x.day, kindOf(x)]);
  // a month in progress changes as the days pass, so today is part of what's cached
  const key = createHash('sha1').update(JSON.stringify([mine, budget.monthly, budget.caps, f.beforeTotal, f.current ? today : ''])).digest('hex');
  const id = `insights-${month}`;
  const saved = await db.get<Saved>('money', id);
  let take: Pick<Saved, 'headline' | 'tips' | 'via'> | null = saved && saved.key === key && (saved.via === 'jelly' || Date.now() - Date.parse(saved.createdAt) < QUICK_TTL) ? saved : null;

  if (!take) {
    const rules = tips(f);
    take = { ...rules, via: 'quick' };
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

  return json({
    month,
    shares: f.shares,
    compare: f.compare,
    beforeTotal: f.beforeTotal,
    sameDay: f.sameDay,
    change: f.change,
    projected: f.projected,
    spent: f.summary.spent,
    inEur: f.summary.inEur,
    net: f.summary.net,
    byIn: f.summary.byIn,
    headline: take.headline,
    tips: take.tips,
    via: take.via,
  });
}
