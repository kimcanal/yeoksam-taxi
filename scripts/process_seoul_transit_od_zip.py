#!/usr/bin/env python3
"""Aggregate Seoul dong-level public-transit OD ZIP files for target dongs.

The OA-21226 files are monthly ZIP files containing one daily CSV per service
date. Each CSV is origin-dong x destination-dong with 24 hourly passenger
columns. This script streams the ZIP without extracting it and writes a compact
dong-hour table for the 9 target Gangnam dongs.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
from collections import Counter
from pathlib import Path
from zipfile import ZipFile


TARGET_DONG_IDS = {
    "신사동": {"1123051", "11230510"},
    "논현1동": {"1123052", "11230520"},
    "논현2동": {"1123053", "11230530"},
    "삼성1동": {"1123058", "11230580"},
    "삼성2동": {"1123059", "11230590"},
    "대치4동": {"1123063", "11230630"},
    "역삼1동": {"1123064", "11230640"},
    "역삼2동": {"1123065", "11230650"},
    "청담동": {"1123078", "11230780"},
}

ID_TO_DONG = {
    dong_id: dong_name
    for dong_name, ids in TARGET_DONG_IDS.items()
    for dong_id in ids
}

TARGET_DONGS = [
    "논현1동",
    "논현2동",
    "대치4동",
    "삼성1동",
    "삼성2동",
    "신사동",
    "역삼1동",
    "역삼2동",
    "청담동",
]

CSV_ENCODINGS = ["utf-8-sig", "cp949", "euc-kr"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--period", required=True, help="YYYY-MM")
    parser.add_argument("--zip", required=True, dest="zip_path")
    parser.add_argument("--out-dir", default="data/processed/transit_od")
    return parser.parse_args()


def normalize_date(value: str) -> str:
    text = "".join(ch for ch in str(value) if ch.isdigit())
    return f"{text[:4]}-{text[4:6]}-{text[6:8]}"


def to_int(value: str | None) -> int:
    if value in (None, ""):
        return 0
    try:
        return int(float(value))
    except ValueError:
        return 0


def decode_csv_bytes(raw: bytes) -> tuple[str, str]:
    for encoding in CSV_ENCODINGS:
        try:
            return raw.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace"), "utf-8-replace"


def empty_hour_row(date: str, hour: int, dong_name: str) -> dict:
    return {
        "date": date,
        "hour": hour,
        "dong_name": dong_name,
        "outbound_boardings": 0,
        "inbound_boardings": 0,
        "within_target_outbound_boardings": 0,
        "within_target_inbound_boardings": 0,
        "source_od_rows": 0,
        "nonzero_od_rows": 0,
    }


def main() -> None:
    args = parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    aggregate: dict[tuple[str, int, str], dict] = {}
    source_files: list[str] = []
    source_rows = 0
    matched_rows = 0
    dates: set[str] = set()
    encoding_counts: Counter[str] = Counter()

    with ZipFile(args.zip_path) as zf:
        for name in sorted(zf.namelist()):
            if not name.lower().endswith(".csv"):
                continue
            source_files.append(name)
            text, encoding = decode_csv_bytes(zf.read(name))
            encoding_counts[encoding] += 1
            reader = csv.DictReader(io.StringIO(text, newline=""))
            for row in reader:
                source_rows += 1
                origin_id = row.get("시작_행정동_ID", "").strip()
                dest_id = row.get("종료_행정동_ID", "").strip()
                origin_dong = ID_TO_DONG.get(origin_id)
                dest_dong = ID_TO_DONG.get(dest_id)
                if not origin_dong and not dest_dong:
                    continue

                matched_rows += 1
                date = normalize_date(row.get("기준_날짜", ""))
                dates.add(date)

                for hour in range(24):
                    count = to_int(row.get(f"승객_수_{hour:02d}"))
                    if origin_dong:
                        key = (date, hour, origin_dong)
                        agg = aggregate.setdefault(key, empty_hour_row(date, hour, origin_dong))
                        agg["outbound_boardings"] += count
                        agg["source_od_rows"] += 1
                        if count:
                            agg["nonzero_od_rows"] += 1
                        if dest_dong:
                            agg["within_target_outbound_boardings"] += count

                    if dest_dong:
                        key = (date, hour, dest_dong)
                        agg = aggregate.setdefault(key, empty_hour_row(date, hour, dest_dong))
                        agg["inbound_boardings"] += count
                        if not origin_dong:
                            agg["source_od_rows"] += 1
                            if count:
                                agg["nonzero_od_rows"] += 1
                        if origin_dong:
                            agg["within_target_inbound_boardings"] += count

    # Fill zero rows for every observed date/hour/dong so joins are stable.
    for date in dates:
        for hour in range(24):
            for dong_name in TARGET_DONGS:
                aggregate.setdefault((date, hour, dong_name), empty_hour_row(date, hour, dong_name))

    rows = []
    for row in aggregate.values():
        row["net_inbound_boardings"] = row["inbound_boardings"] - row["outbound_boardings"]
        rows.append(row)
    rows.sort(key=lambda item: (item["date"], item["hour"], item["dong_name"]))

    output_path = out_dir / f"seoul_transit_od_dong_hourly_{args.period}.csv"
    fieldnames = [
        "date",
        "hour",
        "dong_name",
        "outbound_boardings",
        "inbound_boardings",
        "net_inbound_boardings",
        "within_target_outbound_boardings",
        "within_target_inbound_boardings",
        "source_od_rows",
        "nonzero_od_rows",
    ]
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    covered_dongs = sorted({row["dong_name"] for row in rows})
    meta = {
        "source": "서울시 행정동 단위 대중교통 출발지/도착지 승객수 정보 OA-21226",
        "period": args.period,
        "source_zip": args.zip_path,
        "source_file_count": len(source_files),
        "source_file_encoding_counts": dict(encoding_counts),
        "source_rows_scanned": source_rows,
        "matched_od_rows": matched_rows,
        "output_rows": len(rows),
        "date_count": len(dates),
        "min_date": min(dates) if dates else None,
        "max_date": max(dates) if dates else None,
        "covered_dongs": covered_dongs,
        "output_csv": str(output_path),
        "notes": [
            "Source is origin-dong x destination-dong x 24 hourly columns.",
            "Output is compact dong-hour aggregation for 9 target Gangnam dongs.",
            "outbound_boardings means trips starting in the dong.",
            "inbound_boardings means trips ending in the dong.",
            "within_target_* columns count trips where both origin and destination are in the 9 target dongs.",
        ],
    }
    meta_path = out_dir / f"seoul_transit_od_dong_hourly_{args.period}.meta.json"
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {output_path} ({len(rows)} rows)")
    print(f"Wrote {meta_path}")
    print(f"Scanned {source_rows:,} rows, matched {matched_rows:,} rows")


if __name__ == "__main__":
    main()
