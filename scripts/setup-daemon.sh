#!/usr/bin/env bash

# yeoksam-taxi systemd user daemon helper script
# This script manages installing, building, running, and monitoring the daemon.

set -euo pipefail

APP_DIR="/home/sogang055@SGVDI.local/yeoksam-taxi"
SERVICE_NAME="yeoksam-taxi"
SYSTEMD_USER_DIR="${HOME}/.config/systemd/user"
SERVICE_FILE="${SYSTEMD_USER_DIR}/${SERVICE_NAME}.service"

# Move to the app root directory
cd "${APP_DIR}"

print_usage() {
  cat <<EOF
Usage: $0 [command]

Commands:
  setup    - Install systemd user service file with correct Node path and cert.pem.
  build    - Run production build (npm run build) of Next.js.
  start    - Enable and start the background daemon.
  stop     - Stop the background daemon.
  restart  - Restart the background daemon.
  status   - View current status of the daemon.
  logs     - Tail real-time logs of the daemon.
  linger   - Enable systemd lingering to keep daemon running even when logged out.
  help     - Show this help message.
EOF
}

check_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "[-] Error: Node.js is not found in PATH." >&2
    exit 1
  fi
}

cmd_setup() {
  check_node
  local node_path
  node_path=$(command -v node)
  
  echo "[+] Setting up systemd user service directory..."
  mkdir -p "${SYSTEMD_USER_DIR}"

  echo "[+] Creating systemd user service file: ${SERVICE_FILE}"
  cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=Yeoksam Taxi Web Application (Port 8000)
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=8000
Environment=NODE_EXTRA_CA_CERTS=${APP_DIR}/cert.pem
ExecStart=${node_path} ${APP_DIR}/scripts/run-next.mjs start --no-open --port 8000 --host 0.0.0.0
Restart=always
RestartSec=5
StandardOutput=append:${APP_DIR}/daemon.log
StandardError=append:${APP_DIR}/daemon.log

[Install]
WantedBy=default.target
EOF

  echo "[+] Reloading systemd user daemon..."
  systemctl --user daemon-reload

  echo "[+] Systemd service successfully created!"
  echo "    You can start it with: $0 start"
}

cmd_build() {
  echo "[+] Building the Next.js production bundle..."
  npm run build
}

cmd_start() {
  if [ ! -f "${SERVICE_FILE}" ]; then
    echo "[!] Service file not found. Running setup first..."
    cmd_setup
  fi

  echo "[+] Enabling and starting ${SERVICE_NAME} daemon..."
  systemctl --user enable --now "${SERVICE_NAME}"
  
  echo "[+] Daemon start requested. Checking status..."
  sleep 1.5
  systemctl --user status "${SERVICE_NAME}" || true
}

cmd_stop() {
  echo "[+] Stopping ${SERVICE_NAME} daemon..."
  systemctl --user stop "${SERVICE_NAME}"
  systemctl --user disable "${SERVICE_NAME}"
  echo "[+] Daemon stopped."
}

cmd_restart() {
  echo "[+] Restarting ${SERVICE_NAME} daemon..."
  systemctl --user restart "${SERVICE_NAME}"
  sleep 1
  systemctl --user status "${SERVICE_NAME}" || true
}

cmd_status() {
  systemctl --user status "${SERVICE_NAME}"
}

cmd_logs() {
  local log_file="${APP_DIR}/daemon.log"
  if [ ! -f "${log_file}" ]; then
    touch "${log_file}"
  fi
  echo "[+] Tailing logs for ${SERVICE_NAME} from ${log_file} (Ctrl+C to exit)..."
  tail -n 100 -f "${log_file}"
}

cmd_linger() {
  local current_user
  current_user=$(whoami)
  echo "[+] Enabling systemd user lingering for user: ${current_user}"
  echo "    This allows the daemon to start on boot and run without active login."
  sudo loginctl enable-linger "${current_user}" || {
    echo "[!] Failed to run sudo loginctl. Trying without sudo..."
    loginctl enable-linger "${current_user}"
  }
}

if [ $# -lt 1 ]; then
  print_usage
  exit 1
fi

case "$1" in
  setup) cmd_setup ;;
  build) cmd_build ;;
  start) cmd_start ;;
  stop) cmd_stop ;;
  restart) cmd_restart ;;
  status) cmd_status ;;
  logs) cmd_logs ;;
  linger) cmd_linger ;;
  help|--help|-h) print_usage ;;
  *)
    echo "[-] Unknown command: $1" >&2
    print_usage
    exit 1
    ;;
esac
