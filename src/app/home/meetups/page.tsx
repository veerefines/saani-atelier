import PageHead from '@/components/home/Back';
import MeetupPlanner from '@/components/home/MeetupPlanner';

export default async function MeetupsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { google } = await searchParams;
  return (
    <main className="h-page">
      <PageHead kicker="faces, not just texts" title="Meetups" sub="Video calls with your people on Google Meet, at a time that suits everyone’s clocks." />
      <MeetupPlanner status={google ?? null} />
    </main>
  );
}
