import * as db from './db';

/**
 * Meetups: video calls Saani sets up with her friends. Each one lives in her Google Calendar with
 * a real Google Meet link (see google.ts); Google emails the friends, and they also see it on their
 * desks with a Join button and can say if they're coming.
 */
import type { Meetup } from './meetup-model';
export type { Meetup, Rsvp } from './meetup-model';
export { isRsvp, MEETUP_TITLES } from './meetup-model';

const COL = 'meetups';
export const listMeetups = async () => (await db.list<Meetup>(COL)).sort((a, b) => (a.start < b.start ? -1 : 1));
export const getMeetup = (id: string) => db.get<Meetup>(COL, id);
export const saveMeetup = (m: Meetup) => db.put<Meetup>(COL, m);
export const newMeetupId = () => db.newId('mt_');
/** Still to come (or on right now), not cancelled. */
export const upcoming = (list: Meetup[], now = Date.now()) => list.filter((m) => !m.cancelled && Date.parse(m.start) + m.minutes * 60_000 > now);
