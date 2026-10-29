#!/bin/bash
# Jelly's emails: call invites to friends, the 14-day nudge to Saani, big wins, a gentle heads-up when she
# is having a hard time (opt-in), the fortnightly update for her friends, and "stop these emails".
# Runs against tests/fake-mail.js (a stand-in for Resend) and tests/fake-google.js.
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
ROOT=${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
SA=$D/jm-sa.jar; FR=$D/jm-fr.jar; EF=$D/jm-ef.jar; rm -f "$SA" "$FR" "$EF"
CS=${CRON_SECRET:-$(sed -n 's/^CRON_SECRET=//p' "$ROOT/.env.local")}
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
mailcount() { cat "$D/mail-count" 2>/dev/null || echo 0; }
tofriend() { node -e "const fs=require('fs');let n=0;for(const f of fs.readdirSync('$D'))if(/^mail-\\d+\\.json$/.test(f)&&fs.readFileSync('$D/'+f,'utf8').includes('\"to\":[\"friend.one@example.com\"]'))n++;console.log(n)"; }
last() { cp "$D/mail-last.json" "$D/body"; }
edit() { node -e "const fs=require('fs'),f='$ROOT/.data/$1.json';const d=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{};($2)(d);fs.writeFileSync(f,JSON.stringify(d))"; }
J=(-H 'Content-Type: application/json')
daily() { curl -s -o "$D/body" -w '%{http_code}' -H "Authorization: Bearer $CS" "$B/api/daily?now=$1"; }

curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1
curl -s -o /dev/null -c "$FR" $B/hello/CHANGE-ME-2
curl -s -o /dev/null -c "$EF" $B/hello/ENV-FRIEND-TEST

echo "--- her switches"
check "signed out can't" 401 $B/api/mail/prefs
check "friends can't" 403 -b "$FR" $B/api/mail/prefs
check "her switches" 200 -b "$SA" $B/api/mail/prefs
same "nudges are on" "$(jget .inactive)" "true"
same "big wins are on" "$(jget .achievements)" "true"
same "the fortnightly update is on" "$(jget .digest)" "true"
same "feeling low is off until she says" "$(jget .low)" "false"
check "friends' mail is for her to switch" 403 -b "$FR" -X PUT "${J[@]}" -d '{"low":true}' $B/api/mail/prefs

echo "--- calls: Jelly emails the friends too"
check "connect Google" 307 -b "$SA" -c "$SA" $B/api/google/connect
LOC=$(grep -i '^location:' "$D/headers" | tr -d '\r' | cut -d' ' -f2)
STATE=$(node -e "console.log(new URL(process.argv[1]).searchParams.get('state'))" "$LOC")
check "back from Google" 307 -b "$SA" "$B/api/google/callback?code=GOOD&state=$STATE"
check "the friends" 200 -b "$SA" $B/api/meetups
F1=$(jget ".friends.find(f=>f.name!=='Env Friend').id")
check "a friend's email" 200 -b "$FR" -X POST "${J[@]}" -d "{\"id\":\"$F1\",\"email\":\"Friend.One@Example.com\"}" $B/api/admin/friends/email
IN2=$(node -e "console.log(new Date(Date.now()+2*86400000).toISOString())")
IN3=$(node -e "console.log(new Date(Date.now()+3*86400000).toISOString())")
before=$(mailcount)
check "schedule a call" 201 -b "$SA" -X POST "${J[@]}" -d "{\"title\":\"Chai & chisme\",\"start\":\"$IN2\",\"minutes\":45,\"friendIds\":[\"$F1\"]}" $B/api/meetups
MT=$(jget .meetup.id)
same "one invite email" "$(( $(mailcount) - before ))" "1"
last
expect "to the friend" '"to":\["friend.one@example.com"\]'
expect "from Jelly" '"from":"Jelly <jelly@saani.space>"'
expect "with the title" "Chai &amp; chisme"
expect "and the Meet link" "meet.google.com/aaa-bbbb"
expect "and a way to stop" "api/mail/unsubscribe"
before=$(mailcount)
check "move it" 200 -b "$SA" -X PATCH "${J[@]}" -d "{\"start\":\"$IN3\"}" $B/api/meetups/$MT
same "a new-time email" "$(( $(mailcount) - before ))" "1"
last
expect "says it moved" "New time for"
before=$(mailcount)
check "cancel it" 200 -b "$SA" -X DELETE $B/api/meetups/$MT
same "a cancelled email" "$(( $(mailcount) - before ))" "1"
last
expect "says it's off" "Cancelled"
expect "no join link on a cancelled call" "meet.google.com" absent

echo "--- stop these emails"
TOKEN=$(node -e "const m=JSON.parse(require('fs').readFileSync('$D/mail-last.json','utf8'));console.log((m.html.match(/unsubscribe\?t=([^\"]+)/)||[])[1]||'')")
[[ -n "$TOKEN" ]] && { pass=$((pass+1)); echo "PASS the email carries a stop link"; } || { failn=$((failn+1)); echo "FAIL no stop link"; }
check "a bad token" 400 "$B/api/mail/unsubscribe?t=nope"
echo "     (kept for later: stopping is tried at the end)"

echo "--- 14 days away"
D1=$(node -e "console.log(new Date(Date.now()+86400000).toISOString().slice(0,10))")
NOW1="${D1}T06:00:00Z"
edit state "d=>{d.presence={id:'presence',createdAt:'x',lastSeen:new Date(Date.parse('$NOW1')-20*86400000).toISOString()}}"
before=$(mailcount)
same "the daily job runs" "$(daily $NOW1)" "200"
expect "and reports Jelly's mail" '"jellyMail":"[a-z:0-9 ]*inactive'
same "Saani gets one email" "$(( $(mailcount) - before ))" "1"
cp "$D/mail-1.json" /dev/null 2>/dev/null
last
expect "to her Google account" '"to":\["saani.test@gmail.com"\]'
expect "it asks her to come back" "come see what"
expect "with a stop link of her own" "api/mail/unsubscribe"
D2=$(node -e "console.log(new Date(Date.now()+2*86400000).toISOString().slice(0,10))")
before=$(mailcount)
same "the next day" "$(daily ${D2}T06:00:00Z)" "200"
same "no second nudge so soon" "$(( $(mailcount) - before ))" "0"

echo "--- something big"
# the first look just notes what she already has; then she unlocks a 100-pearl one
edit jelly "d=>{d.friend=Object.assign({id:'friend',createdAt:'x',pets:0,chats:0,lastSeen:null},d.friend,{v:3,epoch:999999});d.friend.unlocked=Object.assign({}, d.friend.unlocked)}"
before=$(mailcount)
edit jelly "d=>{d.friend.unlocked['spend-150']=new Date().toISOString()}"
D3=$(node -e "console.log(new Date(Date.now()+3*86400000).toISOString().slice(0,10))")
same "daily" "$(daily ${D3}T06:00:00Z)" "200"
expect "reports the wins" 'achievements:1'
same "the friend is told" "$(( $(mailcount) - before ))" "1"
last
expect "to the friend" '"to":\["friend.one@example.com"\]'
expect "it says what she did" "Saani just did something amazing"
before=$(mailcount)
edit jelly "d=>{d.friend.unlocked['pats-50']=new Date().toISOString()}"
D4=$(node -e "console.log(new Date(Date.now()+4*86400000).toISOString().slice(0,10))")
same "daily again" "$(daily ${D4}T06:00:00Z)" "200"
same "a small win isn't mailed" "$(( $(mailcount) - before ))" "0"

echo "--- a hard time (only if she switched it on)"
check "a low mood" 200 -b "$SA" -X POST "${J[@]}" -d '{"mood":"homesick","note":"private words"}' $B/api/mood
sleep 2
same "switched off: no email" "$(( $(mailcount) - before ))" "0"
check "she switches it on" 200 -b "$SA" -X PUT "${J[@]}" -d '{"low":true}' $B/api/mail/prefs
same "on" "$(jget .low)" "true"
edit state "d=>{if(d.mood){d.mood.alerted='2000-01-01'}}"
before=$(mailcount)
check "a low mood again" 200 -b "$SA" -X POST "${J[@]}" -d '{"mood":"stressed","note":"private words"}' $B/api/mood
sleep 3
same "the friend gets a gentle heads-up" "$(( $(mailcount) - before ))" "1"
last
expect "to the friend" '"to":\["friend.one@example.com"\]'
expect "it is gentle" "could use"
expect "her note is never in it" "private words" absent
edit state "d=>{if(d.mood){d.mood.alerted='2000-01-01'}}"
before=$(mailcount)
check "low again the same week" 200 -b "$SA" -X POST "${J[@]}" -d '{"mood":"homesick"}' $B/api/mood
sleep 3
same "at most one a week" "$(( $(mailcount) - before ))" "0"

echo "--- every two weeks"
before=$(tofriend)
D5=$(node -e "console.log(new Date(Date.now()+20*86400000).toISOString().slice(0,10))")
same "two weeks on" "$(daily ${D5}T06:00:00Z)" "200"
expect "reports the update" 'digest:1'
same "the friend gets it" "$(( $(tofriend) - before ))" "1"
last
expect "How Saani's doing" "How Saani"
expect "from Jelly" '"from":"Jelly <jelly@saani.space>"'
expect "a stop link" "api/mail/unsubscribe"
expect "no diary" "[Dd]iary" absent
expect "no money" "Soldi" absent
before=$(tofriend)
D6=$(node -e "console.log(new Date(Date.now()+21*86400000).toISOString().slice(0,10))")
same "the next day" "$(daily ${D6}T06:00:00Z)" "200"
same "not again for a fortnight" "$(( $(tofriend) - before ))" "0"

echo "--- stop"
check "the friend presses stop" 200 "$B/api/mail/unsubscribe?t=$TOKEN"
expect "a kind goodbye" "no more emails"
check "her switches" 200 -b "$SA" $B/api/mail/prefs
same "one friend has stopped" "$(jget .friends.stopped)" "1"
before=$(tofriend)
D7=$(node -e "console.log(new Date(Date.now()+40*86400000).toISOString().slice(0,10))")
same "the next update" "$(daily ${D7}T06:00:00Z)" "200"
same "they get nothing more" "$(( $(tofriend) - before ))" "0"

echo
echo "passed=$pass failed=$failn"
[[ $failn == 0 ]]
