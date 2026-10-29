#!/bin/bash
# End-to-end tests against a real production build: every API, privacy rule and page for each role,
# then web push (a fake push service decrypts what Saanika and a friend would see).
#
#   npm run build && npm test
#
# Starts its own server on $PORT (default 3100) using .env.local (or the environment, in CI), plus a
# test friend that lives in INVITES so removing a settings-based friend can be tested. Your .data/
# is backed up first and put back afterwards.
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
export ROOT
export TEST_TMP=$(mktemp -d)
PORT=${PORT:-3100}
export BASE_URL="http://localhost:$PORT"

envval() { local v="${!1:-}"; [ -n "$v" ] && { echo "$v"; return; }; [ -f .env.local ] && sed -n "s/^$1=//p" .env.local | head -1; }
export CRON_SECRET=$(envval CRON_SECRET)
# the friend list, plus one test friend "in the settings"
export INVITES=$(INV="$(envval INVITES)" node -e 'const a=JSON.parse(process.env.INV||"[]"); a.push({id:"envfriend",name:"Env Friend",role:"wellwisher",code:"ENV-FRIEND-TEST"}); process.stdout.write(JSON.stringify(a))')
export ALLOW_TEST_CLOCK=1
# no real AI calls from tests, even if .env.local has a key
export GROQ_API_KEY=off

# keep the real local data safe
[ -d .data ] && cp -R .data "$TEST_TMP/data-backup"
cleanup() {
  [ -n "${SERVER:-}" ] && kill "$SERVER" 2>/dev/null
  [ -n "${FAKE:-}" ] && kill "$FAKE" "$FAKE2" 2>/dev/null
  [ -n "${FAKEFX:-}" ] && kill "$FAKEFX" 2>/dev/null
  [ -n "${FAKEG:-}" ] && kill "$FAKEG" 2>/dev/null
  [ -n "${FAKEWA:-}" ] && kill "$FAKEWA" 2>/dev/null
  rm -rf .data
  [ -d "$TEST_TMP/data-backup" ] && cp -R "$TEST_TMP/data-backup" .data
  rm -rf "$TEST_TMP"
}
trap cleanup EXIT

# a throwaway certificate for the fake push service
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$TEST_TMP/push-test.key" -out "$TEST_TMP/push-test.crt" -days 1 -subj "/CN=localhost" 2>/dev/null

# a fake for the euro to rupee rates (both servers use it)
node tests/fake-fx.js 4611 "$TEST_TMP" &
FAKEFX=$!
export FX_BASE_URL=http://localhost:4611
# a fake Google (OAuth + Calendar) for meetups
node tests/fake-google.js 4612 "$TEST_TMP" &
FAKEG=$!
export GOOGLE_CLIENT_ID=test-client GOOGLE_CLIENT_SECRET=test-secret GOOGLE_API_BASE=http://localhost:4612 GOOGLE_AUTH_URL=http://localhost:4612/auth
# a fake WhatsApp Cloud API for Soldi over WhatsApp
node tests/fake-whatsapp.js 4613 "$TEST_TMP" &
FAKEWA=$!
export WHATSAPP_TOKEN=test-wa-token WHATSAPP_PHONE_ID=12345 WHATSAPP_VERIFY_TOKEN=TEST-VERIFY WHATSAPP_APP_SECRET=test-app-secret WHATSAPP_OWNER='+39 333 1234567' WHATSAPP_GRAPH_URL=http://localhost:4613

# the push library must trust that certificate; nothing else here talks to anything private
NODE_TLS_REJECT_UNAUTHORIZED=0 node node_modules/next/dist/bin/next start -p "$PORT" > "$TEST_TMP/server.log" 2>&1 &
SERVER=$!
for i in $(seq 1 60); do curl -s -o /dev/null "$BASE_URL/" && break; sleep 1; done
curl -s -o /dev/null "$BASE_URL/" || { echo "server didn't start"; cat "$TEST_TMP/server.log"; exit 1; }

rm -rf .data
mkdir -p .data
cp -R .data "$TEST_TMP/data-start"
status=0
run() {
  echo "== $1"
  "${@:2}" > "$TEST_TMP/out.txt" 2>&1 || status=1
  grep -E "^FAIL|passed=" "$TEST_TMP/out.txt"
  # fresh data for the next suite; wait out the server's few-second friend cache
  rm -rf .data && cp -R "$TEST_TMP/data-start" .data
  sleep 6
}
run "endpoints, part 1" bash tests/endpoints-1.sh
run "endpoints, part 2" bash tests/endpoints-2.sh
run "endpoints, part 3" bash tests/endpoints-3.sh
run "endpoints, part 4" bash tests/endpoints-4.sh
run "endpoints, part 5" bash tests/endpoints-5.sh
run "endpoints, part 6" bash tests/endpoints-6.sh
run "endpoints, part 7" bash tests/endpoints-7.sh
run "web push" node tests/push.js "$TEST_TMP"

# the My Corner assistant, with a key, against a fake Groq server
kill "$SERVER" 2>/dev/null; wait "$SERVER" 2>/dev/null
# make sure the first server has let go of the port before starting the keyed one
for i in $(seq 1 30); do curl -s -o /dev/null "$BASE_URL/" || break; sleep 1; done
node tests/fake-groq.js 4610 "$TEST_TMP" &
FAKE=$!
# and a fake Gemini (Google Search grounding) for Jelly's web lookups
node tests/fake-gemini.js 4614 "$TEST_TMP" &
FAKE2=$!
GEMINI_RPM=200 GEMINI_API_KEY=test-key-not-real GEMINI_BASE_URL=http://localhost:4614 GROQ_API_KEY=test-key-not-real GROQ_BASE_URL=http://localhost:4610/openai/v1 node node_modules/next/dist/bin/next start -p "$PORT" > "$TEST_TMP/server-ai.log" 2>&1 &
SERVER=$!
for i in $(seq 1 60); do curl -s -o /dev/null "$BASE_URL/" && break; sleep 1; done
run "assistant (fake Groq)" bash tests/assistant.sh
run "Soldi with Jelly (fake Groq)" bash tests/soldi-ai.sh
kill "$FAKE" 2>/dev/null
echo
[ $status -eq 0 ] && echo "ALL PASSED" || echo "SOME TESTS FAILED"
exit $status
