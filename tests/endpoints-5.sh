#!/bin/bash
# Part 5: Soldi (spends, budget, the ₹ rate), and her daily rhythm and a deeper Jelly.
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
SA=$D/p5-sa.jar; FR=$D/p5-fr.jar; rm -f "$SA" "$FR"
pass=0; failn=0
check() {
  local name=$1 exp=$2; shift 2
  local code
  code=$(curl -s -o "$D/body" -w '%{http_code}' -m 30 "$@")
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
TODAY=$(TZ=Europe/Rome date +%Y-%m-%d)
MONTH=${TODAY:0:7}

curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1
curl -s -o /dev/null -c "$FR" $B/hello/CHANGE-ME-2

echo "--- Soldi: the rate"
check "the rate" 200 -b "$SA" $B/api/fx
same "ECB rate from the fake" "$(jget .inr)" "100"
same "a month of trend" "$(jget .trend.length)" "3"
same "source named" "$(jget .source)" "ECB"
touch "$D/fx-ecb-down"
check "the rate with ECB down" 200 -b "$SA" $B/api/fx
same "falls back to ExchangeRate-API" "$(jget .source)" "ExchangeRate-API"
same "its rate" "$(jget .inr)" "90"
rm -f "$D/fx-ecb-down"
check "friends can't see her rate page" 403 -b "$FR" $B/api/fx
check "nor sign out of it" 401 $B/api/fx

echo "--- Soldi: spends"
check "a spend in euros" 201 -b "$SA" -X POST "${J[@]}" -d '{"amount":12.5,"currency":"EUR","category":"groceries","note":"Esselunga run"}' $B/api/expenses
EX1=$(jget .id)
same "in rupees too" "$(jget .inr)" "1250"
same "kept the rate" "$(jget .rate)" "100"
same "today" "$(jget .day)" "$TODAY"
check "a spend in rupees" 201 -b "$SA" -X POST "${J[@]}" -d '{"amount":500,"currency":"INR","category":"phone"}' $B/api/expenses
same "in euros" "$(jget .eur)" "5"
check "an unknown category becomes other" 201 -b "$SA" -X POST "${J[@]}" -d '{"amount":3,"category":"nope"}' $B/api/expenses
same "other" "$(jget .category)" "other"
EX3=$(jget .id)
check "no amount" 400 -b "$SA" -X POST "${J[@]}" -d '{"amount":0}' $B/api/expenses
check "a negative amount" 400 -b "$SA" -X POST "${J[@]}" -d '{"amount":-4}' $B/api/expenses
check "a future day becomes today" 201 -b "$SA" -X POST "${J[@]}" -d '{"amount":1,"day":"2999-01-01"}' $B/api/expenses
same "today" "$(jget .day)" "$TODAY"
EX4=$(jget .id)
check "friends can't add" 403 -b "$FR" -X POST "${J[@]}" -d '{"amount":5}' $B/api/expenses
check "friends can't read" 403 -b "$FR" $B/api/expenses
check "change a spend" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"amount":20,"note":"Big shop"}' $B/api/expenses/$EX1
same "recomputed" "$(jget .inr)" "2000"
same "note kept" "$(jget .note)" "Big shop"
check "friends can't change" 403 -b "$FR" -X PATCH "${J[@]}" -d '{"amount":1}' $B/api/expenses/$EX1
check "change a missing one" 404 -b "$SA" -X PATCH "${J[@]}" -d '{"amount":1}' $B/api/expenses/ex_missing
check "delete one" 200 -b "$SA" -X DELETE $B/api/expenses/$EX3
check "delete another" 200 -b "$SA" -X DELETE $B/api/expenses/$EX4

echo "--- Soldi: budget and the month"
check "set a budget" 200 -b "$SA" -X PUT "${J[@]}" -d '{"monthly":500,"caps":{"groceries":15,"bogus":5}}' $B/api/expenses/budget
same "budget saved" "$(jget .monthly)" "500"
expect "unknown caps dropped" '"bogus"' absent
check "a silly budget" 400 -b "$SA" -X PUT "${J[@]}" -d '{"monthly":-3}' $B/api/expenses/budget
check "friends can't budget" 403 -b "$FR" -X PUT "${J[@]}" -d '{"monthly":1}' $B/api/expenses/budget
check "the month" 200 -b "$SA" "$B/api/expenses?month=$MONTH"
same "two spends" "$(jget .expenses.length)" "2"
same "spent" "$(jget .summary.spent)" "25"
same "left" "$(jget .summary.left)" "475"
same "groceries first" "$(jget .summary.byCat[0].id)" "groceries"
same "its cap" "$(jget .summary.byCat[0].cap)" "15"
check "an empty month" 200 -b "$SA" "$B/api/expenses?month=2020-01"
same "nothing then" "$(jget .expenses.length)" "0"
check "the Soldi page" 200 -b "$SA" $B/home/money
expect "shows her spend" "Big shop"
check "the desk shows money left" 200 -b "$SA" $B/home
expect "Soldi card" "475 left this month"
check "friends can't open Soldi" 307 -b "$FR" $B/home/money

echo
echo "passed=$pass failed=$failn"
[ $failn -eq 0 ]
