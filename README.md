# Saani Atelier

A private surprise website for Saanika. Next.js + Framer Motion.

## Run it on your Mac

```bash
npm install
cp env.template .env.local   # then fill in SESSION_SECRET (and INVITES later)
npm run dev
```

Open http://localhost:3000

In development, two demo codes work when `INVITES` is empty:

- `DEMO-SAANIKA` – Saanika's view (the gift reveal)
- `DEMO-FRIEND` – a well-wisher's view

Magic links work too: http://localhost:3000/hello/DEMO-SAANIKA

- Replay the reveal: http://localhost:3000/?replay=1
- Sign out: http://localhost:3000/api/logout

## What's built so far

- Landing: the wrapped bouquet with a gift tag that is the login
- Login: invite codes and personal magic links (`/hello/<code>`), signed cookie sessions, revocable by removing the invite
- Surprise reveal: tap the bow, it falls, the tissue lifts, carnations bloom, petals drift, a gold needle pulls a silk thread down to a handwritten note
- Journey (`/journey`): a scroll story in five chapters. A silk thread is stitched down the page as she scrolls, with the gold needle catching the light; backgrounds and paper textures shift with each chapter; polaroids develop, notes pin themselves down, quotes light up word by word, a film strip slides sideways, cassette voice notes, a video that plays as it scrolls into view, a boarding pass, a postcard, confetti at the end, and optional music-box background music
- Her desk (`/home`): the dashboard she lands on after the reveal, with live Milano and Mumbai clocks, a day counter, and six desk objects:
  - Wall of love (`/home/love`): every message, photo, voice note and video from her people, pinned up as polaroids, notes and cassettes. She reacts with 🌷 🌸 🪡 ✂️ 💗, filters by person, and sees "new" badges.
  - Open when (`/home/letters`): sealed envelopes; some unlock on a date, and they open with a letter sliding out on handmade paper.
  - Message jar (`/home/jar`): she picks how she feels, shakes the jar, and a note for that mood pops out.
  - Milano bingo (`/home/bingo`): 25 squares; tapping "I did it" stitches the square shut and gives a reward (a bouquet, a quirky certificate or a cheer), with confetti for every line and a finale for the full board. Optional photo proof.
  - Milano corner (`/home/milano`): days in Milano (or sleeps until), two clocks, and "Your little Milano": mood chips (food, coffee & matcha, vibes, fashion & places, local spots, flowers, golden hour, beaches), a pastel mini map of every place, and a Surprise me button that deals a place with what to order, its Google rating and a Google Maps link. A 📍 Near me chip uses her location (only in her browser, never sent to the server) to show what's closest, with walking times, a dot on the map, and quick Google Maps searches around her (matcha, gelato, florists, fabric shops, vintage…). Then "Workshops, shows & people": the big fashion dates (Fashion Week, MICAM shoes, MIPEL bags, White, Milano Unica, Lineapelle, Design Week) counting down to the next edition, plus fashion and sewing workshops, matcha classes, runway courses and networking, linked to live listings on Eventbrite and Meetup. Below that, beaches to run away to, from Milano's lidos to the islands. Her own list sits at the side; anything can be saved to it in one tap.
  - Your story: back to the journey.
- Well-wishers' desk (`/wall`): the same atelier as hers, with clocks and a countdown to Saanika landing in Milano, and six tiles:
  - Pin to her wall (`/wall/love`): a message, a photo album (up to 10), a voice note (record in the browser or upload) or a video (record with the camera, up to 90 seconds, or upload).
  - Open when (`/wall/letters`): sealed letters, optionally locked until a date.
  - Fill her jar (`/wall/jar`): notes by mood, with a gauge showing which moods need more.
  - Cheer her bingo (`/wall/bingo`): see which squares she's stitched (never her photo proofs) and pin a dare or cheer to any square. She sees it on the square and with her reward.
  - Milano tips (`/wall/milano`): places and plans that land on her Milano list as "from <name>".
  - Your sent box (`/wall/sent`): everything they've sent, whether she's opened or read it, her reactions, and delete.

## Adding her real photos, videos and voice notes

All journey content is in `src/content/journey.ts`, with media in `public/journey/`:

- `public/journey/photos/` – drop photos in using the file names listed in `journey.ts` (e.g. `childhood-1.jpg`), or change the names there. Missing photos show a soft "your photo here" polaroid with the expected file name.
- `public/journey/video/` – `.mp4` (H.264). The studio clip is expected at `video/studio.mp4`; until then a placeholder plays.
- `public/journey/audio/` – `.mp3` voice notes (`voice-1.mp3` …) and `music-box.mp3` for the background music. The current files are placeholder chimes.

## Where things are stored

- On your Mac (development), everything people post is saved in a `.data/` folder in the project. Delete that folder to start fresh.
- For the real site on Vercel, use Supabase (free):
  1. Create a project at supabase.com.
  2. In SQL Editor, run `supabase/schema.sql`.
  3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API) to your Vercel environment variables, alongside `SESSION_SECRET` and `INVITES`.
  Photos, voice notes and videos then go to a private storage bucket, and only signed-in people can see them.

## Dashboard content

`src/content/home.ts` holds the bingo squares and rewards, her arrival date, the letters and jar notes from you that appear on day one, the mood list and the reaction set.

## Milano guide and Google ratings

The places (about 90, each checked against OpenStreetMap for its location) are in `src/content/milano.ts`. Add, remove or reword freely; `q` is what Google Maps searches for.

For live Google ratings on the cards, add `GOOGLE_MAPS_API_KEY` (a Google Cloud key with the Places API (New) enabled) to `.env.local` or Vercel. Ratings are cached for a week. Without a key, each card links to the place on Google Maps.

Fashion dates live in `src/content/happenings.ts`. They were checked on the organisers' sites in October 2026; add the next editions each season (past ones drop off by themselves).

## Things she loves (PNG keepsakes)

Sunglasses, iced coffee, matcha, chamomile, bags, heels, a check scarf, flowers, Italian food and beach things are tucked around the desk and its corners. Drop transparent PNGs (about 800px on the long side) into `public/her/` with these names, then restart the server:

| File | What | Where it shows |
|---|---|---|
| `sunglasses.png` | Gentle Monster-style sunglasses | desk, Milano corner |
| `iced-coffee.png` | Iced coffee with a straw | desk |
| `matcha.png` | Matcha latte | message jar |
| `chamomile.png` | Cup of chamomile tea | message jar |
| `handbag.png` | Designer handbag / purse | desk |
| `heels.png` | A pair of heels | desk, bingo |
| `scarf.png` | Check scarf, Burberry-style | letters |
| `shopping-bags.png` | Fashion-brand shopping bags | bingo |
| `peonies.png` | Pastel peonies or roses | desk, wall of love |
| `daisies.png` | Daisies or wildflowers | wall of love, letters |
| `pasta.png`, `gelato.png`, `pizza.png` | Italian food | Milano corner |
| `seashell.png`, `starfish.png`, `sun-hat.png`, `beach-umbrella.png` | Beach things | beaches |

Positions are in `src/content/keepsakes.ts`. Missing files don't show on the real site; in `npm run dev` they appear as dashed placeholders so you can see where each goes.

## Swapping images and text

- Photo layers live in `public/reveal/`. Replace a file with another transparent WebP/PNG of the same name.
- The note text is in `src/content/site.ts`.
- Bouquet layer positions are in `src/components/PhotoBouquet.tsx` (percentages of the stage).

## Deployment

- Live at https://saani-atelier.vercel.app (Vercel), with data and media in Supabase (project `saani-atelier`, Frankfurt).
- Every push to `main` on GitHub deploys to production automatically.
- Production settings live in Vercel (Project → Settings → Environment Variables): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `INVITES`, and optionally `GOOGLE_MAPS_API_KEY`. After changing one, redeploy (push, or `npx vercel@latest deploy --prod`).
- Database changes: add a file to `supabase/migrations/` and run `npx supabase@latest db push`.

## Notifications, calm and keeping things awake

- **Notifications:** on her desk, "Tell me when something new arrives" sends her a push notification whenever a friend pins something, seals a letter, fills the jar, leaves a dare or adds a tip. On iPhone it works from the home-screen app (iOS 16.4+). The keys are `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Vercel.
- **Something calming:** after a sad, anxious, homesick or unmotivated jar note, the jar suggests chamomile and a few quiet places from the guide (`calm` in `src/content/home.ts`).
- **A taste of home:** the 🪔 Home mood in Milano corner: Indian restaurants and an Indian grocery, checked against OpenStreetMap.
- **Keepalive:** a daily Vercel cron (`vercel.json`) calls `/api/keepalive` so Supabase's free plan doesn't pause the database. It needs `CRON_SECRET` in Vercel.

## Before sharing

Set `SESSION_SECRET` and `INVITES` in your hosting provider (Vercel) environment variables. Demo codes are switched off in production.
