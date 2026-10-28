/** Meetups as both sides see them (no database code here; meetups.ts saves them). */
export type Rsvp = 'yes' | 'maybe' | 'no';
export type Meetup = {
  id: string;
  createdAt: string;
  title: string;
  /** when it starts (ISO, UTC) */
  start: string;
  minutes: number;
  friendIds: string[];
  meetLink: string | null;
  googleEventId: string | null;
  rsvp: Record<string, Rsvp>;
  cancelled?: boolean;
  /** "starting soon" was sent */
  nudged?: boolean;
};

export const isRsvp = (x: unknown): x is Rsvp => x === 'yes' || x === 'maybe' || x === 'no';

/** Little names for a call, for "Surprise me". */
export const MEETUP_TITLES = ['Chai & chisme ☕', 'Gossip o’clock 💬', 'Pajama party call 🌙', 'Sunday catch-up 🌷', 'Milano diaries, live 🎥', 'Show & tell: my week ✨', 'Matcha & memories 🍵', 'Virtual aperitivo 🍹'];
