#!/bin/bash
# The monthly Soldi sheet: who it goes to, the button, the Excel file itself, and the 1st-of-month job,
# against tests/fake-mail.js (a stand-in for Resend).
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
SA=$D/rp-sa.jar; FR=$D/rp-fr.jar; rm -f "$SA" "$FR"
CS=${CRON_SECRET:-}
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
same() { if [[ "$2" == "$3" ]]; then pass=$((pass+1)); printf 'PASS %-58s\n' "$1"; else failn=$((failn+1)); printf 'FAIL %-58s (%s vs %s)\n' "$1" "$2" "$3"; fi; }
jget() { node -e "let d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));const v=eval('d'+process.argv[1]);console.log(v===undefined||v===null?'':v)" "$1"; }
mailcount() { cat "$D/mail-count" 2>/dev/null || echo 0; }
J=(-H 'Content-Type: application/json')
TODAY=$(TZ=Europe/Rome date +%Y-%m-%d)
MONTH=${TODAY:0:7}
NEXT=$(node -e "const d=new Date('$MONTH-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);console.log(d.toISOString().slice(0,10))")
NEXT2=${NEXT:0:8}02

curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1
curl -s -o /dev/null -c "$FR" $B/hello/CHANGE-ME-2

echo "--- who gets it"
check "signed out can't see it" 401 $B/api/expenses/report
check "friends can't" 403 -b "$FR" $B/api/expenses/report
check "friends can't change it" 403 -b "$FR" -X PUT "${J[@]}" -d '{"emails":["x@example.com"]}' $B/api/expenses/report
check "her list" 200 -b "$SA" $B/api/expenses/report
same "mail is switched on" "$(jget .ready)" "true"
same "starts from the settings" "$(jget .recipients[0])" "seed@example.com"
check "a bad address" 400 -b "$SA" -X PUT "${J[@]}" -d '{"emails":["not-an-email"]}' $B/api/expenses/report
check "change the list" 200 -b "$SA" -X PUT "${J[@]}" -d '{"emails":["A@Example.com","a@example.com","b@example.com"]}' $B/api/expenses/report
same "lowercased and no duplicates" "$(jget '.recipients.join(",")')" "a@example.com,b@example.com"
check "it sticks" 200 -b "$SA" $B/api/expenses/report
same "saved" "$(jget '.recipients.length')" "2"

echo "--- the sheet"
check "a spend" 201 -b "$SA" -X POST "${J[@]}" -d '{"amount":12.5,"currency":"EUR","category":"groceries","note":"Esselunga run"}' $B/api/expenses
check "another, in rupees" 201 -b "$SA" -X POST "${J[@]}" -d '{"amount":500,"currency":"INR","category":"phone","note":"Airtel top-up"}' $B/api/expenses
check "money in" 201 -b "$SA" -X POST "${J[@]}" -d '{"amount":100,"currency":"EUR","kind":"in","category":"home","note":"From Papa"}' $B/api/expenses
check "a budget with a cap" 200 -b "$SA" -X PUT "${J[@]}" -d '{"monthly":900,"caps":{"groceries":10}}' $B/api/expenses/budget
check "download it" 200 -b "$SA" "$B/api/expenses/report/file"
curl -s -b "$SA" -o "$D/sheet.xlsx" "$B/api/expenses/report/file"
same "it is an Excel file (a zip)" "$(head -c 2 "$D/sheet.xlsx")" "PK"
same "download is signed in only" "$(curl -s -o /dev/null -w '%{http_code}' $B/api/expenses/report/file)" "401"
WB=$(unzip -p "$D/sheet.xlsx" xl/workbook.xml)
for t in Summary Spends "By category" Daily "Money in"; do
  [[ "$WB" == *"$t"* ]] && { pass=$((pass+1)); echo "PASS tab: $t"; } || { failn=$((failn+1)); echo "FAIL tab: $t"; }
done
STR=$(unzip -p "$D/sheet.xlsx" xl/sharedStrings.xml)
[[ "$STR" == *"Esselunga run"* && "$STR" == *"Airtel top-up"* && "$STR" == *"From Papa"* ]] && { pass=$((pass+1)); echo "PASS the notes are in the sheet"; } || { failn=$((failn+1)); echo "FAIL notes missing"; }
CATS=$(unzip -p "$D/sheet.xlsx" xl/worksheets/sheet3.xml)
[[ "$CATS" == *"SUMIFS"* ]] && { pass=$((pass+1)); echo "PASS the category tab adds up live (formulas)"; } || { failn=$((failn+1)); echo "FAIL no formulas"; }

echo "--- the button"
before=$(mailcount)
check "send now" 200 -b "$SA" -X POST "${J[@]}" -d '{}' $B/api/expenses/report
same "to both people" "$(jget '.sent.length')" "2"
same "two emails went out" "$(( $(mailcount) - before ))" "2"
cp "$D/mail-last.json" "$D/body"
expect "from Jelly" '"from":"Jelly <jelly@saani.space>"'
expect "to one person only" '"to":\["b@example.com"\]'
expect "the key goes in a header" '"authorization":"Bearer test-resend-key"'
expect "the month so far, in the subject" "so far"
expect "the sheet is attached" "Soldi-$MONTH.xlsx"
node -e "const m=JSON.parse(require('fs').readFileSync('$D/mail-last.json','utf8'));require('fs').writeFileSync('$D/att.xlsx',Buffer.from(m.attachments[0].content,'base64'))"
same "the attachment is a real workbook" "$(head -c 2 "$D/att.xlsx")" "PK"
check "clear the list" 200 -b "$SA" -X PUT "${J[@]}" -d '{"emails":[]}' $B/api/expenses/report
check "so there's no one to send to" 400 -b "$SA" -X POST "${J[@]}" -d '{}' $B/api/expenses/report
check "friends can't press it" 403 -b "$FR" -X POST "${J[@]}" -d '{}' $B/api/expenses/report
check "list back" 200 -b "$SA" -X PUT "${J[@]}" -d '{"emails":["a@example.com","b@example.com"]}' $B/api/expenses/report
for i in 1 2 3 4; do curl -s -o /dev/null -b "$SA" -X POST "${J[@]}" -d '{}' $B/api/expenses/report; done
check "too many presses in a day" 429 -b "$SA" -X POST "${J[@]}" -d '{}' $B/api/expenses/report

echo "--- the 1st of the month"
touch "$D/mail-down"
before=$(mailcount)
check "the 1st, with mail down" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=${NEXT}T06:00:00Z"
same "it tried and failed" "$(jget .report)" "failed"
rm -f "$D/mail-down"
check "the 2nd retries" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=${NEXT2}T06:00:00Z"
same "and it went" "$(jget .report)" "sent"
same "to both" "$(( $(mailcount) - before ))" "2"
cp "$D/mail-last.json" "$D/body"
expect "last month's sheet" "Soldi-$MONTH.xlsx"
expect "not marked as so far" "so far" absent
check "the 3rd" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=${NEXT:0:8}03T06:00:00Z"
same "nothing twice" "$(jget .report)" "already-sent"
same "no new mail" "$(( $(mailcount) - before ))" "2"
check "the list shows when it went" 200 -b "$SA" $B/api/expenses/report
[[ -n "$(jget ".lastSent[\"$MONTH\"]")" ]] && { pass=$((pass+1)); echo "PASS last sent is recorded"; } || { failn=$((failn+1)); echo "FAIL last sent missing"; }
check "mid-month the job does nothing" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=${NEXT:0:8}15T06:00:00Z"
same "not due" "$(jget .report)" "not-due"

echo
echo "passed=$pass failed=$failn"
[[ $failn == 0 ]]
