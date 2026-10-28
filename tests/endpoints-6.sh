#!/bin/bash
# Part 6: the Milano guide's data, the calendar (+ .ics and Google links), week-ahead nudges,
# and meetups on Google Meet (against tests/fake-google.js).
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
ROOT=${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
SA=$D/p6-sa.jar; FR=$D/p6-fr.jar; EF=$D/p6-ef.jar; rm -f "$SA" "$FR" "$EF"
pass=0; failn=0
check() {
  local name=$1 exp=$2; shift 2
  local code
  code=$(curl -s -o "$D/body" -D "$D/headers" -w '%{http_code}' -m 30 "$@")
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
CS=${CRON_SECRET:?}

curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1
curl -s -o /dev/null -c "$FR" $B/hello/CHANGE-ME-2
curl -s -o /dev/null -c "$EF" $B/hello/ENV-FRIEND-TEST

echo "--- the guide's data"
if (cd "$ROOT" && node scripts/check-content.mjs > "$D/body" 2>&1); then pass=$((pass+1)); echo "PASS content check"; else failn=$((failn+1)); echo "FAIL content check: $(cat "$D/body")"; fi
check "the Milano page" 200 -b "$SA" "$B/home/milano?event=artigiano"
expect "events with details" "Artigiano in Fiera"
expect "new things are marked" "✨ New"

echo "--- calendar"
check "December" 200 -b "$SA" "$B/api/calendar/items?month=2026-12"
expect "a market" '"id":"h:artigiano:2026-12-05"'
expect "a festival" '"kind":"festival"'
expect "Christmas from admin" '"title":"Christmas"'
expect "tentative dates say so" '"tentative":true'
check "friends can't see her calendar" 403 -b "$FR" "$B/api/calendar/items?month=2026-12"
check "the calendar page" 200 -b "$SA" $B/home/calendar
expect "a planner" "Calendario"
check "an all-day event as .ics" 200 -b "$SA" "$B/api/calendar/ics?item=h:artigiano:2026-12-05"
expect "a calendar file" "BEGIN:VCALENDAR"
expect "starts on the 5th" "DTSTART;VALUE=DATE:20261205"
expect "ends after the 13th" "DTEND;VALUE=DATE:20261214"
grep -qi "content-type: text/calendar" "$D/headers" && { pass=$((pass+1)); echo "PASS served as text/calendar"; } || { failn=$((failn+1)); echo "FAIL not text/calendar"; }
check "a timed event as .ics" 200 -b "$SA" "$B/api/calendar/ics?item=h:prima-scala:2026-12-07"
expect "at 6 PM Milano time" "DTSTART;TZID=Europe/Rome:20261207T180000"
check "the whole month" 200 -b "$SA" "$B/api/calendar/ics?month=2026-12"
same "lots of events" "$(grep -c 'BEGIN:VEVENT' "$D/body" | awk '{print ($1>4)?"many":"few"}')" "many"
check "an unknown item" 404 -b "$SA" "$B/api/calendar/ics?item=h:nope:2026-01-01"
check "nothing asked" 400 -b "$SA" "$B/api/calendar/ics"
check "friends can't download it" 403 -b "$FR" "$B/api/calendar/ics?month=2026-12"

echo "--- week-ahead and monthly nudges (test clock)"
check "a week before Artigiano" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=2026-11-28T06:00:00Z"
expect "nudged a week ahead" '"w:artigiano:2026-12-05"'
check "the 1st of December" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=2026-12-01T06:00:00Z"
same "the month's list" "$(jget '.month>0')" "true"
check "the day before" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=2026-12-04T06:00:00Z"
expect "nudged the day before" '"d:artigiano:2026-12-05"'
check "the same day again" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=2026-12-04T07:00:00Z"
expect "nothing twice" '"d:artigiano' absent

echo "--- meetups on Google Meet"
check "meetups page" 200 -b "$SA" $B/home/meetups
check "not connected yet" 200 -b "$SA" $B/api/meetups
same "google ready" "$(jget .google.ready)" "true"
same "not linked" "$(jget .google.linked)" "false"
F1=$(jget ".friends.find(f=>f.name!=='Env Friend').id")
F2=$(jget ".friends.find(f=>f.name==='Env Friend').id")
IN2=$(node -e "console.log(new Date(Date.now()+2*86400000).toISOString())")
check "can't schedule before connecting" 409 -b "$SA" -X POST "${J[@]}" -d "{\"title\":\"Chai\",\"start\":\"$IN2\",\"minutes\":45,\"friendIds\":[\"$F1\"]}" $B/api/meetups
check "connect: off to Google" 307 -b "$SA" -c "$SA" $B/api/google/connect
LOC=$(grep -i '^location:' "$D/headers" | tr -d '\r' | cut -d' ' -f2)
same "to Google's consent page" "$(echo "$LOC" | grep -c 'localhost:4612/auth')" "1"
same "with the calendar scope" "$(echo "$LOC" | grep -c 'calendar.events')" "1"
STATE=$(node -e "console.log(new URL(process.argv[1]).searchParams.get('state'))" "$LOC")
check "a wrong state is refused" 307 -b "$SA" "$B/api/google/callback?code=GOOD&state=nope"
same "back with an error" "$(grep -i '^location:' "$D/headers" | grep -c 'google=error')" "1"
check "friends can't connect hers" 403 -b "$FR" $B/api/google/connect
check "back from Google" 307 -b "$SA" "$B/api/google/callback?code=GOOD&state=$STATE"
same "connected" "$(grep -i '^location:' "$D/headers" | grep -c 'google=linked')" "1"
check "now linked" 200 -b "$SA" $B/api/meetups
same "linked" "$(jget .google.linked)" "true"
check "a friend's email (admin)" 200 -b "$FR" -X POST "${J[@]}" -d "{\"id\":\"$F1\",\"email\":\"Friend.One@Example.com\"}" $B/api/admin/friends/email
same "kept lower-case" "$(jget .email)" "friend.one@example.com"
check "a bad email" 400 -b "$FR" -X POST "${J[@]}" -d "{\"id\":\"$F1\",\"email\":\"nope\"}" $B/api/admin/friends/email
check "only admins set emails" 403 -b "$EF" -X POST "${J[@]}" -d "{\"id\":\"$F1\",\"email\":\"a@b.co\"}" $B/api/admin/friends/email
check "schedule a call" 201 -b "$SA" -X POST "${J[@]}" -d "{\"title\":\"Chai & chisme\",\"start\":\"$IN2\",\"minutes\":45,\"friendIds\":[\"$F1\",\"$F2\"]}" $B/api/meetups
MT=$(jget .meetup.id)
expect "a real Meet link" "meet.google.com/aaa-bbbb"
expect "says who has no email" '"noEmail":\["Env Friend"\]'
cp "$D/google-event.json" "$D/body"
expect "Google invites the friend" "friend.one@example.com"
expect "with a Meet link asked for" "hangoutsMeet"
check "no friends" 400 -b "$SA" -X POST "${J[@]}" -d "{\"title\":\"x\",\"start\":\"$IN2\",\"minutes\":45,\"friendIds\":[]}" $B/api/meetups
check "in the past" 400 -b "$SA" -X POST "${J[@]}" -d "{\"title\":\"x\",\"start\":\"2020-01-01T10:00:00Z\",\"minutes\":45,\"friendIds\":[\"$F1\"]}" $B/api/meetups
check "too long" 400 -b "$SA" -X POST "${J[@]}" -d "{\"title\":\"x\",\"start\":\"$IN2\",\"minutes\":600,\"friendIds\":[\"$F1\"]}" $B/api/meetups
check "friends can't schedule hers" 403 -b "$FR" -X POST "${J[@]}" -d "{\"title\":\"x\",\"start\":\"$IN2\",\"minutes\":45,\"friendIds\":[\"$F1\"]}" $B/api/meetups
check "the friend sees it" 200 -b "$FR" $B/api/meetups
expect "their call" "Chai & chisme"
expect "with the join link" "meet.google.com"
check "they're in" 200 -b "$FR" -X POST "${J[@]}" -d '{"rsvp":"yes"}' $B/api/meetups/$MT/rsvp
check "a silly answer" 400 -b "$FR" -X POST "${J[@]}" -d '{"rsvp":"sure"}' $B/api/meetups/$MT/rsvp
check "Saani can't rsvp to her own" 403 -b "$SA" -X POST "${J[@]}" -d '{"rsvp":"yes"}' $B/api/meetups/$MT/rsvp
check "Saani sees who's coming" 200 -b "$SA" $B/api/meetups
same "yes" "$(jget ".meetups[0].friends.find(f=>f.id==='$F1').rsvp")" "yes"
check "the friend's desk" 200 -b "$FR" $B/wall
check "on her calendar" 200 -b "$SA" "$B/api/calendar/items?month=${IN2:0:7}"
expect "the meetup" "\"id\":\"m:$MT\""
IN3=$(node -e "console.log(new Date(Date.now()+3*86400000).toISOString())")
check "move it" 200 -b "$SA" -X PATCH "${J[@]}" -d "{\"start\":\"$IN3\"}" $B/api/meetups/$MT
same "answers start over" "$(jget '.rsvp.'$F1)" ""
SOON=$(node -e "console.log(new Date(Date.now()+10*60000).toISOString())")
check "a call in 10 minutes" 201 -b "$SA" -X POST "${J[@]}" -d "{\"title\":\"Quick hi\",\"start\":\"$SOON\",\"minutes\":30,\"friendIds\":[\"$F1\"]}" $B/api/meetups
check "tick: starting soon" 200 -H "Authorization: Bearer $CS" $B/api/tick
same "one nudge" "$(jget .meetups)" "1"
check "tick again" 200 -H "Authorization: Bearer $CS" $B/api/tick
same "not twice" "$(jget .meetups)" "0"
check "cancel the first" 200 -b "$SA" -X DELETE $B/api/meetups/$MT
cp "$D/google-last.json" "$D/body"
expect "cancelled in Google too" '"method":"DELETE"'
check "the friend's list" 200 -b "$FR" $B/api/meetups
expect "it's gone" "Chai & chisme" absent
check "disconnect Google" 200 -b "$SA" -X POST $B/api/google/disconnect
check "and it's off" 200 -b "$SA" $B/api/meetups
same "not linked" "$(jget .google.linked)" "false"

echo
echo "passed=$pass failed=$failn"
[ $failn -eq 0 ]
