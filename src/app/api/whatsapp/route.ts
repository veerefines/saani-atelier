import { after } from 'next/server';
import { firstTime, handleText, isOwner, messagesIn, sendReply, signedByMeta, tail, whatsappReady, type Reply } from '@/lib/whatsapp';

/** Meta checks the webhook once, when it's set up: echo the challenge if the token matches. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const want = process.env.WHATSAPP_VERIFY_TOKEN;
  if (want && q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === want) return new Response(q.get('hub.challenge') ?? '', { status: 200 });
  return new Response('Not allowed.', { status: 403 });
}

/** A delivery from WhatsApp: answered at once (so Meta doesn't retry), handled just after. */
export async function POST(req: Request) {
  if (!whatsappReady()) return new Response('WhatsApp isn’t set up.', { status: 404 });
  const raw = await req.text();
  if (!signedByMeta(raw, req.headers.get('x-hub-signature-256'))) return new Response('Bad signature.', { status: 401 });
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('ok');
  }
  // only her number; status updates, photos and strangers are ignored
  const all = messagesIn(body);
  const mine = all.filter((m) => isOwner(m.from));
  for (const m of all) if (!mine.includes(m)) console.warn(`[whatsapp] ignored a message from ${tail(m.from)}: not WHATSAPP_OWNER (…${(process.env.WHATSAPP_OWNER ?? '').replace(/\D/g, '').slice(-4)})`);
  after(async () => {
    for (const m of mine) {
      if (!(await firstTime(m.id))) continue;
      const reply = await handleText(m.text, undefined, m.tap).catch((e: Error): Reply => {
        console.error(`[whatsapp] couldn't handle a message: ${e.message}`);
        return { text: 'Jelly got a little tangled 🫧 Try that again in a moment?' };
      });
      await sendReply(m.from, reply);
    }
  });
  return new Response('ok');
}
