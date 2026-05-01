#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

START_YEAR=${1:-2023}
START_MONTH=${2:-01}
END_YEAR=${3:-2026}
END_MONTH=${4:-03}

year=$START_YEAR
month=$START_MONTH

while true; do
  ym=$(printf "%04d%02d" "$year" "$month")

  if [[ "$year" -gt "$END_YEAR" ]] || [[ "$year" -eq "$END_YEAR" && "$month" -gt "$END_MONTH" ]]; then
    break
  fi

  echo ""
  echo "===== $ym ====="
  SEOUL_DONG_MONTH=$ym SEOUL_SUBWAY_MONTH=$ym node scripts/fetch-seoul-dong-files.mjs

  month=$((10#$month + 1))
  if [[ "$month" -gt 12 ]]; then
    month=1
    year=$((year + 1))
  fi
done

echo ""
echo "===== 과거 수집 완료 ====="
