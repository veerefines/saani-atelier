/**
 * Milano guide: places to eat, sip, wander and swim, for the Milano corner.
 * Every place was checked against OpenStreetMap; lat/lng come from there.
 * q is what Google Maps searches for. Add, remove or edit freely.
 */

export type Category = 'food' | 'sweet' | 'vibes' | 'fashion' | 'places' | 'local' | 'bloom' | 'golden' | 'beach';

export const categories: { id: Category; label: string; short: string; icon: string; tint: string }[] = [
  { id: 'food', label: 'Food', short: 'Food', icon: '🍝', tint: '#ffd9c7' },
  { id: 'sweet', label: 'Coffee, matcha & sweets', short: 'Coffee & matcha', icon: '🍵', tint: '#d4efdf' },
  { id: 'vibes', label: 'Vibes', short: 'Vibes', icon: '🍹', tint: '#e6dcf7' },
  { id: 'fashion', label: 'Fashion houses & shopping', short: 'Fashion', icon: '👠', tint: '#f6d3ea' },
  { id: 'places', label: 'Sights & day trips', short: 'Places', icon: '🏛️', tint: '#fbe0d0' },
  { id: 'local', label: 'Local spots', short: 'Local', icon: '🧺', tint: '#f8ebbf' },
  { id: 'bloom', label: 'Flowers & green', short: 'Flowers', icon: '🌷', tint: '#dcefd5' },
  { id: 'golden', label: 'Sunrise & sunset', short: 'Golden hour', icon: '🌅', tint: '#ffe0c4' },
  { id: 'beach', label: 'Beaches', short: 'Beaches', icon: '🐚', tint: '#d3e9f6' },
];

export type Place = {
  id: string;
  name: string;
  cat: Category;
  area: string;
  note: string;
  try: string[];
  q: string;
  lat: number;
  lng: number;
  /** beaches only */
  region?: string;
  reach?: string;
};

export const places: Place[] = [
  {
    id: "luini",
    name: "Luini",
    cat: "food",
    area: "Duomo",
    note: "The queue moves fast and it is worth it. Eat it warm, standing on the street like a local.",
    try: [
      "Panzerotto mozzarella & tomato",
      "Sweet ricotta panzerotto"
    ],
    q: "Luini Panzerotti, Via Santa Radegonda 16, Milano",
    lat: 45.4658,
    lng: 9.19148
  },
  {
    id: "ratana",
    name: "Ratanà",
    cat: "food",
    area: "Isola",
    note: "Modern Milanese cooking in an old railway building, by the Bosco Verticale.",
    try: [
      "Risotto alla milanese",
      "Cotoletta"
    ],
    q: "Ratanà, Via Gaetano de Castillia 28, Milano",
    lat: 45.48578,
    lng: 9.19279
  },
  {
    id: "masuelli",
    name: "Trattoria Masuelli San Marco",
    cat: "food",
    area: "Porta Romana",
    note: "A proper old-school family trattoria, the kind Milanese grandmothers approve of.",
    try: [
      "Cotoletta alla milanese",
      "Risotto"
    ],
    q: "Trattoria Masuelli San Marco, Viale Umbria 80, Milano",
    lat: 45.4564,
    lng: 9.21719
  },
  {
    id: "pesa",
    name: "Antica Trattoria della Pesa",
    cat: "food",
    area: "Porta Garibaldi",
    note: "Wood panels, white tablecloths and Milanese classics done the traditional way.",
    try: [
      "Ossobuco with risotto",
      "Cotoletta"
    ],
    q: "Antica Trattoria della Pesa, Viale Pasubio 10, Milano",
    lat: 45.4818,
    lng: 9.18394
  },
  {
    id: "milanese",
    name: "Trattoria Milanese",
    cat: "food",
    area: "Cinque Vie",
    note: "Tucked in the old lanes near Sant’Ambrogio. Cosy, classic and very Milano.",
    try: [
      "Risotto al salto",
      "Ossobuco"
    ],
    q: "Trattoria Milanese, Via Santa Marta 11, Milano",
    lat: 45.46293,
    lng: 9.18368
  },
  {
    id: "spontini",
    name: "Spontini",
    cat: "food",
    area: "Corso Buenos Aires",
    note: "Thick, soft Milanese pizza by the slice. A cheap, happy dinner after shopping.",
    try: [
      "Pizza al trancio margherita",
      "Margherita with anchovies"
    ],
    q: "Spontini, Corso Buenos Aires 60, Milano",
    lat: 45.48205,
    lng: 9.2128
  },
  {
    id: "sorbillo",
    name: "Gino Sorbillo",
    cat: "food",
    area: "Duomo",
    note: "Naples’ most famous pizzaiolo, a few steps from the Duomo.",
    try: [
      "Margherita",
      "Pizza with buffalo mozzarella"
    ],
    q: "Gino Sorbillo, Largo Corsia dei Servi 11, Milano",
    lat: 45.46507,
    lng: 9.19602
  },
  {
    id: "princi",
    name: "Princi",
    cat: "food",
    area: "Duomo",
    note: "A beautiful bakery for a quick lunch or a breakfast on the go.",
    try: [
      "Focaccia",
      "Cornetto",
      "A slice of pizza"
    ],
    q: "Princi, Via Speronari 6, Milano",
    lat: 45.46299,
    lng: 9.18791
  },
  {
    id: "garghet",
    name: "Al Garghet",
    cat: "food",
    area: "Southern edge of Milano",
    note: "A rustic farmhouse inside the city limits, cosy and candlelit. Book ahead.",
    try: [
      "Risotto",
      "Cotoletta"
    ],
    q: "Al Garghet, Via Selvanesco 36, Milano",
    lat: 45.41987,
    lng: 9.19305
  },
  {
    id: "langosteria",
    name: "Langosteria",
    cat: "food",
    area: "Tortona",
    note: "For a big celebration: the seafood place Milano dresses up for.",
    try: [
      "Crudo (raw seafood)",
      "Seafood pasta"
    ],
    q: "Langosteria, Via Savona 10, Milano",
    lat: 45.45563,
    lng: 9.16863
  },
  {
    id: "marchesi",
    name: "Pasticceria Marchesi",
    cat: "sweet",
    area: "Galleria",
    note: "The pastel green salon upstairs in the Galleria, looking down over the mosaic floor.",
    try: [
      "A pastry from the counter",
      "Cappuccino",
      "Panettone in winter"
    ],
    q: "Pasticceria Marchesi, Galleria Vittorio Emanuele II, Milano",
    lat: 45.46542,
    lng: 9.19013
  },
  {
    id: "barluce",
    name: "Bar Luce",
    cat: "sweet",
    area: "Fondazione Prada",
    note: "Designed by Wes Anderson: pastel walls, pinball machines and a 1950s Milan café feel.",
    try: [
      "Cappuccino",
      "A pastry under the painted ceiling"
    ],
    q: "Bar Luce, Fondazione Prada, Largo Isarco 2, Milano",
    lat: 45.44437,
    lng: 9.20533
  },
  {
    id: "santambroeus",
    name: "Sant Ambroeus",
    cat: "sweet",
    area: "San Babila",
    note: "An elegant old Milanese café with pastel pink pastry boxes.",
    try: [
      "Cappuccino",
      "Pastries",
      "Chocolates to take home"
    ],
    q: "Sant Ambroeus, Corso Giacomo Matteotti 7, Milano",
    lat: 45.46702,
    lng: 9.19562
  },
  {
    id: "cova",
    name: "Pasticceria Cova",
    cat: "sweet",
    area: "Montenapoleone",
    note: "A coffee in the middle of the fashion district, since 1817.",
    try: [
      "Espresso at the bar",
      "Pastries",
      "Panettone"
    ],
    q: "Pasticceria Cova, Via Montenapoleone 8, Milano",
    lat: 45.46811,
    lng: 9.19549
  },
  {
    id: "pave",
    name: "Pavé",
    cat: "sweet",
    area: "Porta Venezia",
    note: "The breakfast spot everyone talks about. Go early on a weekend.",
    try: [
      "Brioche",
      "Cornetto",
      "Cappuccino"
    ],
    q: "Pavé, Via Felice Casati 27, Milano",
    lat: 45.47911,
    lng: 9.20264
  },
  {
    id: "orsonero",
    name: "Orsonero Coffee",
    cat: "sweet",
    area: "Porta Venezia",
    note: "A tiny specialty coffee bar for when she misses a proper iced coffee.",
    try: [
      "Iced coffee",
      "Filter coffee",
      "Something sweet from the counter"
    ],
    q: "Orsonero Coffee, Via Giuseppe Broggi 15, Milano",
    lat: 45.47778,
    lng: 9.21122
  },
  {
    id: "mokos",
    name: "Moko’s Matcha Milano",
    cat: "sweet",
    area: "Moscova",
    note: "Hand-whisked ceremonial matcha. Many people call it the best matcha in the city.",
    try: [
      "Ceremonial matcha",
      "Iced matcha latte"
    ],
    q: "Moko's Matcha Milano",
    lat: 45.4759,
    lng: 9.19376
  },
  {
    id: "matchatelier",
    name: "Matchatelier",
    cat: "sweet",
    area: "Paolo Sarpi",
    note: "A matcha dessert bar in Chinatown.",
    try: [
      "Matcha gelato",
      "Matcha cream puffs",
      "Iced matcha"
    ],
    q: "Matchatelier Via Paolo Sarpi Milano",
    lat: 45.48124,
    lng: 9.17285
  },
  {
    id: "kitsune",
    name: "Café Kitsuné",
    cat: "sweet",
    area: "Cordusio",
    note: "Central and stylish: a matcha latte and a little fox biscuit between errands.",
    try: [
      "Matcha latte",
      "Fox shortbread"
    ],
    q: "Café Kitsuné Milano Piazza Cordusio",
    lat: 45.46523,
    lng: 9.18681
  },
  {
    id: "saryo",
    name: "Kagurazaka Saryō",
    cat: "sweet",
    area: "Corso Como",
    note: "A Japanese teahouse for a slow, calm afternoon.",
    try: [
      "Matcha affogato",
      "Ceremonial matcha",
      "Japanese desserts"
    ],
    q: "Kagurazaka Saryo Milano",
    lat: 45.48214,
    lng: 9.18752
  },
  {
    id: "cioccolati",
    name: "Cioccolati Italiani",
    cat: "sweet",
    area: "Duomo",
    note: "Gelato with a pour of melted chocolate into the cone first.",
    try: [
      "Gelato with a chocolate base",
      "Hot chocolate in winter"
    ],
    q: "Cioccolati Italiani, Via San Raffaele 6, Milano",
    lat: 45.46556,
    lng: 9.19135
  },
  {
    id: "gelmusica",
    name: "Gelateria della Musica",
    cat: "sweet",
    area: "Milano",
    note: "One of the city’s favourite gelaterias. The flavours change with the season.",
    try: [
      "Seasonal gelato",
      "Pistachio"
    ],
    q: "Gelateria della Musica Milano",
    lat: 45.4475,
    lng: 9.15554
  },
  {
    id: "barbasso",
    name: "Bar Basso",
    cat: "vibes",
    area: "Città Studi",
    note: "The bar where the Negroni Sbagliato was invented, served in a giant goblet.",
    try: [
      "Negroni Sbagliato",
      "Mangia e Bevi"
    ],
    q: "Bar Basso, Via Plinio 39, Milano",
    lat: 45.47677,
    lng: 9.21758
  },
  {
    id: "camparino",
    name: "Camparino in Galleria",
    cat: "vibes",
    area: "Galleria",
    note: "Stand at the historic bar right at the Galleria’s entrance, like the Milanesi do.",
    try: [
      "Campari seltz",
      "Campari spritz"
    ],
    q: "Camparino in Galleria, Milano",
    lat: 45.46492,
    lng: 9.18988
  },
  {
    id: "terrazzaaperol",
    name: "Terrazza Aperol",
    cat: "vibes",
    area: "Duomo",
    note: "An orange spritz with the Duomo right in front of her.",
    try: [
      "Aperol spritz"
    ],
    q: "Terrazza Aperol, Piazza del Duomo, Milano",
    lat: 45.465,
    lng: 9.19033
  },
  {
    id: "ceresio",
    name: "Ceresio 7",
    cat: "vibes",
    area: "Porta Garibaldi",
    note: "Rooftop pools and an aperitivo above the city. Very fashion-week.",
    try: [
      "Aperitivo by the pool",
      "Sunset cocktails"
    ],
    q: "Ceresio 7, Via Ceresio 7, Milano",
    lat: 45.48352,
    lng: 9.18031
  },
  {
    id: "nottingham",
    name: "Nottingham Forest",
    cat: "vibes",
    area: "Porta Venezia",
    note: "A tiny, eccentric cocktail bar with some of the most creative drinks in Milano.",
    try: [
      "Whatever the bartender suggests"
    ],
    q: "Nottingham Forest, Viale Piave 1, Milano",
    lat: 45.46872,
    lng: 9.20671
  },
  {
    id: "rinascente",
    name: "Rinascente rooftop",
    cat: "vibes",
    area: "Duomo",
    note: "Shop downstairs, then go up to the food hall terrace, eye level with the Duomo spires.",
    try: [
      "Lunch on the terrace",
      "A coffee with a view"
    ],
    q: "Rinascente Milano Duomo",
    lat: 45.46496,
    lng: 9.19191
  },
  {
    id: "navigli",
    name: "Aperitivo on the Navigli",
    cat: "vibes",
    area: "Navigli",
    note: "Canal-side tables, a spritz and little bites, and the whole city out at golden hour.",
    try: [
      "Spritz",
      "Aperitivo plates"
    ],
    q: "Naviglio Grande, Milano",
    lat: 45.44726,
    lng: 9.15296
  },
  {
    id: "montenapo",
    name: "Quadrilatero della Moda",
    cat: "fashion",
    area: "Montenapoleone",
    note: "Via Montenapoleone, Via della Spiga and Via Sant’Andrea: every fashion house she loves, window after window.",
    try: [
      "Window shopping",
      "Coffee at Cova"
    ],
    q: "Via Montenapoleone, Milano",
    lat: 45.46858,
    lng: 9.19483
  },
  {
    id: "burberry",
    name: "Burberry Milano",
    cat: "fashion",
    area: "Via Sant’Andrea",
    note: "The Burberry store in the fashion district. Trench coats and that check.",
    try: [
      "Trench coats",
      "Check scarves"
    ],
    q: "Burberry, Via Sant'Andrea 2, Milano",
    lat: 45.46844,
    lng: 9.19593
  },
  {
    id: "gentlemonster",
    name: "Gentle Monster at 10 Corso Como",
    cat: "fashion",
    area: "Corso Como",
    note: "Gentle Monster’s first store in Europe, inside the 10 Corso Como concept store.",
    try: [
      "Trying on every pair of sunglasses"
    ],
    q: "Gentle Monster, 10 Corso Como, Milano",
    lat: 45.48194,
    lng: 9.18743
  },
  {
    id: "corsocomo",
    name: "10 Corso Como",
    cat: "fashion",
    area: "Corso Como",
    note: "Concept store, gallery, bookshop and a courtyard café full of plants.",
    try: [
      "The bookshop",
      "Café in the courtyard"
    ],
    q: "10 Corso Como, Milano",
    lat: 45.48194,
    lng: 9.18743
  },
  {
    id: "armanisilos",
    name: "Armani/Silos",
    cat: "fashion",
    area: "Tortona",
    note: "Armani’s own fashion museum: four floors of his work. A must for a fashion student.",
    try: [
      "The archive collections"
    ],
    q: "Armani/Silos, Via Bergognone 40, Milano",
    lat: 45.45141,
    lng: 9.16497
  },
  {
    id: "prada",
    name: "Fondazione Prada",
    cat: "places",
    area: "Largo Isarco",
    note: "Art, architecture and the Haunted House tower covered in gold leaf.",
    try: [
      "The exhibitions",
      "Bar Luce afterwards"
    ],
    q: "Fondazione Prada, Largo Isarco 2, Milano",
    lat: 45.44437,
    lng: 9.20533
  },
  {
    id: "necchi",
    name: "Villa Necchi Campiglio",
    cat: "places",
    area: "Palestro",
    note: "A 1930s villa with a garden and pool, straight out of a film (it was in “I Am Love”).",
    try: [
      "The house tour",
      "Coffee in the garden café"
    ],
    q: "Villa Necchi Campiglio, Via Mozart 14, Milano",
    lat: 45.46822,
    lng: 9.20183
  },
  {
    id: "galleria",
    name: "Galleria Vittorio Emanuele II",
    cat: "places",
    area: "Duomo",
    note: "Spin three times on the bull’s mosaic in the floor. It is said to bring you back to Milano.",
    try: [
      "The bull spin",
      "Looking up at the glass dome"
    ],
    q: "Galleria Vittorio Emanuele II, Milano",
    lat: 45.46564,
    lng: 9.19001
  },
  {
    id: "brera",
    name: "Pinacoteca di Brera",
    cat: "places",
    area: "Brera",
    note: "Beautiful paintings, then a slow wander through Brera’s little streets.",
    try: [
      "The gallery",
      "A walk down Via Fiori Chiari"
    ],
    q: "Pinacoteca di Brera, Milano",
    lat: 45.47224,
    lng: 9.18841
  },
  {
    id: "lastsupper",
    name: "The Last Supper",
    cat: "places",
    area: "Santa Maria delle Grazie",
    note: "Leonardo’s Last Supper. Tickets go weeks ahead, so book early.",
    try: [
      "Book tickets well ahead"
    ],
    q: "Cenacolo Vinciano, Santa Maria delle Grazie, Milano",
    lat: 45.46671,
    lng: 9.16962
  },
  {
    id: "castello",
    name: "Castello Sforzesco",
    cat: "places",
    area: "Sempione",
    note: "A real castle in the middle of the city, opening onto Parco Sempione.",
    try: [
      "The courtyards",
      "Michelangelo’s last sculpture"
    ],
    q: "Castello Sforzesco, Milano",
    lat: 45.4703,
    lng: 9.17809
  },
  {
    id: "scala",
    name: "Teatro alla Scala",
    cat: "places",
    area: "Duomo",
    note: "Dress up for a night at the opera or ballet. Cheaper last-minute seats exist too.",
    try: [
      "A ballet night",
      "The museum and a peek at the hall"
    ],
    q: "Teatro alla Scala, Milano",
    lat: 45.4676,
    lng: 9.18911
  },
  {
    id: "bellagio",
    name: "Bellagio, Lake Como",
    cat: "places",
    area: "Day trip · ~1h30",
    note: "The pearl of the lake: flower-filled lanes, gelato and a ferry ride.",
    try: [
      "Ferry between Varenna and Bellagio",
      "Gelato by the water"
    ],
    q: "Bellagio, Lake Como",
    lat: 45.98725,
    lng: 9.2613
  },
  {
    id: "varenna",
    name: "Varenna, Lake Como",
    cat: "places",
    area: "Day trip · ~1h by train",
    note: "Pastel houses tumbling down to the lake. Straight from Milano Centrale.",
    try: [
      "Passeggiata degli Innamorati",
      "Villa Monastero gardens"
    ],
    q: "Varenna, Lake Como",
    lat: 46.00998,
    lng: 9.28316
  },
  {
    id: "bergamo",
    name: "Bergamo Città Alta",
    cat: "places",
    area: "Day trip · ~50 min",
    note: "An old walled hilltop town. Take the funicular up.",
    try: [
      "Polenta",
      "Stracciatella gelato (invented here)"
    ],
    q: "Città Alta, Bergamo",
    lat: 45.69038,
    lng: 9.675
  },
  {
    id: "orta",
    name: "Orta San Giulio",
    cat: "places",
    area: "Day trip · ~1h30",
    note: "A tiny, quiet lake town with an island monastery. Calm in every way.",
    try: [
      "Boat to Isola San Giulio"
    ],
    q: "Orta San Giulio",
    lat: 45.79808,
    lng: 8.40695
  },
  {
    id: "isolabella",
    name: "Isola Bella, Lago Maggiore",
    cat: "places",
    area: "Day trip · ~1h by train",
    note: "A whole island of terraced baroque gardens with white peacocks.",
    try: [
      "Palazzo Borromeo gardens"
    ],
    q: "Isola Bella, Stresa",
    lat: 45.89547,
    lng: 8.52723
  },
  {
    id: "papiniano",
    name: "Mercato di Viale Papiniano",
    cat: "local",
    area: "Sant’Agostino",
    note: "Tuesday and Saturday market. Locals dig for designer bags, shoes and clothes here.",
    try: [
      "Bags",
      "Shoes",
      "Scarves"
    ],
    q: "Mercato Viale Papiniano, Milano",
    lat: 45.45848,
    lng: 9.16941
  },
  {
    id: "antiquariato",
    name: "Mercatone dell’Antiquariato",
    cat: "local",
    area: "Naviglio Grande",
    note: "The last Sunday of the month: kilometres of vintage and antiques along the canal.",
    try: [
      "Vintage bags",
      "Old jewellery",
      "Prints"
    ],
    q: "Mercatone dell'Antiquariato Naviglio Grande Milano",
    lat: 45.44726,
    lng: 9.15296
  },
  {
    id: "eastmarket",
    name: "East Market",
    cat: "local",
    area: "Lambrate",
    note: "A huge vintage and second-hand market on some Sundays. Check the dates first.",
    try: [
      "Vintage clothes",
      "Street food"
    ],
    q: "East Market Milano",
    lat: 45.48406,
    lng: 9.24313
  },
  {
    id: "raponi",
    name: "Tessuti Raponi",
    cat: "local",
    area: "Milano",
    note: "Fabric for her own designs, recommended by sewers in Milano.",
    try: [
      "Fabric by the metre"
    ],
    q: "Tessuti Raponi Milano",
    lat: 45.45307,
    lng: 9.17819
  },
  {
    id: "scampoli",
    name: "Tessuti e Scampoli",
    cat: "local",
    area: "Isola",
    note: "Fabrics and remnants, sometimes from fashion houses. A treasure hunt.",
    try: [
      "Remnants (scampoli)"
    ],
    q: "Tessuti e Scampoli Milano Isola",
    lat: 45.49206,
    lng: 9.1902
  },
  {
    id: "lavandai",
    name: "Vicolo dei Lavandai",
    cat: "local",
    area: "Navigli",
    note: "The old washhouse lane where clothes were scrubbed in the canal. One of the prettiest corners in the city.",
    try: [
      "A slow walk",
      "Photos"
    ],
    q: "Vicolo dei Lavandai, Milano",
    lat: 45.45203,
    lng: 9.17471
  },
  {
    id: "sarpi",
    name: "Via Paolo Sarpi",
    cat: "local",
    area: "Chinatown",
    note: "A pedestrian street of dumplings, bubble tea and matcha. Good for a taste of Asia.",
    try: [
      "Ravioli",
      "Bubble tea",
      "Matcha"
    ],
    q: "Via Paolo Sarpi, Milano",
    lat: 45.48152,
    lng: 9.17753
  },
  {
    id: "mercatocentrale",
    name: "Mercato Centrale",
    cat: "local",
    area: "Stazione Centrale",
    note: "A food hall at the station: a bit of everything, under one roof.",
    try: [
      "Pasta",
      "Pizza",
      "Gelato"
    ],
    q: "Mercato Centrale Milano",
    lat: 45.48729,
    lng: 9.20406
  },
  {
    id: "ortobotanico",
    name: "Orto Botanico di Brera",
    cat: "bloom",
    area: "Brera",
    note: "A secret little botanical garden behind the Brera gallery. Free, quiet and full of flowers.",
    try: [
      "A slow wander",
      "Reading on a bench"
    ],
    q: "Orto Botanico di Brera, Milano",
    lat: 45.47104,
    lng: 9.1897
  },
  {
    id: "sempione",
    name: "Parco Sempione",
    cat: "bloom",
    area: "Sempione",
    note: "The big park behind the castle. A picnic, a book and the Arco della Pace.",
    try: [
      "A picnic",
      "Sunset at Arco della Pace"
    ],
    q: "Parco Sempione, Milano",
    lat: 45.473,
    lng: 9.17697
  },
  {
    id: "montanelli",
    name: "Giardini Indro Montanelli",
    cat: "bloom",
    area: "Porta Venezia",
    note: "Old trees, ponds and the planetarium. A soft green place to breathe.",
    try: [
      "A walk",
      "Planetarium show"
    ],
    q: "Giardini Indro Montanelli, Milano",
    lat: 45.47457,
    lng: 9.20035
  },
  {
    id: "alberi",
    name: "Biblioteca degli Alberi",
    cat: "bloom",
    area: "Porta Nuova",
    note: "A modern park of flower fields and tree circles between the skyscrapers.",
    try: [
      "Lying in the grass",
      "Bosco Verticale photos"
    ],
    q: "Biblioteca degli Alberi, Milano",
    lat: 45.48452,
    lng: 9.19205
  },
  {
    id: "villareale",
    name: "Giardini della Villa Reale",
    cat: "bloom",
    area: "Palestro",
    note: "An English garden with a pond behind a neoclassical villa.",
    try: [
      "A quiet morning walk"
    ],
    q: "Giardini della Villa Reale, Milano",
    lat: 45.47257,
    lng: 9.19954
  },
  {
    id: "bosco",
    name: "Bosco Verticale",
    cat: "bloom",
    area: "Porta Nuova",
    note: "Two towers covered in trees. They are prettiest in spring and autumn.",
    try: [
      "Photos from the park below"
    ],
    q: "Bosco Verticale, Milano",
    lat: 45.48674,
    lng: 9.19126
  },
  {
    id: "duomoroof",
    name: "Duomo rooftop at sunset",
    cat: "golden",
    area: "Duomo",
    note: "Walk among the marble spires while the city turns pink.",
    try: [
      "Go up for the last slot of the day"
    ],
    q: "Duomo di Milano Terraces",
    lat: 45.46417,
    lng: 9.19161
  },
  {
    id: "montestella",
    name: "Monte Stella",
    cat: "golden",
    area: "San Siro",
    note: "The “little mountain” built from wartime rubble. Locals climb it for sunset over the city.",
    try: [
      "Sunset with a snack",
      "The Alps on clear days"
    ],
    q: "Monte Stella, Milano",
    lat: 45.49088,
    lng: 9.13448
  },
  {
    id: "torrebranca",
    name: "Torre Branca",
    cat: "golden",
    area: "Parco Sempione",
    note: "An iron tower in the park with a lift to a panoramic view.",
    try: [
      "Golden hour view"
    ],
    q: "Torre Branca, Milano",
    lat: 45.47329,
    lng: 9.17288
  },
  {
    id: "darsena",
    name: "Darsena at sunset",
    cat: "golden",
    area: "Navigli",
    note: "The old harbour where the canals meet. The water glows at sundown.",
    try: [
      "Sitting on the steps with a gelato"
    ],
    q: "Darsena, Milano",
    lat: 45.45291,
    lng: 9.17857
  },
  {
    id: "gaeaulenti",
    name: "Piazza Gae Aulenti",
    cat: "golden",
    area: "Porta Nuova",
    note: "Blue hour among the glass towers. The fountains light up after dark.",
    try: [
      "Blue hour photos"
    ],
    q: "Piazza Gae Aulenti, Milano",
    lat: 45.48348,
    lng: 9.19022
  },
  {
    id: "idroscalo",
    name: "Idroscalo sunrise",
    cat: "golden",
    area: "Near Linate",
    note: "Milano’s “sea”: a long lake for an early sunrise walk or a run.",
    try: [
      "Sunrise walk",
      "Summer lido"
    ],
    q: "Idroscalo, Milano",
    lat: 45.46421,
    lng: 9.28903
  },
  {
    id: "brunate",
    name: "Brunate, above Como",
    cat: "golden",
    area: "Day trip · funicular",
    note: "Take the funicular up from Como and watch the sun go down over the lake.",
    try: [
      "Funicular ride",
      "Sunset at the lighthouse (Faro Voltiano)"
    ],
    q: "Brunate, Como",
    lat: 45.81947,
    lng: 9.09599
  },
  {
    id: "bagnimisteriosi",
    name: "Bagni Misteriosi",
    cat: "beach",
    region: "In Milano",
    area: "Porta Romana",
    reach: "In the city",
    note: "A 1930s lido with pools and a summer beach-club feel, right in Milano.",
    try: [
      "Sunbathing by the pool",
      "Summer evenings"
    ],
    q: "Bagni Misteriosi, Milano",
    lat: 45.45378,
    lng: 9.20501
  },
  {
    id: "idroscalobeach",
    name: "Idroscalo beaches",
    cat: "beach",
    region: "In Milano",
    area: "Near Linate",
    reach: "~30 min by bus",
    note: "Sandy lake beaches and lidos for summer weekends without leaving the city.",
    try: [
      "A summer swim",
      "Paddleboarding"
    ],
    q: "Idroscalo Milano spiaggia",
    lat: 45.46421,
    lng: 9.28903
  },
  {
    id: "lenno",
    name: "Lido di Lenno",
    cat: "beach",
    region: "The lakes",
    area: "Lake Como",
    reach: "~1h30",
    note: "A lido on Lake Como with mountain views.",
    try: [
      "Sun loungers",
      "A swim in the lake"
    ],
    q: "Lido di Lenno, Lake Como",
    lat: 45.97058,
    lng: 9.19756
  },
  {
    id: "villaolmo",
    name: "Lido Villa Olmo",
    cat: "beach",
    region: "The lakes",
    area: "Como",
    reach: "~1h by train",
    note: "An easy lido in Como town, next to a grand villa garden.",
    try: [
      "The pool by the lake"
    ],
    q: "Lido Villa Olmo, Como",
    lat: 45.81997,
    lng: 9.06671
  },
  {
    id: "jamaica",
    name: "Jamaica Beach, Sirmione",
    cat: "beach",
    region: "The lakes",
    area: "Lake Garda",
    reach: "~1h30",
    note: "Smooth white rocks and turquoise water at the tip of Sirmione.",
    try: [
      "Sunbathing on the rock slabs"
    ],
    q: "Jamaica Beach Sirmione",
    lat: 45.49287,
    lng: 10.60773
  },
  {
    id: "camogli",
    name: "Camogli",
    cat: "beach",
    region: "Liguria",
    area: "Riviera di Levante",
    reach: "~2h30 by train",
    note: "Tall pastel houses and a pebble beach. It might be her dream postcard.",
    try: [
      "Focaccia di Recco",
      "A swim off the pebbles"
    ],
    q: "Spiaggia di Camogli",
    lat: 44.35114,
    lng: 9.15249
  },
  {
    id: "paraggi",
    name: "Paraggi",
    cat: "beach",
    region: "Liguria",
    area: "Near Portofino",
    reach: "~2h30",
    note: "An emerald cove between Santa Margherita and Portofino. Very chic.",
    try: [
      "A beach club day",
      "Walk on to Portofino"
    ],
    q: "Spiaggia di Paraggi",
    lat: 44.31157,
    lng: 9.2086
  },
  {
    id: "santamargherita",
    name: "Santa Margherita Ligure",
    cat: "beach",
    region: "Liguria",
    area: "Riviera di Levante",
    reach: "~2h by train",
    note: "An elegant seaside town with a palm promenade. An easy base for Portofino.",
    try: [
      "Seafront passeggiata",
      "Pesto"
    ],
    q: "Santa Margherita Ligure",
    lat: 44.3281,
    lng: 9.19271
  },
  {
    id: "baiadelsilenzio",
    name: "Baia del Silenzio",
    cat: "beach",
    region: "Liguria",
    area: "Sestri Levante",
    reach: "~2h30 by train",
    note: "The “bay of silence”: a curve of colourful houses around calm water.",
    try: [
      "A morning swim",
      "Gelato on the sand"
    ],
    q: "Baia del Silenzio, Sestri Levante",
    lat: 44.26987,
    lng: 9.39403
  },
  {
    id: "monterosso",
    name: "Monterosso al Mare",
    cat: "beach",
    region: "Liguria",
    area: "Cinque Terre",
    reach: "~3h by train",
    note: "The Cinque Terre village with real sandy beaches and striped umbrellas.",
    try: [
      "Anchovies",
      "The coastal trail to Vernazza"
    ],
    q: "Spiaggia di Fegina, Monterosso al Mare",
    lat: 44.14652,
    lng: 9.65556
  },
  {
    id: "varigotti",
    name: "Baia dei Saraceni",
    cat: "beach",
    region: "Liguria",
    area: "Varigotti",
    reach: "~2h30",
    note: "Clear water and a little old fishing village painted in pastels.",
    try: [
      "Snorkelling",
      "Farinata"
    ],
    q: "Baia dei Saraceni, Varigotti",
    lat: 44.18416,
    lng: 8.40739
  },
  {
    id: "calaviolina",
    name: "Cala Violina",
    cat: "beach",
    region: "Tuscany",
    area: "Maremma",
    reach: "~5h",
    note: "A wild cove reached through a pine forest. The sand is said to “sing” underfoot.",
    try: [
      "The forest walk in",
      "Bring a picnic"
    ],
    q: "Cala Violina",
    lat: 42.85721,
    lng: 10.77411
  },
  {
    id: "fetovaia",
    name: "Fetovaia, Elba",
    cat: "beach",
    region: "Tuscany",
    area: "Isola d’Elba",
    reach: "~5h + ferry",
    note: "Golden sand and Caribbean-blue water on Elba island.",
    try: [
      "A whole lazy beach day"
    ],
    q: "Spiaggia di Fetovaia, Elba",
    lat: 42.73452,
    lng: 10.15294
  },
  {
    id: "pelosa",
    name: "La Pelosa",
    cat: "beach",
    region: "Sardinia",
    area: "Stintino",
    reach: "~1h flight",
    note: "Shallow turquoise water and an old watchtower. Book a beach slot in summer.",
    try: [
      "Floating in the shallows"
    ],
    q: "Spiaggia La Pelosa, Stintino",
    lat: 40.93916,
    lng: 8.2255
  },
  {
    id: "goloritze",
    name: "Cala Goloritzé",
    cat: "beach",
    region: "Sardinia",
    area: "Baunei",
    reach: "~1h flight + hike",
    note: "A rock spire over white pebbles. Reached by a hike or by boat.",
    try: [
      "The hike down",
      "Snorkelling"
    ],
    q: "Cala Goloritzé",
    lat: 40.10807,
    lng: 9.6896
  },
  {
    id: "principe",
    name: "Spiaggia del Principe",
    cat: "beach",
    region: "Sardinia",
    area: "Costa Smeralda",
    reach: "~1h flight",
    note: "A soft arc of white sand and clear water on the Costa Smeralda.",
    try: [
      "A slow morning swim"
    ],
    q: "Spiaggia del Principe, Costa Smeralda",
    lat: 41.08916,
    lng: 9.5615
  },
  {
    id: "scaladeiturchi",
    name: "Scala dei Turchi",
    cat: "beach",
    region: "Sicily",
    area: "Agrigento",
    reach: "~1h45 flight",
    note: "Dazzling white chalk cliffs above blue water. Unreal at sunset.",
    try: [
      "Sunset from the beach below"
    ],
    q: "Scala dei Turchi",
    lat: 37.28992,
    lng: 13.4727
  },
  {
    id: "sanvito",
    name: "San Vito Lo Capo",
    cat: "beach",
    region: "Sicily",
    area: "Trapani",
    reach: "~1h45 flight",
    note: "A long white beach under a mountain, with couscous on every menu.",
    try: [
      "Fish couscous",
      "Granita"
    ],
    q: "Spiaggia di San Vito Lo Capo",
    lat: 38.17235,
    lng: 12.73493
  },
  {
    id: "isolabellataormina",
    name: "Isola Bella, Taormina",
    cat: "beach",
    region: "Sicily",
    area: "Taormina",
    reach: "~1h45 flight",
    note: "A tiny island joined to the shore by a sandbar. Pure postcard.",
    try: [
      "Walking the sandbar",
      "Granita with brioche"
    ],
    q: "Isola Bella, Taormina",
    lat: 37.85025,
    lng: 15.30072
  },
  {
    id: "polignano",
    name: "Polignano a Mare",
    cat: "beach",
    region: "Puglia",
    area: "Lama Monachile",
    reach: "~1h30 flight",
    note: "A tiny pebble cove between cliffs, right under the old town.",
    try: [
      "A swim in the cove",
      "Caffè speciale"
    ],
    q: "Lama Monachile, Polignano a Mare",
    lat: 40.99482,
    lng: 17.21726
  },
  {
    id: "torredellorso",
    name: "Torre dell’Orso",
    cat: "beach",
    region: "Puglia",
    area: "Salento",
    reach: "~1h30 flight",
    note: "Soft sand, pine trees and two sea stacks called the Two Sisters.",
    try: [
      "Sunrise on the beach"
    ],
    q: "Torre dell'Orso spiaggia",
    lat: 40.27451,
    lng: 18.43015
  },
  {
    id: "baiadeiturchi",
    name: "Baia dei Turchi",
    cat: "beach",
    region: "Puglia",
    area: "Otranto",
    reach: "~1h30 flight",
    note: "A Caribbean-looking bay through the pine woods near Otranto.",
    try: [
      "Snorkelling",
      "Otranto old town after"
    ],
    q: "Baia dei Turchi, Otranto",
    lat: 40.19515,
    lng: 18.46295
  },
  {
    id: "positano",
    name: "Positano",
    cat: "beach",
    region: "Amalfi Coast",
    area: "Spiaggia Grande",
    reach: "~4h30 train + ferry",
    note: "Pastel houses stacked up the cliff and orange-and-blue umbrellas below.",
    try: [
      "Lemon granita",
      "A ferry along the coast"
    ],
    q: "Spiaggia Grande, Positano",
    lat: 40.62763,
    lng: 14.48774
  },
  {
    id: "furore",
    name: "Fiordo di Furore",
    cat: "beach",
    region: "Amalfi Coast",
    area: "Furore",
    reach: "~5h",
    note: "A tiny beach hidden in a fjord under a bridge.",
    try: [
      "A quick dip"
    ],
    q: "Fiordo di Furore",
    lat: 40.61457,
    lng: 14.55485
  },
  {
    id: "capri",
    name: "Marina Piccola, Capri",
    cat: "beach",
    region: "Amalfi Coast",
    area: "Capri",
    reach: "~5h train + ferry",
    note: "Clear water with the Faraglioni rocks in view. Very glamorous.",
    try: [
      "Beach club lunch",
      "Caprese salad, where it was born"
    ],
    q: "Marina Piccola, Capri",
    lat: 40.54521,
    lng: 14.2344
  },
  {
    id: "tropea",
    name: "Tropea",
    cat: "beach",
    region: "Calabria",
    area: "Coast of the Gods",
    reach: "~1h30 flight",
    note: "A clifftop town above white sand. Famous for its sweet red onions.",
    try: [
      "Red onion gelato (really)",
      "Sunset at the sanctuary"
    ],
    q: "Spiaggia di Tropea",
    lat: 38.67527,
    lng: 15.89485
  },
  {
    id: "prada",
    name: "Prada, Galleria",
    cat: "fashion",
    area: "Galleria",
    note: "The very first Prada store, opened in 1913 under the Galleria’s glass dome. Look down at the black-and-white mosaic floor.",
    try: [
      "Bags",
      "Shoes",
      "The window displays"
    ],
    q: "Prada Galleria Vittorio Emanuele II Milano",
    lat: 45.46547,
    lng: 9.19019
  },
  {
    id: "gucci",
    name: "Gucci",
    cat: "fashion",
    area: "Montenapoleone",
    note: "The Montenapoleone flagship. Worth it just for the interiors.",
    try: [
      "Bags",
      "Loafers",
      "Scarves"
    ],
    q: "Gucci Via Monte Napoleone 7 Milano",
    lat: 45.46793,
    lng: 9.19546
  },
  {
    id: "versace",
    name: "Versace",
    cat: "fashion",
    area: "Montenapoleone",
    note: "Bold, gold and very Milanese. The flagship on Montenapoleone.",
    try: [
      "Scarves",
      "Sunglasses"
    ],
    q: "Versace Via Monte Napoleone 11 Milano",
    lat: 45.46834,
    lng: 9.19499
  },
  {
    id: "dolce",
    name: "Dolce&Gabbana",
    cat: "fashion",
    area: "Via della Spiga",
    note: "Sicily in Milano: prints, lace and lemons all over Via della Spiga.",
    try: [
      "Dresses",
      "Bags"
    ],
    q: "Dolce & Gabbana Via della Spiga Milano",
    lat: 45.46862,
    lng: 9.19868
  },
  {
    id: "armani",
    name: "Armani/Manzoni 31",
    cat: "fashion",
    area: "Via Manzoni",
    note: "A whole Armani world under one roof: fashion, home, flowers, café and a restaurant.",
    try: [
      "Window shopping",
      "Coffee upstairs"
    ],
    q: "Armani Manzoni 31 Milano",
    lat: 45.47088,
    lng: 9.19299
  },
  {
    id: "valentino",
    name: "Valentino",
    cat: "fashion",
    area: "Montenapoleone",
    note: "Valentino red and couture-level details on Montenapoleone.",
    try: [
      "Shoes",
      "Bags"
    ],
    q: "Valentino Via Monte Napoleone 20 Milano",
    lat: 45.46955,
    lng: 9.19378
  },
  {
    id: "bottega",
    name: "Bottega Veneta",
    cat: "fashion",
    area: "Montenapoleone",
    note: "The woven-leather bags. Quiet luxury at its best.",
    try: [
      "Intrecciato bags"
    ],
    q: "Bottega Veneta Via Monte Napoleone 27 Milano",
    lat: 45.46965,
    lng: 9.19331
  },
  {
    id: "miumiu",
    name: "Miu Miu",
    cat: "fashion",
    area: "Via della Spiga",
    note: "Playful, girly and very now.",
    try: [
      "Ballet flats",
      "Mini bags"
    ],
    q: "Miu Miu Via della Spiga 13 Milano",
    lat: 45.46963,
    lng: 9.19745
  },
  {
    id: "maxmara",
    name: "Max Mara",
    cat: "fashion",
    area: "Corso Vittorio Emanuele",
    note: "The camel coat, in the city it was made for.",
    try: [
      "The 101801 camel coat",
      "Knitwear"
    ],
    q: "Max Mara Corso Vittorio Emanuele II Milano",
    lat: 45.46536,
    lng: 9.1949
  },
  {
    id: "etro",
    name: "Etro",
    cat: "fashion",
    area: "Montenapoleone",
    note: "The paisley house. Prints, colour and beautiful scarves.",
    try: [
      "Paisley scarves"
    ],
    q: "Etro Via Monte Napoleone 5 Milano",
    lat: 45.4678,
    lng: 9.19561
  },
  {
    id: "lv",
    name: "Louis Vuitton",
    cat: "fashion",
    area: "Montenapoleone",
    note: "At the top of Montenapoleone.",
    try: [
      "Bags",
      "Small leather goods"
    ],
    q: "Louis Vuitton Via Monte Napoleone 2 Milano",
    lat: 45.46716,
    lng: 9.19662
  },
  {
    id: "dior",
    name: "Dior (Galleria)",
    cat: "fashion",
    area: "Galleria",
    note: "Dior inside the Galleria, a pretty stop between the Duomo and La Scala.",
    try: [
      "Bags",
      "Beauty"
    ],
    q: "Dior Galleria Vittorio Emanuele II Milano",
    lat: 45.46548,
    lng: 9.18983
  },
  {
    id: "chanel",
    name: "Chanel (Galleria)",
    cat: "fashion",
    area: "Galleria",
    note: "Chanel’s boutique in the Galleria.",
    try: [
      "Bags",
      "Beauty and fragrance"
    ],
    q: "Chanel Galleria Vittorio Emanuele II Milano",
    lat: 45.46515,
    lng: 9.19014
  },
  {
    id: "excelsior",
    name: "Excelsior Milano",
    cat: "fashion",
    area: "Galleria del Corso",
    note: "A concept department store: designer edits, beauty and a food hall, near the Duomo.",
    try: [
      "Designer edits",
      "Beauty"
    ],
    q: "Excelsior Milano Galleria del Corso 4",
    lat: 45.46474,
    lng: 9.19482
  },
  {
    id: "antonia",
    name: "Antonia",
    cat: "fashion",
    area: "Brera",
    note: "A favourite multi-brand boutique with a sharp eye for what’s next.",
    try: [
      "New designers",
      "Shoes"
    ],
    q: "Antonia Via Cusani 5 Milano",
    lat: 45.46865,
    lng: 9.18477
  },
  {
    id: "morando",
    name: "Palazzo Morando",
    cat: "fashion",
    area: "Via Sant’Andrea",
    note: "A palazzo museum of costume and fashion, in the middle of the fashion district.",
    try: [
      "Fashion exhibitions"
    ],
    q: "Palazzo Morando Costume Moda Immagine Milano",
    lat: 45.46859,
    lng: 9.19626
  },
  {
    id: "corsovittorio",
    name: "Corso Vittorio Emanuele II",
    cat: "fashion",
    area: "Duomo",
    note: "The high street by the Duomo, for the easier everyday buys.",
    try: [
      "High-street shopping"
    ],
    q: "Corso Vittorio Emanuele II Milano",
    lat: 45.46534,
    lng: 9.19521
  },
  {
    id: "buenosaires",
    name: "Corso Buenos Aires",
    cat: "fashion",
    area: "Porta Venezia",
    note: "One of Europe’s longest shopping streets. Shoes, bags and everything in between.",
    try: [
      "Shoes",
      "Bags",
      "Then pizza at Spontini"
    ],
    q: "Corso Buenos Aires Milano",
    lat: 45.47895,
    lng: 9.20957
  },
  {
    id: "scalo",
    name: "Scalo Milano Outlet & More",
    cat: "fashion",
    area: "Locate di Triulzi",
    note: "The outlet closest to the city, reachable without a car.",
    try: [
      "Designer outlet deals"
    ],
    q: "Scalo Milano Outlet & More",
    lat: 45.36056,
    lng: 9.21551
  },
  {
    id: "serravalle",
    name: "Serravalle Designer Outlet",
    cat: "fashion",
    area: "Day trip · shuttle from Milano",
    note: "A huge designer outlet village. Shuttles run from central Milano.",
    try: [
      "Big-brand outlet deals"
    ],
    q: "Serravalle Designer Outlet",
    lat: 44.73508,
    lng: 8.8373
  },
  {
    id: "fidenza",
    name: "Fidenza Village",
    cat: "fashion",
    area: "Near Parma",
    note: "A designer outlet village between Milano and Parma. Train to Fidenza, then a short shuttle.",
    try: [
      "Designer outlet deals"
    ],
    q: "Fidenza Village",
    lat: 44.88393,
    lng: 10.09081
  },
  {
    id: "vicolungo",
    name: "Vicolungo The Style Outlets",
    cat: "fashion",
    area: "Novara",
    note: "An outlet village west of Milano, with weekend shuttles from Centrale.",
    try: [
      "Outlet deals"
    ],
    q: "Vicolungo The Style Outlets",
    lat: 45.4685,
    lng: 8.46114
  },
  {
    id: "franciacorta",
    name: "Franciacorta Outlet Village",
    cat: "fashion",
    area: "Brescia",
    note: "Outlets in the Franciacorta wine country.",
    try: [
      "Outlet deals",
      "A glass of Franciacorta"
    ],
    q: "Franciacorta Outlet Village",
    lat: 45.57706,
    lng: 10.11947
  }
];

export const mapsLink = (p: Place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.q)}`;

export type Spot = { lat: number; lng: number };

/** Straight-line distance in km. */
export function distanceKm(a: Spot, b: Spot) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "900 m · 14 min walk", "6.2 km away", "320 km away". Streets aren't straight, so walking adds ~30%. */
export function distanceLabel(km: number) {
  if (km < 3) {
    const mins = Math.max(1, Math.round(((km * 1.3) / 4.8) * 60));
    return `${km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`} · ${mins} min walk`;
  }
  return `${km < 20 ? km.toFixed(1) : Math.round(km)} km away`;
}

/** Google Maps search centred on her, e.g. "matcha" around where she's standing. */
export const mapsAround = (q: string, at: Spot) => `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${at.lat},${at.lng},15z`;
