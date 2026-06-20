#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-"$ROOT_DIR/../deploy"}"
RUNTIME_DIR="$ROOT_DIR/.next/demo-runtime"
FRONTEND_PORT="${FRONTEND_PORT:-8010}"

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "$label 종료 요청: PID $pid"
    else
      echo "$label 이미 종료됨"
    fi
    rm -f "$pid_file"
  fi
}

stop_pid_file "$RUNTIME_DIR/cloudflared.pid" "Cloudflare 터널"
stop_pid_file "$RUNTIME_DIR/next.pid" "Next production 서버"

port_pids=""
if command -v lsof >/dev/null 2>&1; then
  port_pids="$(lsof -tiTCP:"$FRONTEND_PORT" -sTCP:LISTEN 2>/dev/null || true)"
fi
if [ -z "$port_pids" ] && command -v fuser >/dev/null 2>&1; then
  port_pids="$(fuser "$FRONTEND_PORT/tcp" 2>/dev/null || true)"
fi
while IFS= read -r pid; do
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    echo "Next production 서버 포트 점유 프로세스 종료 요청: PID $pid"
  fi
done < <(printf "%s\n" $port_pids)

if [ -x "$DEPLOY_DIR/stop.sh" ]; then
  "$DEPLOY_DIR/stop.sh"
fi
