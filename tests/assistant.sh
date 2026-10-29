#!/bin/bash
# The My Corner assistant with a key, against tests/fake-groq.js: checks what is sent to Groq
# (brief, notes, the PDF's text, the text file, the image; Word/PowerPoint and scanned PDFs listed as
# not read), the reply, and the free-tier limits (daily cap, and pausing when Groq says to wait).
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
ROOT=${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
SA=$D/ai-sa.jar; rm -f "$SA"
pass=0; failn=0
check() {
  local name=$1 exp=$2; shift 2
  local code
  code=$(curl -s -o "$D/body" -D "$D/headers" -w '%{http_code}' -m 60 "$@")
  if [[ "$code" == "$exp" ]]; then pass=$((pass+1)); printf 'PASS %-58s %s\n' "$name" "$code"
  else failn=$((failn+1)); printf 'FAIL %-58s got %s want %s  %s\n' "$name" "$code" "$exp" "$(head -c 220 "$D/body")"; fi
}
expect() {
  if grep -q -- "$2" "$D/body"; then found=1; else found=0; fi
  if [[ "$3" == absent ]]; then want=0; else want=1; fi
  if [[ $found == $want ]]; then pass=$((pass+1)); printf 'PASS %-58s\n' "$1"; else failn=$((failn+1)); printf 'FAIL %-58s (pattern %s %s)\n' "$1" "$2" "$3"; fi
}
same() { if [[ "$2" == "$3" ]]; then pass=$((pass+1)); printf 'PASS %-58s\n' "$1"; else failn=$((failn+1)); printf 'FAIL %-58s (%s vs %s)\n' "$1" "$2" "$3"; fi; }
jget() { node -e "let d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));const v=eval('d'+process.argv[1]);console.log(v===undefined||v===null?'':v)" "$1"; }
J=(-H 'Content-Type: application/json')
upload() {
  local sz; sz=$(wc -c < "$1" | tr -d ' ')
  local r; r=$(curl -s -b "$SA" -X POST "${J[@]}" -d "{\"mime\":\"$2\",\"size\":$sz,\"purpose\":\"corner\",\"filename\":\"$3\"}" $B/api/upload)
  local u; u=$(node -e "console.log(JSON.parse(process.argv[1]).url)" "$r")
  curl -s -o /dev/null -b "$SA" -X PUT -H "Content-Type: $2" --data-binary @"$1" "$B$u"
  node -e "console.log(JSON.parse(process.argv[1]).id)" "$r"
}
# a real one-page PDF with words in it, and one with none (like a scan)
node -e '
const s = "BT /F1 18 Tf 20 50 Td (PDF-TREND-WORDS sustainable denim) Tj ET";
const objs = ["<</Type/Catalog/Pages 2 0 R>>", "<</Type/Pages/Kids[3 0 R]/Count 1>>",
  "<</Type/Page/Parent 2 0 R/MediaBox[0 0 500 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
  `<</Length ${s.length}>>\nstream\n${s}\nendstream`, "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>"];
let out = "%PDF-1.4\n"; const at = [];
objs.forEach((o, i) => { at.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
const x = out.length;
out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + at.map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("");
out += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${x}\n%%EOF\n`;
require("fs").writeFileSync(process.argv[1], out);' "$D/ai.pdf"
printf '%%PDF-1.4\n%%%%EOF\n' > "$D/scan.pdf"
printf 'Trend notes: SOFT-TAILORING-TREND.' > "$D/ai.txt"
printf 'PK fake' > "$D/ai.pptx"
curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1

check "status says ready" 200 -b "$SA" $B/api/corner/projects/x/assistant
expect "ready" '"ready":true'
check "a project" 201 -b "$SA" -X POST "${J[@]}" -d '{"title":"AI test","description":"AI-DESC","category":"Brand Strategy"}' $B/api/corner/projects
P=$(jget .id)
curl -s -o /dev/null -b "$SA" -X PATCH "${J[@]}" -d '{"brief":{"audience":"AI-AUDIENCE"},"costing":{"fabric":10,"labour":5,"sellingPrice":60}}' $B/api/corner/projects/$P
for x in "ai.pdf application/pdf Brief.pdf" "scan.pdf application/pdf Scan.pdf" "ai.txt text/plain notes.txt" "ai.pptx application/vnd.openxmlformats-officedocument.presentationml.presentation Deck.pptx"; do
  set -- $x
  M=$(upload "$D/$1" "$2" "$3"); curl -s -o /dev/null -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"doc\",\"mediaId\":\"$M\"}" $B/api/corner/projects/$P/items
done
for c in AI-CAPTION SECOND-IMG THIRD-IMG; do
  IM=$(upload "$ROOT/public/icons/icon-192.png" image/png board.png)
  curl -s -o /dev/null -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"board\",\"board\":\"image\",\"mediaId\":\"$IM\",\"caption\":\"$c\"}" $B/api/corner/projects/$P/items
done
curl -s -o /dev/null -b "$SA" -X POST "${J[@]}" -d '{"kind":"palette","name":"AI-PALETTE","hexes":["#f4a6c0"]}' $B/api/corner/projects/$P/items

check "bad mode 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"mode":"poem"}' $B/api/corner/projects/$P/assistant
check "empty question 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"mode":"question","question":" "}' $B/api/corner/projects/$P/assistant
check "missing project 404" 404 -b "$SA" -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/nope/assistant
check "summarise" 200 -b "$SA" -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/$P/assistant
expect "reply comes back" "FAKE-GROQ-REPLY"
expect "hidden thinking is stripped" "hidden" absent
expect "says it read the PDF" '"read":\[[^]]*Brief.pdf'
expect "and the text file" '"read":\[[^]]*notes.txt'
expect "and the image" 'moodboard image'
expect "follow-up questions come back" '"suggestions":\["FOLLOW-ONE?","FOLLOW-TWO?","FOLLOW-THREE?"\]'
expect "and are taken out of the answer" 'Try next' absent
expect "the answer is saved as a conversation" '"chat":{"id":"ch_'
expect "named after the question" '"title":"Summarise the project"'
CH=$(jget .chat.id)
expect "says it couldn't read the deck" '"notRead":\[[^]]*Deck.pptx'
expect "or the scanned PDF" '"notRead":\[[^]]*Scan.pdf (no text found'
expect "only two images fit a free request" '"notRead":\[[^]]*THIRD-IMG[^]]*only 2 images'

cp "$D/groq-req-last.json" "$D/body"
expect "model is Qwen 3.8 27B" '"model":"qwen/qwen3.8-27b"'
expect "answer length capped" '"max_completion_tokens":900'
expect "no hidden reasoning" '"reasoning_effort":"none"'
expect "the PDF's words" "PDF-TREND-WORDS"
expect "the text file's words" "SOFT-TAILORING-TREND"
expect "an image as a data URL" '"url":"data:image/png;base64,'
expect "the brief" "AI-AUDIENCE"
expect "the description" "AI-DESC"
expect "the palette" "AI-PALETTE"
expect "the caption" "AI-CAPTION"
expect "costing worked out" "unit cost 15"
expect "the deck named as not read" "Deck.pptx (Word and PowerPoint"
expect "a system prompt" "only from the project content"
same "the request fits the free tier (under 30 KB of text)" "$(node -e "const b=JSON.parse(require('fs').readFileSync('$D/groq-req-last.json','utf8'));console.log(b.messages[1].content[0].text.length<30000)")" true
cp "$D/groq-headers-last.json" "$D/body"
expect "the key goes in the auth header (server side only)" 'Bearer test-key-not-real'

check "a follow-up in the same conversation" 200 -b "$SA" -X POST "${J[@]}" -d "{\"mode\":\"question\",\"question\":\"FOLLOW-UP-Q\",\"chatId\":\"$CH\",\"history\":[{\"q\":\"SNEAKY\",\"a\":\"SNEAKY\"}]}" $B/api/corner/projects/$P/assistant
same "same conversation" "$(jget .chat.id)" "$CH"
same "now two answers" "$(jget .chat.turns.length)" 2
cp "$D/groq-req-last.json" "$D/body"
expect "the question" "FOLLOW-UP-Q"
expect "the earlier answer comes from the saved conversation" "FAKE-GROQ-REPLY about the brief"
expect "history sent by the browser is ignored" "SNEAKY" absent
check "a designer question starts a new one" 200 -b "$SA" -X POST "${J[@]}" -d '{"mode":"palette"}' $B/api/corner/projects/$P/assistant
expect "named after it" '"title":"Build a colour story"'
CH2=$(jget .chat.id)
cp "$D/groq-req-last.json" "$D/body"
expect "asks for HEX codes" "HEX code written exactly like"
check "conversations are saved" 200 -b "$SA" $B/api/corner/projects/$P/assistant
expect "both listed" "$CH2"
expect "with the first one's answers" "FOLLOW-UP-Q"
check "rename" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"title":"CHAT-RENAMED"}' $B/api/corner/projects/$P/assistant/chats/$CH
expect "renamed" "CHAT-RENAMED"
check "empty name 400" 400 -b "$SA" -X PATCH "${J[@]}" -d '{"title":" "}' $B/api/corner/projects/$P/assistant/chats/$CH
check "another project's conversation 404" 404 -b "$SA" -X POST "${J[@]}" -d "{\"mode\":\"summary\",\"chatId\":\"$CH\"}" $B/api/corner/projects/nope/assistant
check "unknown conversation 404" 404 -b "$SA" -X POST "${J[@]}" -d '{"mode":"summary","chatId":"ch_nope"}' $B/api/corner/projects/$P/assistant
curl -s -o /dev/null -c "$D/ai-fr.jar" $B/hello/CHANGE-ME-2
# a sealed letter from a friend, so Jelly is told never to reveal it
curl -s -o /dev/null -b "$D/ai-fr.jar" -X POST -H "Content-Type: application/json" -d '{"title":"Later","body":"SEALED-WORDS","unlockAt":"2099-01-01"}' $B/api/letters
check "friend can't read them 403" 403 -b "$D/ai-fr.jar" $B/api/corner/projects/$P/assistant
check "friend can't delete 403" 403 -b "$D/ai-fr.jar" -X DELETE $B/api/corner/projects/$P/assistant/chats/$CH
check "delete one" 200 -b "$SA" -X DELETE $B/api/corner/projects/$P/assistant/chats/$CH2
check "gone" 404 -b "$SA" -X DELETE $B/api/corner/projects/$P/assistant/chats/$CH2
check "workspace opens on the assistant tab" 200 -b "$SA" "$B/home/corner/$P?tab=assistant"
expect "with the saved conversation" "CHAT-RENAMED"
check "signed out 401" 401 -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/$P/assistant

# Jelly: one running chat that sees every project (a fresh minute before each answer, as the free tier allows one or two)
fresh_minute() { node -e "const f='$ROOT/.data/groq-usage.json',u=JSON.parse(require('fs').readFileSync(f,'utf8'));Object.assign(u['free-tier'],{minuteRequests:0,minuteTokens:0,minuteOutput:0});require('fs').writeFileSync(f,JSON.stringify(u))"; }
check "jelly is awake" 200 -b "$SA" $B/api/corner/jelly
expect "ready" '"ready":true'
expect "knows the projects" '"title":"AI test"'
expect "first time they meet" '"away":null'
expect "has a mood" '"mood":"[a-z]*"'
expect "friendship starts at level 1" '"level":1'
expect "pearls for today's visit" '"kind":"daily","pearls":10'
expect "and the first achievement" '"id":"hello"'
check "jelly remembers the visit" 200 -b "$SA" $B/api/corner/jelly
expect "so she knows how long Saani was away" '"away":[0-9]'
check "a second project" 201 -b "$SA" -X POST "${J[@]}" -d '{"title":"OTHER-PROJECT","description":"OTHER-DESC","category":"Fashion Research"}' $B/api/corner/projects
check "empty question 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"question":" "}' $B/api/corner/jelly
fresh_minute
check "ask jelly" 200 -b "$SA" -X POST "${J[@]}" -d '{"question":"JELLY-Q what next?"}' $B/api/corner/jelly
expect "reply comes back" "FAKE-GROQ-REPLY"
expect "with follow-ups" '"suggestions":\["FOLLOW-ONE?"'
expect "the answer has a mood" '"mood":"[a-z]*"'
expect "a chat counts towards friendship" '"chats":1'
JC=$(jget .chat.id)
cp "$D/groq-req-last.json" "$D/body"
expect "jelly's own system prompt" "You are Jelly"
expect "she knows how she feels" "in Milano and you feel"
expect "and tags her answer with a mood" "\\[mood: joyful\\]"
expect "every project at a glance" "OTHER-DESC"
expect "she knows the whole Atelier" "Atelier (her private site"
expect "the checklist" "Settling-in checklist: 0/"
expect "the passport" "Passport: 0/"
expect "her home and achievements" "Close to unlocking"
expect "never sealed letters' words" "never reveal"
expect "and the first one" "AI-DESC"
expect "no project in full when none is open" "Open now, in full" absent
fresh_minute
check "carry on the chat from a project page" 200 -b "$SA" -X POST "${J[@]}" -d "{\"question\":\"JELLY-Q2\",\"projectId\":\"$P\",\"chatId\":\"$JC\",\"page\":\"/home/corner/$P\"}" $B/api/corner/jelly
same "same chat" "$(jget .chat.id)" "$JC"
cp "$D/groq-req-last.json" "$D/body"
expect "the open project in full" "Open now, in full"
expect "and which page she's on" "looking at a project in My Corner"
expect "with its brief" "AI-AUDIENCE"
expect "and its documents" "PDF-TREND-WORDS"
expect "the earlier question comes along" "JELLY-Q what next?"
check "unknown chat 404" 404 -b "$SA" -X POST "${J[@]}" -d '{"question":"x","chatId":"ch_nope"}' $B/api/corner/jelly
# Jelly sets reminders and remembers things, from notes at the end of her answer
fresh_minute
check "ask jelly to remind and remember" 200 -b "$SA" -X POST "${J[@]}" -d '{"question":"REMIND-AND-REMEMBER please","tz":"Asia/Kolkata"}' $B/api/corner/jelly
expect "a reminder note" '"kind":"remind"'
expect "a memory note" '"kind":"remember"'
expect "the notes are taken out of her answer" '\[remind:' absent
expect "and out of the follow-ups" '"suggestions":\["FOLLOW-ONE?","FOLLOW-TWO?","FOLLOW-THREE?"\]'
cp "$D/groq-req-last.json" "$D/body"
expect "she knows her clock" "Asia/Kolkata"
expect "and how to set reminders" "remind: YYYY-MM-DD HH:MM"
check "the reminder is set" 200 -b "$SA" $B/api/reminders
expect "with its words" "Call home before class"
same "in her time zone" "$(jget .open[0].tz)" "Asia/Kolkata"
IN2=$(node -e "console.log(new Date(Date.now()+2*86400000).toISOString().slice(0,10))")
same "09:30 in Mumbai" "$(jget .open[0].at)" "${IN2}T04:00:00.000Z"
same "every week" "$(jget .open[0].repeat)" "weekly"
check "and Jelly remembers" 200 -b "$SA" $B/api/jelly/memory
expect "the gelato" "loves pistachio gelato"
fresh_minute
check "ask again" 200 -b "$SA" -X POST "${J[@]}" -d '{"question":"JELLY-Q3 anything"}' $B/api/corner/jelly
cp "$D/groq-req-last.json" "$D/body"
expect "what she remembers goes along" "Things Saanika told you before"
expect "her reminders too" "Call home before class"
# Jelly looks things up on Google when she needs to, and only then
fresh_minute
check "casual chat doesn't search" 200 -b "$SA" -X POST "${J[@]}" -d "{\"question\":\"I feel a bit nervous about the move\",\"chatId\":\"$JC\"}" $B/api/corner/jelly
same "no web sources saved" "$(jget .turn.web)" ""
cp "$D/groq-req-last.json" "$D/body"
expect "so nothing from the web is added" "From the web (Google Search" absent
# the chat so far goes along as real messages, not a pasted block
expect "earlier answers go along as chat messages" '"role":"assistant"'
expect "and the first question as one of them" "JELLY-Q what next?"
expect "not pasted into the question" "Earlier in this conversation" absent
cp "$D/gemini-req-last.json" "$D/body"
expect "Gemini was asked, with the question" "nervous about the move"
expect "and never sees her projects" "OTHER-DESC" absent
fresh_minute
check "a question that needs Google" 200 -b "$SA" -X POST "${J[@]}" -d "{\"question\":\"WEB-SEARCH when is the Navigli market open?\",\"chatId\":\"$JC\"}" $B/api/corner/jelly
expect "the answer says where it looked" '"web":{"sources":\[{"title":"example.com","url":"https://example.com/navigli"}'
expect "with what was searched for" '"queries":\["navigli market opening hours"\]'
expect "and the read list says so" "a Google search"
cp "$D/groq-req-last.json" "$D/body"
expect "the findings go to Jelly" "FAKE-WEB-FINDINGS"
expect "under their own heading" "From the web (Google Search,"
expect "and she's told how to use them" "Sometimes the message has a section"
cp "$D/gemini-headers-last.json" "$D/body"
expect "the key goes in a header" "x-goog-api-key"
fresh_minute
check "Gemini failing doesn't stop Jelly" 200 -b "$SA" -X POST "${J[@]}" -d "{\"question\":\"WEB-BROKEN where is the post office?\",\"chatId\":\"$JC\"}" $B/api/corner/jelly
expect "she still answers" "FAKE-GROQ-REPLY"
same "without web sources" "$(jget .turn.web)" ""
# Jelly reads an answer aloud (tap to hear), a piece at a time, each recorded once
check "back to the chat" 200 -b "$SA" $B/api/corner/jelly
TURN=$(node -e "const d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));console.log(d.chats.find(c=>c.id==='$JC').turns[0].id)")
TURN2=$(node -e "const d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));console.log(d.chats.find(c=>c.id==='$JC').turns[1].id)")
check "hear an answer" 200 -b "$SA" "$B/api/jelly/speak?chat=$JC&turn=$TURN&part=0"
expect "a piece of audio" '"url":"/api/media/v_'
expect "and how many pieces" '"parts":[1-9]'
VURL=$(jget .url)
cp "$D/tts-last.json" "$D/body"
expect "in Jelly's voice" '"voice":"autumn"'
expect "with her lively direction" "\\[cheerful\\]"
expect "without the markdown" '\*\*' absent
TTS1=$(cat "$D/tts-count")
check "hear it again" 200 -b "$SA" "$B/api/jelly/speak?chat=$JC&turn=$TURN&part=0"
same "same recording" "$(jget .url)" "$VURL"
same "not recorded twice" "$(cat "$D/tts-count")" "$TTS1"
check "the audio plays" 200 -b "$SA" "$B$VURL"
if grep -qi '^content-type: audio/wav' "$D/headers"; then pass=$((pass+1)); echo "PASS it's a WAV"; else failn=$((failn+1)); echo "FAIL not a WAV"; fi
node -e "const f='$ROOT/.data/groq-usage.json',u=JSON.parse(require('fs').readFileSync(f,'utf8'));u.tts.requests=95;require('fs').writeFileSync(f,JSON.stringify(u))"
check "when today's free voice is used up" 200 -b "$SA" "$B/api/jelly/speak?chat=$JC&turn=$TURN2&part=0"
expect "the backup voice takes over" '"fallback":true'
check "friend can't hear her 403" 403 -b "$D/ai-fr.jar" "$B/api/jelly/speak?chat=$JC&turn=$TURN&part=0"
check "unknown chat 404" 404 -b "$SA" "$B/api/jelly/speak?chat=nope&turn=x&part=0"
# the switch for every voice and sound
check "sound off" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"sound":false}' $B/api/jelly/settings
expect "is off" '"sound":false'
check "remembered" 200 -b "$SA" $B/api/jelly/home
expect "still off" '"sound":false'
check "sound on" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"sound":true}' $B/api/jelly/settings
expect "is on" '"sound":true'
check "nonsense 400" 400 -b "$SA" -X PATCH "${J[@]}" -d '{"sound":"loud"}' $B/api/jelly/settings
check "friend can't change it 403" 403 -b "$D/ai-fr.jar" -X PATCH "${J[@]}" -d '{"sound":false}' $B/api/jelly/settings
check "the switch is on her desk" 200 -b "$SA" $B/home
expect "below the cards" "Sound &amp; feel"
check "turn the music down and the buzzes off" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"audio":{"music":0.2,"haptics":false}}' $B/api/jelly/settings
expect "music at 20%" '"music":0.2'
expect "no buzzes" '"haptics":false'
expect "everything else as it was" '"voice":0.9'
check "volumes stay between 0 and 100%" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"audio":{"sfx":5,"voice":-1}}' $B/api/jelly/settings
expect "loudest is 100%" '"sfx":1'
expect "quietest is off" '"voice":0'
check "remembered for every device" 200 -b "$SA" $B/api/jelly/home
expect "still 20%" '"music":0.2'
expect "Radio Italia by default" '"style":"radio"'
check "corner tunes instead" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"audio":{"style":"tunes"}}' $B/api/jelly/settings
expect "tunes" '"style":"tunes"'
check "not a style" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"audio":{"style":"disco"}}' $B/api/jelly/settings
expect "keeps the last one" '"style":"tunes"'
# Saani's radio: her Spotify
check "connect a playlist" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"spotify":"https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123"}' $B/api/jelly/settings
expect "saved as a Spotify URI" '"spotify":"spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"'
check "remembered" 200 -b "$SA" $B/api/jelly/settings
expect "still connected" 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'
check "an album link works too" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"spotify":"https://open.spotify.com/intl-it/album/4aawyAB9vmqN3uQ7FjRGTy"}' $B/api/jelly/settings
expect "as an album" '"spotify":"spotify:album:4aawyAB9vmqN3uQ7FjRGTy"'
check "not a Spotify link 400" 400 -b "$SA" -X PATCH "${J[@]}" -d '{"spotify":"https://example.com/playlist/37i9dQZF1DXcBWIGoYBM5M"}' $B/api/jelly/settings
expect "says how to get one" "Copy link"
check "friend can't change it 403" 403 -b "$D/ai-fr.jar" -X PATCH "${J[@]}" -d '{"spotify":null}' $B/api/jelly/settings
check "friend can't see it 403" 403 -b "$D/ai-fr.jar" $B/api/jelly/settings
check "friends get music and sounds on their desk too" 200 -b "$D/ai-fr.jar" $B/wall
expect "their own Sound & feel" "Sound &amp; feel"
check "disconnect" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"spotify":null}' $B/api/jelly/settings
expect "gone" '"spotify":null'
same "Radio Italia's songs are served" "$(curl -s -o /dev/null -w '%{http_code}' $B/radio/r01.m4a)" 200
same "and can be streamed from the middle" "$(curl -s -o /dev/null -w '%{http_code}' -H 'Range: bytes=1000-2000' $B/radio/r12.m4a)" 206
check "her chats are saved" 200 -b "$SA" $B/api/corner/jelly
expect "with both questions" "JELLY-Q2"
check "and show in the project's Jelly Got This! tab" 200 -b "$SA" "$B/home/corner/$P?tab=assistant"
expect "tab renamed" "Jelly Got This!"
expect "a Jelly chats section" "Chats with Jelly"
expect "with the chat" "JELLY-Q what next?"
check "pats" 200 -b "$SA" -X POST "${J[@]}" -d '{"n":12}' $B/api/corner/jelly/pet
expect "are counted" '"pets":12'
check "too many at once are capped" 200 -b "$SA" -X POST "${J[@]}" -d '{"n":5000}' $B/api/corner/jelly/pet
expect "at 60" '"pets":72'
expect "and friendship grows" '"level":4'
check "rename a jelly chat" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"title":"JELLY-RENAMED"}' $B/api/corner/jelly/chats/$JC
expect "renamed" "JELLY-RENAMED"
check "pin a jelly chat" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"pinned":true}' $B/api/corner/jelly/chats/$JC
expect "pinned" '"pinned":true'
expect "keeps its name" "JELLY-RENAMED"
check "Jelly's Chats tab" 200 -b "$SA" "$B/home/jelly?tab=chats"
expect "lists her chats" "JELLY-RENAMED"
expect "with the chats tab" 'aria-label="Chats"'
# Jelly's Corner: pearls, the shop, her room, achievements
check "her home" 200 -b "$SA" $B/api/jelly/home
expect "no second daily bonus today" '"kind":"daily"' absent
same "lots to achieve" "$(node -e "const d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));console.log(d.stats.placesTotal>100&&d.stats.bingoTotal>20)")" true
expect "pats and chats unlocked things" '"pats-50":"'
expect "a reward in her things" '"clam":1'
expect "My Corner counts too" '"project-1":"'
PEARLS=$(jget .home.pearls)
same "she has pearls to spend" "$( [ "$PEARLS" -ge 20 ] && echo yes )" yes
check "buy a plant" 200 -b "$SA" -X POST "${J[@]}" -d '{"id":"palm"}' $B/api/jelly/shop
same "it costs 25 pearls (and unlocks a 10-pearl achievement)" "$(jget .home.pearls)" "$((PEARLS - 25 + 10))"
expect "it's hers" '"palm":1'
expect "first purchase" '"shop-1":"'
check "rewards can't be bought" 400 -b "$SA" -X POST "${J[@]}" -d '{"id":"shell-bed"}' $B/api/jelly/shop
check "nor made-up things" 400 -b "$SA" -X POST "${J[@]}" -d '{"id":"spaceship"}' $B/api/jelly/shop
# spend down until a whale (120) is out of reach
for i in 1 2 3; do curl -s -o /dev/null -b "$SA" -X POST "${J[@]}" -d '{"id":"shell-sofa"}' $B/api/jelly/shop; done
check "too expensive" 400 -b "$SA" -X POST "${J[@]}" -d '{"id":"shell-sofa"}' $B/api/jelly/shop
expect "says so kindly" "Not enough pearls"
check "place it in her room" 200 -b "$SA" -X PUT "${J[@]}" -d '{"placed":[{"uid":"a","item":"palm","x":40,"y":70,"s":9},{"uid":"b","item":"clam","x":-5,"y":50}],"backdrop":"stars"}' $B/api/jelly/home
expect "sizes are kept sensible" '"s":2.5'
expect "and inside the room" '"x":0'
expect "a backdrop she doesn't own isn't used" '"backdrop":"lagoon"'
check "two plants when she has one" 400 -b "$SA" -X PUT "${J[@]}" -d '{"placed":[{"item":"palm"},{"item":"palm"}]}' $B/api/jelly/home
check "a thing she doesn't have" 400 -b "$SA" -X PUT "${J[@]}" -d '{"placed":[{"item":"vanity"}]}' $B/api/jelly/home
check "the house and her things are pictures" 200 $B/corner/home/house.webp
same "a shop picture" "$(curl -s -o /dev/null -w '%{http_code}' $B/corner/home/items/shell-bed.webp)" 200
same "a sea friend" "$(curl -s -o /dev/null -w '%{http_code}' $B/corner/home/items/turtle.webp)" 200
same "a sharp face for her home" "$(curl -s -o /dev/null -w '%{http_code}' $B/corner/jelly/hd/joyful.webp)" 200
check "checking in again" 200 -b "$SA" -X POST $B/api/jelly/check
expect "nothing new" '"gains":\[\]'
# an old (emoji) purchase is refunded once the illustrated catalog arrives
node -e "const f='$ROOT/.data/jelly.json',d=JSON.parse(require('fs').readFileSync(f,'utf8'));d.friend.v=1;d.friend.owned.vespa=1;d.friend.placed.push({uid:'old',item:'vespa',x:50,y:50,s:1,flip:false});require('fs').writeFileSync(f,JSON.stringify(d))"
BEFORE=$(curl -s -b "$SA" -X POST $B/api/jelly/check | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).home.pearls))")
check "old things are tidied away" 200 -b "$SA" $B/api/jelly/home
expect "the old Vespa is gone" '"vespa"' absent
same "and it was refunded just once" "$(jget .home.pearls)" "$BEFORE"
check "Jelly's Corner opens" 200 -b "$SA" $B/home/jelly
expect "her page" "Jelly’s Corner"
check "and it's on her desk" 200 -b "$SA" $B/home
expect "a Jelly tile" "/home/jelly"
check "friend can't see her home 403" 403 -b "$D/ai-fr.jar" $B/api/jelly/home
check "friend can't shop 403" 403 -b "$D/ai-fr.jar" -X POST "${J[@]}" -d '{"id":"plant"}' $B/api/jelly/shop
check "friend can't check in 403" 403 -b "$D/ai-fr.jar" -X POST $B/api/jelly/check
check "friend can't talk to jelly 403" 403 -b "$D/ai-fr.jar" $B/api/corner/jelly
check "friend can't ask 403" 403 -b "$D/ai-fr.jar" -X POST "${J[@]}" -d '{"question":"hi"}' $B/api/corner/jelly
check "friend can't pet her 403" 403 -b "$D/ai-fr.jar" -X POST "${J[@]}" -d '{"n":1}' $B/api/corner/jelly/pet
check "friend can't delete her chats 403" 403 -b "$D/ai-fr.jar" -X DELETE $B/api/corner/jelly/chats/$JC
check "delete a jelly chat" 200 -b "$SA" -X DELETE $B/api/corner/jelly/chats/$JC
check "gone" 404 -b "$SA" -X DELETE $B/api/corner/jelly/chats/$JC
for m in content joyful excited wink calm sad grumpy confused idea sleepy surprised love studious curious shy; do
  code=$(curl -s -o /dev/null -w '%{http_code}' $B/corner/jelly/$m.webp)
  same "her $m face is there" "$code" 200
done

# free-tier limits
count() { cat "$D/groq-count"; }
U="$ROOT/.data/groq-usage.json"
same "usage is counted" "$(node -e "console.log(JSON.parse(require('fs').readFileSync('$U','utf8'))['free-tier'].dayRequests)")" 10
node -e "const f='$U',u=JSON.parse(require('fs').readFileSync(f,'utf8'));u['free-tier'].dayRequests=900;require('fs').writeFileSync(f,JSON.stringify(u))"
before=$(count)
check "daily cap reached 429" 429 -b "$SA" -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/$P/assistant
expect "says today's questions are used" "today’s free questions"
same "Groq wasn't called" "$(count)" "$before"
node -e "const f='$U',u=JSON.parse(require('fs').readFileSync(f,'utf8'));Object.assign(u['free-tier'],{dayRequests:2,minute:Math.floor(Date.now()/60000),minuteRequests:2,minuteTokens:0,minuteOutput:500});require('fs').writeFileSync(f,JSON.stringify(u))"
check "a third answer this minute would pass 1,000 output tokens: waits" 429 -b "$SA" -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/$P/assistant
same "without calling Groq" "$(count)" "$before"
node -e "const f='$U',u=JSON.parse(require('fs').readFileSync(f,'utf8'));Object.assign(u['free-tier'],{minuteRequests:0,minuteTokens:0,minuteOutput:0});require('fs').writeFileSync(f,JSON.stringify(u))"
check "Groq says slow down: 429" 429 -b "$SA" -X POST "${J[@]}" -d '{"mode":"question","question":"SLOW-DOWN"}' $B/api/corner/projects/$P/assistant
expect "with how long to wait" "about 42 seconds"
if grep -qi '^retry-after: 42' "$D/headers"; then pass=$((pass+1)); echo "PASS retry-after header"; else failn=$((failn+1)); echo "FAIL retry-after header"; fi
before=$(count)
check "then it waits instead of asking again" 429 -b "$SA" -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/$P/assistant
expect "still friendly" "catching its breath"
same "Groq wasn't called while paused" "$(count)" "$before"

check "deleting the project" 200 -b "$SA" -X DELETE $B/api/corner/projects/$P
if grep -q "\"projectId\":\"$P\"" "$ROOT/.data/cornerChats.json" 2>/dev/null; then failn=$((failn+1)); echo "FAIL conversations left behind"; else pass=$((pass+1)); echo "PASS its conversations go too"; fi

echo; echo "passed=$pass failed=$failn"
[ "$failn" -eq 0 ]
