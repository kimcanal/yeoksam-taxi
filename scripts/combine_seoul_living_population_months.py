#!/usr/bin/env python3
"""Combine monthly Seoul living population CSVs for target dongs."""

from __future__ import annotations

import argparse
import calendar
import csv
import json
from pathlib import Path


TARGET_DONG_COUNT = 9
HOURS_PER_DAY = 24


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2023-01")
    parser.add_argument("--end", default="2025-12")
    parser.add_argument("--input-dir", default="data/processed/living_population")
    return parser.parse_args()


def periods_between(start: str, end: str) -> list[str]:
    start_year = int(start.split("-")[0])
    end_year = int(end.split("-")[0])
    periods = []
    for year in range(start_year, end_year + 1):
        for month in range(1, 13):
            period = f"{year}-{month:02d}"
            if start <= period <= end:
                periods.append(period)
    return periods


def expected_rows(period: str) -> int:
    year, month = (int(part) for part in period.split("-"))
    return calendar.monthrange(year, month)[1] * HOURS_PER_DAY * TARGET_DONG_COUNT


def load_meta(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    args = parse_args()
    input_dir = Path(args.input_dir)
    output_csv = input_dir / f"seoul_living_population_dong_hourly_{args.start}_{args.end}.csv"
    summary_csv = input_dir / f"seoul_living_population_collection_summary_{args.start}_{args.end}.csv"
    summary_json = input_dir / f"seoul_living_population_collection_summary_{args.start}_{args.end}.json"

    months = []
    total_rows = 0
    wrote_header = False

    with output_csv.open("w", newline="", encoding="utf-8") as combined:
      writer = None
      for period in periods_between(args.start, args.end):
          csv_path = input_dir / f"seoul_living_population_dong_hourly_{period}.csv"
          meta_path = input_dir / f"seoul_living_population_dong_hourly_{period}.meta.json"
          meta = load_meta(meta_path)
          exp_rows = expected_rows(period)
          issues = []

          if not csv_path.exists():
              months.append({
                  "period": period,
                  "ok": False,
                  "expected_rows": exp_rows,
                  "output_rows": 0,
                  "date_count": 0,
                  "min_date": None,
                  "max_date": None,
                  "covered_dong_count": 0,
                  "issues": ["missing_csv"],
              })
              continue

          output_rows = 0
          with csv_path.open(newline="", encoding="utf-8") as handle:
              reader = csv.DictReader(handle)
              if writer is None:
                  writer = csv.DictWriter(combined, fieldnames=reader.fieldnames)
              if not wrote_header:
                  writer.writeheader()
                  wrote_header = True
              for row in reader:
                  writer.writerow(row)
                  output_rows += 1

          covered_dong_count = len(meta.get("covered_dongs") or [])
          date_count = int(meta.get("date_count") or 0)
          if output_rows != exp_rows:
              issues.append("row_count_mismatch")
          if covered_dong_count != TARGET_DONG_COUNT:
              issues.append("dong_coverage_mismatch")

          months.append({
              "period": period,
              "ok": not issues,
              "expected_rows": exp_rows,
              "output_rows": output_rows,
              "date_count": date_count,
              "min_date": meta.get("min_date"),
              "max_date": meta.get("max_date"),
              "covered_dong_count": covered_dong_count,
              "source_rows_scanned": int(meta.get("source_rows_scanned") or 0),
              "matched_rows": int(meta.get("matched_rows") or 0),
              "issues": issues,
          })
          total_rows += output_rows

    with summary_csv.open("w", newline="", encoding="utf-8") as handle:
        fieldnames = [
            "period",
            "ok",
            "expected_rows",
            "output_rows",
            "date_count",
            "min_date",
            "max_date",
            "covered_dong_count",
            "source_rows_scanned",
            "matched_rows",
            "issues",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for month in months:
            row = dict(month)
            row["issues"] = ";".join(row["issues"])
            writer.writerow(row)

    summary = {
        "source": "행정동 단위 서울 생활인구(내국인) OA-14991",
        "range": {"start": args.start, "end": args.end},
        "output_csv": str(output_csv),
        "summary_csv": str(summary_csv),
        "month_count": len(months),
        "ok_month_count": sum(1 for month in months if month["ok"]),
        "issue_months": [month for month in months if not month["ok"]],
        "total_output_rows": total_rows,
        "months": months,
    }
    summary_json.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output_csv} ({total_rows:,} rows)")
    print(f"Wrote {summary_csv}")
    print(f"Wrote {summary_json}")
    print(f"OK months: {summary['ok_month_count']} / {summary['month_count']}")


if __name__ == "__main__":
    main()
