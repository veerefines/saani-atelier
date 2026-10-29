import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { findInvite } from '@/lib/invites';
import { site } from '@/content/site';
import InviteInstall from '@/components/InviteInstall';
import './invite.css';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `You’re invited · ${site.title}`,
    description: 'A little something is waiting.',
    manifest: `/invite/${code}/manifest.webmanifest`,
  };
}

/** One-page invitation: open the gift, then keep it on the phone's home screen like an app. */
export default async function Invite({ params }: Props) {
  const { code } = await params;
  const invite = await findInvite(decodeURIComponent(code));
  if (!invite) redirect('/?e=link');

  const first = invite.name.split(' ')[0];
  return (
    <main className="inv">
      <p className="inv-kicker hand">you’re invited</p>
      <h1 className="chrome inv-title">{first},</h1>

      <section className="inv-card">
        <img className="tape" src="/reveal/washi.webp" alt="" />
        <p className="whisper inv-line">Something special<br />awaits you.</p>
        <p className="hand inv-sign">With all of us ♡</p>
      </section>

      <InviteInstall code={invite.code} />

      <div className="inv-actions">
        <a className="cta inv-open" href={`/hello/${encodeURIComponent(invite.code)}`}>
          Open my gift
        </a>
      </div>

      <p className="inv-foot">Private, made just for you.</p>
    </main>
  );
}
