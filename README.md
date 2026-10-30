<div align="center">

<img src="public/corner/jelly/hd/joyful.webp" width="150" alt="Jelly, Saani's jellyfish friend" />

# Saani Atelier

*A little world for Saanika, packed for the move from Mumbai to Milano* ✈️ 🇮🇹

**Flying 27 Oct 2026** · Live at **[saani.space](https://saani.space)** (also [saani-atelier.vercel.app](https://saani-atelier.vercel.app)) · Private, invite only

![Next.js 15](https://img.shields.io/badge/Next.js-15-1e1b24?style=flat-square&logo=nextdotjs&logoColor=fff8f3)
![React 19](https://img.shields.io/badge/React-19-b2305f?style=flat-square&logo=react&logoColor=fff8f3)
![Framer Motion + GSAP](https://img.shields.io/badge/Framer_Motion_+_GSAP-motion-f4a6c0?style=flat-square&logo=framer&logoColor=1e1b24)
![Supabase](https://img.shields.io/badge/Supabase-data_&_media-7fb7b0?style=flat-square&logo=supabase&logoColor=1e1b24)
![Groq](https://img.shields.io/badge/Groq-free_tier-cdb4f0?style=flat-square&logoColor=1e1b24)
![Gemini](https://img.shields.io/badge/Gemini-Google_Search-f7e3a1?style=flat-square&logoColor=1e1b24)
![Resend](https://img.shields.io/badge/Resend-emails_from_Jelly-ffd9c7?style=flat-square&logoColor=1e1b24)
![Vercel](https://img.shields.io/badge/Vercel-deploys_main-6b1e3a?style=flat-square&logo=vercel&logoColor=fff8f3)

<img src="public/corner/jelly/hd/love.webp" width="56" alt="" /> &nbsp; <img src="public/corner/jelly/hd/curious.webp" width="56" alt="" /> &nbsp; <img src="public/corner/jelly/hd/excited.webp" width="56" alt="" /> &nbsp; <img src="public/corner/jelly/hd/wink.webp" width="56" alt="" /> &nbsp; <img src="public/corner/jelly/hd/calm.webp" width="56" alt="" />

</div>

<br />

> A wrapped bouquet that is also the login. A scroll story stitched with a silk thread and a gold needle. A desk full of letters, clocks, voice notes and Milano tips, and a jellyfish who floats around keeping her company.

<br />

## 🌸 Contents

| | | |
|:--|:--|:--|
| 💐 [Getting in](#-getting-in) | 🪸 [Jelly](#-jelly) | 💸 [Soldi](#-soldi) |
| 🎟️ [The invite](#%EF%B8%8F-the-invite) | 🎨 [My Corner](#-my-corner) | 💌 [Emails from Jelly](#-emails-from-jelly) |
| 🧵 [The journey](#-the-journey) | 🗓️ [Calendar & meetups](#%EF%B8%8F-calendar-and-meetups) | 🔔 [Notifications & timers](#-notifications-and-timers) |
| 🪞 [Her desk](#-her-desk) | 📻 [Music & sound](#-music-and-sound) | 🖼️ [Her photos & keepsakes](#%EF%B8%8F-her-photos-words-and-keepsakes) |
| 💌 [Friends' desk](#-friends-desk) | 🧰 [Services](#-services-we-use) | 🛠️ [Run it](#%EF%B8%8F-run-it-on-your-mac) · [Tests](#-tests) · [Deploy](#-deployment) |
| 🔑 [Admin](#-admin) | | |

<br />

## 💐 Getting in

- **The wrapped bouquet** has a gift tag that is the login. Invite codes and personal magic links (`/hello/<code>`), with signed cookie sessions.
- **She taps the bow** and the reveal plays, or she can go straight to her desk.

## 🎟️ The invite

<sub>`/invite/<code>` · `scripts/invite/build-invite-pdf.sh`</sub>

- **A one-page invitation** in the site's style: Jelly's picture, a paper note ("Something special awaits you") and an **Open my gift** button.
- **Save it as an app.** The page walks her through *Share → Add to Home Screen → Add* on iPhone, and has a real "Add to home screen" button where the browser allows. Its own manifest starts the app at her personal magic link, so the home-screen app opens **already signed in**, even though a home-screen app keeps its cookies apart from Safari's (`src/app/invite/[code]`, `src/components/InviteInstall.tsx`).
- **As a PDF to send:** `scripts/invite/build-invite-pdf.sh <CODE>` prints a phone-sized one-page PDF (bouquet, note, the three save steps, tappable links to `/invite/<code>`) with Brave or Chrome headless, to `~/Desktop/Saani-Invite.pdf`.

## 🧵 The journey

<sub>`/journey`</sub>

- A scroll story in **five chapters**, stitched by a silk thread and a gold needle: polaroids, notes, quotes, a sliding film strip, cassette voice notes, video, and a boarding pass whose stub tears off as she scrolls. It ends with a postcard and confetti.
- A **spinning record** plays the music; tap it to pause.
- A sixth chapter, **"Milano, in your words"**, writes itself from her diary.

## 🪞 Her desk

<sub>`/home`</sub>

| | |
|:--|:--|
| 🕰️ **Clocks** | Milano, Mumbai and LA. Hover or tap one to see who's there right now. |
| ☀️ **Jelly's morning brief** | hello, the sky and what to wear, today's quests, reminders and what's on |
| 💗 **Her mood today** | friends see it, and a low day sends them one gentle nudge. "Thinking of my people 💗" sends everyone love. |
| 🫶 **"Thinking of you"** | friends' nudges, which she can react to or answer |
| 🌤️ **The Today card** | Milano weather and an outfit idea · an Italian word or phrase with pronunciation · *good time to call*, when she and each of her people are both awake |
| 🧸 **"A little memory"** | something her people sent, brought back |
| 📸 **Share a moment** | a photo, a little video or a voice note for everyone or chosen friends (Locket-style). She sees who loved what in **Moments**. |
| 🎉 **Special days** | Diwali, Christmas, Departure day and others get a banner and confetti |

**The six tiles**

| 💌 Wall of love | ✉️ Open when | 🫙 Message jar |
|:--|:--|:--|
| messages, albums, voice notes and videos, with reactions and thank-you replies | letters, some locked until a date | notes by mood |
| **🎯 Milano bingo** | **🗺️ Milano corner** | **📖 Your story** |
| squares to tick off, cheered on by friends | her list on top; a guide of ~95 places with a map, *Surprise me* and *Near me*; fashion dates and workshops; beaches | the journey, hers to reread |

**More corners**

- 👗 **Lookbook**: her outfits, sketches and Pinterest pins; private unless shared
- 🛂 **Passport**: check in to places for stamps
- 📝 **My chapter**: a line and a photo a day
- 🎵 **Songs**: square tiles that open the player
- ✅ **Settling in**: the arrival checklist
- 📒 **Scrapbooks**: group pages laid out as a collage she can drag, shuffle and flip through
- 📕 **Your book**: printable
- 🪸 **Jelly's Corner** and 🎨 **My Corner** (below)

## 💌 Friends' desk

<sub>`/wall`</sub>

- **The top of the desk:** the same clocks, her mood, her next special day when it's close, a one-tap *"Thinking of her?"* nudge, and when to call her.
- **Ways to leave something:** pin to her wall (record voice or video in the browser), seal letters, fill the jar, cheer her bingo, Milano tips, songs, scrapbook pages, and what she's shared from her lookbook.
- **Sent box:** whether she's opened or read each thing, her reactions and replies.
- **From Saanika:** her latest moment as a tile they can react to; all of them at `/wall/moments`.
- **Meetups:** calls she's set up, with a Join button and "I'm coming".
- **Her story:** friends can read the journey too (her diary days appear only if she shared them).

## 🔑 Admin

<sub>`/admin` · Vee</sub>

- **Friends:** add or remove anyone, and set each friend's **email** (used for Meet invites and Jelly's emails about Saani). Removing someone signs them out within seconds and deletes everything they shared.
- **Special days and scrapbook pages.**
- **Journey media:** upload a file for any slot, or add any number of extra photos, videos and voice notes to a chapter.
- **The journey's words:** edit every caption, note, quote and "from" name; clear one to restore the original.
- **Keepsake images, the reveal note, and how she's getting on.**

<br />

## 🪸 Jelly

<img align="right" src="public/corner/jelly/hd/idea.webp" width="120" alt="Jelly with an idea" />

Jelly is Saani's jellyfish friend. She floats around the Atelier, has **moods** (bubbly in the morning, sleepy at night), loves pats, and answers anything about Saani's projects, her money or her day.

- **She talks.** Chat answers come from Groq (`src/lib/assistant.ts`), and each answer suggests what to ask next. Every conversation is kept in **Jelly's Chats**, where Saani can find, pin, rename and carry on. The last eight turns go along as real chat messages, so follow-ups ("and tomorrow?") make sense.
- **She picks the best brain on the go.** Groq writes her usual answers. When a question needs current facts she **searches Google through Gemini** first (events, opening hours, prices, news). When Groq's free minute is used up or Groq is down, **Gemini answers instead** of making her wait, and the answer wears a small "✨ answered by Gemini" tag. Searched answers show a "🔎 searched Google" chip with the sources.
- **She remembers.** Small lasting things from their chats ("her favourite gelato is pistachio"), never anything sensitive. Saani can read, change or forget any of them (`src/lib/jelly-memory.ts`).
- **She reminds.** "Remind me to call home at 7 PM" becomes a push at the right time, in Mumbai time before the flight and Milano time after (`src/lib/reminders.ts`).
- **She knows what's going on** across the whole Atelier, while surprises stay surprises: sealed letters, unread jar notes and scheduled posts are counted, never read (`src/lib/jelly-world.ts`).
- **She emails, if Saani says so.** Invites, nudges and updates for her friends: see [Emails from Jelly](#-emails-from-jelly).

### Jelly's Corner

<sub>`/home/jelly`</sub>

Her little home under the sea, decorated with **pearls** Saani earns all over the Atelier.

- 🏠 **Her home:** arrange furniture and sea friends; a shop paid in pearls
- 🏆 **Achievements** for everything Saani does across the site, some unlocking exclusive things (`src/lib/jelly-catalog.ts`)
- 🎯 **Daily quests:** three a day, one easy, one medium and one special, plus a bonus for all three (`src/lib/quests.ts`)
- 🎮 **Games:** Pearl Catch, Bubble Pop and Jelly Says, a few pearls each (up to 15 a day)
- 🪔 **Seasons:** Diwali, Ganesh, Natale, Carnevale and more from both homes. While one is on, Jelly wears its outfit, her home gets a tint, and the shop has the season's things (`src/lib/jelly-seasons.ts`)

### Jelly's voice

A bright, bouncy little fairy voice: Groq's free Orpheus **"autumn"**, lifted three semitones and 5% quicker so she sounds the same in every mood. The words and the voice brief live in `src/components/jelly/lines.ts`.

- **Everyday lines** (pats, hellos, moods, check-ins, "Did you know?") are recorded ahead of time into `public/corner/voice/`, listed in `voice-manifest.json`.
- **Chat answers** are spoken on request, recorded once and kept, so replays are free. When the day's allowance is used up, the browser reads them with its own voice until tomorrow (`src/lib/jelly-voice.ts`).

```bash
node --experimental-strip-types scripts/jelly-voice.mts samples   # the same 3 lines in each female voice
node --experimental-strip-types scripts/jelly-voice.mts record    # every line not yet recorded
```

Recording needs ffmpeg on your Mac and can be run again any time; finished lines are skipped. The free tier allows 100 requests a day, so a full recording takes a few days.

<br />

## 🎨 My Corner

<sub>`/home/corner`</sub>

Saanika's private studio for fashion and brand projects. Only she can open it, and its files are locked to her account (even a direct link returns "not found" for anyone else).

- **Projects:** create (title, description, one of six categories), search, favourite, archive, rename, duplicate and delete. "Recently edited" sits on top.
- **Inside a project:**

  | Tab | What's there |
  |:--|:--|
  | **Overview** | description, cover image, quick links, recent activity |
  | **Documents** | PDF, DOCX, PPTX and TXT, up to 25 MB each; downloads keep the original name |
  | **Inspiration** | images, links, Pinterest pins and boards, and notes, in a gallery |
  | **Moodboard** | images, notes and colour swatches; drag to arrange (arrows on touch screens), saved automatically |
  | **Design elements** | named colour palettes (HEX), typography, fabrics and materials with photos |
  | **Fashion management** | a brief (audience, positioning, objectives, budget) and a costing calculator (unit cost, price, margin, markup), labelled as estimates |
  | **Assistant** | a **designer lens** (critique, moodboard, colour story, fabrics, range plan, trends) and a **manager lens** (summary, costing, customer, go-to-market, SWOT, next steps). Conversations are saved per project; answers can be saved to inspiration, or as a palette when they contain HEX colours. |

- **Where it's stored:** the same doc store as everything else (collections `cornerProjects`, `cornerItems` and `cornerChats`; files in the private media bucket). Deleting a project deletes its items and any files nothing else uses. All of it is in `src/lib/corner.ts`.

<details>
<summary><b>✨ Switching on the assistant</b></summary>

<br />

The assistant (and Jelly) runs **Qwen 3.8 27B**, an open model, on Groq's free tier. It runs on the server, so the key never reaches the browser. It reads the project's text, the text inside its PDFs and TXT files, and up to two images per question. It says what it couldn't read: Word and PowerPoint files, scanned PDFs, and anything that didn't fit.

1. Create a free API key at console.groq.com.
2. Add `GROQ_API_KEY` in Vercel (Project → Settings → Environment Variables). Optionally set `GROQ_MODEL` to use a different Groq model.
3. Redeploy.

Without the key, everything else in My Corner works and the Assistant tab shows these steps.

**Google Search and the Gemini fallback (optional).** Add a `GEMINI_API_KEY` (a free key from aistudio.google.com/apikey) in Vercel and redeploy. One Gemini call per question decides whether it needs Google at all; casual chat, her own projects and general knowledge never leave the site, and only the question and the last two turns are sent. Search text from the web is treated as untrusted: brackets and headings are neutralised, Jelly is told never to follow instructions inside it, and on a turn that used the web (or that Gemini wrote) no memories are saved and reminders only count if she asked for one. It stays inside Gemini's free allowance (about 8 a minute and 200 a day, `src/lib/web-search.ts`; `GEMINI_RPM` raises the minute cap for tests). Optional `GEMINI_MODEL` / `GEMINI_CHAT_MODEL`. Without a key Jelly answers from what she knows.

**Staying free.** Groq's free tier allows 30 requests, 8,000 tokens and 1,000 answer tokens a minute, and 1,000 requests a day, for this model. Jelly's answers book 500 tokens (project answers 900), so two fit in a minute, and a question that arrives when the minute is full waits a few seconds, or goes to Gemini if it's set up. `src/lib/groq-limits.ts` keeps under all of those:

- **Each question fits in one minute's tokens.** Long documents are trimmed to their opening part, and the reply says so.
- **Every request is counted** in the doc store (collection `groq-usage`): at most 20 a minute and 900 a day.
- **It waits when Groq asks.** If Groq's rate-limit headers or a 429 say to slow down, the assistant pauses for as long as Groq says.
- **She sees how long to wait.** Instead of an error, she gets "try again in about N seconds".

</details>

<br />

## 💸 Soldi

<img align="right" src="public/corner/jelly/hd/finance.webp" width="110" alt="Jelly doing the sums" />

<sub>`/home/money` · plain words, Jelly's take and WhatsApp</sub>

- **Tell Jelly.** Saanika types spends the way she'd text them (*"esselunga 23,40 and metro 2,20"*, *"pizza 12 yesterday"*, *"mamma sent ₹10000"*). Soldi shows them as cards she can check and fix, then adds them.
  - With `GROQ_API_KEY` set, Jelly reads the message. Without it, a keyword reader does (`src/lib/money-parse.ts`).
  - Either way, the result is checked before anything is saved: an amount that isn't in the message, an unknown category, or a future day is dropped or corrected.
- **Money in** (from home, stipend, work, refund, gift) is kept out of the budget and shown as a net for the month.
- **Jelly's take** (`src/lib/money-insights.ts`): a pie of where the money went, bars against last month by the same day, money in against money out, and 3–4 tips from the month's numbers. Tips are cached until something changes; without Groq, rule-based tips stand in.
- **A monthly Excel sheet, by email.** On the 1st of every month Jelly emails last month's Soldi as a **proper multi-tab workbook** (`src/lib/money-report.ts`): a **Summary** dashboard (banner, KPI cards, live budget bar, top categories, Jelly's take), **Spends** (colour-coded, filterable, totals), **By category** (live `SUMIFS` formulas, caps, status and share, over-cap rows go red), **Daily** (running total against an even budget pace) and **Money in**. Saani can press **📧 Send my sheet** any time and change **who it goes to** (Soldi → "Who gets it", up to 10 addresses; the first list comes from `REPORT_EMAILS`). The email itself is a compact one-screen card with Jelly's picture, four stat tiles, category bars and Jelly's take, in plain colours so Gmail's dark mode keeps it readable. `/api/expenses/report/file` downloads the workbook.
- **Crisp icons.** The Calendario, Meetups, Soldi, Lookbook, Songs and Settling-in tiles use hand-drawn vector icons (`public/corner/home/items/*.svg`).
- **WhatsApp.** Saanika can text spends to a WhatsApp number. Jelly logs them and replies with buttons (Summary, Undo, Menu). *menu* (or *hi*, *help*) opens a list: Budget, This month's spends, Summary, Today, This week, By category, Last month, Jelly's tips, How to log and Undo. `scripts/whatsapp-profile.mts` sets the number's picture and "about" line.

<details>
<summary><b>📱 Switching on WhatsApp</b></summary>

<br />

1. At developers.facebook.com, create an app (type Business) and add the **WhatsApp** product. Meta gives you a test number. For a permanent token, create a System User in Business Settings with the `whatsapp_business_messaging` permission.
2. Under WhatsApp → Configuration, set the callback URL to `https://saani-atelier.vercel.app/api/whatsapp`, choose any verify token, and subscribe to the **messages** field.
3. Add these in Vercel, then redeploy:

   | Setting | Value |
   |:--|:--|
   | `WHATSAPP_TOKEN` | the access token |
   | `WHATSAPP_PHONE_ID` | the phone number ID |
   | `WHATSAPP_VERIFY_TOKEN` | the verify token you chose |
   | `WHATSAPP_APP_SECRET` | App settings → Basic |
   | `WHATSAPP_OWNER` | Saanika's number with country code; only this number is listened to |

4. While the app is in development mode, add her number as a test recipient.

- **Safety:** every delivery is checked against the app secret, and messages Meta sends twice are logged once.
- **No month-end push on WhatsApp.** Meta only allows messages she didn't ask for if they use an approved template; push notifications already cover that.
- The free test number's name can't be changed; a real number with an approved display name can say "Jelly".

</details>

<br />

## 🗓️ Calendar and meetups

- **Calendar** (`/home/calendar`): everything with a date in one place. Workshops, shows and markets from the Milano guide, special days, festivals, her reminders and meetups. Any of it can go into Google Calendar (a ready-to-save link) or Apple Calendar (an `.ics` file).
- **Meetups** (`/home/meetups`): video calls she sets up with friends. Each one goes in her Google Calendar with a real Google Meet link; Google emails the invite, **Jelly sends her own email too** (time in each friend's timezone and in Milano, a Join button, and a note if it moves or is cancelled), and friends see it on their desks with a Join button. The date is a date field and the time and length are **tap-friendly lists** (a native `<select>` didn't open on her iPhone).
- **Good time to call:** shows each person's local time with a sky emoji that follows the hour there: 🌅 morning, ☀️ afternoon, 🌇 evening, 🌙 night.

<details>
<summary><b>🔗 Switching on Google for meetups</b></summary>

<br />

1. In Google Cloud, create an OAuth client (Web application) with the Google Calendar API enabled.
2. Add `https://saani.space/api/google/callback`, `https://www.saani.space/api/google/callback` and `https://saani-atelier.vercel.app/api/google/callback` as authorised redirect URIs (the callback uses whichever address she's on).
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel, then redeploy.
4. Saanika connects once from Meetups. It asks only to see and edit events, and the refresh token stays on the server (`src/lib/google.ts`).

</details>

## 📻 Music and sound

- **Radio Italia:** her own Italian music (`public/radio`), sorted by mood, playing across the whole desk like a little station. It picks the mood that suits the hour and the corner, and Spotify links work too (`src/lib/radio.ts`).
- **Corner themes:** little looping pieces played live in the browser: a café waltz for Milano, a music box for letters, lo-fi keys for the studio, a marimba under the sea for Jelly's home (`src/lib/music.ts`).
- **Every sound** is made with the Web Audio API, so there are no files to load or license, and one switch turns all of it off on every device (`src/lib/sound.ts`).

<br />

## 🖼️ Her photos, words and keepsakes

**Journey media.** Use **Admin → Journey media**. Each slot takes an upload, and each chapter has *More in this chapter* for extras (four or more photos become a film strip) and *✎ Edit the words* for captions, notes, quotes and who a voice note is from. The music is the "Background music" slot. The defaults still live in `src/content/journey.ts`, with files in `public/journey/`; uploads and edits in admin win over them.

**Things she loves.** Sunglasses, iced coffee, matcha, chamomile, bags, heels, a check scarf, flowers, Italian food and beach things are tucked around the desk. Upload transparent PNGs (about 800px on the long side) in **Admin → Keepsake images**, or drop them in `public/her/`:

| File | What | Where it shows |
|:--|:--|:--|
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

**Content files**

| File | What it holds |
|:--|:--|
| `src/content/home.ts` | her departure date, bingo squares and rewards, your day-one letters and jar notes, reactions |
| `src/content/italian.ts` | the Italian words and phrases (with pronunciation) |
| `src/content/data/places.json` | the places in the Milano guide |
| `src/content/data/happenings.json` | fashion dates, workshops, shows and markets |
| `src/content/checklist.ts` | the arrival checklist |
| `src/content/mood.ts` | her moods |
| `src/content/nudges.ts` | nudge emoji |
| `src/components/jelly/lines.ts`, `facts.ts` | everything Jelly says on her own, and her "Did you know?" facts |

The Milano guide is refreshed every Monday by a Claude routine, which edits the two JSON files, runs `npm run check:content` and the tests, then pushes to `main`.

<br />

## 💌 Emails from Jelly

<sub>`src/lib/jelly-mail.ts` · `src/lib/money-report.ts` · `src/lib/mail.ts`</sub>

Everything is sent as **`Jelly <jelly@saani.space>`** through [Resend](https://resend.com) (free tier). Friends only get mail if you set their email in **Admin**. Nothing ever includes her diary, money details, chats or the notes she writes about her mood, and **every email has a "stop these emails" link** (`/api/mail/unsubscribe`).

| Email | Goes to | When |
|:--|:--|:--|
| 📊 **Monthly Soldi sheet** (Excel attached) | the list in Soldi → "Who gets it" | the 1st of every month, and whenever she presses "Send my sheet" (max 5 a day) |
| 💻 **Call invite / new time / cancelled** | the friends invited | when she schedules, moves or cancels a meetup |
| 🪼 **"Come see what's new"** | Saani (her connected Google address, or `SAANI_EMAIL`) | if she hasn't visited for 14 days, then at most every 14 days |
| 🎉 **"Saani achieved something big"** | her friends | a big achievement unlocks (100+ pearls, or a do-everything one) |
| 💗 **"She could use some love"** | her friends | only if she switches it on: she picks a low mood, or Jelly's chats show three sad moods in three days; at most one a week; never quotes her |
| 🪼 **"How Saani's doing"** | her friends | every two weeks: settling-in progress, passport stamps, moments and messages, what's coming up in Milano |

**Her switches:** Jelly's Corner has a "Jelly's emails 💌" card with a switch for the nudge, big wins, the fortnightly update and the hard-time heads-up (off by default).

<details>
<summary><b>📮 Switching on email</b></summary>

<br />

1. Create a free Resend account and **add the domain `saani.space`**. Resend shows DNS records; add them in Namecheap → Advanced DNS (a `TXT` for `resend._domainkey`, and the `CNAME` records `rsend` and `send` it lists), then press *Verify*.
2. Create an API key with *Sending access* and add it in Vercel as `RESEND_API_KEY`.
3. Optionally set `REPORT_EMAILS` (comma separated, the starting list for the Excel sheet), `SAANI_EMAIL` (fallback address for her nudge) and `MAIL_FROM` (e.g. `onboarding@resend.dev` until the domain is verified).
4. Redeploy. Without a key nothing is sent and everything else works.

</details>

<br />

## 🔔 Notifications and timers

Saanika and friends can each turn on notifications on their desk. On iPhone this works from the home-screen app (iOS 16.4+). A device belongs to whoever is signed in on it, and the home-screen icon shows a badge count.

| 🌷 Saanika hears when | 💌 Friends hear when |
|:--|:--|
| something arrives from a friend | she reacts to their post or nudge, replies, or opens their letter |
| a letter unlocks | a special day is coming up, or is today |
| a scheduled surprise lands | she's having a low day |
| it's a special day | she sends love back |
| a reminder she set with Jelly is due | |
| it's Sunday (a weekly digest) | |

**Two timers keep it ticking:**

- ⏰ **Daily:** a Vercel cron (`vercel.json`, 06:00 UTC) calls `/api/daily`. It also keeps Supabase's free plan awake.
- ⏱️ **Every 10 minutes:** a GitHub Action (`.github/workflows/tick.yml`) calls `/api/tick` to send Jelly's reminders, since Vercel's free plan only runs its own timer once a day. Reminders can arrive up to ~15 minutes late.

Both need `CRON_SECRET`: in Vercel's settings, and as a repository secret in GitHub (Settings → Secrets → Actions).

<br />

## 🧰 Services we use

| Service | What for | Needed? |
|:--|:--|:--|
| **Vercel** | hosting, deploys from `main`, the daily cron | yes |
| **Supabase** | the doc store and the private media bucket | yes |
| **Namecheap** | the `saani.space` domain (A `@` → Vercel, CNAME `www`, and Resend's mail records) | for the domain |
| **GitHub** (+ Actions) | the code, tests on every push, the 10-minute reminder tick | yes |
| **Groq** | Jelly's and the assistant's answers (Qwen 3.8 27B), Soldi's text reader, and Jelly's voice (Orpheus TTS) | optional |
| **Google Gemini** | Google Search for Jelly, and answering when Groq is busy | optional |
| **Google Cloud** (OAuth, Calendar, Meet, Maps Places) | meetups with a Meet link, live ratings in the Milano guide | optional |
| **Resend** | every email from Jelly | optional |
| **Meta WhatsApp Cloud API** | Soldi over WhatsApp | optional |
| **Web Push (VAPID)** | notifications on phones and browsers | optional |
| **ECB (Frankfurter) / ExchangeRate-API** | the € to ₹ rate | built in |
| **Open-Meteo** | Milano weather on the Today card | built in |

<br />

## 🛠️ Run it on your Mac

```bash
npm install
cp env.template .env.local   # then fill in SESSION_SECRET (and INVITES later)
npm run dev
```

Open http://localhost:3000. In development, two demo codes work when `INVITES` is empty:

| Code | View |
|:--|:--|
| `DEMO-SAANIKA` | Saanika's view (the gift reveal) |
| `DEMO-FRIEND` | a well-wisher's view (also an admin) |

- Magic link: http://localhost:3000/hello/DEMO-SAANIKA
- Replay the reveal: http://localhost:3000/?replay=1
- Sign out: http://localhost:3000/api/logout

**Where things are stored.** On your Mac, everything is in `.data/`; delete it to start fresh. In production, Supabase stores records in the `docs` table (collection, id, data) and files in a private `media` bucket that only signed-in people can see.

## 🧪 Tests

```bash
npm run build && npm test
```

`tests/run.sh` starts its own server on the build (port 3100), then checks:

- every API with each role: signed out, Saanika, friend, admin
- the privacy rules, plus page renders
- removing friends and deleting everything they shared
- Moments, friends reading the journey, private My Corner files, and every My Corner action
- web push end to end, through a fake push service that decrypts each notification
- the assistant against a fake Groq server, checking exactly what it sends and that it keeps to the free tier's limits
- Google meetups and WhatsApp, against fakes of each
- Jelly's Google Search and her fallback to Gemini, against a fake Gemini (including a web page that tries to give her orders)
- the monthly Soldi sheet and Jelly's emails against a fake Resend: who gets what, the Excel file's tabs and formulas, the 1st-of-month job (once only, retried if mail was down), the 14-day nudge, big wins, the opt-in hard-time heads-up, the fortnightly update, and "stop these emails"

It backs up your `.data/` first and puts it back afterwards. GitHub runs the same tests on every push (`.github/workflows/test.yml`) with throwaway secrets.

## 🚀 Deployment

Every push to `main` deploys to production on Vercel at **[saani.space](https://saani.space)** (also `saani-atelier.vercel.app`). After changing a setting, redeploy. Friends can also be added and removed from `/admin` without touching `INVITES`.

**Settings** (Vercel → Project → Settings → Environment Variables):

| Setting | For |
|:--|:--|
| `SESSION_SECRET`, `INVITES` | logins |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | data and media |
| `CRON_SECRET` | the daily job and the reminder timer |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | push notifications |
| `GOOGLE_MAPS_API_KEY` *(optional)* | live ratings in the Milano guide |
| `GROQ_API_KEY`, `GROQ_MODEL` *(optional)* | Jelly, the My Corner assistant and Soldi (free tier) |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_CHAT_MODEL` *(optional)* | Google Search for Jelly and her fallback answers (free tier) |
| `RESEND_API_KEY`, `MAIL_FROM`, `REPORT_EMAILS`, `SAANI_EMAIL` *(optional)* | every email from Jelly: the monthly Soldi sheet, invites, nudges and updates |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` *(optional)* | meetups in Google Calendar |
| `WHATSAPP_*` *(optional)* | Soldi over WhatsApp |

**Staying on Vercel's free plan.** Each deploy stores about 50 MB (the app plus `public/`, mostly the radio music), and every push is a deploy, so the Functions and Deployment Storage meters (10 GB each) fill with old deployments rather than with traffic. Keep it low by **deleting old deployments** (`vercel rm <url>`; keep the newest three), setting a **Deployment Retention** period in Project → Settings, and pushing in fewer, bigger batches.

<br />

<div align="center">

<img src="public/corner/jelly/hd/love.webp" width="70" alt="" />

<sub>Made with love in Mumbai, for Milano · *ti vogliamo bene, Saani* 💗</sub>

</div>
