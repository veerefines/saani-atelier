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

check "a follow-up question" 200 -b "$SA" -X POST "${J[@]}" -d '{"mode":"question","question":"FOLLOW-UP-Q","history":[{"q":"OLDEST-Q","a":"OLDEST"},{"q":"Summarise","a":"EARLIER-ANSWER"}]}' $B/api/corner/projects/$P/assistant
cp "$D/groq-req-last.json" "$D/body"
expect "the question" "FOLLOW-UP-Q"
expect "the earlier answer for context" "EARLIER-ANSWER"
check "signed out 401" 401 -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/$P/assistant

# free-tier limits
count() { cat "$D/groq-count"; }
U="$ROOT/.data/groq-usage.json"
same "usage is counted" "$(node -e "console.log(JSON.parse(require('fs').readFileSync('$U','utf8'))['free-tier'].dayRequests)")" 2
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

echo; echo "passed=$pass failed=$failn"
[ "$failn" -eq 0 ]
