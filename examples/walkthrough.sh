#!/usr/bin/env bash
# End-to-end walkthrough against a running workspace API.
# Prereq:  npm run dev:api   (in another terminal)
# Usage:   ./examples/walkthrough.sh
set -euo pipefail

API="${WORKSPACE_API_URL:-http://localhost:4319}"
jqr() { if command -v jq >/dev/null; then jq "$@"; else cat; fi; }

echo "== 1. health =="
curl -s "$API/health" | jqr .

echo "== 2. create a task and run it to the first human gate =="
RESP=$(curl -s -X POST "$API/api/tasks" -H 'content-type: application/json' \
  -d '{"title":"Walkthrough: add a metrics endpoint","role":"engineering","source":"api","autostart":true}')
echo "$RESP" | jqr .
SID=$(echo "$RESP" | (command -v jq >/dev/null && jq -r .sessionId || sed -E 's/.*"sessionId":"([^"]+)".*/\1/'))
echo "session = $SID"

echo "== 3. inspect the session (should be awaiting_approval) =="
curl -s "$API/api/sessions/$SID" | jqr '.session | {state, runtimeMode, budget}'

echo "== 4. approve, then run to the next gate =="
curl -s -X POST "$API/api/sessions/$SID/decision" -H 'content-type: application/json' \
  -d '{"decision":"approved","by":"walkthrough"}' | jqr '.session.state'
curl -s -X POST "$API/api/sessions/$SID/run" | jqr '{state: .session.state, next: .availableEvents}'

echo "== 5. complete it (ready_to_merge -> done) =="
curl -s -X POST "$API/api/sessions/$SID/transition" -H 'content-type: application/json' \
  -d '{"event":"complete","actor":"walkthrough"}' | jqr '.session | {state, closedAt}'

echo "== 6. terminal guard: a discarded/done session cannot revive =="
curl -s -o /dev/null -w "HTTP %{http_code} (expect 409)\n" \
  -X POST "$API/api/sessions/$SID/transition" -H 'content-type: application/json' \
  -d '{"event":"submit"}'

echo "== 7. workspace status =="
curl -s "$API/api/status" | jqr .
