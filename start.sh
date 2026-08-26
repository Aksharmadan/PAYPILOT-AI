#!/usr/bin/env bash
# Cold-start PayPilot: Docker infra → API → web, with a fresh DEV_API_TOKEN.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"
COMPOSE_FILE="$ROOT/infra/docker-compose.yml"
API_LOG="/tmp/paypilot-api.log"
WEB_LOG="/tmp/paypilot-web.log"
API_PID_FILE="/tmp/paypilot-api.pid"
WEB_PID_FILE="/tmp/paypilot-web.pid"

log() { printf '[paypilot] %s\n' "$*"; }

ensure_docker() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  log "Docker Desktop not running — launching…"
  open -a Docker
  for _ in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      log "Docker is ready"
      return 0
    fi
    sleep 2
  done
  echo "Docker did not become ready in time" >&2
  exit 1
}

wait_postgres() {
  log "Waiting for Postgres health…"
  for _ in $(seq 1 60); do
    status="$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null \
      | python3 -c 'import sys,json
rows=[json.loads(l) for l in sys.stdin if l.strip()]
print(next((r.get("Health") or r.get("State") or "" for r in rows if "postgres" in (r.get("Service") or r.get("Name") or "")), ""))' \
      2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then
      log "Postgres is healthy"
      return 0
    fi
    # Fallback: pg_isready inside the container
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U paypilot >/dev/null 2>&1; then
      log "Postgres is ready (pg_isready)"
      return 0
    fi
    sleep 2
  done
  echo "Postgres did not become healthy in time" >&2
  exit 1
}

write_dev_token() {
  local token
  token="$("$API_DIR/.venv/bin/python" "$API_DIR/scripts/dev_token.py")"
  if [[ -z "$token" ]]; then
    echo "Failed to obtain DEV_API_TOKEN" >&2
    exit 1
  fi
  mkdir -p "$WEB_DIR"
  if [[ -f "$WEB_DIR/.env.local" ]]; then
    if grep -q '^DEV_API_TOKEN=' "$WEB_DIR/.env.local"; then
      # Portable in-place replace without relying on GNU sed
      python3 - "$WEB_DIR/.env.local" "$token" <<'PY'
import sys
path, token = sys.argv[1], sys.argv[2]
lines = open(path).read().splitlines()
out = []
found = False
for line in lines:
    if line.startswith("DEV_API_TOKEN="):
        out.append(f"DEV_API_TOKEN={token}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"DEV_API_TOKEN={token}")
if not any(l.startswith("API_BASE_URL=") for l in out):
    out.insert(0, "API_BASE_URL=http://localhost:8000")
open(path, "w").write("\n".join(out) + "\n")
PY
    else
      echo "DEV_API_TOKEN=$token" >> "$WEB_DIR/.env.local"
    fi
  else
    cat > "$WEB_DIR/.env.local" <<EOF
API_BASE_URL=http://localhost:8000
DEV_API_TOKEN=$token
EOF
  fi
  log "Wrote DEV_API_TOKEN to apps/web/.env.local"
}

stop_pid_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file" || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$file"
  fi
}

start_api() {
  stop_pid_file "$API_PID_FILE"
  # Free port 8000 if something else holds it
  if lsof -nP -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
    log "Stopping existing process on :8000"
    lsof -nP -tiTCP:8000 -sTCP:LISTEN | xargs kill 2>/dev/null || true
    sleep 1
  fi
  log "Starting API (logs → $API_LOG)"
  (
    cd "$API_DIR"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    nohup uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 >"$API_LOG" 2>&1 &
    echo $! >"$API_PID_FILE"
  )
  for _ in $(seq 1 40); do
    if curl -sf http://127.0.0.1:8000/health >/dev/null; then
      log "API healthy"
      return 0
    fi
    sleep 0.5
  done
  echo "API failed to become healthy — see $API_LOG" >&2
  tail -n 40 "$API_LOG" >&2 || true
  exit 1
}

start_web() {
  stop_pid_file "$WEB_PID_FILE"
  if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
    log "Stopping existing process on :3000"
    lsof -nP -tiTCP:3000 -sTCP:LISTEN | xargs kill 2>/dev/null || true
    sleep 1
  fi
  log "Starting web (logs → $WEB_LOG)"
  (
    cd "$WEB_DIR"
    nohup npm run dev -- --hostname 0.0.0.0 --port 3000 >"$WEB_LOG" 2>&1 &
    echo $! >"$WEB_PID_FILE"
  )
  for _ in $(seq 1 60); do
    code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)"
    if [[ "$code" != "000" && "$code" != "" ]]; then
      log "Web responding (HTTP $code)"
      return 0
    fi
    sleep 1
  done
  echo "Web failed to become ready — see $WEB_LOG" >&2
  tail -n 40 "$WEB_LOG" >&2 || true
  exit 1
}

main() {
  ensure_docker
  log "Starting docker compose"
  docker compose -f "$COMPOSE_FILE" up -d
  wait_postgres
  start_api
  write_dev_token
  start_web

  log "Verifying…"
  curl -sf http://127.0.0.1:8000/health | tee /tmp/paypilot-health.json
  echo
  curl -sI http://127.0.0.1:3000/ | head -n 1
  log "PayPilot is up — API :8000, Web :3000"
}

main "$@"
