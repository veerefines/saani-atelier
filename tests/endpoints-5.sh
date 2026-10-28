#!/bin/bash
# Part 5: Soldi (spends, budget, the ₹ rate), and her daily rhythm and a deeper Jelly.
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
ROOT=${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
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

echo "--- daily quests"
check "Jelly says hello (picks today's quests)" 200 -b "$SA" $B/api/corner/jelly
expect "season field" '"season"'
check "the morning brief" 200 -b "$SA" "$B/api/brief?tz=Europe/Rome"
same "three quests" "$(jget .quests.length)" "3"
same "one of each tier" "$(jget ".quests.map(q=>q.tier).join(',')")" "1,2,3"
expect "a fact" '"fact"'
expect "what Jelly says" '"say"'
Q1=$(jget ".quests[0].id")
case "$Q1" in
  pat10) check "do the easy quest: 10 pats" 200 -b "$SA" -X POST "${J[@]}" -d '{"n":10}' $B/api/corner/jelly/pet ;;
  phrase|mood|brief|fact) check "do the easy quest: $Q1" 200 -b "$SA" -X POST "${J[@]}" -d "{\"name\":\"$Q1\"}" $B/api/jelly/event ;;
  *) echo "(easy quest is $Q1, which needs the assistant: skipped)" ;;
esac
if [[ "$Q1" != chat1 ]]; then
  check "check in" 200 -b "$SA" -X POST $B/api/jelly/check
  expect "quest gain" '"kind":"quest"'
  same "5 pearls for it" "$(jget ".gains.find(g=>g.kind==='quest').pearls")" "5"
  same "and the first-quest achievement" "$(jget ".gains.some(g=>g.id==='quest-1')")" "true"
  check "the brief again" 200 -b "$SA" "$B/api/brief?tz=Europe/Rome"
  same "easy quest done" "$(jget .quests[0].done)" "true"
  check "check in again" 200 -b "$SA" -X POST $B/api/jelly/check
  expect "never paid twice" '"kind":"quest"' absent
fi
check "friends can't see the brief" 403 -b "$FR" $B/api/brief
check "brief read aloud (no AI here: backup voice)" 200 -b "$SA" "$B/api/jelly/speak?brief=$TODAY"
expect "backup" '"fallback":true'
check "no brief for another day" 404 -b "$SA" "$B/api/jelly/speak?brief=2020-01-01"

echo "--- events"
check "heard the brief" 200 -b "$SA" -X POST "${J[@]}" -d '{"name":"brief"}' $B/api/jelly/event
check "and again" 200 -b "$SA" -X POST "${J[@]}" -d '{"name":"brief"}' $B/api/jelly/event
check "a third time" 200 -b "$SA" -X POST "${J[@]}" -d '{"name":"brief"}' $B/api/jelly/event
same "capped for the day" "$(jget .counted)" "false"
check "an unknown event" 400 -b "$SA" -X POST "${J[@]}" -d '{"name":"nope"}' $B/api/jelly/event
check "game scores can't be sent as events" 400 -b "$SA" -X POST "${J[@]}" -d '{"name":"catch20"}' $B/api/jelly/event
check "friends can't send events" 403 -b "$FR" -X POST "${J[@]}" -d '{"name":"phrase"}' $B/api/jelly/event

echo "--- games"
check "an impossible score" 200 -b "$SA" -X POST "${J[@]}" -d '{"game":"catch","score":9999,"ms":10000}' $B/api/jelly/game
same "capped to what's possible" "$(jget .score)" "30"
same "pearls for it" "$(jget .pearls)" "7"
expect "game achievement" '"id":"game-1"'
check "a real game" 200 -b "$SA" -X POST "${J[@]}" -d '{"game":"catch","score":60,"ms":45000}' $B/api/jelly/game
same "only 8 more pearls today" "$(jget .pearls)" "8"
same "a new best" "$(jget .best)" "true"
same "best kept" "$(jget .home.games.best.catch)" "60"
check "games pearls are used up" 200 -b "$SA" -X POST "${J[@]}" -d '{"game":"pop","score":50,"ms":40000}' $B/api/jelly/game
same "no pearls" "$(jget .pearls)" "0"
same "three played" "$(jget .home.games.played)" "3"
check "an unknown game" 400 -b "$SA" -X POST "${J[@]}" -d '{"game":"chess","score":1,"ms":1}' $B/api/jelly/game
check "a negative score" 400 -b "$SA" -X POST "${J[@]}" -d '{"game":"pop","score":-1,"ms":1000}' $B/api/jelly/game
check "friends can't play for her" 403 -b "$FR" -X POST "${J[@]}" -d '{"game":"pop","score":1,"ms":1000}' $B/api/jelly/game

echo "--- reminders"
TOMORROW=$(node -e "const d=new Date(Date.now()+86400000);console.log(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(d))")
check "set one" 201 -b "$SA" -X POST "${J[@]}" -d "{\"text\":\"Call home\",\"day\":\"$TOMORROW\",\"time\":\"19:00\",\"tz\":\"Europe/Rome\",\"repeat\":\"none\"}" $B/api/reminders
R1=$(jget .reminder.id)
AT1=$(jget .reminder.at)
expect "reminder achievement" '"id":"remind-1"'
check "a daily one, in Mumbai time" 201 -b "$SA" -X POST "${J[@]}" -d "{\"text\":\"Drink water\",\"day\":\"$TOMORROW\",\"time\":\"08:30\",\"tz\":\"Asia/Kolkata\",\"repeat\":\"daily\"}" $B/api/reminders
R2=$(jget .reminder.id)
same "08:30 in Mumbai is 03:00 UTC" "$(jget .reminder.at | cut -c12-16)" "03:00"
AT2=$(jget .reminder.at)
check "one in the past" 400 -b "$SA" -X POST "${J[@]}" -d '{"text":"Too late","day":"2020-01-01","time":"10:00"}' $B/api/reminders
check "no text" 400 -b "$SA" -X POST "${J[@]}" -d "{\"text\":\" \",\"day\":\"$TOMORROW\",\"time\":\"10:00\"}" $B/api/reminders
check "a bad time" 400 -b "$SA" -X POST "${J[@]}" -d "{\"text\":\"x\",\"day\":\"$TOMORROW\",\"time\":\"25:00\"}" $B/api/reminders
check "friends can't set hers" 403 -b "$FR" -X POST "${J[@]}" -d "{\"text\":\"x\",\"day\":\"$TOMORROW\",\"time\":\"10:00\"}" $B/api/reminders
check "her reminders" 200 -b "$SA" $B/api/reminders
same "two to come" "$(jget .open.length)" "2"
check "said on screen too early: nothing changes" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"fired":true}' $B/api/reminders/$R1
same "still due" "$(jget .at)" "$AT1"
check "tick without the secret" 401 $B/api/tick
check "tick with a wrong secret" 401 -H "Authorization: Bearer nope" $B/api/tick
check "tick before they're due" 200 -H "Authorization: Bearer $CRON_SECRET" $B/api/tick
same "nothing due" "$(jget .due)" "0"
LATER=$(node -e "console.log(new Date(Date.parse('$AT1')+60000).toISOString())")
check "tick after both are due" 200 -H "Authorization: Bearer $CRON_SECRET" "$B/api/tick?now=$LATER"
same "both due" "$(jget .due)" "2"
check "her reminders now" 200 -b "$SA" $B/api/reminders
same "the daily one rolls on" "$(jget .open.length)" "1"
NEXT=$(node -e "console.log(new Date(Date.parse('$AT2')+86400000).toISOString())")
same "to the next morning" "$(jget .open[0].at)" "$NEXT"
same "the one-off is done" "$(jget .done[0].id)" "$R1"
check "tick again: nothing twice" 200 -H "Authorization: Bearer $CRON_SECRET" "$B/api/tick?now=$LATER"
same "nothing due" "$(jget .due)" "0"
check "delete one" 200 -b "$SA" -X DELETE $B/api/reminders/$R2
check "a missing one" 404 -b "$SA" -X PATCH "${J[@]}" -d '{"fired":true}' $B/api/reminders/rm_missing

echo "--- Jelly remembers"
check "tell her something" 201 -b "$SA" -X POST "${J[@]}" -d '{"text":"My favourite gelato is pistachio"}' $B/api/jelly/memory
M1=$(jget .id)
check "nothing private" 400 -b "$SA" -X POST "${J[@]}" -d '{"text":"My password is hunter2"}' $B/api/jelly/memory
check "too short" 400 -b "$SA" -X POST "${J[@]}" -d '{"text":"hi"}' $B/api/jelly/memory
check "a newer version replaces the old" 201 -b "$SA" -X POST "${J[@]}" -d '{"text":"My favourite gelato is pistachio, with fig"}' $B/api/jelly/memory
M2=$(jget .id)
check "what she remembers" 200 -b "$SA" $B/api/jelly/memory
same "just one" "$(jget .facts.length)" "1"
expect "the newer one" "with fig"
check "change it" 200 -b "$SA" -X PATCH "${J[@]}" -d "{\"id\":\"$M2\",\"text\":\"Gelato: pistachio forever\"}" $B/api/jelly/memory
check "change a missing one" 400 -b "$SA" -X PATCH "${J[@]}" -d '{"id":"mf_x","text":"whatever it is"}' $B/api/jelly/memory
check "friends can't read it" 403 -b "$FR" $B/api/jelly/memory
check "forget it" 200 -b "$SA" -X DELETE "${J[@]}" -d "{\"id\":\"$M2\"}" $B/api/jelly/memory
check "gone" 200 -b "$SA" $B/api/jelly/memory
same "nothing left" "$(jget .facts.length)" "0"

echo "--- seasons"
SEASONS=$(cd "$ROOT" && node --experimental-strip-types --no-warnings -e "
import('./src/lib/jelly-seasons.ts').then(({ seasonOn, occasionSeasons }) => {
  const k = (d, x) => seasonOn(d, x)?.key ?? 'none';
  const grad = occasionSeasons([{ date: '2027-07-01', title: 'Saani’s graduation' }, { date: '2027-08-17', title: 'Saanika’s Birthday' }]);
  console.log([k('2026-10-27'), k('2026-11-08'), k('2026-11-20'), k('2026-12-25'), k('2027-01-01'), k('2027-01-20'), k('2027-02-05'), k('2027-02-14'), k('2027-03-22'), k('2027-03-28'), k('2027-04-07'), k('2027-07-01', grad), k('2027-08-01'), k('2026-10-29'), k('2027-01-14'), k('2027-01-16'), k('2027-03-06'), k('2027-03-10'), k('2027-08-17'), k('2027-08-17', grad), k('2027-08-24'), k('2027-09-05'), k('2027-09-12'), k('2027-10-02'), k('2027-10-09'), k('2027-10-18')].join(','));
});" 2>&1)
same "the right festival each day" "$SEASONS" "halloween,diwali,study,natale,capodanno,inverno,carnevale,valentino,holi,pasqua,gudi,graduation,none,karvachauth,sankranti,pongal,shivratri,eid,rakhi,birthday,janmashtami,ganesh,onam,navratri,dussehra,karvachauth"
for k in halloween natale diwali holi capodanno gudi pasqua valentino carnevale graduation study inverno sankranti pongal shivratri eid rakhi janmashtami ganesh onam navratri dussehra karvachauth birthday; do
  check "Jelly's $k outfit" 200 "$B/corner/jelly/festive/$k.webp"
done
NOWK=$(cd "$ROOT" && node --experimental-strip-types --no-warnings -e "import('./src/lib/jelly-seasons.ts').then(({ seasonOn }) => console.log(seasonOn(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date()))?.key ?? 'none'))")
OFF=santa-hat; [[ "$NOWK" == natale ]] && OFF=trishul
check "a festival's things wait for their festival" 400 -b "$SA" -X POST "${J[@]}" -d "{\"id\":\"$OFF\"}" $B/api/jelly/shop
expect "says when" "only in the shop for"
check "an every-day new thing is in the shop" 200 "$B/corner/home/items/cappuccino.webp"
check "Jelly's Corner with the new tabs" 200 -b "$SA" "$B/home/jelly?tab=games"
expect "games tab" "Pearl Catch"

echo
echo "passed=$pass failed=$failn"
[ $failn -eq 0 ]
