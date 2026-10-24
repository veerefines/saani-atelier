import { pushReady, removeSubscription, saveSubscription, vapidPublicKey } from '@/lib/push';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** The public key her browser needs to subscribe. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json({ enabled: pushReady, publicKey: vapidPublicKey() });
}

/** Save this device's subscription. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  if (!pushReady) return fail('Notifications aren’t set up on this site yet.', 503);
  const { subscription } = await req.json().catch(() => ({}));
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string') {
    return fail('That doesn’t look like a notification subscription.');
  }
  await saveSubscription({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
  return json({ ok: true }, 201);
}

/** Turn notifications off for this device. */
export async function DELETE(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint !== 'string') return fail('Missing subscription.');
  await removeSubscription(endpoint);
  return json({ ok: true });
}
