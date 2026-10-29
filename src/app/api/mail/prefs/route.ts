import { googleAccount } from '@/lib/google';
import { friendEmails } from '@/lib/google';
import { getInvites } from '@/lib/invites';
import { getPrefs, setPrefs } from '@/lib/jelly-mail';
import { mailReady } from '@/lib/mail';
import { requireSession, isResponse, json } from '@/lib/api';

async function view() {
  const [prefs, invites, emails, g] = await Promise.all([getPrefs(), getInvites(), friendEmails(), googleAccount()]);
  const friends = invites.filter((i) => i.role === 'wellwisher');
  return {
    ready: mailReady(),
    inactive: prefs.inactive,
    achievements: prefs.achievements,
    low: prefs.low,
    digest: prefs.digest,
    // who it can reach: her own address comes from the Google account she connected
    myEmail: g?.email || process.env.SAANI_EMAIL || null,
    friends: { total: friends.length, withEmail: friends.filter((f) => emails[f.id]).length, stopped: friends.filter((f) => prefs.optOut.includes(f.id)).length },
  };
}

/** What Jelly may email, and to whom it can reach. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json(await view());
}

/** Switch a kind of email on or off: { inactive?, achievements?, low?, digest? }. */
export async function PUT(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const b = await req.json().catch(() => ({}));
  await setPrefs({ inactive: b.inactive, achievements: b.achievements, low: b.low, digest: b.digest });
  return json(await view());
}
