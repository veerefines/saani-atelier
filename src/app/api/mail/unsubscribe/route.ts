import { unsubscribe } from '@/lib/jelly-mail';
import { readUnsub } from '@/lib/session';

const page = (title: string, text: string, status = 200) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#fbe3e8;font-family:Arial,Helvetica,sans-serif;color:#3a2a33"><div style="max-width:440px;margin:12vh auto;padding:28px;text-align:center;background:#fff8f3;border-radius:22px;border:1px solid #f3d4de"><img src="/email/jelly.png" width="84" height="84" alt="" style="border-radius:42px;border:3px solid #fff"><h1 style="font:700 24px Georgia,serif;color:#6b1e3a">${title}</h1><p style="line-height:1.55">${text}</p></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
  );

/** The "stop these emails" link at the bottom of every email Jelly sends. */
export async function GET(req: Request) {
  const id = await readUnsub(new URL(req.url).searchParams.get('t'));
  if (!id) return page('That link didn’t work', 'It may be old or cut off. You can reply to Varun and he’ll switch these emails off for you.', 400);
  await unsubscribe(id);
  return page('Done, no more emails 🫧', 'Jelly won’t send you these emails any more. Saani’s Atelier is still here whenever you like.');
}
