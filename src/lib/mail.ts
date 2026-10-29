/**
 * Outbound email, as Jelly, through Resend (free tier). RESEND_API_KEY switches it on (off or empty
 * means no mail is sent); MAIL_FROM is the sender ("Jelly <jelly@saani.space>" once saani.space is
 * verified in Resend); RESEND_BASE_URL points the tests at a fake.
 */
export const mailReady = () => Boolean(process.env.RESEND_API_KEY) && process.env.RESEND_API_KEY !== 'off';
const BASE = () => (process.env.RESEND_BASE_URL || 'https://api.resend.com').replace(/\/$/, '');
const FROM = () => process.env.MAIL_FROM || 'Jelly <jelly@saani.space>';

export type Mail = { to: string; subject: string; html: string; text: string; attachments?: { filename: string; content: Buffer }[] };

/** One email to one person (so nobody sees who else got it). True when Resend took it. */
export async function sendMail(m: Mail): Promise<boolean> {
  if (!mailReady()) return false;
  try {
    const res = await fetch(`${BASE()}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM(),
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
        ...(m.attachments?.length ? { attachments: m.attachments.map((a) => ({ filename: a.filename, content: a.content.toString('base64') })) } : {}),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) console.error('mail', res.status, (await res.text().catch(() => '')).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error('mail', e instanceof Error ? e.message : e);
    return false;
  }
}
