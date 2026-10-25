#!/bin/bash
# Part 3: removing friends (and everything they shared), nudges, songs as tiles, journey extras.
# Expects the server started with an extra INVITES friend "envfriend" (code ENV-FRIEND-TEST).
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
ROOT=${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
SA=$D/p3-sa.jar; FR=$D/p3-fr.jar; NF=$D/p3-nf.jar; EF=$D/p3-ef.jar; rm -f "$SA" "$FR" "$NF" "$EF"
pass=0; failn=0
check() {
  local name=$1 exp=$2; shift 2
  local code
  code=$(curl -s -o "$D/body" -w '%{http_code}' -m 30 "$@")
  if [[ "$code" == "$exp" ]]; then pass=$((pass+1)); printf 'PASS %-56s %s\n' "$name" "$code"
  else failn=$((failn+1)); printf 'FAIL %-56s got %s want %s  %s\n' "$name" "$code" "$exp" "$(head -c 220 "$D/body")"; fi
}
expect() {
  if grep -q -- "$2" "$D/body"; then found=1; else found=0; fi
  if [[ "$3" == absent ]]; then want=0; else want=1; fi
  if [[ $found == $want ]]; then pass=$((pass+1)); printf 'PASS %-56s\n' "$1"; else failn=$((failn+1)); printf 'FAIL %-56s (pattern %s %s)\n' "$1" "$2" "$3"; fi
}
jget() { node -e "let d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));const v=eval('d'+process.argv[1]);console.log(v===undefined||v===null?'':v)" "$1"; }
J=(-H 'Content-Type: application/json')
upload() { # upload FILE MIME JAR -> media id
  local sz; sz=$(wc -c < "$1" | tr -d ' ')
  local r; r=$(curl -s -b "$3" -X POST "${J[@]}" -d "{\"mime\":\"$2\",\"size\":$sz}" $B/api/upload)
  local u; u=$(node -e "console.log(JSON.parse(process.argv[1]).url)" "$r")
  curl -s -o /dev/null -b "$3" -X PUT -H "Content-Type: $2" --data-binary @"$1" "$B$u"
  node -e "console.log(JSON.parse(process.argv[1]).id)" "$r"
}
IMG="$ROOT/public/icons/icon-192.png"

curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1
curl -s -o /dev/null -c "$FR" $B/hello/CHANGE-ME-2
curl -s -o /dev/null -c "$EF" $B/hello/ENV-FRIEND-TEST

echo "--- nudges"
check "nudge anon 401" 401 -X POST "${J[@]}" -d '{"emoji":"💗"}' $B/api/nudges
check "saanika can't nudge herself 403" 403 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"💗"}' $B/api/nudges
check "nudge bad emoji 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"💩"}' $B/api/nudges
check "nudge too long 400" 400 -b "$FR" -X POST "${J[@]}" -d "{\"emoji\":\"💗\",\"text\":\"$(printf 'x%.0s' {1..81})\"}" $B/api/nudges
check "friend nudges" 201 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"🌸","text":"NUDGE-ONE"}' $B/api/nudges
NUD=$(jget .id)
check "second nudge straight away 429" 429 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"💗"}' $B/api/nudges
check "other friend nudges" 201 -b "$EF" -X POST "${J[@]}" -d '{"emoji":"☕","text":"ENV-NUDGE"}' $B/api/nudges
check "saanika sees all nudges" 200 -b "$SA" $B/api/nudges
expect "has nudge one" "NUDGE-ONE"
expect "has env nudge" "ENV-NUDGE"
check "friend sees only own nudges" 200 -b "$FR" $B/api/nudges
expect "own nudge" "NUDGE-ONE"
expect "not the other friend's" "ENV-NUDGE" absent
check "friend can't answer 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"reaction":"💗"}' $B/api/nudges/$NUD
check "answer empty 400" 400 -b "$SA" -X POST "${J[@]}" -d '{}' $B/api/nudges/$NUD
check "answer bad emoji 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"reaction":"💩"}' $B/api/nudges/$NUD
check "answer missing 404" 404 -b "$SA" -X POST "${J[@]}" -d '{"reaction":"💗"}' $B/api/nudges/nope
check "she reacts" 200 -b "$SA" -X POST "${J[@]}" -d '{"reaction":"🥹"}' $B/api/nudges/$NUD
check "she replies" 200 -b "$SA" -X POST "${J[@]}" -d '{"reply":"REPLY-BACK"}' $B/api/nudges/$NUD
expect "keeps the reaction" '"reaction":"🥹"'
check "friend sees her answer" 200 -b "$FR" $B/api/nudges
expect "reply visible" "REPLY-BACK"
check "clear: friend can't 403" 403 -b "$FR" -X POST "${J[@]}" -d "{\"ids\":[\"$NUD\"]}" $B/api/nudges/dismiss
check "clear: nothing given 400" 400 -b "$SA" -X POST "${J[@]}" -d '{}' $B/api/nudges/dismiss
check "she clears one" 200 -b "$SA" -X POST "${J[@]}" -d "{\"ids\":[\"$NUD\"]}" $B/api/nudges/dismiss
expect "one cleared" '"cleared":1'
check "gone from her desk" 200 -b "$SA" $B/api/nudges
expect "cleared nudge hidden" "NUDGE-ONE" absent
expect "the other stays" "ENV-NUDGE"
check "the friend still sees theirs" 200 -b "$FR" $B/api/nudges
expect "friend keeps it" "NUDGE-ONE"
check "she clears all" 200 -b "$SA" -X POST "${J[@]}" -d '{"all":true}' $B/api/nudges/dismiss
check "her inbox is empty" 200 -b "$SA" $B/api/nudges
expect "empty" '^\[\]$'
check "her desk renders" 200 -b "$SA" $B/home
check "friend desk renders" 200 -b "$FR" $B/wall

echo "--- songs as tiles"
check "song with cover lookup" 201 -b "$EF" -X POST "${J[@]}" -d '{"url":"https://www.youtube.com/watch?v=7maJOI3QMu0","note":"ENV-SONG"}' $B/api/songs
expect "has a cover" '"cover":"https://'
expect "has a title" '"title":'
check "songs page" 200 -b "$SA" $B/home/songs
expect "square sleeve" "song-sleeve"

echo "--- journey extras"
P1=$(upload "$IMG" image/png "$FR"); P2=$(upload "$IMG" image/png "$FR"); P3=$(upload "$IMG" image/png "$FR"); P4=$(upload "$IMG" image/png "$FR")
check "extras: friend (not admin) 403" 403 -b "$EF" -X POST "${J[@]}" -d "{\"chapter\":\"once\",\"mediaIds\":[\"$P1\"]}" $B/api/admin/journey/extras
check "extras: unknown chapter 400" 400 -b "$FR" -X POST "${J[@]}" -d "{\"chapter\":\"nope\",\"mediaIds\":[\"$P1\"]}" $B/api/admin/journey/extras
check "extras: no files 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"chapter":"once","mediaIds":[]}' $B/api/admin/journey/extras
check "extras: unknown file 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"chapter":"once","mediaIds":["m_nope"]}' $B/api/admin/journey/extras
check "extras: a film of four" 201 -b "$FR" -X POST "${J[@]}" -d "{\"chapter\":\"leap\",\"mediaIds\":[\"$P1\",\"$P2\",\"$P3\",\"$P4\"],\"caption\":\"EXTRA-FILM\"}" $B/api/admin/journey/extras
XF=$(jget .id)
check "journey shows the extra film" 200 -b "$SA" $B/journey
expect "film caption" "EXTRA-FILM"
expect "film photo" "/api/media/$P4"
check "remove the extra" 200 -b "$FR" -X DELETE $B/api/admin/journey/extras/$XF
check "remove again 404" 404 -b "$FR" -X DELETE $B/api/admin/journey/extras/$XF
check "its files are gone" 404 -b "$SA" $B/api/media/$P1
check "journey without it" 200 -b "$SA" $B/journey
expect "caption gone" "EXTRA-FILM" absent

echo "--- her mood"
check "mood anon 401" 401 $B/api/mood
check "mood empty to start" 200 -b "$SA" $B/api/mood
expect "null when not set" '^null$'
check "friend can't set mood 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"mood":"great"}' $B/api/mood
check "unknown mood 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"mood":"meh"}' $B/api/mood
check "note too long 400" 400 -b "$SA" -X POST "${J[@]}" -d "{\"mood\":\"great\",\"note\":\"$(printf 'x%.0s' {1..101})\"}" $B/api/mood
check "she sets her mood" 200 -b "$SA" -X POST "${J[@]}" -d '{"mood":"excited","note":"MOOD-NOTE"}' $B/api/mood
check "friend sees it" 200 -b "$FR" $B/api/mood
expect "mood visible" '"mood":"excited"'
expect "note visible" "MOOD-NOTE"

echo "--- a little memory"
check "memory anon 401" 401 $B/api/memory
check "memory friend 403" 403 -b "$FR" $B/api/memory
check "friend posts one" 201 -b "$FR" -X POST "${J[@]}" -d '{"kind":"text","text":"MEMORY-ONE"}' $B/api/posts
M1=$(jget .id)
check "friend posts another" 201 -b "$FR" -X POST "${J[@]}" -d '{"kind":"text","text":"MEMORY-TWO"}' $B/api/posts
check "memory for her" 200 -b "$SA" $B/api/memory
expect "has a post" '"post":{'
check "skips the one she just saw" 200 -b "$SA" "$B/api/memory?not=$M1"
expect "not the same one" "\"id\":\"$M1\"" absent
check "a hidden surprise never shows" 201 -b "$FR" -X POST "${J[@]}" -d "{\"kind\":\"text\",\"text\":\"MEMORY-LATER\",\"showAt\":\"$(node -e 'console.log(new Date(Date.now()+30*86400000).toISOString())')\"}" $B/api/posts
for k in 1 2 3 4 5 6; do curl -s -b "$SA" $B/api/memory >> "$D/mem-all"; done; cp "$D/mem-all" "$D/body"; rm -f "$D/mem-all"
expect "scheduled drop not in memories" "MEMORY-LATER" absent

echo "--- who's where (desk clocks)"
check "friend in LA" 200 -b "$FR" -X POST "${J[@]}" -d '{"tz":"America/Los_Angeles"}' $B/api/zone
check "her clocks" 200 -b "$SA" -X POST "${J[@]}" -d '{"tz":"Europe/Rome"}' $B/api/zone
expect "everyone listed" '"everyone":\['
expect "Vee in LA" '{"name":"Vee","tz":"America/Los_Angeles","saanika":false,"me":false}'
expect "her, marked as her and me" '{"name":"Saanika","tz":"Europe/Rome","saanika":true,"me":true}'

echo "--- her love back to everyone"
check "love back anon 401" 401 -X POST "${J[@]}" -d '{"emoji":"💗"}' $B/api/nudges/back
check "friend can't send it 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"💗"}' $B/api/nudges/back
check "bad emoji 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"💩"}' $B/api/nudges/back
check "she sends love back" 201 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"💗"}' $B/api/nudges/back
check "not twice in a minute 429" 429 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"💗"}' $B/api/nudges/back
check "friend sees it" 200 -b "$FR" $B/api/nudges/back
expect "her love" '"emoji":"💗"'

echo "--- departure day"
check "admin lists departure day" 200 -b "$FR" $B/admin
expect "departure seeded" 'Departure day'
expect "on the 27th" '2026-10-27'
TMRW=$(node -e "const d=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date(Date.now()+86400000));console.log(d)")
check "a special day tomorrow" 201 -b "$FR" -X POST "${J[@]}" -d "{\"date\":\"$TMRW\",\"title\":\"SOON-DAY\",\"emoji\":\"🎉\",\"remindDays\":2}" $B/api/admin/occasions
check "friend desk shows it coming up" 200 -b "$FR" $B/wall
expect "special day banner" "w-soon"
expect "says tomorrow" "SOON-DAY"

echo "--- the journey's words, edited from admin"
check "words: friend (not admin) 403" 403 -b "$EF" -X POST "${J[@]}" -d '{"key":"once.title","value":"x"}' $B/api/admin/journey/text
check "words: unknown key 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"key":"once.nope","value":"x"}' $B/api/admin/journey/text
check "words: too long 400" 400 -b "$FR" -X POST "${J[@]}" -d "{\"key\":\"once.title\",\"value\":\"$(printf 'x%.0s' {1..601})\"}" $B/api/admin/journey/text
check "rename chapter one" 200 -b "$FR" -X POST "${J[@]}" -d '{"key":"once.title","value":"WORDS-TITLE"}' $B/api/admin/journey/text
check "name a voice note" 200 -b "$FR" -X POST "${J[@]}" -d '{"key":"designer.3.from","value":"WORDS-AUNTY"}' $B/api/admin/journey/text
check "caption a film frame" 200 -b "$FR" -X POST "${J[@]}" -d '{"key":"designer.0.frames.1.caption","value":"WORDS-JURY"}' $B/api/admin/journey/text
check "new opening line" 200 -b "$FR" -X POST "${J[@]}" -d '{"key":"intro.line","value":"WORDS-OPENING"}' $B/api/admin/journey/text
check "journey shows the new words" 200 -b "$SA" $B/journey
expect "chapter title" "WORDS-TITLE"
expect "voice note from" "WORDS-AUNTY"
expect "film frame" "WORDS-JURY"
expect "opening line" "WORDS-OPENING"
expect "old title gone" ">Once upon a time<" absent
check "admin shows the edits" 200 -b "$FR" $B/admin
expect "edited value in admin" "WORDS-AUNTY"
check "clear it again" 200 -b "$FR" -X POST "${J[@]}" -d '{"key":"once.title","value":""}' $B/api/admin/journey/text
expect "cleared" '"value":null'
check "journey back to the original title" 200 -b "$SA" $B/journey
expect "original title back" "Once upon a time"
expect "edit gone" "WORDS-TITLE" absent

echo "--- removing a friend deletes everything they shared"
check "add a friend" 201 -b "$FR" -X POST "${J[@]}" -d '{"name":"Purge Test"}' $B/api/admin/friends
PT=$(jget .id); PCODE=$(jget .code)
curl -s -o /dev/null -c "$NF" $B/hello/$PCODE
check "new friend signed in" 200 -b "$NF" $B/wall
M1=$(upload "$IMG" image/png "$NF"); M2=$(upload "$IMG" image/png "$NF"); MU=$(upload "$IMG" image/png "$NF")
check "they post an album" 201 -b "$NF" -X POST "${J[@]}" -d "{\"kind\":\"photo\",\"text\":\"PURGE-POST\",\"mediaIds\":[\"$M1\",\"$M2\"]}" $B/api/posts
PP=$(jget .id)
check "she replies to it" 200 -b "$SA" -X POST "${J[@]}" -d '{"text":"thanks"}' $B/api/posts/$PP/reply
check "they write a letter" 201 -b "$NF" -X POST "${J[@]}" -d '{"title":"t","body":"PURGE-LETTER"}' $B/api/letters
check "they fill the jar" 201 -b "$NF" -X POST "${J[@]}" -d '{"mood":"happy","text":"PURGE-JAR"}' $B/api/jar
check "they leave a dare" 201 -b "$NF" -X POST "${J[@]}" -d '{"squareId":"aperitivo","text":"PURGE-DARE"}' $B/api/dares
check "they suggest a tip" 201 -b "$NF" -X POST "${J[@]}" -d '{"text":"PURGE-TIP"}' $B/api/tips
check "they dedicate a song" 201 -b "$NF" -X POST "${J[@]}" -d '{"url":"https://youtu.be/7maJOI3QMu0","note":"PURGE-SONG"}' $B/api/songs
check "they nudge" 201 -b "$NF" -X POST "${J[@]}" -d '{"emoji":"🤗","text":"PURGE-NUDGE"}' $B/api/nudges
check "they set a time zone" 200 -b "$NF" -X POST "${J[@]}" -d '{"tz":"Asia/Kolkata"}' $B/api/zone
check "their files exist" 200 -b "$SA" -o /dev/null $B/api/media/$M1
check "admin can't remove Saanika" 400 -b "$FR" -X DELETE $B/api/admin/friends/saanika
check "admin can't remove themselves" 400 -b "$FR" -X DELETE $B/api/admin/friends/priya
check "friend (not admin) can't remove 403" 403 -b "$EF" -X DELETE $B/api/admin/friends/$PT
check "remove the friend" 200 -b "$FR" -X DELETE $B/api/admin/friends/$PT
echo "     removed things: $(jget .removed)"
check "their link stops working" 307 -b "$NF" $B/wall
check "their post is gone from her wall" 200 -b "$SA" $B/home/love
expect "no post" "PURGE-POST" absent
check "their letter is gone" 200 -b "$SA" $B/home/letters
expect "no letter" "PURGE-LETTER" absent
check "their songs are gone" 200 -b "$SA" $B/home/songs
expect "no song" "PURGE-SONG" absent
check "her Milano list" 200 -b "$SA" $B/home/milano
expect "no tip" "PURGE-TIP" absent
check "her nudges" 200 -b "$SA" $B/api/nudges
expect "no nudge" "PURGE-NUDGE" absent
check "album photo 1 deleted" 404 -b "$SA" $B/api/media/$M1
check "album photo 2 deleted" 404 -b "$SA" $B/api/media/$M2
check "unused upload deleted" 404 -b "$SA" $B/api/media/$MU
check "she no longer has them to call" 200 -b "$SA" -X POST "${J[@]}" -d '{"tz":"Europe/Rome"}' $B/api/zone
expect "not in call list" "Purge Test" absent
check "removed from admin list" 200 -b "$FR" $B/api/admin/friends
expect "not listed" "Purge Test" absent
for f in jar dares wishes posts letters songs nudges media; do
  if grep -q "$PT" "$ROOT/.data/$f.json" 2>/dev/null; then failn=$((failn+1)); echo "FAIL nothing of theirs left in $f"; else pass=$((pass+1)); echo "PASS nothing of theirs left in $f"; fi
done

echo "--- removing a friend from the Vercel INVITES setting"
check "env friend signed in" 200 -b "$EF" $B/wall
check "remove env friend" 200 -b "$FR" -X DELETE $B/api/admin/friends/envfriend
check "env friend signed out" 307 -b "$EF" $B/wall
curl -s -o /dev/null -c "$D/p3-x.jar" $B/hello/ENV-FRIEND-TEST
check "still signed out" 307 -b "$D/p3-x.jar" $B/wall
check "their song is gone" 200 -b "$SA" $B/home/songs
expect "no env song" "ENV-SONG" absent
check "their nudge is gone" 200 -b "$SA" $B/api/nudges
expect "no env nudge" "ENV-NUDGE" absent
check "admin list" 200 -b "$FR" $B/api/admin/friends
expect "env friend not listed" '"id":"envfriend"' absent

echo; echo "passed=$pass failed=$failn"
[ "$failn" -eq 0 ]
