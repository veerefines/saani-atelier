#!/bin/bash
# Part 4: friends reading her journey, Moments, private My Corner files, and My Corner itself.
B=${BASE_URL:-http://localhost:3000}
D=${TEST_TMP:?run these through tests/run.sh}
ROOT=${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
SA=$D/p4-sa.jar; FR=$D/p4-fr.jar; EF=$D/p4-ef.jar; rm -f "$SA" "$FR" "$EF"
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
jget() { node -e "let d=JSON.parse(require('fs').readFileSync('$D/body','utf8'));const v=eval('d'+process.argv[1]);console.log(v===undefined||v===null?'':v)" "$1"; }
J=(-H 'Content-Type: application/json')
# upload FILE MIME JAR [purpose] [filename] -> media id (empty if refused)
upload() {
  local sz; sz=$(wc -c < "$1" | tr -d ' ')
  local extra=""; [ -n "$4" ] && extra=",\"purpose\":\"$4\",\"filename\":\"$5\""
  local r; r=$(curl -s -b "$3" -X POST "${J[@]}" -d "{\"mime\":\"$2\",\"size\":$sz$extra}" $B/api/upload)
  local u; u=$(node -e "try{console.log(JSON.parse(process.argv[1]).url||'')}catch{console.log('')}" "$r")
  [ -z "$u" ] && return
  curl -s -o /dev/null -b "$3" -X PUT -H "Content-Type: $2" --data-binary @"$1" "$B$u"
  node -e "console.log(JSON.parse(process.argv[1]).id)" "$r"
}
IMG="$ROOT/public/icons/icon-192.png"
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > "$D/brief.pdf"
printf 'Trend notes: SOFT-TAILORING-TREND and washed pastels.' > "$D/notes.txt"
printf 'PK\x03\x04 not really a word file' > "$D/deck.pptx"
DOCX=application/vnd.openxmlformats-officedocument.wordprocessingml.document
PPTX=application/vnd.openxmlformats-officedocument.presentationml.presentation

curl -s -o /dev/null -c "$SA" $B/hello/CHANGE-ME-1
curl -s -o /dev/null -c "$FR" $B/hello/CHANGE-ME-2
curl -s -o /dev/null -c "$EF" $B/hello/ENV-FRIEND-TEST

echo "--- friends can read her journey"
check "her private day" 201 -b "$SA" -X POST "${J[@]}" -d '{"text":"JOURNEY-PRIVATE-DAY","mood":"☀️"}' $B/api/diary
check "her shared day" 201 -b "$SA" -X POST "${J[@]}" -d '{"text":"JOURNEY-SHARED-DAY","mood":"🌷","shared":true}' $B/api/diary
check "friend opens the journey" 200 -b "$EF" $B/journey
expect "her shared day is there" "JOURNEY-SHARED-DAY"
expect "her private day is not" "JOURNEY-PRIVATE-DAY" absent
expect "told in her voice" "in her words"
expect "ending sends them to their desk" 'href="/wall"'
check "she still sees both" 200 -b "$SA" $B/journey
expect "private day for her" "JOURNEY-PRIVATE-DAY"
expect "her ending" 'href="/home"'
check "friend desk links her story" 200 -b "$EF" $B/wall
expect "journey tile" 'href="/journey"'
check "signed out still can't" 307 $B/journey

echo "--- moments"
PH=$(upload "$IMG" image/png "$SA")
VO=$(upload "$IMG" image/png "$FR")
check "moments anon 401" 401 $B/api/moments
check "friend can't share a moment 403" 403 -b "$FR" -X POST "${J[@]}" -d "{\"kind\":\"photo\",\"mediaId\":\"$VO\"}" $B/api/moments
check "bad kind 400" 400 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"gif\",\"mediaId\":\"$PH\"}" $B/api/moments
check "someone else's file 400" 400 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"photo\",\"mediaId\":\"$VO\"}" $B/api/moments
check "photo sent as video 400" 400 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"video\",\"mediaId\":\"$PH\"}" $B/api/moments
check "caption too long 400" 400 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"photo\",\"mediaId\":\"$PH\",\"caption\":\"$(printf 'x%.0s' {1..141})\"}" $B/api/moments
check "unknown friend 400" 400 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"photo\",\"mediaId\":\"$PH\",\"to\":[\"nobody\"]}" $B/api/moments
check "empty pick 400" 400 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"photo\",\"mediaId\":\"$PH\",\"to\":[]}" $B/api/moments
check "a moment for everyone" 201 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"photo\",\"mediaId\":\"$PH\",\"caption\":\"MOMENT-ALL\"}" $B/api/moments
MALL=$(jget .id)
PH2=$(upload "$IMG" image/png "$SA")
check "a moment just for Vee" 201 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"photo\",\"mediaId\":\"$PH2\",\"caption\":\"MOMENT-VEE\",\"to\":[\"priya\"]}" $B/api/moments
MVEE=$(jget .id)
check "Vee sees both" 200 -b "$FR" $B/api/moments
expect "everyone's" "MOMENT-ALL"
expect "his own" "MOMENT-VEE"
check "the other friend sees only everyone's" 200 -b "$EF" $B/api/moments
expect "everyone's moment" "MOMENT-ALL"
expect "not Vee's" "MOMENT-VEE" absent
check "other friend can't react to Vee's 404" 404 -b "$EF" -X POST "${J[@]}" -d '{"emoji":"💗"}' $B/api/moments/$MVEE/react
check "bad reaction 400" 400 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"💩"}' $B/api/moments/$MALL/react
check "Saanika can't react 403" 403 -b "$SA" -X POST "${J[@]}" -d '{"emoji":"💗"}' $B/api/moments/$MALL/react
check "Vee reacts" 200 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"😍"}' $B/api/moments/$MALL/react
expect "reaction saved" '"emoji":"😍"'
check "other friend reacts" 200 -b "$EF" -X POST "${J[@]}" -d '{"emoji":"💗"}' $B/api/moments/$MALL/react
check "tap again takes it back" 200 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"😍"}' $B/api/moments/$MALL/react
expect "Vee's gone" '"emoji":"😍"' absent
check "Vee reacts again" 200 -b "$FR" -X POST "${J[@]}" -d '{"emoji":"😍"}' $B/api/moments/$MALL/react
check "she sees reactions" 200 -b "$SA" $B/api/moments
expect "both reactions" '"name":"Env Friend"'
check "her moments page" 200 -b "$SA" $B/home/moments
check "friend moments page" 200 -b "$FR" $B/wall/moments
expect "friend sees his moment" "MOMENT-VEE"
check "friend can't delete 403" 403 -b "$FR" -X DELETE $B/api/moments/$MVEE
check "she takes one back" 200 -b "$SA" -X DELETE $B/api/moments/$MVEE
check "its photo is gone" 404 -b "$SA" $B/api/media/$PH2

echo "--- private My Corner files"
check "corner upload: friend 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"mime":"application/pdf","size":100,"purpose":"corner","filename":"a.pdf"}' $B/api/upload
check "corner upload: exe refused" 400 -b "$SA" -X POST "${J[@]}" -d '{"mime":"application/x-msdownload","size":100,"purpose":"corner","filename":"a.exe"}' $B/api/upload
check "corner upload: pdf named .docx refused" 400 -b "$SA" -X POST "${J[@]}" -d '{"mime":"application/pdf","size":100,"purpose":"corner","filename":"a.docx"}' $B/api/upload
check "corner upload: doc over 25 MB" 400 -b "$SA" -X POST "${J[@]}" -d '{"mime":"application/pdf","size":27000000,"purpose":"corner","filename":"big.pdf"}' $B/api/upload
check "everyday upload still refuses PDFs" 400 -b "$SA" -X POST "${J[@]}" -d '{"mime":"application/pdf","size":100}' $B/api/upload
PDF=$(upload "$D/brief.pdf" application/pdf "$SA" corner "Trend brief.pdf")
TXT=$(upload "$D/notes.txt" text/plain "$SA" corner "notes.txt")
PPT=$(upload "$D/deck.pptx" $PPTX "$SA" corner "Pitch deck.pptx")
CIMG=$(upload "$IMG" image/png "$SA" corner "board.png")
[ -n "$PDF" ] && [ -n "$TXT" ] && [ -n "$PPT" ] && [ -n "$CIMG" ] && { pass=$((pass+1)); echo "PASS corner uploads (pdf, txt, pptx, image)"; } || { failn=$((failn+1)); echo "FAIL corner uploads"; }
check "she can open her file" 200 -b "$SA" $B/api/media/$PDF
curl -s -D "$D/headers" -o /dev/null -b "$SA" "$B/api/media/$PDF?download=1"; cp "$D/headers" "$D/body"
expect "download keeps the file name" 'filename="Trend brief.pdf"'
check "a friend can't, even with the link 404" 404 -b "$FR" $B/api/media/$PDF
check "signed out can't 401" 401 $B/api/media/$PDF
echo -n 'bigger than declared bigger than declared bigger than declared' > "$D/lie.txt"
R=$(curl -s -b "$SA" -X POST "${J[@]}" -d '{"mime":"text/plain","size":5,"purpose":"corner","filename":"lie.txt"}' $B/api/upload); U=$(node -e "console.log(JSON.parse(process.argv[1]).url)" "$R")
check "upload body bigger than declared 413" 413 -b "$SA" -X PUT -H "Content-Type: text/plain" --data-binary @"$D/lie.txt" "$B$U"

echo "--- My Corner: projects"
check "corner anon 401" 401 $B/api/corner/projects
check "corner friend 403" 403 -b "$FR" $B/api/corner/projects
check "corner page friend redirected" 307 -b "$FR" $B/home/corner
check "corner page" 200 -b "$SA" $B/home/corner
expect "heading" "My Corner"
expect "subtitle" "A little space for big ideas."
check "no title 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"title":" ","category":"Brand Strategy"}' $B/api/corner/projects
check "bad category 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"title":"x","category":"Cooking"}' $B/api/corner/projects
check "create project" 201 -b "$SA" -X POST "${J[@]}" -d '{"title":"SS27 Navigli","description":"CORNER-DESC","category":"Fashion Collection"}' $B/api/corner/projects
P=$(jget .id)
check "second project" 201 -b "$SA" -X POST "${J[@]}" -d '{"title":"Brand essay","category":"University Assignment"}' $B/api/corner/projects
P2=$(jget .id)
check "list" 200 -b "$SA" $B/api/corner/projects
expect "both listed" "Brand essay"
check "open project" 200 -b "$SA" $B/api/corner/projects/$P
expect "description" "CORNER-DESC"
expect "activity" '"what":"Project created"'
check "workspace page" 200 -b "$SA" $B/home/corner/$P
expect "tabs" "Fashion management"
check "missing project page 404" 404 -b "$SA" $B/home/corner/nope
check "rename" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"title":"SS27 Navigli Dusk"}' $B/api/corner/projects/$P
expect "renamed" '"title":"SS27 Navigli Dusk"'
check "empty rename 400" 400 -b "$SA" -X PATCH "${J[@]}" -d '{"title":""}' $B/api/corner/projects/$P
check "favourite" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"favourite":true}' $B/api/corner/projects/$P
expect "is favourite" '"favourite":true'
check "archive" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"archived":true}' $B/api/corner/projects/$P2
expect "is archived" '"archived":true'
check "cover: not her file 400" 400 -b "$SA" -X PATCH "${J[@]}" -d "{\"coverMediaId\":\"$VO\"}" $B/api/corner/projects/$P
check "cover: a pdf 400" 400 -b "$SA" -X PATCH "${J[@]}" -d "{\"coverMediaId\":\"$PDF\"}" $B/api/corner/projects/$P
check "cover" 200 -b "$SA" -X PATCH "${J[@]}" -d "{\"coverMediaId\":\"$CIMG\"}" $B/api/corner/projects/$P

echo "--- My Corner: brief and costing"
check "brief" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"brief":{"audience":"BRIEF-AUDIENCE","positioning":"quiet luxury","objectives":"a capsule of 8","budget":"€2,000"}}' $B/api/corner/projects/$P
expect "brief saved" "BRIEF-AUDIENCE"
check "negative cost 400" 400 -b "$SA" -X PATCH "${J[@]}" -d '{"costing":{"fabric":-1}}' $B/api/corner/projects/$P
check "costing" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"costing":{"fabric":42.5,"labour":30,"trims":7.5,"other":5,"sellingPrice":185}}' $B/api/corner/projects/$P
expect "costing saved" '"sellingPrice":185'
expect "brief kept" "BRIEF-AUDIENCE"

echo "--- My Corner: items"
check "doc: pdf" 201 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"doc\",\"mediaId\":\"$PDF\"}" $B/api/corner/projects/$P/items
DOC=$(jget .id)
expect "keeps the file name" '"filename":"Trend brief.pdf"'
check "doc: txt" 201 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"doc\",\"mediaId\":\"$TXT\"}" $B/api/corner/projects/$P/items
check "doc: pptx" 201 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"doc\",\"mediaId\":\"$PPT\"}" $B/api/corner/projects/$P/items
check "doc: an image isn't a document 400" 400 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"doc\",\"mediaId\":\"$CIMG\"}" $B/api/corner/projects/$P/items
check "drop: image" 201 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"drop\",\"drop\":\"image\",\"mediaId\":\"$CIMG\",\"note\":\"DROP-IMAGE-NOTE\"}" $B/api/corner/projects/$P/items
check "drop: link" 201 -b "$SA" -X POST "${J[@]}" -d '{"kind":"drop","drop":"link","url":"https://www.vogue.it/moda","note":"DROP-LINK"}' $B/api/corner/projects/$P/items
check "drop: javascript link refused" 400 -b "$SA" -X POST "${J[@]}" -d '{"kind":"drop","drop":"link","url":"javascript:alert(1)"}' $B/api/corner/projects/$P/items
check "drop: pinterest" 201 -b "$SA" -X POST "${J[@]}" -d '{"kind":"drop","drop":"pinterest","url":"https://www.pinterest.com/pin/99360735500167749/"}' $B/api/corner/projects/$P/items
check "drop: not pinterest 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"kind":"drop","drop":"pinterest","url":"https://example.com/pin/1"}' $B/api/corner/projects/$P/items
check "drop: note" 201 -b "$SA" -X POST "${J[@]}" -d '{"kind":"drop","drop":"note","note":"DROP-NOTE"}' $B/api/corner/projects/$P/items
check "drop: empty note 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"kind":"drop","drop":"note","note":" "}' $B/api/corner/projects/$P/items
check "board: image" 201 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"board\",\"board\":\"image\",\"mediaId\":\"$CIMG\"}" $B/api/corner/projects/$P/items
B1=$(jget .id)
check "board: note" 201 -b "$SA" -X POST "${J[@]}" -d '{"kind":"board","board":"note","text":"BOARD-NOTE"}' $B/api/corner/projects/$P/items
B2=$(jget .id)
check "board: swatch" 201 -b "$SA" -X POST "${J[@]}" -d '{"kind":"board","board":"swatch","hex":"#F4A6C0","label":"Navigli rose"}' $B/api/corner/projects/$P/items
B3=$(jget .id)
expect "hex lower-cased" '"hex":"#f4a6c0"'
check "board: bad hex 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"kind":"board","board":"swatch","hex":"pink"}' $B/api/corner/projects/$P/items
check "reorder the board" 200 -b "$SA" -X POST "${J[@]}" -d "{\"ids\":[\"$B3\",\"$B1\",\"$B2\"]}" $B/api/corner/projects/$P/items/reorder
check "reorder with a stranger 400" 400 -b "$SA" -X POST "${J[@]}" -d "{\"ids\":[\"$B3\",\"ci_nope\"]}" $B/api/corner/projects/$P/items/reorder
check "reorder another project's item 400" 400 -b "$SA" -X POST "${J[@]}" -d "{\"ids\":[\"$B3\"]}" $B/api/corner/projects/$P2/items/reorder
check "palette" 201 -b "$SA" -X POST "${J[@]}" -d '{"kind":"palette","name":"Dusk","hexes":["#F4A6C0","#6b1e3a","#e6dcf7"]}' $B/api/corner/projects/$P/items
PAL=$(jget .id)
check "palette: bad hex 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"kind":"palette","name":"x","hexes":["#zzzzzz"]}' $B/api/corner/projects/$P/items
check "palette: too many 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"kind":"palette","name":"x","hexes":["#111111","#111111","#111111","#111111","#111111","#111111","#111111","#111111","#111111","#111111","#111111","#111111","#111111"]}' $B/api/corner/projects/$P/items
check "rename the palette" 200 -b "$SA" -X PATCH "${J[@]}" -d '{"name":"Dusk on the Navigli"}' $B/api/corner/projects/$P/items/$PAL
check "edit through the wrong project 404" 404 -b "$SA" -X PATCH "${J[@]}" -d '{"name":"x"}' $B/api/corner/projects/$P2/items/$PAL
check "typography" 201 -b "$SA" -X POST "${J[@]}" -d '{"kind":"type","font":"Didot","note":"TYPE-NOTE"}' $B/api/corner/projects/$P/items
check "fabric" 201 -b "$SA" -X POST "${J[@]}" -d "{\"kind\":\"fabric\",\"name\":\"Silk crepe\",\"description\":\"FABRIC-DESC\",\"mediaId\":\"$CIMG\"}" $B/api/corner/projects/$P/items
check "fabric: unknown kind 400" 400 -b "$SA" -X POST "${J[@]}" -d '{"kind":"sofa"}' $B/api/corner/projects/$P/items
check "items on a missing project 404" 404 -b "$SA" -X POST "${J[@]}" -d '{"kind":"type","font":"x"}' $B/api/corner/projects/nope/items
check "project with everything" 200 -b "$SA" $B/api/corner/projects/$P
for s in DROP-LINK DROP-NOTE BOARD-NOTE TYPE-NOTE FABRIC-DESC "Dusk on the Navigli"; do expect "has $s" "$s"; done
expect "board order saved" "\"id\":\"$B3\"[^}]*\"order\":0"
expect "activity lists the latest change" "Fabric: Silk crepe"

echo "--- the assistant (no key here)"
check "assistant status" 200 -b "$SA" $B/api/corner/projects/$P/assistant
expect "not ready" '"ready":false'
check "assistant without a key 503" 503 -b "$SA" -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/$P/assistant
expect "explains setup" "ANTHROPIC_API_KEY"
check "assistant friend 403" 403 -b "$FR" -X POST "${J[@]}" -d '{"mode":"summary"}' $B/api/corner/projects/$P/assistant

echo "--- duplicate and delete"
check "duplicate" 201 -b "$SA" -X POST $B/api/corner/projects/$P/duplicate
PC=$(jget .id)
expect "copy title" "SS27 Navigli Dusk (copy)"
check "copy has the items" 200 -b "$SA" $B/api/corner/projects/$PC
expect "copied note" "BOARD-NOTE"
check "delete one document" 200 -b "$SA" -X DELETE $B/api/corner/projects/$P/items/$DOC
check "the copy still uses that file" 200 -b "$SA" $B/api/media/$PDF
check "delete the original" 200 -b "$SA" -X DELETE $B/api/corner/projects/$P
check "gone" 404 -b "$SA" $B/api/corner/projects/$P
check "shared files kept for the copy" 200 -b "$SA" $B/api/media/$CIMG
check "delete the copy" 200 -b "$SA" -X DELETE $B/api/corner/projects/$PC
check "now the files are gone" 404 -b "$SA" $B/api/media/$CIMG
check "and the pdf" 404 -b "$SA" $B/api/media/$PDF
check "delete again 404" 404 -b "$SA" -X DELETE $B/api/corner/projects/$PC
if grep -q "\"projectId\":\"$P\"" "$ROOT/.data/cornerItems.json" 2>/dev/null; then failn=$((failn+1)); echo "FAIL items left behind"; else pass=$((pass+1)); echo "PASS no items left behind"; fi

echo "--- her desk"
check "her desk" 200 -b "$SA" $B/home
expect "My Corner tile" 'href="/home/corner"'
expect "Moments tile" 'href="/home/moments"'

echo; echo "passed=$pass failed=$failn"
[ "$failn" -eq 0 ]
