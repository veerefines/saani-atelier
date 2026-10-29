#!/bin/bash
# Part 7: Soldi in plain words (the keyword reader, as Groq is off here), money in, Jelly's take
# (rule-based tips), and Soldi over WhatsApp (against tests/fake-whatsapp.js).
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
ROOT=${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
SA=$D/p7-sa.jar; FR=$D/p7-fr.jar; rm -f "$SA" "$FR"
pass=0; failn=0
check() {
  local name=$1 exp=$2; shift 2
  local code
  code=$(curl -s -o "$D/body" -w '%{http_code}' -m 30 "$@")
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
TODAY=$(TZ=Europe/Rome date +%Y-%m-%d)
MONTH=${TODAY:0:7}
YESTERDAY=$(node -e "const d=new Date('${TODAY}T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);console.log(d.toISOString().slice(0,10))")
count() { curl -s -b "$SA" "$B/api/expenses?month=$MONTH" | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>console.log(JSON.parse(s).expenses.length))"; }

curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1
curl -s -o /dev/null -c "$FR" $B/hello/CHANGE-ME-2

echo "--- Soldi: plain words"
check "two spends in one message" 200 -b "$SA" -X POST "${J[@]}" -d '{"text":"esselunga 23,40 and metro 2,20"}' $B/api/expenses/parse
same "two drafts" "$(jget .drafts.length)" "2"
same "groceries" "$(jget .drafts[0].category)" "groceries"
same "comma decimals" "$(jget .drafts[0].amount)" "23.4"
same "then transport" "$(jget .drafts[1].category)" "transport"
same "read without AI" "$(jget .via)" "quick"
check "money from home" 200 -b "$SA" -X POST "${J[@]}" -d '{"text":"mamma sent ₹10000"}' $B/api/expenses/parse
same "money in" "$(jget .drafts[0].kind)" "in"
same "in rupees" "$(jget .drafts[0].currency)" "INR"
same "from home" "$(jget .drafts[0].category)" "home"
check "one shop, one total" 200 -b "$SA" -X POST "${J[@]}" -d '{"text":"esselunga milk eggs pasta 23,40"}' $B/api/expenses/parse
same "stays one" "$(jget .drafts.length)" "1"
check "yesterday" 200 -b "$SA" -X POST "${J[@]}" -d '{"text":"pizza 12 yesterday"}' $B/api/expenses/parse
same "dated yesterday" "$(jget .drafts[0].day)" "$YESTERDAY"
same "eating out" "$(jget .drafts[0].category)" "eating"
check "no amount" 200 -b "$SA" -X POST "${J[@]}" -d '{"text":"hello jelly"}' $B/api/expenses/parse
same "nothing" "$(jget .drafts.length)" "0"
check "an empty message" 400 -b "$SA" -X POST "${J[@]}" -d '{"text":"  "}' $B/api/expenses/parse
check "friends can't parse" 403 -b "$FR" -X POST "${J[@]}" -d '{"text":"pizza 12"}' $B/api/expenses/parse

echo "--- Soldi: adding drafts, money in"
check "add two at once" 201 -b "$SA" -X POST "${J[@]}" -d '{"items":[{"amount":23.4,"category":"groceries","note":"Esselunga"},{"kind":"in","amount":10000,"currency":"INR","category":"home","note":"Mamma"}]}' $B/api/expenses/batch
same "both saved" "$(jget .items.length)" "2"
same "money in kept" "$(jget .items[1].kind)" "in"
same "in euros" "$(jget .items[1].eur)" "100"
EXIN=$(jget .items[1].id)
check "one without an amount" 400 -b "$SA" -X POST "${J[@]}" -d '{"items":[{"amount":5},{"amount":0}]}' $B/api/expenses/batch
check "friends can't add" 403 -b "$FR" -X POST "${J[@]}" -d '{"items":[{"amount":5}]}' $B/api/expenses/batch
check "a spend category can't be money in" 201 -b "$SA" -X POST "${J[@]}" -d '{"kind":"in","amount":5,"category":"groceries"}' $B/api/expenses
same "other money in" "$(jget .category)" "other-in"
EXIN2=$(jget .id)
check "turn it into a spend" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"kind":"out"}' $B/api/expenses/$EXIN2
same "a spend now" "$(jget .kind)" "out"
same "with a spend category" "$(jget .category)" "other"
check "delete it" 200 -b "$SA" -X DELETE $B/api/expenses/$EXIN2
check "the month" 200 -b "$SA" "$B/api/expenses?month=$MONTH"
same "spent leaves money in out" "$(jget .summary.spent)" "23.4"
same "money in" "$(jget .summary.inEur)" "100"
same "net" "$(jget .summary.net)" "76.6"
same "one spend counted" "$(jget .summary.count)" "1"

echo "--- Soldi: Jelly's take"
check "insights" 200 -b "$SA" "$B/api/expenses/insights?month=$MONTH"
same "rule-based without AI" "$(jget .via)" "quick"
same "groceries in the pie" "$(jget .shares[0].id)" "groceries"
same "all of it" "$(jget .shares[0].pct)" "100"
same "money in for the flow chart" "$(jget .inEur)" "100"
expect "a headline" '"headline":"[^"]'
expect "the money-in tip" 'came in'
check "friends can't see it" 403 -b "$FR" "$B/api/expenses/insights?month=$MONTH"
check "an empty month" 200 -b "$SA" "$B/api/expenses/insights?month=2020-01"
same "no slices" "$(jget .shares.length)" "0"
check "the Soldi page" 200 -b "$SA" $B/home/money
expect "the Tell Jelly box" "Tell Jelly"

echo "--- Soldi on WhatsApp"
OWNER=393331234567
sign() { node -e "process.stdout.write('sha256='+require('crypto').createHmac('sha256','test-app-secret').update(process.argv[1]).digest('hex'))" "$1"; }
wa() { # id from text
  local body; body=$(node -e "console.log(JSON.stringify({object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{messaging_product:'whatsapp',messages:[{id:process.argv[1],from:process.argv[2],type:'text',text:{body:process.argv[3]}}]}}]}]}))" "$1" "$2" "$3")
  curl -s -o "$D/body" -w '%{http_code}' -m 30 -X POST "${J[@]}" -H "X-Hub-Signature-256: $(sign "$body")" -d "$body" $B/api/whatsapp
}
sent() { cat "$D/wa-out-count" 2>/dev/null || echo 0; }
waitsent() { for i in $(seq 1 40); do [ "$(sent)" -ge "$1" ] && return; sleep 0.25; done; }
check "Meta's handshake" 200 "$B/api/whatsapp?hub.mode=subscribe&hub.verify_token=TEST-VERIFY&hub.challenge=chal-42"
same "echoes the challenge" "$(cat "$D/body")" "chal-42"
check "a wrong verify token" 403 "$B/api/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=x"
check "an unsigned delivery" 401 -X POST "${J[@]}" -d '{"entry":[]}' $B/api/whatsapp
check "a forged signature" 401 -X POST "${J[@]}" -H "X-Hub-Signature-256: sha256=0000" -d '{"entry":[]}' $B/api/whatsapp
BEFORE=$(count)
same "her message" "$(wa wamid.A1 "+$OWNER" 'pizza 12 and metro 2')" "200"
waitsent 1
same "Jelly replied" "$(sent)" "1"
expect "to her number" "\"to\":\"$OWNER\"" present "$D/wa-out-last.json"
expect "says what she logged" "Logged" present "$D/wa-out-last.json"
expect "offers undo" "undo" present "$D/wa-out-last.json"
expect "with the token" "Bearer test-wa-token" present "$D/wa-auth-last"
same "two spends saved" "$(count)" "$((BEFORE+2))"
same "Meta retries the same message" "$(wa wamid.A1 "+$OWNER" 'pizza 12 and metro 2')" "200"
sleep 2
same "logged once" "$(count)" "$((BEFORE+2))"
same "no second reply" "$(sent)" "1"
same "a stranger" "$(wa wamid.S1 "441234567890" 'pizza 99')" "200"
sleep 2
same "ignored" "$(count)" "$((BEFORE+2))"
same "no reply to them" "$(sent)" "1"
wa wamid.A2 "$OWNER" 'undo' > /dev/null
waitsent 2
expect "undo" "Taken back" present "$D/wa-out-last.json"
same "both taken back" "$(count)" "$BEFORE"
wa wamid.A3 "$OWNER" 'summary' > /dev/null
waitsent 3
expect "the month" "Spent" present "$D/wa-out-last.json"
expect "money in too" "Money in" present "$D/wa-out-last.json"
wa wamid.A4 "$OWNER" 'help' > /dev/null
waitsent 4
expect "help" "summary" present "$D/wa-out-last.json"
wa wamid.A5 "$OWNER" 'no numbers here' > /dev/null
waitsent 5
expect "asks for an amount" "couldn" present "$D/wa-out-last.json"
same "nothing saved" "$(count)" "$BEFORE"

echo "--- Jelly's WhatsApp menu"
tap() { # id from kind(button_reply|list_reply) choice
  local body; body=$(node -e "console.log(JSON.stringify({object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{messaging_product:'whatsapp',messages:[{id:process.argv[1],from:process.argv[2],type:'interactive',interactive:{type:process.argv[3],[process.argv[3]]:{id:process.argv[4],title:process.argv[4]}}}]}}]}]}))" "$1" "$2" "$3" "$4")
  curl -s -o /dev/null -w '%{http_code}' -m 30 -X POST "${J[@]}" -H "X-Hub-Signature-256: $(sign "$body")" -d "$body" $B/api/whatsapp
}
out() { node -e "const m=require('$D/wa-out-last.json');console.log(eval(process.argv[1]))" "$1"; }
N=$(sent)
wa wamid.M1 "$OWNER" 'menu' > /dev/null
waitsent $((N+1))
same "the menu is a list" "$(out m.interactive.type)" "list"
same "with ten things to tap" "$(out 'm.interactive.action.sections[0].rows.length')" "10"
same "every title fits WhatsApp's 24" "$(out "m.interactive.action.sections[0].rows.every(r=>[...r.title].length<=24&&r.description.length<=72)")" "true"
# a cap so the budget has something to show
check "a cafe cap" 200 -b "$SA" -X PUT "${J[@]}" -d '{"monthly":500,"caps":{"cafe":20}}' $B/api/expenses/budget
same "a tap on Budget" "$(tap wamid.M2 "$OWNER" list_reply budget)" "200"
waitsent $((N+2))
expect "the budget" "Budget" present "$D/wa-out-last.json"
expect "its caps" "Caps" present "$D/wa-out-last.json"
same "with buttons under it" "$(out m.interactive.type)" "button"
wa wamid.M3 "$OWNER" 'aperitivo 9' > /dev/null
waitsent $((N+3))
same "a logged spend offers three buttons" "$(out m.interactive.action.buttons.length)" "3"
same "undo among them" "$(out "m.interactive.action.buttons.some(b=>b.reply.id==='undo')")" "true"
AFTER=$(count)
tap wamid.M4 "$OWNER" button_reply undo > /dev/null
waitsent $((N+4))
expect "a tap on Undo takes it back" "Taken back" present "$D/wa-out-last.json"
same "gone" "$(count)" "$((AFTER-1))"
I=5
for row in spends summary today week cats last tips how; do
  tap wamid.M$I "$OWNER" list_reply $row > /dev/null
  waitsent $((N+I))
  same "the $row row answers" "$(sent)" "$((N+I))"
  I=$((I+1))
done
expect "Jelly's tips" "Jelly’s take" present "$D/wa-out-$((N+11)).json"
expect "the spends list" "🧾" present "$D/wa-out-$((N+5)).json"
expect "where it went" "Where it went" present "$D/wa-out-$((N+9)).json"
expect "how to log" "esselunga" present "$D/wa-out-last.json"
INS=$(curl -s -b "$SA" "$B/api/expenses/insights?month=$MONTH" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).headline))")
same "tips match Soldi's own take" "$(node -e "console.log(require('$D/wa-out-$((N+11)).json').interactive.body.text.split('\n')[1])")" "$INS"
same "a stranger's tap" "$(tap wamid.M20 "441234567890" list_reply budget)" "200"
sleep 2
same "is ignored" "$(sent)" "$((N+12))"

echo
echo "passed=$pass failed=$failn"
[ $failn -eq 0 ]
