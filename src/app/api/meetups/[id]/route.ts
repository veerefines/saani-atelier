import { cancelMeet, friendEmails, updateMeet, GoogleNotLinked } from '@/lib/google';
import { getMeetup, saveMeetup } from '@/lib/meetups';
import { notifyPerson } from '@/lib/push';
import { meetupMail } from '@/lib/jelly-mail';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** Move a call to another time ({ start }); Google tells everyone. */
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const m = await getMeetup((await params).id);
  if (!m || m.cancelled) return fail('That call isn’t here any more.', 404);
  const b = await req.json().catch(() => ({}));
  const start = typeof b.start === 'string' && !isNaN(Date.parse(b.start)) ? new Date(b.start).toISOString() : '';
  if (!start || Date.parse(start) < Date.now() - 5 * 60_000) return fail('Pick a time that’s still to come.');
  const emails = await friendEmails();
  try {
    if (m.googleEventId) await updateMeet(m.googleEventId, { title: m.title, start, minutes: m.minutes, emails: m.friendIds.map((f) => emails[f]).filter(Boolean) });
  } catch (e) {
    return fail(e instanceof GoogleNotLinked ? 'Google needs connecting again.' : 'Google couldn’t move it just now.', e instanceof GoogleNotLinked ? 409 : 502);
  }
  const next = await saveMeetup({ ...m, start, rsvp: {}, nudged: false });
  await Promise.all(m.friendIds.map((f) => notifyPerson(f, { title: `💻 “${m.title}” moved`, body: 'There’s a new time. Tap to say if you can make it.', url: '/wall' })));
  await meetupMail('moved', next).catch(() => 0);
  return json(next);
}

/** Cancel a call (Google tells the guests). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const m = await getMeetup((await params).id);
  if (!m) return fail('That call isn’t here any more.', 404);
  try {
    if (m.googleEventId && !m.cancelled) await cancelMeet(m.googleEventId);
  } catch (e) {
    if (!(e instanceof GoogleNotLinked)) return fail('Google couldn’t cancel it just now.', 502);
  }
  await saveMeetup({ ...m, cancelled: true });
  if (!m.cancelled) await Promise.all(m.friendIds.map((f) => notifyPerson(f, { title: `💻 “${m.title}” is off`, body: 'Saanika cancelled this call. Another time! 💗', url: '/wall' })));
  if (!m.cancelled) await meetupMail('cancelled', { ...m, cancelled: true }).catch(() => 0);
  return json({ ok: true });
}
