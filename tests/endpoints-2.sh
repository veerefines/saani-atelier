#!/bin/bash
# Part 2 endpoint tests: today, checklist, passport, diary, lookbook, songs, drops, pages, replies,
# admin (friends, occasions, pages, journey, note), the daily job, and privacy rules.
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
ROOT=${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
SA=$D/p2-sa.jar; FR=$D/p2-fr.jar; NF=$D/p2-nf.jar; rm -f "$SA" "$FR" "$NF"
pass=0; failn=0
check() {
  local name=$1 exp=$2; shift 2
  local code
  code=$(curl -s -o "$D/body" -w '%{http_code}' -m 30 "$@")
  if [[ "$code" == "$exp" ]]; then pass=$((pass+1)); printf 'PASS %-52s %s\n' "$name" "$code"
  else failn=$((failn+1)); printf 'FAIL %-52s got %s want %s  %s\n' "$name" "$code" "$exp" "$(head -c 220 "$D/body")"; fi
}
expect() { # expect NAME "grep pattern" [present|absent]
  if grep -q -- "$2" "$D/body"; then found=1; else found=0; fi
  if [[ "$3" == absent ]]; then want=0; else want=1; fi
  if [[ $found == $want ]]; then pass=$((pass+1)); printf 'PASS %-52s\n' "$1"; else failn=$((failn+1)); printf 'FAIL %-52s (pattern %s %s)\n' "$1" "$2" "$3"; fi
}
jget() { node -e "let d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));const v=eval('d'+process.argv[1]);console.log(v===undefined||v===null?'':v)" "$1"; }
J=(-H 'Content-Type: application/json')
CS=${CRON_SECRET:-$(sed -n 's/^CRON_SECRET=//p' "$ROOT/.env.local")}
FUT=$(node -e 'console.log(new Date(Date.now()+3*86400000).toISOString())')
LATER=$(node -e 'console.log(new Date(Date.now()+4*86400000).toISOString())')

curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1
curl -s -o /dev/null -c "$FR" $B/hello/CHANGE-ME-2

echo "--- pages by role"
for p in /home/checklist /home/passport /home/chapter /home/lookbook /home/songs /home/scrapbooks /home/book; do check "saanika $p" 200 -b "$SA" $B$p; done
for p in /wall/songs /wall/scrapbooks /wall/her /admin; do check "admin friend $p" 200 -b "$FR" $B$p; done
check "friend -> /home/lookbook redirected" 307 -b "$FR" $B/home/lookbook
check "saanika -> /admin redirected" 307 -b "$SA" $B/admin
check "anon -> /admin redirected" 307 $B/admin
check "offline page public" 200 $B/offline.html
check "service worker public" 200 $B/sw.js
expect "sw has offline caching" "atelier-v"

echo "--- today card"
check "today anon 401" 401 $B/api/today
check "today friend 403" 403 -b "$FR" $B/api/today
check "today saanika" 200 -b "$SA" $B/api/today
echo "     weather: $(jget '.weather?.now')° $(jget '.weather?.sky?.words') · outfit: $(jget '.outfit' | cut -c1-60)…"

echo "--- checklist"
check "checklist unknown 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"itemId":"nope","done":true}' $B/api/checklist
check "checklist tick" 200 -b "$SA" -X POST "${J[@]}" -d '{"itemId":"sim","done":true}' $B/api/checklist
echo "     sim done at: $(jget '.done.sim' | cut -c1-19)"
check "checklist friend 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"itemId":"sim","done":true}' $B/api/checklist

echo "--- passport"
check "stamp unknown place 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"placeId":"zzz","manual":true}' $B/api/stamps
check "stamp manual" 201 -b "$SA" -X POST "${J[@]}" -d '{"placeId":"bosco","manual":true}' $B/api/stamps
check "stamp here but far away 422" 422 -b "$SA" -X POST "${J[@]}" -d '{"placeId":"luini","lat":45.50,"lng":9.25}' $B/api/stamps
echo "     $(jget .error)"
check "stamp here, at the place" 201 -b "$SA" -X POST "${J[@]}" -d '{"placeId":"luini","lat":45.4659,"lng":9.1915}' $B/api/stamps
echo "     how=$(jget .how)"
check "stamp friend 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"placeId":"luini","manual":true}' $B/api/stamps
check "friend sees stamps on her-life" 200 -b "$FR" $B/wall/her
expect "her-life shows stamped place" "Luini"
check "unstamp" 200 -b "$SA" -X DELETE $B/api/stamps/bosco

echo "--- my chapter (diary)"
check "diary empty 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"text":" "}' $B/api/diary
check "diary bad mood 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"text":"x","mood":"🐙"}' $B/api/diary
check "diary private day" 201 -b "$SA" -X POST "${J[@]}" -d '{"text":"PRIVATE-DAY-LINE","mood":"☀️"}' $B/api/diary
DPRIV=$(jget .id)
check "diary shared day" 201 -b "$SA" -X POST "${J[@]}" -d '{"text":"SHARED-DAY-LINE","mood":"🌷","shared":true}' $B/api/diary
DSH=$(jget .id)
check "diary friend 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"text":"x"}' $B/api/diary
check "friend her-life page" 200 -b "$FR" $B/wall/her
expect "friend sees the shared day" "SHARED-DAY-LINE"
expect "friend never sees the private day" "PRIVATE-DAY-LINE" absent
check "journey has chapter six" 200 -b "$SA" $B/journey
expect "chapter six title" "Milano, in your words"
expect "chapter six includes her private day (her own journey)" "PRIVATE-DAY-LINE"
check "unshare a day" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"shared":false}' $B/api/diary/$DSH
check "friend her-life after unshare" 200 -b "$FR" $B/wall/her
expect "unshared day gone for friends" "SHARED-DAY-LINE" absent
check "delete day" 200 -b "$SA" -X DELETE $B/api/diary/$DPRIV
check "delete day 2" 200 -b "$SA" -X DELETE $B/api/diary/$DSH

echo "--- lookbook + pinterest"
check "lookbook not pinterest 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"link":"https://example.com/pin/1"}' $B/api/lookbook
check "lookbook pinterest pin" 201 -b "$SA" -X POST "${J[@]}" -d '{"link":"https://in.pinterest.com/pin/1125899967789012/","caption":"autumn","tags":"Autumn, #studio"}' $B/api/lookbook
LPIN=$(jget .id); echo "     kind=$(jget .kind) url=$(jget .pinUrl) tags=$(jget '.tags.join(",")')"
check "lookbook pinterest board" 201 -b "$SA" -X POST "${J[@]}" -d '{"link":"https://www.pinterest.com/saanika/milano-looks/","shared":true}' $B/api/lookbook
LBOARD=$(jget .id); echo "     kind=$(jget .kind)"
check "friend react on private item 404" 404 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"🌷"}' $B/api/lookbook/$LPIN/react
check "friend react on shared board" 200 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"🌷"}' $B/api/lookbook/$LBOARD/react
echo "     reactions=$(jget '.reactions.length') by $(jget '.reactions[0].name')"
check "saanika react 403" 403 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"🌷"}' $B/api/lookbook/$LBOARD/react
check "lookbook page shows pinterest embed" 200 -b "$SA" $B/home/lookbook
expect "embed markup present" "embedBoard"
check "delete pin" 200 -b "$SA" -X DELETE $B/api/lookbook/$LPIN
check "delete board" 200 -b "$SA" -X DELETE $B/api/lookbook/$LBOARD

echo "--- songs"
check "song bad link 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"url":"https://example.com/x"}' $B/api/songs
check "song spotify" 201 -b "$FR" -X POST "${J[@]}" -d '{"url":"https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x","note":"our song"}' $B/api/songs
SONG=$(jget .id); echo "     embed=$(jget .embed)"
check "song youtube" 201 -b "$FR" -X POST "${J[@]}" -d '{"url":"https://youtu.be/dQw4w9WgXcQ"}' $B/api/songs
SONG2=$(jget .id); echo "     embed=$(jget .embed)"
check "song saanika 403" 403 -b "$SA" -X POST "${J[@]}" -d '{"url":"https://youtu.be/dQw4w9WgXcQ"}' $B/api/songs
check "her songs page" 200 -b "$SA" $B/home/songs
expect "spotify player" "open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC"
expect "songs are square sleeves" 'song-sleeve'
if grep -q 'referrerPolicy="strict-origin-when-cross-origin"' "$ROOT/src/components/home/SongCard.tsx"; then pass=$((pass+1)); echo "PASS youtube player (opened on tap) sends referrer"; else failn=$((failn+1)); echo "FAIL youtube player referrer"; fi
check "saanika delete song 403" 403 -b "$SA" -X DELETE $B/api/songs/$SONG

echo "--- admin: friends (and a non-admin friend for 403s)"
check "admin friends list" 200 -b "$FR" $B/api/admin/friends
check "add friend empty 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"name":" "}' $B/api/admin/friends
check "add friend" 201 -b "$FR" -X POST "${J[@]}" -d '{"name":"Test Friend"}' $B/api/admin/friends
NFID=$(jget .id); NFLINK=$(jget .link); echo "     id=$NFID link=…/hello/$(basename "$NFLINK" | cut -c1-6)…"
check "new friend's link signs in" 303 -c "$NF" "$NFLINK"
check "new friend desk" 200 -b "$NF" $B/wall
expect "new friend greeted" "Test"
check "non-admin -> /admin redirected" 307 -b "$NF" $B/admin
check "non-admin admin API 403" 403 -b "$NF" $B/api/admin/friends
check "saanika admin API 403" 403 -b "$SA" -X POST "${J[@]}" -d '{"name":"x"}' $B/api/admin/friends
check "removing Saanika refused 400" 400 -b "$FR" -X DELETE $B/api/admin/friends/saanika

echo "--- drops (scheduled surprises) and the daily job"
check "drop in the past 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"kind":"text","text":"x","showAt":"2020-01-01T00:00:00Z"}' $B/api/posts
check "drop too far 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"kind":"text","text":"x","showAt":"2099-01-01T00:00:00Z"}' $B/api/posts
check "drop scheduled" 201 -b "$FR" -X POST "${J[@]}" -d "{\"kind\":\"text\",\"text\":\"DROP-SURPRISE-TEXT\",\"showAt\":\"$FUT\"}" $B/api/posts
DROP=$(jget .id)
check "her wall before the day" 200 -b "$SA" $B/home/love
expect "drop hidden from her" "DROP-SURPRISE-TEXT" absent
check "her book before the day" 200 -b "$SA" $B/home/book
expect "drop hidden from her book" "DROP-SURPRISE-TEXT" absent
check "friend sent box shows it scheduled" 200 -b "$FR" $B/wall/sent
expect "scheduled label" "Arrives"
check "letter unlocking in 3 days" 201 -b "$FR" -X POST "${J[@]}" -d "{\"title\":\"Open on test day\",\"body\":\"x\",\"unlockAt\":\"$FUT\"}" $B/api/letters
LET=$(jget .id)
check "daily no secret 401" 401 $B/api/daily
check "daily run now" 200 -H "Authorization: Bearer $CS" "$B/api/daily"
check "daily run 4 days later" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=$LATER"
echo "     letters=$(jget .letters) drops=$(jget .drops) occasion=$(jget .occasion) reminders=$(jget '.reminders.join(",")')"
[[ "$(jget .letters)" -ge 1 && "$(jget .drops)" -ge 1 ]] && { pass=$((pass+1)); echo "PASS daily found the unlocked letter and the arrived drop"; } || { failn=$((failn+1)); echo "FAIL daily counts"; }
check "daily again same time: nothing twice" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=$LATER"
[[ "$(jget .letters)" == 0 && "$(jget .drops)" == 0 ]] && { pass=$((pass+1)); echo "PASS no double announcements"; } || { failn=$((failn+1)); echo "FAIL announced twice"; }
check "occasion reminder day" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=2026-11-04T06:00:00Z"
echo "     reminders on 4 Nov: $(jget '.reminders.join(",")')"
[[ "$(jget '.reminders.join(",")')" == *Diwali* ]] && { pass=$((pass+1)); echo "PASS Diwali reminder 4 days before"; } || { failn=$((failn+1)); echo "FAIL Diwali reminder"; }
check "occasion day" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=2026-11-08T06:00:00Z"
[[ "$(jget .occasion)" == Diwali ]] && { pass=$((pass+1)); echo "PASS Diwali announced on the day"; } || { failn=$((failn+1)); echo "FAIL Diwali day"; }
check "sunday digest" 200 -H "Authorization: Bearer $CS" "$B/api/daily?now=2026-11-15T06:00:00Z"
echo "     digest count: $(jget .digest)"
check "delete drop" 200 -b "$FR" -X DELETE $B/api/posts/$DROP
check "delete letter" 200 -b "$FR" -X DELETE $B/api/letters/$LET

echo "--- admin: occasions"
check "occasion bad date 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"date":"tomorrow","title":"x"}' $B/api/admin/occasions
check "occasion add" 201 -b "$FR" -X POST "${J[@]}" -d '{"date":"2027-05-01","title":"Test birthday","emoji":"🎂","remindDays":5,"note":"Happy birthday!"}' $B/api/admin/occasions
OCC=$(jget .id)
check "occasion edit" 200 -b "$FR" -X POST "${J[@]}" -d "{\"id\":\"$OCC\",\"date\":\"2027-05-02\",\"title\":\"Test birthday\",\"emoji\":\"🎂\",\"remindDays\":2}" $B/api/admin/occasions
echo "     date=$(jget .date) remind=$(jget .remindDays)"
check "letters page offers the occasion" 200 -b "$FR" $B/wall/letters
expect "occasion chip" "Test birthday"
check "occasion delete" 200 -b "$FR" -X DELETE $B/api/admin/occasions/$OCC

echo "--- admin: scrapbook pages, page pieces, replies"
check "page add" 201 -b "$FR" -X POST "${J[@]}" -d '{"title":"Test page","emoji":"🌸"}' $B/api/admin/pages
PG=$(jget .id)
check "piece for missing page 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"kind":"text","text":"x","pageId":"nope"}' $B/api/posts
check "piece on page (admin friend)" 201 -b "$FR" -X POST "${J[@]}" -d "{\"kind\":\"text\",\"text\":\"PAGE-PIECE-ONE\",\"pageId\":\"$PG\"}" $B/api/posts
PP1=$(jget .id)
check "piece on page (other friend)" 201 -b "$NF" -X POST "${J[@]}" -d "{\"kind\":\"text\",\"text\":\"PAGE-PIECE-TWO\",\"pageId\":\"$PG\"}" $B/api/posts
check "her scrapbook page" 200 -b "$SA" $B/home/scrapbook/$PG
expect "she sees piece one" "PAGE-PIECE-ONE"
expect "she sees piece two" "PAGE-PIECE-TWO"
check "her wall excludes page pieces" 200 -b "$SA" $B/home/love
expect "page piece not on wall" "PAGE-PIECE-ONE" absent
check "friend's page view" 200 -b "$FR" $B/wall/scrapbook/$PG
expect "friend sees own piece" "PAGE-PIECE-ONE"
expect "friend never sees others' pieces" "PAGE-PIECE-TWO" absent
check "saanika replies 🙏" 200 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"🙏"}' $B/api/posts/$PP1/reply
check "saanika replies text" 200 -b "$SA" -X POST "${J[@]}" -d '{"text":"THANK-YOU-REPLY"}' $B/api/posts/$PP1/reply
echo "     replies=$(jget '.replies.length')"
check "reply empty 400" 400 -b "$SA" -X POST "${J[@]}" -d '{}' $B/api/posts/$PP1/reply
check "friend reply 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"🙏"}' $B/api/posts/$PP1/reply
check "reply to hidden drop 404" 404 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"🙏"}' $B/api/posts/nope/reply
check "friend sent box shows her reply" 200 -b "$FR" $B/wall/sent
expect "reply visible to the friend" "THANK-YOU-REPLY"
echo "--- scrapbook collage: arranging pieces"
check "layout anon 401" 401 -X PATCH "${J[@]}" -d '{"layout":{}}' $B/api/pages/$PG/layout
check "layout friend 403" 403 -b "$FR" -X PATCH "${J[@]}" -d "{\"layout\":{\"$PP1\":{\"x\":10,\"y\":10,\"r\":2}}}" $B/api/pages/$PG/layout
check "layout bad body 400" 400 -b "$SA" -X PATCH "${J[@]}" -d '{"layout":"nope"}' $B/api/pages/$PG/layout
check "layout missing page 404" 404 -b "$SA" -X PATCH "${J[@]}" -d '{"layout":{}}' $B/api/pages/nope/layout
check "saanika arranges" 200 -b "$SA" -X PATCH "${J[@]}" -d "{\"layout\":{\"$PP1\":{\"x\":999,\"y\":-5,\"r\":90},\"stranger\":{\"x\":1,\"y\":1,\"r\":0}}}" $B/api/pages/$PG/layout
echo "     saved=$(cat "$D/body" | head -c 200)"
expect "x clamped" '"x":85'
expect "r clamped" '"r":15'
expect "foreign piece dropped" 'stranger' absent
check "collage page after arranging" 200 -b "$SA" $B/home/scrapbook/$PG
expect "collage renders" "sb-canvas"
expect "flip-through button" "Flip through"
check "starter page exists" 200 -b "$SA" $B/home/scrapbooks
expect "starter page seeded" "Welcome to Milano"
check "her desk" 200 -b "$SA" $B/home
expect "desk logo" "handmade with love"
expect "old woven label gone" "h-label" absent
check "friend desk" 200 -b "$FR" $B/wall
expect "friend desk logo" "handmade with love"
check "page delete" 200 -b "$FR" -X DELETE $B/api/admin/pages/$PG

echo "--- admin: journey media + reveal note"
printf '\x89PNG\r\n\x1a\n0123456789abcdef' > "$D/tiny.png"; SZ=$(wc -c < "$D/tiny.png" | tr -d ' ')
check "admin upload reserve" 200 -b "$FR" -X POST "${J[@]}" -d "{\"mime\":\"image/png\",\"size\":$SZ}" $B/api/upload
MID=$(jget .id)
curl -s -o /dev/null -b "$FR" -X PUT -H 'Content-Type: image/png' --data-binary @"$D/tiny.png" $B/api/upload/$MID
check "journey unknown slot 400" 400 -b "$FR" -X POST "${J[@]}" -d "{\"slot\":\"/nope.jpg\",\"mediaId\":\"$MID\"}" $B/api/admin/journey
check "journey wrong kind 400" 400 -b "$FR" -X POST "${J[@]}" -d "{\"slot\":\"/journey/audio/voice-1.mp3\",\"mediaId\":\"$MID\"}" $B/api/admin/journey
check "journey set photo slot" 201 -b "$FR" -X POST "${J[@]}" -d "{\"slot\":\"/journey/photos/childhood-1.jpg\",\"mediaId\":\"$MID\"}" $B/api/admin/journey
check "journey uses uploaded photo" 200 -b "$SA" $B/journey
expect "journey references the upload" "/api/media/$MID"
check "admin can preview journey" 200 -b "$FR" $B/journey
check "journey revert" 200 -b "$FR" -X DELETE "${J[@]}" -d '{"slot":"/journey/photos/childhood-1.jpg"}' $B/api/admin/journey
check "note missing fields 400" 400 -b "$FR" -X PUT "${J[@]}" -d '{"greeting":"Hi"}' $B/api/admin/note
check "note save" 200 -b "$FR" -X PUT "${J[@]}" -d '{"greeting":"Dearest Saani,","lines":"TEST-NOTE-LINE one.\n\nTwo.","signoff":"Love, V"}' $B/api/admin/note
check "note for saanika" 200 -b "$SA" $B/api/note
expect "she gets the new note" "TEST-NOTE-LINE"
check "note for friend 403" 403 -b "$FR" $B/api/note
check "landing page signed out" 200 $B/
expect "note never in the signed-out page" "TEST-NOTE-LINE" absent
check "landing page as saanika (replay)" 200 -b "$SA" "$B/?replay=1"
expect "note in her page" "TEST-NOTE-LINE"


echo "--- admin: keepsake images"
node -e "require('$ROOT/node_modules/sharp')({create:{width:40,height:20,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toFile('$D/ks.png')"
KSZ=$(wc -c < "$D/ks.png" | tr -d ' ')
check "keepsake upload reserve (png)" 200 -b "$FR" -X POST "${J[@]}" -d "{\"mime\":\"image/png\",\"size\":$KSZ}" $B/api/upload
KM=$(jget .id); curl -s -o /dev/null -b "$FR" -X PUT -H 'Content-Type: image/png' --data-binary @"$D/ks.png" $B/api/upload/$KM
check "keepsake unknown name 400" 400 -b "$FR" -X POST "${J[@]}" -d "{\"name\":\"nope\",\"mediaId\":\"$KM\"}" $B/api/admin/keepsakes
check "keepsake by non-admin 403" 403 -b "$NF" -X POST "${J[@]}" -d "{\"name\":\"sunglasses\",\"mediaId\":\"$KM\"}" $B/api/admin/keepsakes
check "keepsake by saanika 403" 403 -b "$SA" -X POST "${J[@]}" -d "{\"name\":\"sunglasses\",\"mediaId\":\"$KM\"}" $B/api/admin/keepsakes
check "keepsake set sunglasses" 201 -b "$FR" -X POST "${J[@]}" -d "{\"name\":\"sunglasses\",\"mediaId\":\"$KM\"}" $B/api/admin/keepsakes
check "her desk shows the keepsake" 200 -b "$SA" $B/home
expect "keepsake image on desk" "/api/media/$KM"
check "keepsake image stays a PNG" 200 -b "$SA" $B/api/media/$KM
cmp -s "$D/body" "$D/ks.png" && { pass=$((pass+1)); echo "PASS keepsake bytes unchanged (transparency kept)"; } || { failn=$((failn+1)); echo "FAIL keepsake bytes changed"; }
check "keepsake remove" 200 -b "$FR" -X DELETE "${J[@]}" -d '{"name":"sunglasses"}' $B/api/admin/keepsakes
check "her desk after removal" 200 -b "$SA" $B/home
expect "keepsake gone" "/api/media/$KM" absent
check "admin page has start buttons" 200 -b "$FR" $B/admin
expect "upload button up front" "Upload keepsake PNGs"

echo "--- good time to call (time zones)"
check "zone anon 401" 401 -X POST "${J[@]}" -d '{"tz":"Europe/Rome"}' $B/api/zone
check "zone bad tz 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"tz":"Mars/Olympus"}' $B/api/zone
check "zone missing tz 400" 400 -b "$SA" -X POST "${J[@]}" -d '{}' $B/api/zone
check "saanika in Milano" 200 -b "$SA" -X POST "${J[@]}" -d '{"tz":"Europe/Rome"}' $B/api/zone
expect "she sees Vee" '"name":"Vee"'
names=$(jget '.others.map(o=>o.name).join(",")'); if [[ ",$names," != *",Saanika,"* ]]; then pass=$((pass+1)); echo "PASS she isn't in her own call list"; else failn=$((failn+1)); echo "FAIL she is in her own call list ($names)"; fi
check "friend from India" 200 -b "$FR" -X POST "${J[@]}" -d '{"tz":"Asia/Kolkata"}' $B/api/zone
expect "friend sees only Saanika" '"others":\[{"name":"Saanika","tz":"Europe/Rome"'
names=$(jget '.others.map(o=>o.name).join(",")'); if [[ "$names" == "Saanika" ]]; then pass=$((pass+1)); echo "PASS friend's call list is only Saanika"; else failn=$((failn+1)); echo "FAIL friend's call list: $names"; fi
check "saanika again" 200 -b "$SA" -X POST "${J[@]}" -d '{"tz":"Europe/Rome"}' $B/api/zone
expect "Vee's own zone wins over the guess" '"name":"Vee","tz":"Asia/Kolkata","city":"India","known":true'
check "friend back to LA" 200 -b "$FR" -X POST "${J[@]}" -d '{"tz":"America/Los_Angeles"}' $B/api/zone
check "saanika sees Vee in LA" 200 -b "$SA" -X POST "${J[@]}" -d '{"tz":"Europe/Rome"}' $B/api/zone
expect "Vee now in LA" '"name":"Vee","tz":"America/Los_Angeles","city":"LA","known":true'
check "friend desk" 200 -b "$FR" $B/wall
expect "friend desk shows LA clock" "Los Angeles"
check "milano corner" 200 -b "$SA" $B/home/milano
expect "milano corner LA clock" "Los Angeles"
check "journey" 200 -b "$SA" $B/journey
expect "ticket has her date" "27 Oct 2026"
check "admin page" 200 -b "$FR" $B/admin
expect "no ad-blocker class names" 'class="ad-' absent

echo "--- notifications for friends + revoking"
check "friend can get push key" 200 -b "$FR" $B/api/push
check "friend subscribes" 201 -b "$FR" -X POST "${J[@]}" -d '{"subscription":{"endpoint":"https://push.example.test/friend","keys":{"p256dh":"x","auth":"y"}}}' $B/api/push
check "friend unsubscribes" 200 -b "$FR" -X DELETE "${J[@]}" -d '{"endpoint":"https://push.example.test/friend"}' $B/api/push
check "delete song" 200 -b "$FR" -X DELETE $B/api/songs/$SONG
check "delete song 2" 200 -b "$FR" -X DELETE $B/api/songs/$SONG2
check "revoke the test friend" 200 -b "$FR" -X DELETE $B/api/admin/friends/$NFID
check "revoked friend signed out" 307 -b "$NF" $B/wall

echo; echo "passed=$pass failed=$failn"
[ "$failn" -eq 0 ]
