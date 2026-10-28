#!/bin/bash
# Soldi with a key, against tests/fake-groq.js: Jelly reads plain words (and a made-up amount is
# dropped), what's sent to Groq, and Jelly's take, cached until the month changes.
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
SA=$D/sai-sa.jar; rm -f "$SA"
pass=0; failn=0
check() {
  local name=$1 exp=$2; shift 2
  local code
  code=$(curl -s -o "$D/body" -w '%{http_code}' -m 60 "$@")
  if [[ "$code" == "$exp" ]]; then pass=$((pass+1)); printf 'PASS %-58s %s\n' "$name" "$code"
  else failn=$((failn+1)); printf 'FAIL %-58s got %s want %s  %s\n' "$name" "$code" "$exp" "$(head -c 220 "$D/body")"; fi
}
expect() {
  if grep -q -- "$2" "${4:-$D/body}"; then found=1; else found=0; fi
  if [[ "$3" == absent ]]; then want=0; else want=1; fi
  if [[ $found == $want ]]; then pass=$((pass+1)); printf 'PASS %-58s\n' "$1"; else failn=$((failn+1)); printf 'FAIL %-58s (pattern %s %s)\n' "$1" "$2" "$3"; fi
}
same() { if [[ "$2" == "$3" ]]; then pass=$((pass+1)); printf 'PASS %-58s\n' "$1"; else failn=$((failn+1)); printf 'FAIL %-58s (%s vs %s)\n' "$1" "$2" "$3"; fi; }
jget() { node -e "let d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));const v=eval('d'+process.argv[1]);console.log(v===undefined||v===null?'':v)" "$1"; }
J=(-H 'Content-Type: application/json')
MONTH=$(TZ=Europe/Rome date +%Y-%m)
curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1

echo "--- Soldi: Jelly reads it"
check "plain words" 200 -b "$SA" -X POST "${J[@]}" -d '{"text":"esselunga 23,40 and metro 2"}' $B/api/expenses/parse
same "read by Jelly" "$(jget .via)" "jelly"
same "the made-up amount is dropped" "$(jget .drafts.length)" "1"
same "her note" "$(jget .drafts[0].note)" "FAKE-ESSELUNGA"
expect "asked for JSON" '"json_object"' present "$D/groq-req-last.json"
node -e "const b=JSON.parse(require('fs').readFileSync('$D/groq-req-last.json','utf8'));process.exit(b.messages[0].content.includes('esselunga 23,40')?1:0)"
same "her words aren't in the instructions" "$?" "0"
expect "but in her message" 'esselunga 23,40' present "$D/groq-req-last.json"

echo "--- Soldi: Jelly's take"
check "a spend" 201 -b "$SA" -X POST "${J[@]}" -d '{"amount":12,"category":"cafe","note":"Spritz"}' $B/api/expenses
check "insights" 200 -b "$SA" "$B/api/expenses/insights?month=$MONTH"
same "from Jelly" "$(jget .via)" "jelly"
same "her headline" "$(jget .headline)" "FAKE-JELLY-HEADLINE"
same "her tips" "$(jget .tips.length)" "2"
expect "the facts went along" 'Café' present "$D/groq-req-last.json"
N=$(cat "$D/groq-count")
check "again" 200 -b "$SA" "$B/api/expenses/insights?month=$MONTH"
same "kept, not asked again" "$(cat "$D/groq-count")" "$N"
check "another spend" 201 -b "$SA" -X POST "${J[@]}" -d '{"amount":3,"category":"transport"}' $B/api/expenses
check "insights after a change" 200 -b "$SA" "$B/api/expenses/insights?month=$MONTH"
same "Jelly looks again" "$(cat "$D/groq-count")" "$((N+1))"

echo
echo "passed=$pass failed=$failn"
[ $failn -eq 0 ]
