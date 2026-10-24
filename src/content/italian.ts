/**
 * Italian phrase of the day, for the Today card. One a day, in order, looping.
 * `say` is what the browser's Italian voice reads aloud.
 */
export type Phrase = { it: string; en: string; when: string };

export const phrases: Phrase[] = [
  { it: 'Un cappuccino, per favore.', en: 'A cappuccino, please.', when: 'at the bar (before 11, never after lunch)' },
  { it: 'Posso pagare con la carta?', en: 'Can I pay by card?', when: 'at the till' },
  { it: 'Il conto, per favore.', en: 'The bill, please.', when: 'at dinner' },
  { it: 'Scusi, dov’è la metro?', en: 'Excuse me, where’s the metro?', when: 'lost in the city' },
  { it: 'Quanto costa?', en: 'How much is it?', when: 'at the market' },
  { it: 'Sono una studentessa di moda.', en: 'I’m a fashion student.', when: 'meeting someone new' },
  { it: 'Piacere!', en: 'Nice to meet you!', when: 'introductions' },
  { it: 'Come ti chiami?', en: 'What’s your name?', when: 'first day of class' },
  { it: 'Non ho capito, può ripetere?', en: 'I didn’t catch that, could you repeat?', when: 'anywhere' },
  { it: 'Parla inglese?', en: 'Do you speak English?', when: 'when you need backup' },
  { it: 'Vorrei provare questa taglia.', en: 'I’d like to try this size.', when: 'shopping' },
  { it: 'Avete una taglia più piccola?', en: 'Do you have a smaller size?', when: 'in the fitting room' },
  { it: 'Dove sono i camerini?', en: 'Where are the fitting rooms?', when: 'shopping' },
  { it: 'Lo prendo!', en: 'I’ll take it!', when: 'found the one' },
  { it: 'Che bello!', en: 'How beautiful!', when: 'all the time in Milano' },
  { it: 'Che stoffa è?', en: 'What fabric is this?', when: 'at a fabric shop' },
  { it: 'Mi serve un metro di questo tessuto.', en: 'I need a metre of this fabric.', when: 'at a fabric shop' },
  { it: 'Ago e filo', en: 'Needle and thread', when: 'in the studio' },
  { it: 'Il cartamodello', en: 'The sewing pattern', when: 'in the studio' },
  { it: 'La sfilata', en: 'The fashion show', when: 'Fashion Week' },
  { it: 'Una pallina di pistacchio, per favore.', en: 'One scoop of pistachio, please.', when: 'at the gelateria' },
  { it: 'Cono o coppetta?', en: 'Cone or cup?', when: 'they’ll ask you this' },
  { it: 'Un tavolo per due?', en: 'A table for two?', when: 'at a restaurant' },
  { it: 'È piccante?', en: 'Is it spicy?', when: 'ordering food' },
  { it: 'Sono vegetariana.', en: 'I’m vegetarian.', when: 'ordering food' },
  { it: 'Acqua naturale o frizzante?', en: 'Still or sparkling water?', when: 'every single meal' },
  { it: 'Andiamo a fare un aperitivo?', en: 'Shall we go for an aperitivo?', when: 'around 7pm' },
  { it: 'Cin cin!', en: 'Cheers!', when: 'with a spritz in hand' },
  { it: 'A che ora apre?', en: 'What time does it open?', when: 'planning the day' },
  { it: 'È chiuso la domenica?', en: 'Is it closed on Sunday?', when: 'many shops are' },
  { it: 'Un biglietto per Como, per favore.', en: 'A ticket to Como, please.', when: 'at the station' },
  { it: 'Da quale binario parte?', en: 'Which platform does it leave from?', when: 'at Milano Centrale' },
  { it: 'Il treno è in ritardo.', en: 'The train is late.', when: 'it happens' },
  { it: 'Scendo alla prossima.', en: 'I’m getting off at the next stop.', when: 'on the tram' },
  { it: 'Mi sono persa.', en: 'I’m lost.', when: 'it’s okay' },
  { it: 'Può aiutarmi?', en: 'Can you help me?', when: 'anywhere' },
  { it: 'Ho bisogno di un medico.', en: 'I need a doctor.', when: 'just in case' },
  { it: 'Dov’è la farmacia più vicina?', en: 'Where’s the nearest pharmacy?', when: 'look for the green cross' },
  { it: 'Ho mal di testa.', en: 'I have a headache.', when: 'at the pharmacy' },
  { it: 'Una camomilla, per favore.', en: 'A chamomile tea, please.', when: 'when you need calm' },
  { it: 'Mi manca casa.', en: 'I miss home.', when: 'it’s allowed' },
  { it: 'Sono stanca morta.', en: 'I’m dead tired.', when: 'after a studio day' },
  { it: 'Che figata!', en: 'That’s so cool!', when: 'with friends' },
  { it: 'Dai!', en: 'Come on! / Go on!', when: 'Italians say it constantly' },
  { it: 'Boh.', en: 'Who knows?', when: 'with a shrug' },
  { it: 'Magari!', en: 'I wish! / If only!', when: 'dreaming out loud' },
  { it: 'In bocca al lupo!', en: 'Good luck! (say “crepi!” back)', when: 'before an exam' },
  { it: 'Ce la faccio!', en: 'I can do this!', when: 'every day' },
  { it: 'Sono fiera di me.', en: 'I’m proud of myself.', when: 'say it often' },
  { it: 'Buon weekend!', en: 'Have a good weekend!', when: 'Friday afternoon' },
  { it: 'A domani!', en: 'See you tomorrow!', when: 'leaving class' },
  { it: 'Ci vediamo dopo.', en: 'See you later.', when: 'with friends' },
  { it: 'Che tempo fa oggi?', en: 'What’s the weather like today?', when: 'small talk' },
  { it: 'Piove a dirotto.', en: 'It’s pouring.', when: 'Milano in November' },
  { it: 'Fa un freddo cane.', en: 'It’s freezing (lit. dog-cold).', when: 'Milano in January' },
  { it: 'Che caldo!', en: 'It’s so hot!', when: 'Milano in July' },
  { it: 'Vorrei aprire un conto.', en: 'I’d like to open an account.', when: 'at the bank' },
  { it: 'Ho un appuntamento.', en: 'I have an appointment.', when: 'at the questura' },
  { it: 'Ecco il mio permesso di soggiorno.', en: 'Here’s my residence permit.', when: 'paperwork days' },
  { it: 'Grazie mille!', en: 'Thanks a lot!', when: 'always' },
];

/** The same phrase all day, a new one tomorrow. */
export function phraseOfDay(day: string) {
  const n = Math.floor(new Date(`${day}T12:00:00Z`).getTime() / 86_400_000);
  return phrases[((n % phrases.length) + phrases.length) % phrases.length];
}
