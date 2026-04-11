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
EOF
}

prompt_script() {
  while true; do
    echo >&2
    read -r -p "Choose an npm script to run: " choice

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

collect_ipv4_addresses() {
  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | tr ' ' '\n'
    return
  fi

  if command -v ip >/dev/null 2>&1; then
    ip -4 addr show scope global 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1
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

  mapfile -t detected_ips < <(collect_ipv4_addresses | awk 'NF' | sort -u)

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

  echo
  echo "Access URLs"
  echo "  this machine : http://localhost:$port"
  if [[ -n "$access_host" ]]; then
    echo "  external     : http://$access_host:$port"
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
    echo "  1) Open immediately on default port 3000" >&2
    echo "  2) Open on a specific port (press Enter for 8000, useful on VDI)" >&2
    read -r -p "Choose port mode: " port_mode

    case "${port_mode}" in
      1 | default | 3000 | "")
        echo "3000"
        return
        ;;
      2 | custom)
        read -r -p "Port number [8000]: " custom_port
        custom_port="${custom_port:-8000}"
        if validate_port "$custom_port"; then
          echo "$custom_port"
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

ensure_build_if_needed() {
  if [[ ! -f ".next/BUILD_ID" ]]; then
    echo
    echo "No production build found. 'npm run start' needs a fresh build first."
    read -r -p "Run 'npm run build' now? [Y/n]: " run_build

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

run_npm_script() {
  local script_name="$1"

  if [[ "$script_name" == "dev" || "$script_name" == "start" ]]; then
    local port
    local bind_host
    local access_host
    port="$(prompt_port)"
    bind_host="${LAUNCH_BIND_HOST:-0.0.0.0}"
    access_host="$(select_access_host)"

    if [[ "$script_name" == "start" ]]; then
      ensure_build_if_needed
    fi

    print_access_urls "$port" "$bind_host" "$access_host"
    echo
    echo "Running: npm run $script_name -- --hostname $bind_host --port $port"
    exec npm run "$script_name" -- --hostname "$bind_host" --port "$port"
  fi

  echo
  echo "Running: npm run $script_name"
  exec npm run "$script_name"
}

print_header
selected_script="$(prompt_script)"
run_npm_script "$selected_script"
