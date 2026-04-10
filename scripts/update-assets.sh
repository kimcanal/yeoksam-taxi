#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_step() {
  local index="$1"
  local total="$2"
  local script_name="$3"
  local description="$4"

  echo
  echo "[$index/$total] $description"
  echo "Running: npm run $script_name"
  npm run "$script_name"
}

echo "yeoksam-taxi asset updater"
echo "This may take a few minutes because Overpass mirrors can rate-limit or retry."
echo "When a fetch step can reuse a cached local file, the pipeline keeps going."

run_step 1 7 "fetch:dongs" "Refresh dong boundaries"
run_step 2 7 "fetch:buildings" "Refresh building geometry"
run_step 3 7 "fetch:non-road" "Refresh non-road surfaces"
run_step 4 7 "fetch:roads" "Refresh roads and routing source geometry"
run_step 5 7 "fetch:road-network" "Regenerate the derived road graph asset"
run_step 6 7 "fetch:traffic-signals" "Refresh traffic signal points"
run_step 7 7 "fetch:transit" "Refresh transit landmarks"

echo
echo "Asset refresh complete."
