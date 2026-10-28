import { getMeetup, isRsvp, saveMeetup } from '@/lib/meetups';
import { notifySaanika } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };
const WORD = { yes: 'is coming 🎉', maybe: 'might make it 🤞', no: 'can’t make it this time 💗' } as const;

/** A friend says if they're coming: { rsvp: yes | maybe | no }. */
export async function POST(req: Request, { params }: Ctx) {
  const s = await requireSession('wellwisher');
  if (isResponse(s)) return s;
  const m = await getMeetup((await params).id);
  if (!m || m.cancelled || !m.friendIds.includes(s.id)) return fail('That call isn’t here.', 404);
  const { rsvp } = await req.json().catch(() => ({}));
  if (!isRsvp(rsvp)) return fail('Yes, maybe or no?');
  const changed = m.rsvp[s.id] !== rsvp;
  const next = await saveMeetup({ ...m, rsvp: { ...m.rsvp, [s.id]: rsvp } });
  if (changed) await notifySaanika({ title: `💻 ${s.name.split(' ')[0]} ${WORD[rsvp]}`, body: `“${m.title}”`, url: '/home/meetups' });
  return json({ ok: true, rsvp: next.rsvp[s.id] });
}
