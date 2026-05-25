#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

print_header() {
  cat <<'EOF'
yeoksam-taxi launcher

npm run options
  1) dev       - development server with HMR. Best for active coding.
  2) start     - production server. Uses the latest build output.
  3) build     - production build only. Does not start a server.
  4) lint      - ESLint check only.
  5) asset:update - refresh local OSM snapshot assets. Can take a few minutes.
  q) quit

For dev/start, the launcher binds Next.js to 0.0.0.0 by default.
That keeps localhost working on this machine while still allowing access from other devices.
The launcher opens http://localhost:<port>/map after the server is ready.
EOF
}

prompt_script() {
  while true; do
    echo >&2
    if ! read -r -p "Choose an npm script to run: " choice; then
      echo "Cancelled."
      exit 1
    fi

    case "${choice}" in
      1 | dev)
        echo "dev"
        return
        ;;
      2 | start)
        echo "start"
        return
        ;;
      3 | build)
        echo "build"
        return
        ;;
      4 | lint)
        echo "lint"
        return
        ;;
      5 | asset:update | fetch:map)
        echo "asset:update"
        return
        ;;
      q | Q | quit | exit)
        exit 0
        ;;
      *)
        echo "Invalid choice. Pick 1-5 or q." >&2
        ;;
    esac
  done
}

validate_port() {
  local candidate="$1"

  if [[ ! "$candidate" =~ ^[0-9]+$ ]]; then
    return 1
  fi

  if (( candidate < 1 || candidate > 65535 )); then
    return 1
  fi

  return 0
}

port_is_busy() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
    return
  fi

  return 1
}

collect_ipv4_addresses() {
  local hostname_ips

  if command -v hostname >/dev/null 2>&1; then
    hostname_ips="$(hostname -I 2>/dev/null || true)"
    if [[ -n "$hostname_ips" ]]; then
      printf '%s\n' "$hostname_ips" | tr ' ' '\n'
      return
    fi
  fi

  if command -v ip >/dev/null 2>&1; then
    ip -4 addr show scope global 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1
    return
  fi

  if command -v ifconfig >/dev/null 2>&1; then
    ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2}'
  fi
}

is_private_ipv4() {
  local ip="$1"

  case "$ip" in
    10.* | 192.168.* | 172.1[6-9].* | 172.2[0-9].* | 172.3[0-1].*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

select_access_host() {
  local -a detected_ips=()
  local -a private_ips=()
  local -a public_ips=()
  local ip

  if [[ -n "${LAUNCH_ACCESS_HOST:-}" ]]; then
    echo "$LAUNCH_ACCESS_HOST"
    return
  fi

  while IFS= read -r ip; do
    detected_ips+=("$ip")
  done < <(collect_ipv4_addresses | awk 'NF' | sort -u)

  for ip in "${detected_ips[@]}"; do
    if is_private_ipv4 "$ip"; then
      private_ips+=("$ip")
    else
      public_ips+=("$ip")
    fi
  done

  if (( ${#private_ips[@]} > 0 )); then
    echo "${private_ips[0]}"
    return
  fi

  if (( ${#public_ips[@]} > 0 )); then
    echo "${public_ips[0]}"
    return
  fi

  echo ""
}

print_access_urls() {
  local port="$1"
  local bind_host="$2"
  local access_host="$3"
  local launch_path="$4"

  echo
  echo "Access URLs"
  echo "  this machine : http://localhost:$port$launch_path"
  if [[ -n "$access_host" ]]; then
    echo "  external     : http://$access_host:$port$launch_path"
  else
    echo "  external     : auto-detect unavailable"
  fi
  echo "  bind         : $bind_host"

  echo
  if [[ "$bind_host" == "0.0.0.0" ]]; then
    echo "Next listens on every interface."
    echo "If your VDI/firewall only exposes port 8000, use the external URL above with port 8000."
  else
    echo "Next listens only on the bind address above."
  fi

  echo
  echo "Note: Next.js labels below are its own banner."
  echo "When binding to 0.0.0.0, Next may still show 0.0.0.0 in its Network line."
}

prompt_port() {
  while true; do
    echo >&2
    echo "Port mode" >&2
    echo "  1) Start on default port 3000 and open /map" >&2
    echo "  2) Start on a specific port (press Enter for 8000, useful on VDI)" >&2
    if ! read -r -p "Choose port mode: " port_mode; then
      echo "Cancelled."
      exit 1
    fi

    case "${port_mode}" in
      1 | default | 3000 | "")
        choose_available_port "3000"
        return
        ;;
      2 | custom)
        if ! read -r -p "Port number [8000]: " custom_port; then
          echo "Cancelled."
          exit 1
        fi
        custom_port="${custom_port:-8000}"
        if validate_port "$custom_port"; then
          choose_available_port "$custom_port"
          return
        fi
        echo "Port must be a number between 1 and 65535." >&2
        ;;
      *)
        echo "Invalid choice. Pick 1 or 2." >&2
        ;;
    esac
  done
}

choose_available_port() {
  local port="$1"
  local alternate_port

  if ! port_is_busy "$port"; then
    echo "$port"
    return
  fi

  alternate_port="$((port + 1))"
  while validate_port "$alternate_port" && port_is_busy "$alternate_port"; do
    alternate_port="$((alternate_port + 1))"
  done

  if ! validate_port "$alternate_port"; then
    echo "Port $port is already in use, and no nearby free port was found." >&2
    exit 1
  fi

  echo "Port $port is already in use." >&2
  if ! read -r -p "Use port $alternate_port instead? [Y/n]: " use_alternate; then
    echo "Cancelled."
    exit 1
  fi

  case "${use_alternate:-Y}" in
    y | Y | yes | YES)
      echo "$alternate_port"
      ;;
    *)
      echo "Cancelled."
      exit 1
      ;;
  esac
}

ensure_build_if_needed() {
  if [[ ! -f ".next/BUILD_ID" ]]; then
    echo
    echo "No production build found. 'npm run start' needs a fresh build first."
    if ! read -r -p "Run 'npm run build' now? [Y/n]: " run_build; then
      echo "Cancelled."
      exit 1
    fi

    case "${run_build:-Y}" in
      y | Y | yes | YES)
        npm run build
        ;;
      *)
        echo "Cancelled."
        exit 1
        ;;
    esac
  fi
}

open_url_when_ready() {
  local url="$1"
  local attempt

  if [[ "${LAUNCH_OPEN:-1}" == "0" ]]; then
    return
  fi

  (
    for attempt in $(seq 1 80); do
      if command -v curl >/dev/null 2>&1; then
        if curl -fsS "$url" >/dev/null 2>&1; then
          break
        fi
      fi
      sleep 0.5
    done

    if command -v open >/dev/null 2>&1; then
      open "$url" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$url" >/dev/null 2>&1 || true
    else
      echo "Browser auto-open unavailable. Open this URL manually: $url" >&2
    fi
  ) &
}

run_npm_script() {
  local script_name="$1"

  if [[ "$script_name" == "dev" || "$script_name" == "start" ]]; then
    local port
    local bind_host
    local access_host
    local launch_path
    local local_url
    port="$(prompt_port)"
    bind_host="${LAUNCH_BIND_HOST:-0.0.0.0}"
    access_host="$(select_access_host)"
    launch_path="${LAUNCH_PATH:-/map}"
    local_url="http://localhost:$port$launch_path"

    if [[ "$script_name" == "start" ]]; then
      ensure_build_if_needed
    fi

    print_access_urls "$port" "$bind_host" "$access_host" "$launch_path"
    echo
    echo "Opening when ready: $local_url"
    echo "Running: npm run $script_name -- --hostname $bind_host --port $port"
    open_url_when_ready "$local_url"
    exec npm run "$script_name" -- --hostname "$bind_host" --port "$port"
  fi

  echo
  echo "Running: npm run $script_name"
  exec npm run "$script_name"
}

print_header
selected_script="$(prompt_script)"
run_npm_script "$selected_script"
