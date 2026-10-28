/**
 * Workshops, shows and people: things to grow into in Milano.
 * The list is in data/happenings.json. A weekly Claude routine checks the organisers' sites, adds
 * new events with their details and a photo, and drops past editions; `added` is when an item
 * joined, so new ones wear a "New" ribbon for a month. Search links open live listings.
 */
import HAPPENINGS from './data/happenings.json';

export type HappeningKind = 'dates' | 'workshop' | 'exhibition' | 'market' | 'talk' | 'tea' | 'runway' | 'network';

export const happeningKinds: { id: HappeningKind; label: string; icon: string; tint: string }[] = [
  { id: 'dates', label: 'Big fashion dates', icon: '🗓️', tint: '#f6d3ea' },
  { id: 'workshop', label: 'Fashion workshops', icon: '🧵', tint: '#e6dcf7' },
  { id: 'exhibition', label: 'Exhibitions', icon: '🖼️', tint: '#fbe0d0' },
  { id: 'market', label: 'Markets & pop-ups', icon: '🧺', tint: '#f8ebbf' },
  { id: 'talk', label: 'Talks', icon: '🎤', tint: '#dcefd5' },
  { id: 'tea', label: 'Matcha & tea', icon: '🍵', tint: '#d4efdf' },
  { id: 'runway', label: 'Runway & shows', icon: '💃', tint: '#ffe0c4' },
  { id: 'network', label: 'Networking', icon: '🤝', tint: '#d3e9f6' },
];

export type Happening = {
  id: string;
  kind: HappeningKind;
  title: string;
  where: string;
  note: string;
  /** upcoming editions, ISO dates; past ones drop off by themselves (time is "18:30" if it has one; tentative until the organiser confirms) */
  editions?: { start: string; end: string; time?: string; tentative?: boolean }[];
  /** e.g. "every February and September" when exact dates aren't published yet */
  usually?: string;
  links: { label: string; url: string }[];
  /** the details she needs to decide */
  details?: { time?: string; price?: string; booking?: string; language?: string; address?: string; lat?: number; lng?: number; goodFor?: string };
  /** a photo from the organiser (public/happenings), credited */
  image?: { src: string; credit: string; from: string };
  /** when it joined the list (YYYY-MM-DD) */
  added?: string;
};

export const happenings: Happening[] = HAPPENINGS as Happening[];
export const happeningById = (id: string) => happenings.find((h) => h.id === id);

const meetup = (q: string) => `https://www.meetup.com/find/?keywords=${encodeURIComponent(q)}&location=it--Milano&source=EVENTS`;

/** Whole-city calendars for everything else. */
export const cityCalendars = [
  { label: 'YesMilano, the city’s calendar', url: 'https://www.yesmilano.it/' },
  { label: 'Everything on Eventbrite', url: 'https://www.eventbrite.it/d/italy--milano/all-events/' },
  { label: 'Meetup in Milano', url: meetup('') },
];

/** The next edition still to come (or on now), as Milano days. */
export function nextEditionOf(h: Happening, today: string) {
  return h.editions?.find((e) => e.end >= today) ?? null;
}
