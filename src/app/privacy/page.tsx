export const metadata = { title: 'Privacy · Saani’s Atelier' };

/** Plain words on what the site keeps, including what it does with Google (for Google's consent screen). */
export default function Privacy() {
  return (
    <main className="legal">
      <h1>Privacy</h1>
      <p className="legal-sub">Saani’s Atelier · last updated 28 October 2026</p>
      <p>Saani’s Atelier is a private website made for Saanika and the friends she invites. Nobody can use it without an invite code, and nothing here is sold, shared for advertising, or used to train anything.</p>
      <h2>What the site keeps</h2>
      <ul>
        <li>What you add to it yourself: messages, letters, photos, voice notes, videos, notes, reminders, spends and settings.</li>
        <li>Your name (from your invite) and your device’s time zone, so times show correctly.</li>
        <li>If you turn on notifications, your browser’s push subscription.</li>
      </ul>
      <h2>Google</h2>
      <p>If Saanika connects her Google account, the site asks only for permission to see and edit events in her Google Calendar (<code>calendar.events</code>). It uses that to put the video calls she schedules with her friends into her calendar with a Google Meet link, to move them and to cancel them. It doesn’t read her other events, email, contacts or files. Its use of information received from Google APIs follows the Google API Services User Data Policy, including the Limited Use requirements.</p>
      <p>Friends’ email addresses are only used so Google can send them the invite for a call. Saanika can disconnect Google at any time from the Meetups page, or from her Google account’s security settings.</p>
      <h2>Where it’s stored</h2>
      <p>Data is stored with the site’s hosting (Vercel) and database (Supabase). Anyone with an invite can ask for their things to be removed, and removing a friend in admin deletes everything they shared.</p>
      <h2>Contact</h2>
      <p>Questions: vghorpade1@gmail.com</p>
    </main>
  );
}
