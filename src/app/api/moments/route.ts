import { after } from 'next/server';
import { getMedia } from '@/lib/data';
import { addMoment, listMoments } from '@/lib/extras';
import { getInvites } from '@/lib/invites';
import { sentTo, type MomentKind } from '@/content/moments';
import { notifyFriends, notifyPerson } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

const MIME: Record<MomentKind, string> = { photo: 'image/', video: 'video/', voice: 'audio/' };
const WORD: Record<MomentKind, string> = { photo: 'a photo', video: 'a little video', voice: 'a voice note' };

/** Saanika sees every moment she's sent (with reactions); a friend sees the ones sent to them. */
export async function GET() {
  const s = await requireSession();
  if (isResponse(s)) return s;
  const all = await listMoments();
  return json(s.role === 'saanika' ? all : all.filter((m) => sentTo(m, s.id)));
}

/** She shares a moment with everyone, or with the friends she picks. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { kind, mediaId, caption, to } = await req.json().catch(() => ({}));
  if (!(kind in MIME)) return fail('Choose a photo, a video or a voice note.');
  const m = await getMedia(String(mediaId ?? ''));
  if (!m || !m.ready || m.ownerId !== s.id) return fail('The file didn’t finish uploading. Try again.');
  if (!m.mime.startsWith(MIME[kind as MomentKind])) return fail(`That isn’t ${WORD[kind as MomentKind]}.`);
  const text = String(caption ?? '').trim();
  if (text.length > 140) return fail('Keep the caption short: 140 characters at most.');
  const friends = (await getInvites()).filter((i) => i.role === 'wellwisher');
  let who: 'all' | string[] = 'all';
  if (to !== 'all' && to !== undefined) {
    if (!Array.isArray(to) || !to.length) return fail('Pick at least one person, or send it to everyone.');
    who = [...new Set(to.map(String))];
    if (who.some((id) => !friends.some((f) => f.id === id))) return fail('One of those people isn’t here any more.');
  }
  const moment = await addMoment({ kind, mediaId: m.id, ...(text ? { caption: text } : {}), to: who });
  const msg = { title: `📸 Saanika shared ${WORD[kind as MomentKind]}`, body: text || 'Tap to see it.', url: '/wall/moments' };
  after(async () => {
    if (who === 'all') await notifyFriends(msg);
    else await Promise.all(who.map((id) => notifyPerson(id, msg)));
  });
  return json(moment, 201);
}
