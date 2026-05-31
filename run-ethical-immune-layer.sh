#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_NAME="AI Ethical Immune Layer Lab"
COMPOSE_PROJECT_NAME_VALUE="ethical-immune-layer"
DEFAULT_PORT="${APP_PORT:-4173}"
ACTION="start"
NO_OPEN=0
REQUESTED_PORT=""

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

banner() {
  cat <<'BANNER'
+------------------------------------------------+
|  AI ETHICAL IMMUNE LAYER LAB                   |
|  one-click Docker launcher                     |
+------------------------------------------------+
BANNER
}

usage() {
  cat <<'USAGE'
Usage:
  ./run-ethical-immune-layer.sh [options]

Options:
  --port <number>    Browser port to use, default 4173
  --port=<number>    Same as --port <number>
  --no-open          Start without opening the browser
  --stop             Stop the Docker stack
  --logs             Show service logs
  --help             Show this help

Examples:
  ./run-ethical-immune-layer.sh
  ./run-ethical-immune-layer.sh --port 4180
  ./run-ethical-immune-layer.sh --no-open
  ./run-ethical-immune-layer.sh --stop
USAGE
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

while (($#)); do
  case "$1" in
    --port)
      shift
      [[ $# -gt 0 ]] || die "--port requires a value"
      REQUESTED_PORT="$1"
      ;;
    --port=*)
      REQUESTED_PORT="${1#*=}"
      ;;
    --no-open)
      NO_OPEN=1
      ;;
    --stop)
      ACTION="stop"
      ;;
    --logs)
      ACTION="logs"
      ;;
    --help|-h)
      banner
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
  shift
done

validate_port() {
  local value="$1"
  [[ "$value" =~ ^[0-9]+$ ]] || die "Port must be numeric: $value"
  (( value >= 1024 && value <= 65535 )) || die "Port must be between 1024 and 65535: $value"
}

port_busy() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
    return
  fi
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
    return
  fi
  (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
}

first_free_port() {
  local candidate
  for candidate in "$@"; do
    validate_port "$candidate"
    if ! port_busy "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

choose_port() {
  local preferred="$1"
  validate_port "$preferred"
  if ! port_busy "$preferred"; then
    printf '%s\n' "$preferred"
    return
  fi

  local suggestions=()
  local candidate
  for candidate in 4174 4175 4180 4200 4300 4500; do
    if ! port_busy "$candidate"; then
      suggestions+=("$candidate")
    fi
  done

  if [[ -t 0 ]]; then
    printf 'Port %s is already in use.\n' "$preferred"
    printf 'Choose a free port:\n'
    local index=1
    for candidate in "${suggestions[@]}"; do
      printf '  %s) %s\n' "$index" "$candidate"
      index=$((index + 1))
    done
    printf '  c) custom port\n'
    printf 'Selection: '
    read -r selection
    if [[ "$selection" == "c" || "$selection" == "C" ]]; then
      printf 'Custom port: '
      read -r candidate
      validate_port "$candidate"
      port_busy "$candidate" && die "Port $candidate is also busy"
      printf '%s\n' "$candidate"
      return
    fi
    [[ "$selection" =~ ^[0-9]+$ ]] || die "Invalid selection"
    (( selection >= 1 && selection <= ${#suggestions[@]} )) || die "Invalid selection"
    printf '%s\n' "${suggestions[$((selection - 1))]}"
    return
  fi

  candidate="$(first_free_port "${suggestions[@]}")" || die "Port $preferred is busy. Re-run with --port <free-port>."
  printf '%s\n' "$candidate"
}

detect_compose() {
  command -v docker >/dev/null 2>&1 || die "Docker is not installed. Install Docker Desktop, then run this launcher again."
  docker info >/dev/null 2>&1 || die "Docker is installed but not running. Start Docker Desktop, then run this launcher again."

  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
    return
  fi
  die "Docker Compose is not available. Update Docker Desktop or install Docker Compose."
}

wait_for_ready() {
  local url="$1"
  local attempt
  printf 'Waiting for %s' "$url"
  for attempt in $(seq 1 90); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      printf '\nReady: %s\n' "$url"
      return
    fi
    printf '.'
    sleep 1
  done
  printf '\n'
  "${COMPOSE[@]}" logs --tail=80 web || true
  die "The app did not become ready at $url"
}

open_browser() {
  local url="$1"
  [[ "$NO_OPEN" -eq 0 ]] || return 0
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

banner
detect_compose

case "$ACTION" in
  stop)
    COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME_VALUE" "${COMPOSE[@]}" down
    printf 'Stopped %s.\n' "$PROJECT_NAME"
    exit 0
    ;;
  logs)
    COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME_VALUE" "${COMPOSE[@]}" logs -f --tail=120
    exit 0
    ;;
esac

APP_PORT="$(choose_port "${REQUESTED_PORT:-$DEFAULT_PORT}")"
export APP_PORT
export COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME_VALUE"
APP_URL="${APP_URL:-http://localhost:${APP_PORT}/platform/}"

printf 'Starting %s on %s\n' "$PROJECT_NAME" "$APP_URL"
"${COMPOSE[@]}" up --build -d
wait_for_ready "$APP_URL"
open_browser "$APP_URL"

cat <<EOF

$PROJECT_NAME is running.
URL:  $APP_URL
Stop: ./run-ethical-immune-layer.sh --stop
Logs: ./run-ethical-immune-layer.sh --logs
EOF
