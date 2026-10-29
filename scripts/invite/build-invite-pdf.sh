#!/bin/sh
# One-page PDF invite for a friend: scripts/invite/build-invite-pdf.sh <INVITE-CODE> [output.pdf]
# The bouquet and the button link to https://saani.space/invite/<code>, which shows the iPhone
# "Add to Home Screen" steps and opens the app already signed in.
set -e
CODE="$1"
[ -n "$CODE" ] || { echo "usage: $0 <invite-code> [output.pdf]" >&2; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
OUT="${2:-$HOME/Desktop/Saani-Invite.pdf}"
BRAVE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$BRAVE" ] && BROWSER="$BRAVE" || BROWSER="$CHROME"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
LINK="https://saani.space/invite/$CODE"
sed -e "s#__ROOT__#$ROOT#g" -e "s#__LINK__#$LINK#g" "$HERE/invite.html" > "$TMP/invite.html"
"$BROWSER" --headless --disable-gpu --no-pdf-header-footer --allow-file-access-from-files \
  --print-to-pdf="$OUT" "file://$TMP/invite.html" >/dev/null 2>&1
echo "wrote $OUT"
