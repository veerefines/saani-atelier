import { after } from 'next/server';
import { firstTime, handleText, isOwner, messagesIn, sendText, signedByMeta, whatsappReady } from '@/lib/whatsapp';

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
  const mine = messagesIn(body).filter((m) => isOwner(m.from));
  after(async () => {
    for (const m of mine) {
      if (!(await firstTime(m.id))) continue;
      const reply = await handleText(m.text).catch(() => 'Jelly got a little tangled 🫧 Try that again in a moment?');
      await sendText(m.from, reply);
    }
  });
  return new Response('ok');
}
