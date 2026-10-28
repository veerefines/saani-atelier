import { createMeet, friendEmails, googleLinked, googleReady, GoogleNotLinked } from '@/lib/google';
import { listMeetups, newMeetupId, saveMeetup, upcoming } from '@/lib/meetups';
import { getInvites } from '@/lib/invites';
import { people } from '@/lib/zones';
import { notifyPerson } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const first = (n: string) => n.split(' ')[0];

/** Saani: every meetup to come, and the friends she can invite. A friend: the ones they're invited to. */
export async function GET() {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const [all, invites, emails, everyone] = await Promise.all([listMeetups(), getInvites(), friendEmails(), people()]);
  const zone = Object.fromEntries(everyone.map((p) => [p.id, { tz: p.tz, city: p.city }]));
  const names = Object.fromEntries(invites.map((i) => [i.id, i.name]));
  const list = upcoming(all).filter((m) => s.role === 'saanika' || m.friendIds.includes(s.id));
  if (s.role !== 'saanika') {
    // a friend sees who else is coming, and their own answer
    return json({ meetups: list.map((m) => ({ ...m, friends: m.friendIds.map((id) => ({ id, name: names[id] ?? 'a friend' })), mine: m.rsvp[s.id] ?? null })) });
  }
  return json({
    google: { ready: googleReady(), linked: await googleLinked() },
    me: zone[s.id] ?? { tz: 'Europe/Rome', city: 'Milano' },
    friends: invites.filter((i) => i.role === 'wellwisher').map((i) => ({ id: i.id, name: i.name, hasEmail: Boolean(emails[i.id]), ...(zone[i.id] ?? { tz: 'Asia/Kolkata', city: 'Mumbai' }) })),
    meetups: list.map((m) => ({ ...m, friends: m.friendIds.map((id) => ({ id, name: names[id] ?? 'a friend', rsvp: m.rsvp[id] ?? null })) })),
  });
}

/** Saani sets up a call: { title, start (ISO), minutes, friendIds }. It goes in her Google Calendar with a Meet link. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const b = await req.json().catch(() => ({}));
  const title = typeof b.title === 'string' ? b.title.trim().slice(0, 80) : '';
  const start = typeof b.start === 'string' && !isNaN(Date.parse(b.start)) ? new Date(b.start).toISOString() : '';
  const minutes = Math.round(Number(b.minutes));
  const invites = await getInvites();
  const friendIds: string[] = Array.isArray(b.friendIds) ? [...new Set(b.friendIds.filter((id: unknown) => invites.some((i) => i.id === id && i.role === 'wellwisher')))] as string[] : [];
  if (!title) return fail('Give the call a name.');
  if (!start || Date.parse(start) < Date.now() - 5 * 60_000) return fail('Pick a time that’s still to come.');
  if (Date.parse(start) > Date.now() + 366 * 86_400_000) return fail('That’s a bit far ahead.');
  if (!(minutes >= 15 && minutes <= 240)) return fail('A call can be 15 minutes to 4 hours.');
  if (!friendIds.length) return fail('Invite at least one friend.');
  if (!googleReady()) return fail('Google Meet isn’t set up on the site yet.', 503);
  if (!(await googleLinked())) return fail('Connect Google first, so Jelly can make the Meet link.', 409);

  const emails = await friendEmails();
  const id = newMeetupId();
  try {
    const g = await createMeet({ id, title, start, minutes, emails: friendIds.map((f) => emails[f]).filter(Boolean), note: 'A little video call, set up from Saani’s Atelier 🪼' });
    const m = await saveMeetup({ id, createdAt: new Date().toISOString(), title, start, minutes, friendIds, meetLink: g.meetLink, googleEventId: g.eventId, rsvp: {} });
    const when = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(start));
    await Promise.all(friendIds.map((f) => notifyPerson(f, { title: `💻 ${first(s.name)} invited you to a call`, body: `“${title}” · ${when} Milano time. Tap to say if you’re coming.`, url: '/wall' })));
    return json({ meetup: m, noEmail: friendIds.filter((f) => !emails[f]).map((f) => invites.find((i) => i.id === f)?.name ?? f) }, 201);
  } catch (e) {
    if (e instanceof GoogleNotLinked) return fail('Google needs connecting again.', 409);
    console.error('meetup', (e as Error).message);
    return fail('Google couldn’t make the call just now. Try again in a minute.', 502);
  }
}
