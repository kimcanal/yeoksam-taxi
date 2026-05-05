#!/usr/bin/env python3
"""Build a compact pattern cache for live-compatible demand inference.

The full dong-hour feature table is a local processed artifact and is too large
for frequent CI restores. This script compresses the historical pattern fallback
into monthly dong/hour/day buckets plus latest static values per dong.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd


DEFAULT_INPUT = "data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv"
DEFAULT_MODEL = "data/processed/model_live_compatible/dong_demand_proxy_model.joblib"
DEFAULT_OUTPUT = "data/processed/model_live_compatible/pattern_cache.json"

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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=DEFAULT_INPUT)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    return parser.parse_args()


def load_feature_columns(model_path: Path) -> list[str]:
    bundle = joblib.load(model_path)
    if not isinstance(bundle, dict) or "feature_columns" not in bundle:
        raise SystemExit(f"Expected model bundle with feature_columns: {model_path}")
    return list(bundle["feature_columns"])


def clean_value(value):
    if pd.isna(value):
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float):
        return round(value, 6)
    return value


def make_record(row: pd.Series, columns: list[str]) -> dict:
    return {column: clean_value(row[column]) for column in columns if column in row.index}


def clean_record(record: dict) -> dict:
    return {key: clean_value(value) for key, value in record.items()}


def grouped_records(
    df: pd.DataFrame,
    numeric_columns: list[str],
    pattern_type: str,
    mask: pd.Series,
) -> list[dict]:
    base = df[mask].copy()
    if base.empty:
        return []

    grouped = (
        base.groupby(["dong_name", "month", "hour"], dropna=False)[numeric_columns]
        .mean()
        .reset_index()
    )
    counts = (
        base.groupby(["dong_name", "month", "hour"], dropna=False)
        .size()
        .reset_index(name="sample_count")
    )
    grouped = grouped.merge(counts, on=["dong_name", "month", "hour"], how="left")
    grouped["pattern_type"] = pattern_type
    return [clean_record(record) for record in grouped.to_dict(orient="records")]


def varying_numeric_columns(df: pd.DataFrame, feature_columns: list[str]) -> list[str]:
    columns: list[str] = []
    for column in feature_columns:
        if column in {"dong_name", "month", "hour"}:
            continue
        if column not in df.columns or not pd.api.types.is_numeric_dtype(df[column]):
            continue
        max_unique_per_dong = df.groupby("dong_name")[column].nunique(dropna=True).max()
        if int(max_unique_per_dong) > 1:
            columns.append(column)
    return columns


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    model_path = Path(args.model)
    output_path = Path(args.output)

    feature_columns = load_feature_columns(model_path)

    df = pd.read_csv(input_path)
    df["datetime_kst"] = pd.to_datetime(df["datetime_kst"])
    df = df[df["dong_name"].isin(TARGET_DONGS)].copy()
    df = df.sort_values(["dong_name", "datetime_kst"]).reset_index(drop=True)
    df["month"] = df["datetime_kst"].dt.month
    latest_by_dong = {}
    latest_columns = sorted(set(feature_columns + ["datetime_kst", "dong_name"]))
    for dong, group in df.groupby("dong_name", sort=False):
        latest_by_dong[dong] = make_record(group.iloc[-1], latest_columns)

    pattern_numeric_columns = varying_numeric_columns(df, feature_columns)
    holiday_column = df["is_holiday"] if "is_holiday" in df.columns else pd.Series("N", index=df.index)
    weekday_mask = (df["day_type"] == "평일") & (holiday_column != "Y")
    weekend_mask = (df["day_type"] == "주말") & (holiday_column != "Y")
    holiday_mask = holiday_column == "Y"
    any_mask = pd.Series(True, index=df.index)

    patterns = []
    patterns.extend(grouped_records(df, pattern_numeric_columns, "weekday", weekday_mask))
    patterns.extend(grouped_records(df, pattern_numeric_columns, "weekend", weekend_mask))
    patterns.extend(grouped_records(df, pattern_numeric_columns, "holiday", holiday_mask))
    patterns.extend(grouped_records(df, pattern_numeric_columns, "any", any_mask))

    payload = {
        "schema_version": 1,
        "source": "historical_dong_hour_month_daytype_pattern_cache",
        "source_dataset": str(input_path),
        "model_path": str(model_path),
        "generated_at": pd.Timestamp.now(tz="Asia/Seoul").strftime("%Y-%m-%dT%H:%M:%S%z"),
        "target_dongs": TARGET_DONGS,
        "feature_columns": feature_columns,
        "pattern_numeric_columns": pattern_numeric_columns,
        "group_keys": ["dong_name", "month", "hour", "pattern_type"],
        "latest_by_dong": latest_by_dong,
        "patterns": patterns,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {output_path} ({len(patterns)} pattern rows)")


if __name__ == "__main__":
    main()
