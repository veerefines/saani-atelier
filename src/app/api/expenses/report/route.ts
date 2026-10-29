import { milanDay, monthOf } from '@/lib/money';
import { cleanEmails, getRecipients, lastSent, manualAllowed, sendReport, setRecipients } from '@/lib/money-report';
import { mailReady } from '@/lib/mail';
import { isEmail } from '@/lib/google';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** Who Jelly emails the monthly sheet to, and when the last ones went. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json({ ready: mailReady(), recipients: await getRecipients(), lastSent: await lastSent() });
}

/** Change who it goes to. */
export async function PUT(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const b = await req.json().catch(() => ({}));
  const raw: unknown[] = Array.isArray(b.emails) ? b.emails : [];
  const emails = cleanEmails(raw);
  if (raw.some((e) => !isEmail(typeof e === 'string' ? e.trim() : e))) return fail('One of those doesn’t look like an email address.');
  return json({ recipients: await setRecipients(emails) });
}

/** Send the sheet right now (the month she's looking at, this month by default). */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  if (!mailReady()) return fail('Email isn’t switched on for the site yet (Varun is setting it up).', 503);
  const b = await req.json().catch(() => ({}));
  const month = typeof b.month === 'string' && /^\d{4}-\d{2}$/.test(b.month) && b.month <= monthOf(milanDay()) ? b.month : monthOf(milanDay());
  if (!(await getRecipients()).length) return fail('Add at least one email address first.');
  if (!(await manualAllowed())) return fail('That’s enough sheets for today. Try again tomorrow? 🫧', 429);
  const r = await sendReport(month);
  if (!r) return fail('Add at least one email address first.');
  if (!r.sent.length) return fail('Jelly couldn’t send it just now. Try again in a bit.', 502);
  return json({ month, sent: r.sent, failed: r.failed });
}
