/**
 * Settling-in checklist for her first weeks in Milano. Short, practical tips plus official links
 * (all checked Oct 2026). Rules change, so each item points to the official source.
 */
export type CheckItem = { id: string; title: string; when: string; tip: string; links: { label: string; url: string }[] };

export const checklist: CheckItem[] = [
  {
    id: 'permesso',
    title: 'Apply for the permesso di soggiorno',
    when: 'Within 8 working days of arriving',
    tip: 'Pick up the application kit at a post office (ask for the “kit per il permesso di soggiorno” at a Sportello Amico counter), fill it in, and send it from there. Keep the receipt (ricevuta): it’s your proof until the card arrives.',
    links: [
      { label: 'Portale Immigrazione', url: 'https://www.portaleimmigrazione.it' },
      { label: 'Polizia di Stato', url: 'https://www.poliziadistato.it' },
    ],
  },
  {
    id: 'codice',
    title: 'Get your codice fiscale',
    when: 'First week',
    tip: 'Your Italian tax code. You’ll need it for a SIM, a bank account, a rental contract and the doctor. Your university or the consulate may have given you one already.',
    links: [{ label: 'Agenzia delle Entrate', url: 'https://www.agenziaentrate.gov.it/portale/web/english' }],
  },
  {
    id: 'sim',
    title: 'Get an Italian SIM',
    when: 'First days',
    tip: 'Take your passport and codice fiscale. Iliad, TIM, Vodafone and WindTre all have shops in the centre; compare the student offers.',
    links: [{ label: 'Iliad', url: 'https://www.iliad.it' }],
  },
  {
    id: 'atm',
    title: 'Sort out a metro pass',
    when: 'First week',
    tip: 'ATM runs the metro, trams and buses. Look at the monthly and yearly passes for young people and students; it’s much cheaper than single tickets.',
    links: [{ label: 'ATM Milano', url: 'https://www.atm.it/en' }],
  },
  {
    id: 'bank',
    title: 'Open a bank account',
    when: 'First month',
    tip: 'Bring your passport, codice fiscale and the permesso receipt. Some online banks let you open an account from your phone.',
    links: [],
  },
  {
    id: 'health',
    title: 'Health cover and a family doctor',
    when: 'First month',
    tip: 'Students can sign up with the national health service (SSN) through ATS Milano, then choose a medico di base (family doctor). Keep your private insurance papers handy until then.',
    links: [{ label: 'ATS Milano', url: 'https://www.ats-milano.it' }],
  },
  {
    id: 'consulate',
    title: 'Register with the Indian consulate',
    when: 'Whenever you have a moment',
    tip: 'The Consulate General of India in Milan helps with passports and documents, and it’s good to be on their radar.',
    links: [{ label: 'Consulate General of India, Milan', url: 'https://www.cgimilan.gov.in' }],
  },
  {
    id: 'residence',
    title: 'Register your residence (if you’re staying long-term)',
    when: 'Once you have a permanent address',
    tip: 'Called iscrizione anagrafica, done with the Comune di Milano. Ask your university whether you need it for your situation.',
    links: [{ label: 'Comune di Milano', url: 'https://www.comune.milano.it' }],
  },
  {
    id: 'trains',
    title: 'Download the train apps',
    when: 'Before your first day trip',
    tip: 'Trenord for the lakes and Bergamo, Trenitalia and Italo for longer trips. Always validate paper tickets before boarding.',
    links: [{ label: 'Trenord', url: 'https://www.trenord.it/en' }],
  },
  {
    id: 'emergency',
    title: 'Save the emergency number',
    when: 'Now',
    tip: '112 is the single emergency number across Europe: police, ambulance and fire. Save it, and share your address with someone at home.',
    links: [],
  },
];
