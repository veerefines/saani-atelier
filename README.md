# Saani Atelier

A private surprise website for Saanika, moving from Mumbai to Milano (flying 27 Oct 2026). Next.js 15, React 19, Framer Motion and GSAP, with Supabase for data and media in production.

Live at https://saani-atelier.vercel.app.

## Run it on your Mac

```bash
npm install
cp env.template .env.local   # then fill in SESSION_SECRET (and INVITES later)
npm run dev
```

Open http://localhost:3000

In development, two demo codes work when `INVITES` is empty:

- `DEMO-SAANIKA` – Saanika's view (the gift reveal)
- `DEMO-FRIEND` – a well-wisher's view (also an admin)

Magic links work too: http://localhost:3000/hello/DEMO-SAANIKA

- Replay the reveal: http://localhost:3000/?replay=1
- Sign out: http://localhost:3000/api/logout

## Tests

```bash
npm run build && npm test
```

`tests/run.sh` starts its own server on the build (port 3100), then runs:

- every API with each role: signed out, Saanika, friend, admin
- the privacy rules, plus page renders
- removing friends and deleting everything they shared
- Moments, friends reading the journey, private My Corner files, and every My Corner action
- web push end to end, through a fake push service that decrypts each notification
- the My Corner assistant against a fake Groq server, checking exactly what it sends and that it keeps to the free tier's limits

It backs up your `.data/` first and puts it back afterwards. GitHub runs the same tests on every push (`.github/workflows/test.yml`) with throwaway secrets.

## What's built

**Getting in**
- The wrapped bouquet with a gift tag that is the login. Invite codes and personal magic links (`/hello/<code>`), with signed cookie sessions.
- She taps the bow and the reveal plays, or she can go straight to her desk.

**The journey (`/journey`)**
- A scroll story in five chapters, stitched by a silk thread and a gold needle. It has polaroids, notes, quotes, a sliding film strip, cassette voice notes, video, and a boarding pass whose stub tears off as she scrolls. It ends with a postcard and confetti.
- A spinning record plays the music; tap it to pause.
- A sixth chapter, "Milano, in your words", writes itself from her diary.

**Her desk (`/home`)**
- **Clocks:** Milano, Mumbai and LA. Hover or tap one to see who's there right now.
- **Her mood today:** friends see it, and a low day sends them one gentle nudge. "Thinking of my people 💗" sends everyone love.
- **"Thinking of you":** friends' nudges, which she can react to or answer.
- **The Today card:**
  - Milano weather and an outfit idea
  - a random Italian word or phrase with pronunciation and meaning
  - "good time to call": when she and each of her people are both awake
- **Six tiles:**
  - Wall of love: messages, photo albums, voice notes and videos, with reactions and thank-you replies.
  - Open when: letters, some locked until a date.
  - Message jar: notes by mood.
  - Milano bingo.
  - Milano corner: her list at the top; a guide of about 95 places with a map, Surprise me and Near me; fashion dates and workshops; beaches.
  - Your story.
- **"A little memory":** something her people sent, brought back.
- **Share a moment:** a photo, a little video or a voice note for everyone or for chosen friends (Locket-style). Friends react; she sees who loved what in **Moments**.
- **More corners:**
  - Lookbook: her outfits, sketches and Pinterest pins; private unless shared.
  - Passport: check in to places for stamps.
  - My chapter: a line and a photo a day.
  - Songs: square tiles that open the player.
  - Settling in: the arrival checklist.
  - Scrapbooks: group pages laid out as a collage she can drag, shuffle and flip through.
  - Your book: printable.
  - My Corner: her private fashion and project workspace (see below).
- **Special days:** Diwali, Christmas, Departure day and others get a banner and confetti on the day.

**Friends' desk (`/wall`)**
- **The top of the desk:**
  - the same clocks
  - her mood
  - her next special day when it's close
  - a one-tap "Thinking of her?" nudge
  - when to call her
- **Ways to leave something:** pin to her wall (record voice or video in the browser), seal letters, fill the jar, cheer her bingo, Milano tips, songs, scrapbook pages, and what she's shared from her lookbook.
- **Sent box:** whether she's opened or read each thing, her reactions and replies.
- **From Saanika:** her latest moment for them, as a tile they can react to; all of them at `/wall/moments`.
- **Her story:** friends can read the journey too (her diary days appear only if she shared them).

**Admin (`/admin`, Vee)**
- **Friends:** add or remove anyone. Removing someone signs them out within seconds and deletes everything they shared.
- **Special days and scrapbook pages.**
- **Journey media:** upload a file for any slot, or add any number of extra photos, videos and voice notes to a chapter.
- **The journey's words:** edit every caption, note, quote and "from" name; clear one to restore the original.
- **Keepsake images, the reveal note, and how she's getting on.**

## My Corner (`/home/corner`)

Saanika's private studio for fashion and brand projects. Only she can open it, and its files are locked to her account (even a direct link returns "not found" for anyone else).

- **Projects:** create (title, description, one of six categories), search, favourite, archive, rename, duplicate and delete. Cards show a cover or placeholder, the category and when it was last edited; "recently edited" sits on top.
- **Inside a project:**
  - **Overview:** description, cover image, quick links, recent activity.
  - **Documents:** PDF, DOCX, PPTX and TXT, up to 25 MB each; download keeps the original file name.
  - **Inspiration:** images, links, Pinterest pins and boards, and notes, in a gallery.
  - **Moodboard:** images, notes and colour swatches; drag to arrange (or use the arrows on touch screens), saved automatically.
  - **Design elements:** named colour palettes (HEX), typography references, fabrics and materials with photos.
  - **Fashion management:** a brief (audience, positioning, objectives, budget) and a costing calculator (unit cost, selling price, gross margin and markup), clearly labelled as estimates.
  - **Assistant:** see below.
- **Where it's stored:** the same doc store as everything else (collections `cornerProjects` and `cornerItems`; files in the private media bucket). Deleting a project deletes its items and any files nothing else uses. All of the storage code is in `src/lib/corner.ts`.

### Switching on the assistant

The assistant runs Qwen 3.8 27B, an open model, on Groq's free tier. It runs on the server, so the key never reaches the browser. It reads:

- the project's text
- the text inside its PDFs and TXT files
- up to two images per question

It says what it couldn't read: Word and PowerPoint files, scanned PDFs, and anything that didn't fit.

1. Create a free API key at console.groq.com.
2. Add `GROQ_API_KEY` in Vercel (Project → Settings → Environment Variables). Optionally set `GROQ_MODEL` to use a different Groq model.
3. Redeploy.

Without the key, everything else in My Corner works and the Assistant tab shows these steps.

**Staying free.** Groq's free tier allows 30 requests, 8,000 tokens and 1,000 answer tokens a minute, and 1,000 requests a day, for this model. Answers are capped at 900 tokens, so after a long answer the next question may wait a minute. `src/lib/groq-limits.ts` keeps under all of those:

- **Each question fits in one minute's tokens.** Long documents are trimmed to their opening part, and the reply says so.
- **Every request is counted in the doc store** (collection `groq-usage`): at most 20 a minute and 900 a day.
- **It waits when Groq asks.** If Groq's rate-limit headers or a 429 say to slow down, the assistant pauses for as long as Groq says.
- **She sees how long to wait.** Instead of an error, she gets "try again in about N seconds".

## Adding her real photos, videos, voice notes and words

Use **Admin → Journey media**. Each slot takes an upload, and each chapter has:

- "More in this chapter" for extras: four or more photos become a film strip.
- "✎ Edit the words": captions, notes, quotes and who a voice note is from.

The music is the "Background music" slot.

The defaults still live in `src/content/journey.ts`, with files in `public/journey/`. Uploads and edits in admin win over them.

## Things she loves (PNG keepsakes)

Sunglasses, iced coffee, matcha, chamomile, bags, heels, a check scarf, flowers, Italian food and beach things are tucked around the desk and its corners.

Upload transparent PNGs (about 800px on the long side) in **Admin → Keepsake images**, or drop them in `public/her/` with these names:

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

Positions are in `src/content/keepsakes.ts`.

## Content files

| File | What it holds |
|---|---|
| `src/content/home.ts` | her departure date, bingo squares and rewards, your day-one letters and jar notes, reactions |
| `src/content/italian.ts` | the Italian words and phrases (with pronunciation) |
| `src/content/milano.ts` | the places in the guide |
| `src/content/happenings.ts` | fashion dates; checked October 2026, so add the next editions each season |
| `src/content/checklist.ts` | the arrival checklist |
| `src/content/mood.ts` | her moods |
| `src/content/nudges.ts` | nudge emoji |

## Where things are stored

- **On your Mac:** everything is in `.data/`. Delete it to start fresh.
- **In production:** Supabase stores records in the `docs` table (collection, id, data) and files in a private `media` bucket that only signed-in people can see.

## Notifications and the daily job

Saanika and friends can each turn on notifications on their desk. On iPhone this works from the home-screen app (iOS 16.4+).

**Saanika hears when:**
- something arrives from a friend
- a letter unlocks
- a scheduled surprise lands
- it's a special day
- it's Sunday (a weekly digest)

**Friends hear when:**
- she reacts to their post or nudge, replies, or opens their letter
- a special day is coming up, or is today
- she's having a low day
- she sends love back

A device belongs to whoever is signed in on it. The home-screen icon shows a badge count.

A daily Vercel cron (`vercel.json`, 06:00 UTC) calls `/api/daily`. It needs `CRON_SECRET`, and it also keeps Supabase's free plan awake.

## Deployment

- Every push to `main` deploys to production on Vercel.
- **Settings** (Vercel → Project → Settings → Environment Variables):
  - `SESSION_SECRET` and `INVITES`
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
  - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`
  - optionally `GOOGLE_MAPS_API_KEY`, for live ratings in the guide
  - optionally `GROQ_API_KEY` (and `GROQ_MODEL`), for My Corner's assistant (free tier)
- After changing a setting, redeploy.
- Friends can also be added and removed from `/admin` without touching `INVITES`.
