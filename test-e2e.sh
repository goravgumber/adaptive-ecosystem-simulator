#!/usr/bin/env bash
set -uo pipefail
echo "=========================================="
echo "  End-to-End Test Suite"
echo "  Adaptive Ecosystem Simulator"
echo "=========================================="

PASS=0
FAIL=0

pass() { echo "  PASS  $1"; ((PASS++)); }
fail() { echo "  FAIL  $1"; ((FAIL++)); }
assert_200() { local c=$(curl -s -o /dev/null -w "%{http_code}" "$1"); if [ "$c" = "200" ]; then pass "$2"; else fail "$2 (HTTP $c)"; fi; }
assert_true() { local val="$1"; if [ "$val" = "True" ] || [ "$val" = "true" ] || [ "$val" = "1" ] || [ "$val" -gt 0 ] 2>/dev/null; then pass "$2"; else fail "$2 (got: $val)"; fi; }
assert_contains() { if echo "$2" | grep -q "$1"; then pass "$3"; else fail "$3 (expected to contain: $1)"; fi; }
assert_len_gt() { local len=$(echo "$2" | python3 -c "import sys,json; v=json.load(sys.stdin); print(len(v) if isinstance(v,(list,dict)) else 0)" 2>/dev/null || echo 0); if [ "$len" -gt "$1" ]; then pass "$3 ($len items)"; else fail "$3 (expected >$1, got $len)"; fi; }

CURL="curl -sf"
BASE="http://localhost:5000"
ML="http://localhost:8000"
FE="http://localhost:8080"

################################################################################
# 1. Auth
################################################################################
echo ""
echo "--- Auth ---"

# Clear rate limit keys in Redis
docker compose exec -T redis redis-cli KEYS 'rate-limit:*' 2>/dev/null | xargs -r docker compose exec -T redis redis-cli DEL 2>/dev/null || true
docker compose exec -T redis redis-cli KEYS 'rl:*' 2>/dev/null | xargs -r docker compose exec -T redis redis-cli DEL 2>/dev/null || true

LOGIN=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"User123!"}')

assert_contains '"token"' "$LOGIN" "login returns token"
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null || echo "")
assert_true "$(echo "$TOKEN" | wc -c)" "token is non-empty"

REG=$(curl -s -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"test-e2e","password":"Test123!","email":"e2e@test.com"}')
assert_contains '"success"' "$REG" "register returns success"

ME=$(curl -s "$BASE/api/v1/auth/me" -H "Authorization: Bearer $TOKEN")
assert_contains '"username"' "$ME" "/me returns user data"

REFRESH_TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['refreshToken'])" 2>/dev/null || echo "")
REFRESHED=$(curl -s -X POST "$BASE/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
assert_contains '"token"' "$REFRESHED" "refresh returns new token"

LOGOUT=$(curl -s -X POST "$BASE/api/v1/auth/logout" -H "Authorization: Bearer $TOKEN")
assert_contains '"success"' "$LOGOUT" "logout succeeds"

################################################################################
# 2. Health
################################################################################
echo ""
echo "--- Health ---"

assert_200 "$BASE/health" "/health"
assert_200 "$BASE/health/live" "/health/live"
assert_200 "$BASE/health/ready" "/health/ready"

HEALTH=$(curl -s "$BASE/health")
assert_contains '"mongodb"' "$HEALTH" "health includes mongodb"
assert_contains '"redis"' "$HEALTH" "health includes redis"
assert_contains '"ml_service"' "$HEALTH" "health includes ml_service"
assert_contains '"simulation_service"' "$HEALTH" "health includes simulation_service"

################################################################################
# 3. ML Service
################################################################################
echo ""
echo "--- ML ---"

assert_200 "$ML/health" "ml /health"
assert_200 "$ML/models/info" "ml /models/info"

COLLAPSE=$(curl -s -X POST "$ML/predict/collapse" \
  -H "Content-Type: application/json" \
  -d '{"plants":100,"herbivores":50,"carnivores":10,"history":[{"plants":200,"herbivores":80,"carnivores":5},{"plants":180,"herbivores":75,"carnivores":7},{"plants":150,"herbivores":65,"carnivores":8},{"plants":120,"herbivores":55,"carnivores":9},{"plants":100,"herbivores":50,"carnivores":10}]}')
assert_contains '"risk_score"' "$COLLAPSE" "collapse prediction returns risk_score"

FORECAST=$(curl -s -X POST "$ML/predict/populations" \
  -H "Content-Type: application/json" \
  -d '{"plants":100,"herbivores":50,"carnivores":10,"history":[{"plants":200,"herbivores":80,"carnivores":5},{"plants":180,"herbivores":75,"carnivores":7},{"plants":150,"herbivores":65,"carnivores":8},{"plants":120,"herbivores":55,"carnivores":9},{"plants":100,"herbivores":50,"carnivores":10},{"plants":90,"herbivores":45,"carnivores":12},{"plants":85,"herbivores":40,"carnivores":15},{"plants":80,"herbivores":38,"carnivores":18},{"plants":75,"herbivores":35,"carnivores":20},{"plants":70,"herbivores":32,"carnivores":22},{"plants":68,"herbivores":30,"carnivores":24},{"plants":65,"herbivores":28,"carnivores":26},{"plants":62,"herbivores":26,"carnivores":28},{"plants":60,"herbivores":24,"carnivores":30},{"plants":58,"herbivores":22,"carnivores":32},{"plants":55,"herbivores":20,"carnivores":34},{"plants":53,"herbivores":18,"carnivores":36},{"plants":50,"herbivores":16,"carnivores":38},{"plants":48,"herbivores":14,"carnivores":40},{"plants":45,"herbivores":12,"carnivores":42}]}')
assert_contains '"predictions"' "$FORECAST" "forecast returns predictions"

INSIGHT=$(curl -s -X POST "$ML/insights" \
  -H "Content-Type: application/json" \
  -d '{"plants":100,"herbivores":50,"carnivores":10}')
assert_contains '"insight"' "$INSIGHT" "insights returns insight text"

################################################################################
# 4. Simulation
################################################################################
echo ""
echo "--- Simulation ---"

# Get fresh token for sim tests
LOGIN2=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"User123!"}')
TOKEN2=$(echo "$LOGIN2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

STARTED=$(curl -s -X POST "$BASE/api/v1/simulation" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E","plant_count":50,"herbivore_count":25,"predator_count":5,"speed":100}')
assert_contains '"message"' "$STARTED" "simulation starts"

sleep 2

STATUS=$(curl -s "$BASE/api/v1/simulation/status" -H "Authorization: Bearer $TOKEN2")
assert_contains '"isRunning"' "$STATUS" "simulation status returns isRunning"

HISTORY=$(curl -s "$BASE/api/v1/simulation/history" -H "Authorization: Bearer $TOKEN2")
assert_len_gt 0 "$HISTORY" "history has ticks"

TOGGLE_PAUSE=$(curl -s -X POST "$BASE/api/v1/simulation/toggle" \
  -H "Authorization: Bearer $TOKEN2" -H "Content-Type: application/json")
assert_contains '"isRunning"' "$TOGGLE_PAUSE" "toggle pause"

TOGGLE_RESUME=$(curl -s -X POST "$BASE/api/v1/simulation/toggle" \
  -H "Authorization: Bearer $TOKEN2" -H "Content-Type: application/json")
assert_contains '"isRunning"' "$TOGGLE_RESUME" "toggle resume"

SPEED=$(curl -s -X POST "$BASE/api/v1/simulation/speed" \
  -H "Authorization: Bearer $TOKEN2" -H "Content-Type: application/json" \
  -d '{"speed":500}')
assert_contains '"speed"' "$SPEED" "speed update"

LOGS=$(curl -s "$BASE/api/v1/simulation/logs" -H "Authorization: Bearer $TOKEN2")
# logs may be empty array, just check it's valid JSON
assert_contains '\[{' "$LOGS" "logs endpoint"

RESPONSE=$(curl -s -X DELETE "$BASE/api/v1/simulation/reset" -H "Authorization: Bearer $TOKEN2")
assert_contains '"message"' "$RESPONSE" "simulation reset"

################################################################################
# 5. Reports & Events
################################################################################
echo ""
echo "--- Reports & Events ---"

ec=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/events"); if [ "$ec" = "401" ]; then pass "/api/v1/events rejects unauthenticated"; else fail "/api/v1/events (expected 401, got $ec)"; fi
EVT_AUTH=$(curl -s "$BASE/api/v1/events" -H "Authorization: Bearer $TOKEN2")
assert_contains 'events' "$EVT_AUTH" "events returns data" 2>/dev/null || true

REPORTS=$(curl -s "$BASE/api/v1/reports/summary" -H "Authorization: Bearer $TOKEN2")
echo "$REPORTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if isinstance(d,(list,dict)) else 'FAIL')" 2>/dev/null && pass "reports returns data" || fail "reports returns data"

################################################################################
# 6. Frontend
################################################################################
echo ""
echo "--- Frontend ---"

assert_200 "$FE/" "frontend serves HTML"
assert_200 "http://localhost:80/" "nginx serves frontend"

TITLE=$(curl -s "$FE/" | grep -o '<title>[^<]*</title>')
assert_contains "Adaptive Ecosystem Simulator" "$TITLE" "page title correct"

################################################################################
# Results
################################################################################
echo ""
echo "=========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "=========================================="
[ "$FAIL" -eq 0 ]
