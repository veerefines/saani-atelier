/**
 * Saanika's journey. Everything here is placeholder content: edit freely.
 *
 * Media lives in /public/journey:
 *   photos/  .jpg / .webp photos  (a missing file shows a soft "your photo here" polaroid)
 *   video/   .mp4 clips (H.264). Keep them short, ideally under 15 MB.
 *   audio/   .mp3 voice notes and the background music
 *
 * To add a photo: drop it in public/journey/photos with the file name used below,
 * or change `src` to your file's name. Paths start with /journey/...
 */

export type Palette = { base: string; a: string; b: string; c: string; ink: string };
export type Texture = 'lined' | 'grid' | 'linen' | 'stars' | 'map';
type Side = 'left' | 'right' | 'center';

export type Item =
  | { type: 'photo'; src: string; caption?: string; size?: 's' | 'm' | 'l' | 'xl'; side?: Side; tilt?: number; tape?: boolean }
  | { type: 'note'; text: string; from?: string; paper?: 'plain' | 'lined' | 'grid'; side?: Side; tilt?: number }
  | { type: 'quote'; text: string; by?: string }
  | { type: 'voice'; src: string; title: string; from: string; side?: Side }
  | { type: 'video'; src: string; poster?: string; caption?: string; side?: Side }
  | { type: 'film'; title: string; frames: { src: string; caption: string }[] }
  | { type: 'ticket'; from: string; fromCity: string; to: string; toCity: string; date: string; seat?: string }
  | { type: 'postcard'; text: string; signoff: string };

export type Chapter = {
  id: 'once' | 'spark' | 'designer' | 'leap' | 'milan' | 'mine';
  number: string;
  kicker: string;
  title: string;
  years?: string;
  intro: string;
  palette: Palette;
  texture: Texture;
  items: Item[];
};

const P = (n: string) => `/journey/photos/${n}`;

export const journeyIntro = {
  name: 'Saanika',
  title: 'the thread of you',
  line: 'Every stitch, from the very first one. Scroll slowly.',
  palette: { base: '#fbe3e8', a: '#ffd9c7', b: '#cdb4f0', c: '#f4a6c0', ink: '#1e1b24' } satisfies Palette,
};

export const chapters: Chapter[] = [
  {
    id: 'once',
    number: 'Chapter one',
    kicker: 'where it all began',
    title: 'Once upon a time',
    years: 'the early years',
    intro: 'Before the sketchbooks and the studios, there was a little girl with very strong opinions about outfits.',
    palette: { base: '#fff3dc', a: '#ffd9c7', b: '#f7e3a1', c: '#fbc8d4', ink: '#3a2a22' },
    texture: 'lined',
    items: [
      { type: 'photo', src: P('childhood-1.jpg'), caption: 'the very beginning', size: 'm', side: 'left', tilt: -4, tape: true },
      {
        type: 'note',
        text: 'Add a childhood memory here: the first outfit she put together, the doll she always dressed up, the thing everyone still teases her about.',
        from: 'Mum',
        paper: 'lined',
        side: 'right',
        tilt: 3,
      },
      { type: 'photo', src: P('childhood-2.jpg'), caption: 'first day of school', size: 's', side: 'right', tilt: 5 },
      { type: 'photo', src: P('little-with-mum-dad.jpg'), caption: 'when you were little, with Mum & Dad', size: 'm', side: 'left', tilt: 3, tape: true },
      { type: 'photo', src: P('childhood-3.jpg'), caption: 'already posing', size: 's', side: 'center', tilt: -6, tape: true },
    ],
  },
  {
    id: 'spark',
    number: 'Chapter two',
    kicker: 'the first flicker',
    title: 'The spark',
    years: 'growing up',
    intro: 'Somewhere between school and growing up, clothes stopped being just clothes and became an idea.',
    palette: { base: '#fde4ea', a: '#f4a6c0', b: '#ffd9c7', c: '#e9c6f2', ink: '#3b1c2c' },
    texture: 'grid',
    items: [
      { type: 'quote', text: 'She never just wore something. She styled it.' },
      { type: 'photo', src: P('spark-1.jpg'), caption: 'the first sketch', size: 'l', side: 'center', tilt: 3, tape: true },
      {
        type: 'note',
        text: 'A note from a school friend: the moment they knew she was going to do this for real.',
        from: 'a best friend',
        paper: 'grid',
        side: 'left',
        tilt: -3,
      },
      // a milestone piece: the big one
      { type: 'photo', src: P('spark-2.jpg'), caption: 'that one outfit', size: 'xl', side: 'center', tilt: -2, tape: true },
    ],
  },
  {
    id: 'designer',
    number: 'Chapter three',
    kicker: 'finding her hand',
    title: 'Becoming a designer',
    years: 'design school and beyond',
    intro: 'Late nights, pinned hems, mood boards on every wall. The years she found her own way of seeing.',
    palette: { base: '#efe6f7', a: '#cdb4f0', b: '#f4a6c0', c: '#bfd9d4', ink: '#2a2038' },
    texture: 'linen',
    items: [
      {
        type: 'film',
        title: 'Collections and firsts',
        frames: [
          { src: P('design-1.jpg'), caption: 'first collection' },
          { src: P('design-2.jpg'), caption: 'jury day' },
          { src: P('design-3.jpg'), caption: 'backstage' },
          { src: P('design-4.jpg'), caption: 'the studio' },
          { src: P('design-5.jpg'), caption: 'graduation' },
        ],
      },
      { type: 'video', src: '/journey/video/studio.mp4', caption: 'add a runway clip or a studio video', side: 'center' },
      { type: 'note', text: 'Something a teacher or mentor said that she still carries with her.', from: 'a mentor', side: 'right', tilt: 2 },
      { type: 'voice', src: '/journey/audio/voice-2.mp3', title: 'So proud of you', from: 'add a name', side: 'left' },
    ],
  },
  {
    id: 'leap',
    number: 'Chapter four',
    kicker: 'brave, and a little terrified',
    title: 'The leap',
    years: 'the dream',
    intro: 'Then came the big idea: a Master’s in Fashion Management, in Milan. And she went for it.',
    palette: { base: '#2b1b3a', a: '#6b1e3a', b: '#8e5bb5', c: '#e48aae', ink: '#fbeff4' },
    texture: 'stars',
    items: [
      { type: 'photo', src: P('leap-1.jpg'), caption: 'the day the letter came', size: 'm', side: 'right', tilt: -3, tape: true },
      { type: 'quote', text: 'Good things take time. Great things take courage.' },
      { type: 'voice', src: '/journey/audio/voice-3.mp3', title: 'Go get it', from: 'add a name', side: 'center' },
      {
        type: 'note',
        text: 'A few words about what it took to get here: the applications, the waiting, the doubts, and then the yes.',
        from: 'Varun',
        paper: 'lined',
        side: 'left',
        tilt: -2,
      },
    ],
  },
  {
    id: 'milan',
    number: 'Chapter five',
    kicker: 'a new city, a new studio',
    title: 'Milano awaits',
    years: 'now',
    intro: 'A whole new chapter, and every one of us stitched into it with you.',
    palette: { base: '#fff4e0', a: '#f7e3a1', b: '#f4a6c0', c: '#e9c79a', ink: '#3a2618' },
    texture: 'map',
    items: [
      { type: 'ticket', from: 'BOM', fromCity: 'Mumbai', to: 'MXP', toCity: 'Milano', date: '10 Nov 2026', seat: 'window, obviously' },
      { type: 'photo', src: P('milano-1.jpg'), caption: 'the new view', size: 'm', side: 'left', tilt: 4 },
      {
        type: 'postcard',
        text: 'Wherever you are, you carry all of us with you. Eat the gelato, walk everywhere, call home. Now go make Milan yours.',
        signoff: 'all of us',
      },
    ],
  },
];

export const journeyMusic = { src: '/journey/audio/river-flows-in-you.m4a', label: 'Play music', title: 'River Flows in You' };
