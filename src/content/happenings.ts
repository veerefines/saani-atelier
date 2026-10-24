/**
 * Workshops, shows and people: things to grow into in Milano.
 * Dated items were checked on the organisers' sites on 24 Oct 2026; update them each season.
 * Search links open live listings (Eventbrite, Meetup…), so they're always current.
 */

export type HappeningKind = 'dates' | 'workshop' | 'tea' | 'runway' | 'network';

export const happeningKinds: { id: HappeningKind; label: string; icon: string; tint: string }[] = [
  { id: 'dates', label: 'Big fashion dates', icon: '🗓️', tint: '#f6d3ea' },
  { id: 'workshop', label: 'Fashion workshops', icon: '🧵', tint: '#e6dcf7' },
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
  /** upcoming editions, ISO dates; past ones drop off by themselves */
  editions?: { start: string; end: string }[];
  /** e.g. "every February and September" when exact dates aren't published yet */
  usually?: string;
  links: { label: string; url: string }[];
};

const eventbrite = (q: string) => `https://www.eventbrite.it/d/italy--milano/${q}/`;
const meetup = (q: string) => `https://www.meetup.com/find/?keywords=${encodeURIComponent(q)}&location=it--Milano&source=EVENTS`;

export const happenings: Happening[] = [
  /* ---------- big dates ---------- */
  {
    id: 'mfw',
    kind: 'dates',
    title: 'Milano Fashion Week, women’s',
    where: 'All over the city',
    note: 'Most shows are invite-only, but the city fills with presentations, pop-ups, window installations and parties. The official calendar lists the open events.',
    editions: [
      { start: '2027-02-23', end: '2027-03-01' },
      { start: '2027-09-21', end: '2027-09-27' },
    ],
    links: [{ label: 'Official calendar', url: 'https://www.cameramoda.it/en/milano-moda-donna/calendar/' }],
  },
  {
    id: 'mfw-men',
    kind: 'dates',
    title: 'Milano Fashion Week, men’s',
    where: 'All over the city',
    note: 'The menswear shows. Quieter than women’s week, but the city still fills with presentations, showrooms and parties.',
    editions: [
      { start: '2027-01-15', end: '2027-01-19' },
      { start: '2027-06-18', end: '2027-06-22' },
    ],
    links: [{ label: 'Official calendar', url: 'https://www.cameramoda.it/en/milano-moda-uomo/calendar/' }],
  },
  {
    id: 'graduate',
    kind: 'dates',
    title: 'Milano Moda Graduate',
    where: 'Camera Nazionale della Moda',
    note: 'The national showcase for graduates of Italian fashion schools, with awards and mentoring. One to watch, and one to aim for.',
    usually: 'Once a year; dates on the site',
    links: [{ label: 'About & dates', url: 'https://www.cameramoda.it/en/milano-moda-graduate/' }],
  },
  {
    id: 'designweek',
    kind: 'dates',
    title: 'Milano Design Week · Fuorisalone',
    where: 'Brera, Tortona, Isola and beyond',
    note: 'A week when the whole city turns into installations, many of them free to walk into. The best week of the year to be in Milano.',
    editions: [{ start: '2027-04-12', end: '2027-04-18' }],
    links: [{ label: 'Fuorisalone guide', url: 'https://www.fuorisalone.it/' }],
  },
  {
    id: 'micam',
    kind: 'dates',
    title: 'MICAM, the shoe fair',
    where: 'Fiera Milano, Rho',
    note: 'The world’s big footwear fair. It’s a trade fair, but it offers a free ticket after registering; worth trying as a fashion student.',
    editions: [
      { start: '2027-02-21', end: '2027-02-23' },
      { start: '2027-09-12', end: '2027-09-14' },
    ],
    links: [{ label: 'MICAM', url: 'https://www.micam.it/' }],
  },
  {
    id: 'mipel',
    kind: 'dates',
    title: 'MIPEL, bags & leather goods',
    where: 'Fiera Milano, Rho',
    note: 'Handbags and leather goods from all over the world, alongside MICAM.',
    editions: [{ start: '2027-02-21', end: '2027-02-23' }],
    links: [{ label: 'MIPEL', url: 'https://www.mipel.com/' }],
  },
  {
    id: 'white',
    kind: 'dates',
    title: 'White Milano',
    where: 'Via Tortona',
    note: 'Contemporary designers and new brands in the Tortona fashion district. Great for discovering young labels.',
    editions: [{ start: '2027-02-25', end: '2027-02-28' }],
    links: [{ label: 'White Milano', url: 'https://www.whiteshow.com/' }],
  },
  {
    id: 'milanounica',
    kind: 'dates',
    title: 'Milano Unica, fabrics',
    where: 'Fiera Milano, Rho',
    note: 'Italy’s fabric and textile fair: where the cloth for next season gets chosen. Accreditation needed.',
    editions: [{ start: '2027-02-02', end: '2027-02-04' }],
    links: [{ label: 'Milano Unica', url: 'https://www.milanounica.it/' }],
  },
  {
    id: 'lineapelle',
    kind: 'dates',
    title: 'Lineapelle, leather & materials',
    where: 'Fiera Milano, Rho',
    note: 'Leathers, trims and materials for bags and shoes.',
    editions: [{ start: '2027-02-23', end: '2027-02-25' }],
    links: [{ label: 'Lineapelle', url: 'https://www.lineapelle-fair.it/' }],
  },
  {
    id: 'fashrev',
    kind: 'dates',
    title: 'Fashion Revolution Week',
    where: 'Worldwide, with events in Milano',
    note: 'Talks, swaps and mending workshops about who makes our clothes.',
    usually: 'The week around 24 April',
    links: [{ label: 'Fashion Revolution', url: 'https://www.fashionrevolution.org/' }],
  },

  /* ---------- fashion workshops ---------- */
  {
    id: 'marangoni',
    kind: 'workshop',
    title: 'Istituto Marangoni short courses',
    where: 'Via Pietro Verri, Milano',
    note: 'One- to three-week courses in fashion design, drawing and pattern making, with a certificate.',
    links: [{ label: 'Short courses', url: 'https://www.istitutomarangoni.com/landing_pages/en/short-courses' }],
  },
  {
    id: 'secoli',
    kind: 'workshop',
    title: 'Istituto Secoli',
    where: 'Milano',
    note: 'Milano’s school of pattern making and tailoring. Look for their shorter courses.',
    links: [{ label: 'Secoli', url: 'https://secoli.com/en/' }],
  },
  {
    id: 'eb-fashion',
    kind: 'workshop',
    title: 'Fashion & sewing workshops this month',
    where: 'Live listings',
    note: 'Sewing, embroidery, upcycling and styling classes around the city, updated all the time.',
    links: [
      { label: 'Fashion workshops', url: eventbrite('workshop-moda') },
      { label: 'Sewing classes', url: eventbrite('corso-di-cucito') },
      { label: 'Upcycling', url: eventbrite('upcycling') },
    ],
  },

  /* ---------- matcha & tea ---------- */
  {
    id: 'eb-matcha',
    kind: 'tea',
    title: 'Matcha workshops & tastings',
    where: 'Live listings',
    note: 'Whisking classes, tastings and matcha mixology when they come up.',
    links: [
      { label: 'Matcha events', url: eventbrite('matcha') },
      { label: 'Tea ceremony', url: eventbrite('cerimonia-del-te') },
    ],
  },
  {
    id: 'tea-calm',
    kind: 'tea',
    title: 'A slow tea afternoon',
    where: 'Kagurazaka Saryō, Corso Como',
    note: 'No class needed: a Japanese teahouse for ceremonial matcha when she needs calm. It’s in the guide above.',
    links: [{ label: 'Directions', url: 'https://www.google.com/maps/search/?api=1&query=Kagurazaka%20Saryo%20Milano' }],
  },

  /* ---------- runway & shows ---------- */
  {
    id: 'portamento',
    kind: 'runway',
    title: 'Runway walking courses',
    where: 'Milano',
    note: 'Courses in "portamento" (posture and the catwalk walk). Compare a few; some are a weekend, some much longer.',
    links: [
      { label: 'Course listings', url: 'https://www.emagister.it/corsi_portamento-milano-kwprov-38513-2863.htm' },
      { label: 'On Eventbrite', url: eventbrite('portamento') },
    ],
  },
  {
    id: 'sfilate',
    kind: 'runway',
    title: 'Fashion shows open to the public',
    where: 'Live listings',
    note: 'School graduate shows, emerging-designer runways and charity shows you can actually get into.',
    links: [{ label: 'Upcoming shows', url: eventbrite('sfilata') }],
  },

  /* ---------- networking ---------- */
  {
    id: 'fashioncircle',
    kind: 'network',
    title: 'Fashion Circle Milano',
    where: 'Meetup group',
    note: 'Designers, stylists, buyers and creators meeting up for talks, workshops and drinks.',
    links: [{ label: 'Join the group', url: 'https://www.meetup.com/fashion-circle-milano/' }],
  },
  {
    id: 'net-live',
    kind: 'network',
    title: 'Fashion & creative networking',
    where: 'Live listings',
    note: 'Industry evenings, portfolio nights and creative meetups.',
    links: [
      { label: 'Meetup', url: meetup('fashion') },
      { label: 'Eventbrite', url: eventbrite('networking-moda') },
      { label: 'Creative networking', url: eventbrite('networking') },
    ],
  },
];

/** Whole-city calendars for everything else. */
export const cityCalendars = [
  { label: 'YesMilano, the city’s calendar', url: 'https://www.yesmilano.it/' },
  { label: 'Everything on Eventbrite', url: 'https://www.eventbrite.it/d/italy--milano/all-events/' },
  { label: 'Meetup in Milano', url: meetup('') },
];
