#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://localhost:5000}"

curl -fsS "$BASE_URL/health/live" >/dev/null
curl -fsS "$BASE_URL/health/ready" >/dev/null

echo "Backend health checks passed"
