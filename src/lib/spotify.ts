/** Spotify links for Saani's radio: any share link (or spotify: URI) becomes a URI the player takes. */
const KINDS = ['playlist', 'album', 'artist', 'track', 'show', 'episode'] as const;
export type SpotifyKind = (typeof KINDS)[number];

export function spotifyUri(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  const web = s.match(/^https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|artist|track|show|episode)\/([A-Za-z0-9]{22})/);
  const uri = s.match(/^spotify:(playlist|album|artist|track|show|episode):([A-Za-z0-9]{22})$/);
  const m = web ?? uri;
  return m && (KINDS as readonly string[]).includes(m[1]) ? `spotify:${m[1]}:${m[2]}` : null;
}
export const spotifyKind = (uri: string) => uri.split(':')[1] as SpotifyKind;
