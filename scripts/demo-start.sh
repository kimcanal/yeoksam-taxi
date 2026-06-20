#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-"$ROOT_DIR/../deploy"}"
FRONTEND_PORT="${FRONTEND_PORT:-8010}"
TUNNEL_HOST="${TUNNEL_HOST:-taxi.yatch-game.cloud}"
RUNTIME_DIR="$ROOT_DIR/.next/demo-runtime"
NEXT_PID_FILE="$RUNTIME_DIR/next.pid"
TUNNEL_PID_FILE="$RUNTIME_DIR/cloudflared.pid"
NEXT_LOG_FILE="$RUNTIME_DIR/next.log"
TUNNEL_LOG_FILE="$RUNTIME_DIR/cloudflared.log"

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [ -f "$pid_file" ]; then
    local old_pid
    old_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
      kill "$old_pid" 2>/dev/null || true
      echo "기존 $label 종료 요청: PID $old_pid"
      sleep 1
    fi
    rm -f "$pid_file"
  fi
}

stop_matching_processes() {
  local pattern="$1"
  local label="$2"

  while IFS= read -r pid; do
    if [ -n "$pid" ] && [ "$pid" != "$$" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "기존 $label 종료 요청: PID $pid"
    fi
  done < <(pgrep -f "$pattern" 2>/dev/null || true)
}

stop_port_listeners() {
  local port="$1"
  local label="$2"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  fi

  if [ -z "$pids" ] && command -v fuser >/dev/null 2>&1; then
    pids="$(fuser "$port/tcp" 2>/dev/null || true)"
  fi

  while IFS= read -r pid; do
    if [ -n "$pid" ] && [ "$pid" != "$$" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "기존 $label 포트 점유 프로세스 종료 요청: PID $pid"
    fi
  done < <(printf "%s\n" $pids)
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 명령을 찾을 수 없습니다." >&2
    exit 1
  fi
}

require_command npm
require_command cloudflared
mkdir -p "$RUNTIME_DIR"

if [ ! -x "$DEPLOY_DIR/start.sh" ]; then
  echo "백엔드 시작 스크립트를 찾을 수 없습니다: $DEPLOY_DIR/start.sh" >&2
  exit 1
fi

echo "1/3 백엔드 API 시작"
"$DEPLOY_DIR/start.sh"

echo "2/3 Next production 서버 시작 (:${FRONTEND_PORT})"
stop_pid_file "$NEXT_PID_FILE" "Next production 서버"
stop_matching_processes "next start --hostname 0.0.0.0 --port ${FRONTEND_PORT}" "Next production 서버"
stop_port_listeners "$FRONTEND_PORT" "Next production 서버"
cd "$ROOT_DIR"
if [ ! -f "$ROOT_DIR/.next/BUILD_ID" ]; then
  echo ".next 빌드가 없어 production build를 먼저 실행합니다."
  npm run build
fi
setsid npm run start -- --hostname 0.0.0.0 --port "$FRONTEND_PORT" \
  > "$NEXT_LOG_FILE" 2>&1 &
echo $! > "$NEXT_PID_FILE"
sleep 2
if ! kill -0 "$(cat "$NEXT_PID_FILE")" 2>/dev/null; then
  echo "Next production 서버 시작 실패. 로그:" >&2
  tail -n 80 "$NEXT_LOG_FILE" >&2 || true
  exit 1
fi
echo "Next PID: $(cat "$NEXT_PID_FILE")"

echo "3/3 Cloudflare 터널 시작 ($TUNNEL_HOST)"
if ! grep -q "service: http://localhost:${FRONTEND_PORT}" "$HOME/.cloudflared/config.yml" 2>/dev/null; then
  echo "주의: $HOME/.cloudflared/config.yml의 $TUNNEL_HOST origin이 localhost:${FRONTEND_PORT}인지 확인하세요." >&2
fi
stop_pid_file "$TUNNEL_PID_FILE" "Cloudflare 터널"
stop_matching_processes "cloudflared tunnel run" "Cloudflare 터널"
setsid cloudflared tunnel run > "$TUNNEL_LOG_FILE" 2>&1 &
echo $! > "$TUNNEL_PID_FILE"
echo "Cloudflared PID: $(cat "$TUNNEL_PID_FILE")"

echo
echo "시연 URL: https://$TUNNEL_HOST"
echo "Next 로그: tail -f $NEXT_LOG_FILE"
echo "Tunnel 로그: tail -f $TUNNEL_LOG_FILE"
echo "Backend 로그: tail -f $DEPLOY_DIR/supply_api/api.log"
