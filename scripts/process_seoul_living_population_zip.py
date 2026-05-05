#!/usr/bin/env python3
"""Filter Seoul local population monthly ZIPs to the 9 target dongs."""

from __future__ import annotations

import argparse
import csv
import io
import json
from collections import Counter
from pathlib import Path
from zipfile import ZipFile


TARGET_DONG_IDS = {
    "11680510": "신사동",
    "11680521": "논현1동",
    "11680531": "논현2동",
    "11680565": "청담동",
    "11680580": "삼성1동",
    "11680590": "삼성2동",
    "11680630": "대치4동",
    "11680640": "역삼1동",
    "11680650": "역삼2동",
}

CSV_ENCODINGS = ["utf-8-sig", "cp949", "euc-kr"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--period", required=True, help="YYYY-MM")
    parser.add_argument("--zip", required=True, dest="zip_path")
    parser.add_argument("--out-dir", default="data/processed/living_population")
    return parser.parse_args()


def normalize_date(value: str) -> str:
    text = "".join(ch for ch in str(value) if ch.isdigit())
    return f"{text[:4]}-{text[4:6]}-{text[6:8]}"


def to_float(value: str | None) -> float:
    if value in (None, ""):
        return 0.0
    try:
        return float(value)
    except ValueError:
        return 0.0


def row_value(row: dict, expected_key: str) -> str:
    value = row.get(expected_key)
    if value is not None:
        return value
    for key, candidate in row.items():
        if key and expected_key in key:
            return candidate
    return ""


def age_bucket_sum(row: dict, buckets: list[str]) -> float:
    total = 0.0
    for key, value in row.items():
        if key is None:
            continue
        if any(bucket in key for bucket in buckets):
            total += to_float(value)
    return total


def decode_csv_bytes(raw: bytes) -> tuple[str, str]:
    for encoding in CSV_ENCODINGS:
        try:
            return raw.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace"), "utf-8-replace"


def main() -> None:
    args = parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    source_rows = 0
    matched_rows = 0
    dates = set()
    encoding_counts: Counter[str] = Counter()

    with ZipFile(args.zip_path) as zf:
        csv_names = [name for name in zf.namelist() if name.lower().endswith(".csv")]
        for name in csv_names:
            text, encoding = decode_csv_bytes(zf.read(name))
            encoding_counts[encoding] += 1
            reader = csv.DictReader(io.StringIO(text, newline=""))
            for row in reader:
                source_rows += 1
                dong_id = str(row_value(row, "행정동코드")).strip()
                dong_name = TARGET_DONG_IDS.get(dong_id)
                if not dong_name:
                    continue

                matched_rows += 1
                date = normalize_date(row_value(row, "기준일ID"))
                dates.add(date)
                hour = int(str(row_value(row, "시간대구분")).strip() or 0)
                total = to_float(row_value(row, "총생활인구수"))
                rows.append(
                    {
                        "date": date,
                        "hour": hour,
                        "dong_id": dong_id,
                        "dong_name": dong_name,
                        "living_population_total": round(total, 4),
                        "living_population_20s": round(
                            age_bucket_sum(row, ["20세부터24세", "25세부터29세"]),
                            4,
                        ),
                        "living_population_30s": round(
                            age_bucket_sum(row, ["30세부터34세", "35세부터39세"]),
                            4,
                        ),
                        "living_population_40s": round(
                            age_bucket_sum(row, ["40세부터44세", "45세부터49세"]),
                            4,
                        ),
                        "living_population_50s": round(
                            age_bucket_sum(row, ["50세부터54세", "55세부터59세"]),
                            4,
                        ),
                    }
                )

    rows.sort(key=lambda item: (item["date"], item["hour"], item["dong_name"]))
    output_csv = out_dir / f"seoul_living_population_dong_hourly_{args.period}.csv"
    fieldnames = [
        "date",
        "hour",
        "dong_id",
        "dong_name",
        "living_population_total",
        "living_population_20s",
        "living_population_30s",
        "living_population_40s",
        "living_population_50s",
    ]
    with output_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    meta = {
        "source": "행정동 단위 서울 생활인구(내국인) OA-14991",
        "period": args.period,
        "source_zip": args.zip_path,
        "source_rows_scanned": source_rows,
        "source_file_encoding_counts": dict(encoding_counts),
        "matched_rows": matched_rows,
        "output_rows": len(rows),
        "date_count": len(dates),
        "min_date": min(dates) if dates else None,
        "max_date": max(dates) if dates else None,
        "covered_dongs": sorted({row["dong_name"] for row in rows}),
        "output_csv": str(output_csv),
        "notes": [
            "Source is true administrative-dong hourly local population.",
            "Only Korean domestic local population is included.",
            "Use total population for normalization features.",
        ],
    }
    meta_path = out_dir / f"seoul_living_population_dong_hourly_{args.period}.meta.json"
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {output_csv} ({len(rows)} rows)")
    print(f"Wrote {meta_path}")
    print(f"Scanned {source_rows:,} rows, matched {matched_rows:,} rows")


if __name__ == "__main__":
    main()
