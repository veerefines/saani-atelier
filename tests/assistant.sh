#!/bin/bash
# The My Corner assistant with a key, against tests/fake-claude.js: checks what is sent to Claude
# (brief, notes, the PDF, the text file, the image; Word/PowerPoint listed as not read) and the reply.
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
ROOT=${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
SA=$D/ai-sa.jar; rm -f "$SA"
pass=0; failn=0
check() {
  local name=$1 exp=$2; shift 2
  local code
  code=$(curl -s -o "$D/body" -w '%{http_code}' -m 60 "$@")
  if [[ "$code" == "$exp" ]]; then pass=$((pass+1)); printf 'PASS %-58s %s\n' "$name" "$code"
  else failn=$((failn+1)); printf 'FAIL %-58s got %s want %s  %s\n' "$name" "$code" "$exp" "$(head -c 220 "$D/body")"; fi
}
expect() {
  if grep -q -- "$2" "$D/body"; then found=1; else found=0; fi
  if [[ "$3" == absent ]]; then want=0; else want=1; fi
  if [[ $found == $want ]]; then pass=$((pass+1)); printf 'PASS %-58s\n' "$1"; else failn=$((failn+1)); printf 'FAIL %-58s (pattern %s %s)\n' "$1" "$2" "$3"; fi
}
jget() { node -e "let d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));const v=eval('d'+process.argv[1]);console.log(v===undefined||v===null?'':v)" "$1"; }
J=(-H 'Content-Type: application/json')
upload() {
  local sz; sz=$(wc -c < "$1" | tr -d ' ')
  local r; r=$(curl -s -b "$SA" -X POST "${J[@]}" -d "{\"mime\":\"$2\",\"size\":$sz,\"purpose\":\"corner\",\"filename\":\"$3\"}" $B/api/upload)
  local u; u=$(node -e "console.log(JSON.parse(process.argv[1]).url)" "$r")
  curl -s -o /dev/null -b "$SA" -X PUT -H "Content-Type: $2" --data-binary @"$1" "$B$u"
  node -e "console.log(JSON.parse(process.argv[1]).id)" "$r"
}
printf '%%PDF-1.4\n%%%%EOF\n' > "$D/ai.pdf"
printf 'Trend notes: SOFT-TAILORING-TREND.' > "$D/ai.txt"
printf 'PK fake' > "$D/ai.pptx"
curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1

check "status says ready" 200 -b "$SA" $B/api/corner/projects/x/assistant
expect "ready" '"ready":true'
check "a project" 201 -b "$SA" -X POST "${J[@]}" -d '{"title":"AI test","description":"AI-DESC","category":"Brand Strategy"}' $B/api/corner/projects
P=$(jget .id)
curl -s -o /dev/null -b "$SA" -X PATCH "${J[@]}" -d '{"brief":{"audience":"AI-AUDIENCE"},"costing":{"fabric":10,"labour":5,"sellingPrice":60}}' $B/api/corner/projects/$P
for x in "ai.pdf application/pdf Brief.pdf" "ai.txt text/plain notes.txt" "ai.pptx application/vnd.openxmlformats-officedocument.presentationml.presentation Deck.pptx"; do
  set -- $x
  M=$(upload "$D/$1" "$2" "$3"); curl -s -o /dev/null -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"doc\",\"mediaId\":\"$M\"}" $B/api/corner/projects/$P/items
done
IM=$(upload "$ROOT/public/icons/icon-192.png" image/png board.png)
curl -s -o /dev/null -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"board\",\"board\":\"image\",\"mediaId\":\"$IM\",\"caption\":\"AI-CAPTION\"}" $B/api/corner/projects/$P/items
curl -s -o /dev/null -b "$SA" -X POST "${J[@]}" -d '{"kind":"palette","name":"AI-PALETTE","hexes":["#f4a6c0"]}' $B/api/corner/projects/$P/items

check "bad mode 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"mode":"poem"}' $B/api/corner/projects/$P/assistant
check "empty question 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"mode":"question","question":" "}' $B/api/corner/projects/$P/assistant
check "missing project 404" 404 -b "$SA" -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/nope/assistant
check "summarise" 200 -b "$SA" -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/$P/assistant
expect "reply comes back" "FAKE-CLAUDE-REPLY"
expect "says it read the PDF" '"read":\[[^]]*Brief.pdf'
expect "and the text file" '"read":\[[^]]*notes.txt'
expect "and the image" 'moodboard image'
expect "says it couldn't read the deck" '"notRead":\[[^]]*Deck.pptx'

cp "$D/claude-req-last.json" "$D/body"
expect "model is Opus 5.5" '"model":"claude-opus-5-5"'
expect "effort set" '"effort":"high"'
expect "fallbacks on" '"fallbacks":"default"'
expect "the PDF as a document block" '"media_type":"application/pdf"'
expect "with its name" '"title":"Brief.pdf"'
expect "the text file's words" "SOFT-TAILORING-TREND"
expect "the image" '"media_type":"image/png"'
expect "the brief" "AI-AUDIENCE"
expect "the description" "AI-DESC"
expect "the palette" "AI-PALETTE"
expect "the caption" "AI-CAPTION"
expect "costing worked out" "unit cost 15"
expect "the deck named as not read" "Deck.pptx (Word and PowerPoint"
expect "a system prompt" "only from the project content"
cp "$D/claude-headers-last.json" "$D/body"
expect "fallback beta header" "server-side-fallback-2026-07-01"
expect "the key goes in the auth header (server side only)" 'test-key-not-real'

check "a follow-up question" 200 -b "$SA" -X POST "${J[@]}" -d '{"mode":"question","question":"FOLLOW-UP-Q","history":[{"q":"Summarise","a":"EARLIER-ANSWER"}]}' $B/api/corner/projects/$P/assistant
cp "$D/claude-req-last.json" "$D/body"
expect "the question" "FOLLOW-UP-Q"
expect "the earlier answer for context" "EARLIER-ANSWER"
check "signed out 401" 401 -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/$P/assistant

echo; echo "passed=$pass failed=$failn"
[ "$failn" -eq 0 ]
