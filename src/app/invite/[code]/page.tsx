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
  const lines =
    invite.role === 'saanika'
      ? [
          'Something small and a little bit big is waiting for you: a whole world made by the people who love you, to carry to Milano.',
          'Letters, voice notes, a jellyfish who talks back, clocks for home and for here. Open it whenever you like.',
        ]
      : [
          'Saani is off to Milano, and we made her a little world to take along. You are one of the people in her corner.',
          'Come in, leave her a note, and keep this on your phone so it is one tap away.',
        ];

  return (
    <main className="inv">
      <img className="inv-jelly" src="/corner/jelly/hd/joyful.webp" alt="" width={132} height={132} />
      <p className="inv-kicker hand">you’re invited</p>
      <h1 className="chrome inv-title">{first},</h1>

      <section className="inv-card">
        <img className="tape" src="/reveal/washi.webp" alt="" />
        {lines.map((l) => (
          <p key={l} className="whisper">{l}</p>
        ))}
        <p className="hand inv-sign">With all of us ♡</p>
        <div className="inv-actions">
          <a className="cta inv-open" href={`/hello/${encodeURIComponent(invite.code)}`}>
            Open my gift
          </a>
        </div>
      </section>

      <InviteInstall code={invite.code} />

      <p className="inv-foot">Private, made just for you.</p>
    </main>
  );
}
