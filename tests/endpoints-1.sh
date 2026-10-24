#!/bin/bash
# Endpoint smoke test for Saani Atelier
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
ROOT=${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
SA=$D/sa.jar; FR=$D/fr.jar; rm -f "$SA" "$FR"
pass=0; failn=0
# check NAME EXPECTED_CODE curl-args...
check() {
  local name=$1 exp=$2; shift 2
  local out code
  out=$(curl -s -o "$D/body" -w '%{http_code}' "$@")
  code=$out
  if [[ "$code" == "$exp" ]]; then pass=$((pass+1)); printf 'PASS %-48s %s\n' "$name" "$code"
  else failn=$((failn+1)); printf 'FAIL %-48s got %s want %s  %s\n' "$name" "$code" "$exp" "$(head -c 200 "$D/body")"; fi
}
body() { cat "$D/body"; }
jget() { node -e "let d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));console.log(eval('d'+process.argv[1])??'')" "$1"; }
J=(-H 'Content-Type: application/json')

echo "--- public"
check "GET /" 200 $B/
check "GET /robots.txt" 200 $B/robots.txt
check "GET /icons/favicon.ico" 200 $B/icons/favicon.ico
check "GET /manifest.webmanifest" 200 $B/manifest.webmanifest
check "GET /reveal/bow.webp (static)" 200 $B/reveal/bow.webp
check "GET /nope -> 404" 404 $B/nope

echo "--- protected pages without session redirect"
for p in /journey /wall /home /home/love /home/letters /home/jar /home/bingo /home/milano; do
  check "GET $p (anon) -> 307" 307 $B$p
done

echo "--- APIs without session -> 401"
check "POST /api/posts anon" 401 -X POST "${J[@]}" -d '{"kind":"text","text":"x"}' $B/api/posts
check "POST /api/upload anon" 401 -X POST "${J[@]}" -d '{}' $B/api/upload
check "GET /api/media/x anon" 401 $B/api/media/x

echo "--- login"
check "POST /api/login bad code" 401 -X POST "${J[@]}" -d '{"code":"WRONG"}' $B/api/login
check "POST /api/login empty body" 401 -X POST $B/api/login
check "GET /hello/BAD -> 303" 303 $B/hello/BAD
check "POST /api/login friend" 200 -c "$FR" -X POST "${J[@]}" -d '{"code":"change-me 2"}' $B/api/login
check "GET /hello/CHANGE-ME-1 -> 303" 303 -c "$SA" $B/hello/CHANGE-ME-1

echo "--- pages with session"
for p in /journey /home /home/love /home/letters /home/jar /home/bingo /home/milano; do
  check "GET $p (saanika)" 200 -b "$SA" $B$p
done
check "GET /wall (saanika) -> /home" 307 -b "$SA" $B/wall
check "GET /wall (friend)" 200 -b "$FR" $B/wall
check "GET / (saanika, reveal)" 200 -b "$SA" "$B/?replay=1"

echo "--- role checks (friend hitting saanika-only)"
check "POST /api/bingo friend -> 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"squareId":"como","done":true}' $B/api/bingo
check "POST /api/wishes friend -> 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"text":"x"}' $B/api/wishes
check "POST /api/seen friend -> 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"area":"love"}' $B/api/seen
check "POST /api/jar/draw friend -> 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"mood":"happy"}' $B/api/jar/draw

echo "--- posts"
check "POST /api/posts text" 201 -b "$FR" -X POST "${J[@]}" -d '{"kind":"text","text":"Hello from test"}' $B/api/posts
POST_ID=$(jget .id)
check "POST /api/posts empty text -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"kind":"text","text":"  "}' $B/api/posts
check "POST /api/posts bad kind -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"kind":"gif"}' $B/api/posts
check "POST /api/posts photo w/o media -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"kind":"photo","mediaId":"nope"}' $B/api/posts
check "POST react saanika" 200 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"🌷"}' $B/api/posts/$POST_ID/react
check "POST react toggle off" 200 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"🌷"}' $B/api/posts/$POST_ID/react
check "POST react bad emoji -> 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"x"}' $B/api/posts/$POST_ID/react
check "POST react missing post -> 404" 404 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"🌷"}' $B/api/posts/nope/react
check "DELETE post by saanika (moderation)" 200 -b "$SA" -X DELETE $B/api/posts/$POST_ID
check "DELETE already-deleted post -> 403" 403 -b "$FR" -X DELETE $B/api/posts/$POST_ID

echo "--- upload + media"
printf '\x89PNG\r\n\x1a\n0123456789abcdef' > "$D/tiny.png"; SZ=$(wc -c < "$D/tiny.png" | tr -d ' ')
check "POST /api/upload bad mime -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"mime":"text/html","size":10}' $B/api/upload
check "POST /api/upload too big -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"mime":"image/png","size":999999999}' $B/api/upload
check "POST /api/upload reserve" 200 -b "$FR" -X POST "${J[@]}" -d "{\"mime\":\"image/png\",\"size\":$SZ}" $B/api/upload
MID=$(jget .id)
check "GET media before upload -> 404" 404 -b "$FR" $B/api/media/$MID
check "PUT upload by other user -> 404" 404 -b "$SA" -X PUT --data-binary @"$D/tiny.png" $B/api/upload/$MID
check "PUT /api/upload/:id body" 200 -b "$FR" -X PUT -H 'Content-Type: image/png' --data-binary @"$D/tiny.png" $B/api/upload/$MID
check "GET /api/media/:id" 200 -b "$SA" $B/api/media/$MID
cmp -s "$D/body" "$D/tiny.png" && echo "     media bytes match" || { echo "FAIL media bytes differ"; failn=$((failn+1)); }
check "GET /api/media/:id Range" 206 -b "$SA" -H 'Range: bytes=0-3' $B/api/media/$MID
check "GET /api/media/:id bad Range -> 416" 416 -b "$SA" -H 'Range: bytes=9999-' $B/api/media/$MID
check "POST /api/upload/:id confirm" 200 -b "$FR" -X POST $B/api/upload/$MID
check "POST /api/posts photo" 201 -b "$FR" -X POST "${J[@]}" -d "{\"kind\":\"photo\",\"text\":\"pic\",\"mediaId\":\"$MID\"}" $B/api/posts
PHOTO_ID=$(jget .id)
check "GET /home/love shows posts" 200 -b "$SA" $B/home/love
check "DELETE photo post" 200 -b "$FR" -X DELETE $B/api/posts/$PHOTO_ID
check "GET media after post deleted" 404 -b "$SA" $B/api/media/$MID

echo "--- letters"
check "POST /api/letters missing body -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"title":"t"}' $B/api/letters
check "POST /api/letters bad date -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"title":"t","body":"b","unlockAt":"notadate"}' $B/api/letters
check "POST /api/letters locked" 201 -b "$FR" -X POST "${J[@]}" -d '{"title":"Later","body":"SECRET-FUTURE-WORDS","unlockAt":"2099-01-01"}' $B/api/letters
LOCKED=$(jget .id)
check "POST /api/letters open now" 201 -b "$FR" -X POST "${J[@]}" -d '{"title":"Now","body":"hi"}' $B/api/letters
LID=$(jget .id)
check "POST open letter (saanika)" 200 -b "$SA" -X POST $B/api/letters/$LID
check "POST open locked letter" 200 -b "$SA" -X POST $B/api/letters/$LOCKED
[[ -z "$(jget .body)" && -z "$(jget .openedAt)" ]] && echo "     locked letter: body hidden, not marked opened" || { echo "FAIL locked letter leaked/opened"; failn=$((failn+1)); }
check "GET /home/letters" 200 -b "$SA" $B/home/letters
grep -q SECRET-FUTURE-WORDS "$D/body" && { echo "FAIL locked body in page HTML"; failn=$((failn+1)); } || echo "     locked body absent from page HTML"
check "POST open missing letter -> 404" 404 -b "$SA" -X POST $B/api/letters/nope
check "POST open letter friend -> 403" 403 -b "$FR" -X POST $B/api/letters/$LID
check "DELETE letter by other -> 403" 403 -b "$SA" -X DELETE $B/api/letters/$LID
check "DELETE letter" 200 -b "$FR" -X DELETE $B/api/letters/$LID
check "DELETE locked letter" 200 -b "$FR" -X DELETE $B/api/letters/$LOCKED

echo "--- jar"
check "POST /api/jar bad mood -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"mood":"meh","text":"x"}' $B/api/jar
check "POST /api/jar empty -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"mood":"happy","text":""}' $B/api/jar
check "POST /api/jar" 201 -b "$FR" -X POST "${J[@]}" -d '{"mood":"proud","text":"so proud"}' $B/api/jar
JID=$(jget .id)
check "POST /api/jar/draw proud" 200 -b "$SA" -X POST "${J[@]}" -d '{"mood":"proud"}' $B/api/jar/draw
echo "     drew: $(jget .note.text)"
check "POST /api/jar/draw bad mood" 200 -b "$SA" -X POST "${J[@]}" -d '{"mood":"zzz"}' $B/api/jar/draw
check "DELETE jar by other -> 403" 403 -b "$SA" -X DELETE $B/api/jar/$JID
check "DELETE jar" 200 -b "$FR" -X DELETE $B/api/jar/$JID

echo "--- bingo / seen / wishes"
check "POST /api/bingo unknown -> 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"squareId":"zzz","done":true}' $B/api/bingo
check "POST /api/bingo done" 200 -b "$SA" -X POST "${J[@]}" -d '{"squareId":"como","done":true}' $B/api/bingo
check "POST /api/bingo undo" 200 -b "$SA" -X POST "${J[@]}" -d '{"squareId":"como","done":false}' $B/api/bingo
check "POST /api/seen love" 200 -b "$SA" -X POST "${J[@]}" -d '{"area":"love"}' $B/api/seen
check "POST /api/seen bad -> 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"area":"x"}' $B/api/seen
check "POST /api/wishes empty -> 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"text":" "}' $B/api/wishes
check "POST /api/wishes" 201 -b "$SA" -X POST "${J[@]}" -d '{"text":"Visit Brera"}' $B/api/wishes
WID=$(jget .id)
check "POST /api/wishes/:id toggle" 200 -b "$SA" -X POST $B/api/wishes/$WID
echo "     done=$(jget .done)"
check "POST /api/wishes/missing toggle" 200 -b "$SA" -X POST $B/api/wishes/nope
echo "     missing toggle body: $(body)"
check "DELETE /api/wishes/:id" 200 -b "$SA" -X DELETE $B/api/wishes/$WID


echo "--- friend desk & pages"
for p in /wall /wall/love /wall/letters /wall/jar /wall/bingo /wall/milano /wall/sent; do
  check "GET $p (friend)" 200 -b "$FR" $B$p
  check "GET $p (anon) -> 307" 307 $B$p
done
check "GET /wall/bingo (saanika) -> 307" 307 -b "$SA" $B/wall/bingo

echo "--- photo album"
A1=$(curl -s -b "$FR" -X POST "${J[@]}" -d "{\"mime\":\"image/png\",\"size\":$SZ}" $B/api/upload | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
A2=$(curl -s -b "$FR" -X POST "${J[@]}" -d "{\"mime\":\"image/png\",\"size\":$SZ}" $B/api/upload | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
curl -s -o /dev/null -b "$FR" -X PUT -H 'Content-Type: image/png' --data-binary @"$D/tiny.png" $B/api/upload/$A1
curl -s -o /dev/null -b "$FR" -X PUT -H 'Content-Type: image/png' --data-binary @"$D/tiny.png" $B/api/upload/$A2
check "POST album (2 photos)" 201 -b "$FR" -X POST "${J[@]}" -d "{\"kind\":\"photo\",\"text\":\"album\",\"mediaIds\":[\"$A1\",\"$A2\"]}" $B/api/posts
ALB=$(jget .id); echo "     mediaIds=$(jget .mediaIds.length) first=$( [[ $(jget .mediaId) == $A1 ]] && echo ok)"
check "POST album 11 photos -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"kind":"photo","mediaIds":["a","b","c","d","e","f","g","h","i","j","k"]}' $B/api/posts
check "POST video with 2 files -> 400" 400 -b "$FR" -X POST "${J[@]}" -d "{\"kind\":\"video\",\"mediaIds\":[\"$A1\",\"$A2\"]}" $B/api/posts
check "GET album photo 2" 200 -b "$SA" $B/api/media/$A2
check "DELETE album" 200 -b "$FR" -X DELETE $B/api/posts/$ALB
check "album photo 1 gone" 404 -b "$SA" $B/api/media/$A1
check "album photo 2 gone" 404 -b "$SA" $B/api/media/$A2

echo "--- bingo dares"
check "POST dare anon -> 401" 401 -X POST "${J[@]}" -d '{"squareId":"como","text":"go"}' $B/api/dares
check "POST dare saanika -> 403" 403 -b "$SA" -X POST "${J[@]}" -d '{"squareId":"como","text":"go"}' $B/api/dares
check "POST dare bad square -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"squareId":"zzz","text":"go"}' $B/api/dares
check "POST dare empty -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"squareId":"como","text":" "}' $B/api/dares
check "POST dare" 201 -b "$FR" -X POST "${J[@]}" -d '{"squareId":"como","text":"Go this weekend!"}' $B/api/dares
DID=$(jget .id)
check "GET her bingo shows dare" 200 -b "$SA" $B/home/bingo
grep -q "Go this weekend" "$D/body" && echo "     dare visible on her board" || { echo "FAIL dare not on her board"; failn=$((failn+1)); }
check "GET friend bingo has no proof media" 200 -b "$FR" $B/wall/bingo
grep -q "/api/media/" "$D/body" && { echo "FAIL media leaked to friend bingo"; failn=$((failn+1)); } || echo "     no photo proofs exposed"
check "DELETE dare by saanika -> 403" 403 -b "$SA" -X DELETE $B/api/dares/$DID
check "DELETE dare" 200 -b "$FR" -X DELETE $B/api/dares/$DID

echo "--- milano tips"
check "POST tip saanika -> 403" 403 -b "$SA" -X POST "${J[@]}" -d '{"text":"x"}' $B/api/tips
check "POST tip empty -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"text":""}' $B/api/tips
check "POST tip" 201 -b "$FR" -X POST "${J[@]}" -d '{"text":"Gelato at Gelateria della Musica"}' $B/api/tips
TID=$(jget .id); echo "     fromName=$(jget .fromName)"
check "GET her milano shows tip" 200 -b "$SA" $B/home/milano
grep -q "Gelateria della Musica" "$D/body" && echo "     tip on her list" || { echo "FAIL tip not on her list"; failn=$((failn+1)); }
check "DELETE tip by saanika via tips -> 403" 403 -b "$SA" -X DELETE $B/api/tips/$TID
check "DELETE tip" 200 -b "$FR" -X DELETE $B/api/tips/$TID


echo "--- keepalive (daily cron)"
CS=${CRON_SECRET:-$(sed -n 's/^CRON_SECRET=//p' "$ROOT/.env.local")}
check "daily no auth -> 401" 401 $B/api/daily
check "daily wrong secret -> 401" 401 -H "Authorization: Bearer nope" $B/api/daily
check "daily with secret" 200 -H "Authorization: Bearer $CS" $B/api/daily

echo "--- her list remembers places"
check "POST wish with placeId" 201 -b "$SA" -X POST "${J[@]}" -d '{"text":"Luini · Duomo","placeId":"luini"}' $B/api/wishes
WP=$(jget .id); echo "     placeId=$(jget .placeId)"
check "POST wish bad placeId -> 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"text":"x","placeId":"nope"}' $B/api/wishes
check "GET milano ?place=luini" 200 -b "$SA" "$B/home/milano?place=luini"
check "DELETE wish" 200 -b "$SA" -X DELETE $B/api/wishes/$WP

echo "--- uploads"
check "upload 60 MB -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"mime":"video/mp4","size":62914560}' $B/api/upload
grep -q "60 MB" "$D/body" && echo "     message names the size: $(jget .error)" || { echo "FAIL size not in message"; failn=$((failn+1)); }
check "upload empty -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"mime":"image/png","size":0}' $B/api/upload

echo "--- notifications"
check "GET /api/push anon -> 401" 401 $B/api/push
check "GET /api/push friend (reminders)" 200 -b "$FR" $B/api/push
check "GET /api/push saanika" 200 -b "$SA" $B/api/push
echo "     enabled=$(jget .enabled) key=$( [[ -n $(jget .publicKey) ]] && echo yes)"
check "POST push bad -> 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"subscription":{"endpoint":"http://evil"}}' $B/api/push
check "POST push friend, bad subscription -> 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"subscription":{}}' $B/api/push
check "POST push subscription" 201 -b "$SA" -X POST "${J[@]}" -d '{"subscription":{"endpoint":"https://push.example.test/abc","keys":{"p256dh":"x","auth":"y"}}}' $B/api/push
check "DELETE push subscription" 200 -b "$SA" -X DELETE "${J[@]}" -d '{"endpoint":"https://push.example.test/abc"}' $B/api/push
check "GET /sw.js (public)" 200 $B/sw.js
check "GET journey (keepsakes)" 200 -b "$SA" $B/journey
check "GET jar (calm card)" 200 -b "$SA" $B/home/jar

echo "--- logout"
check "GET /api/logout -> 303" 303 -b "$SA" -c "$SA" $B/api/logout
check "GET /home after logout -> 307" 307 -b "$SA" $B/home

echo; echo "passed=$pass failed=$failn"
[ "$failn" -eq 0 ]
