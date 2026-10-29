/**
 * Gives Jelly's WhatsApp number her face and a few words: crops the finance art to a 640×640 JPG
 * (WhatsApp shows it in a circle), uploads it with Meta's resumable upload API and sets it, with an
 * "about" line, on the business profile. Run once; re-run to change it.
 *
 *   node --experimental-strip-types scripts/whatsapp-profile.mts <details file> [image]
 *
 * The details file is the one Meta's setup gave ("WhatsApp permanent token: …", "Phone number ID : …",
 * "App ID: …"). Nothing from it is printed.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const GRAPH = 'https://graph.facebook.com/v23.0';
const [details, image = path.join(os.homedir(), 'Desktop/SAANI/JellyFin.png')] = process.argv.slice(2);
if (!details) throw new Error('Usage: whatsapp-profile.mts <details file> [image]');

const text = fs.readFileSync(details, 'utf8');
const field = (label: RegExp) => {
  const v = text.match(new RegExp(`^${label.source}\\s*:\\s*(\\S+)`, 'mi'))?.[1];
  if (!v) throw new Error(`No ${label.source} in the details file.`);
  return v.trim();
};
const token = field(/WhatsApp permanent token/);
const phoneId = field(/Phone number ID/);
const appId = field(/App ID/);

// Jelly with her calculator and laptop, filling the square so the circle crop keeps her face
const { width = 0, height = 0 } = await sharp(image).metadata();
const side = Math.round(Math.min(width, height) * 0.71);
const jpg = await sharp(image)
  .extract({ left: Math.round(width * 0.25), top: Math.round(height * 0.04), width: side, height: side })
  .resize(640, 640)
  .flatten({ background: '#fff7fa' })
  .jpeg({ quality: 90 })
  .toBuffer();
const preview = path.join(os.tmpdir(), 'jelly-whatsapp.jpg');
fs.writeFileSync(preview, jpg);
console.log(`picture: ${preview} (${Math.round(jpg.length / 1024)} KB)`);
if (process.env.PREVIEW) process.exit(0);

async function graph<T>(url: string, init: RequestInit & { auth?: string } = {}): Promise<T> {
  const r = await fetch(url, { ...init, headers: { Authorization: init.auth ?? `Bearer ${token}`, ...(init.headers as Record<string, string>) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify((body as { error?: unknown }).error ?? body)}`);
  return body as T;
}

const session = await graph<{ id: string }>(`${GRAPH}/${appId}/uploads?file_length=${jpg.length}&file_type=image/jpeg&file_name=jelly.jpg`, { method: 'POST' });
const { h } = await graph<{ h: string }>(`${GRAPH}/${session.id}`, { method: 'POST', auth: `OAuth ${token}`, headers: { file_offset: '0' }, body: new Uint8Array(jpg) });

await graph(`${GRAPH}/${phoneId}/whatsapp_business_profile`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    profile_picture_handle: h,
    about: '🪼 Jelly keeps Soldi for Saanika',
    description: 'Tell Jelly what you spent ("esselunga 23,40") and she logs it in Soldi. Send "menu" for your budget, spends and tips.',
    vertical: 'OTHER',
  }),
});

const now = await graph<{ data: { about?: string; profile_picture_url?: string }[] }>(`${GRAPH}/${phoneId}/whatsapp_business_profile?fields=about,profile_picture_url`);
console.log(`about: ${now.data[0]?.about}\npicture set: ${Boolean(now.data[0]?.profile_picture_url)}`);
