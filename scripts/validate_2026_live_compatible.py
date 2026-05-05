#!/usr/bin/env python3
"""Validate the live-compatible demand proxy model on 2026 transit observations."""

from __future__ import annotations

import json
import math
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import joblib
import numpy as np
import pandas as pd
from scipy.stats import pearsonr, spearmanr


MODEL_PATH = Path("data/processed/model_live_compatible/dong_demand_proxy_model.joblib")
METRICS_PATH = Path("data/processed/model_live_compatible/dong_demand_proxy_live_metrics.json")
PATTERN_CACHE_PATH = Path("data/processed/model_live_compatible/pattern_cache.json")
TRANSIT_PATH = Path("data/processed/transit/seoul_transit_dong_hourly_2026-03-01_2026-04-30.csv")
OUTPUT_PATH = Path("data/processed/model_live_compatible/validation_2026_q1.json")

WEATHER_FIELDS = [
    "temperature_c",
    "precipitation_mm",
    "wind_speed_ms",
    "humidity_pct",
    "sea_level_pressure_hpa",
    "snow_depth_cm",
    "cloud_total_tenths",
    "visibility_10m",
]

KOREAN_WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]
PUBLIC_HOLIDAYS = {
    "2026-03-01": "삼일절",
}
EPSILON = 1e-9


def now_kst_iso() -> str:
    return datetime.now(ZoneInfo("Asia/Seoul")).isoformat(timespec="seconds")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_model(path: Path) -> tuple[object, dict]:
    bundle = joblib.load(path)
    if isinstance(bundle, dict) and "pipeline" in bundle:
        return bundle["pipeline"], bundle
    return bundle, {}


def model_categories(pipeline: object, feature_columns: list[str]) -> dict[str, list]:
    try:
        transformer = pipeline.named_steps["preprocess"]
        categorical_columns = list(transformer.transformers_[1][2])
        onehot = transformer.named_transformers_["cat"].named_steps["onehot"]
    except Exception:
        return {}

    categories = {}
    for column, values in zip(categorical_columns, onehot.categories_, strict=False):
        if column in feature_columns:
            categories[column] = list(values)
    return categories


def calendar_context(service_date: pd.Timestamp, categories: dict[str, list]) -> dict:
    weekday_int = int(service_date.weekday())
    date_text = service_date.strftime("%Y-%m-%d")
    is_holiday_bool = date_text in PUBLIC_HOLIDAYS
    pattern_type = "holiday" if is_holiday_bool else ("weekend" if weekday_int >= 5 else "weekday")

    weekday_categories = categories.get("weekday", [])
    if any(value in weekday_categories for value in KOREAN_WEEKDAYS):
        weekday_value = KOREAN_WEEKDAYS[weekday_int]
    else:
        weekday_value = weekday_int

    day_type_categories = categories.get("day_type", [])
    if any(value in day_type_categories for value in ["평일", "주말", "주중"]):
        day_type_value = "주말" if weekday_int >= 5 else "평일"
    else:
        day_type_value = pattern_type

    holiday_categories = categories.get("is_holiday", [])
    if any(value in holiday_categories for value in ["Y", "N"]):
        holiday_value = "Y" if is_holiday_bool else "N"
    else:
        holiday_value = 1 if is_holiday_bool else 0

    return {
        "weekday_int": weekday_int,
        "weekday": weekday_value,
        "day_type": day_type_value,
        "is_holiday": holiday_value,
        "is_holiday_bool": is_holiday_bool,
        "pattern_type": pattern_type,
        "holiday_name": PUBLIC_HOLIDAYS.get(date_text, ""),
    }


def build_pattern_lookup(cache: dict) -> dict[tuple[str, int, int, str], dict]:
    lookup = {}
    for row in cache.get("patterns", []):
        lookup[
            (
                str(row["dong_name"]),
                int(row["month"]),
                int(row["hour"]),
                str(row["pattern_type"]),
            )
        ] = row
    return lookup


def pattern_for(
    lookup: dict[tuple[str, int, int, str], dict],
    dong_name: str,
    month: int,
    hour: int,
    pattern_type: str,
) -> dict:
    row = lookup.get((dong_name, month, hour, pattern_type))
    if row is not None:
        return row
    row = lookup.get((dong_name, month, hour, "weekday"))
    if row is not None:
        return row
    raise KeyError(f"Missing pattern row for {(dong_name, month, hour, pattern_type)}")


def build_feature_frame(
    observed: pd.DataFrame,
    feature_columns: list[str],
    cache: dict,
    categories: dict[str, list],
) -> pd.DataFrame:
    pattern_lookup = build_pattern_lookup(cache)
    static_lookup = cache.get("latest_by_dong", {})
    records = []

    for row in observed.itertuples(index=False):
        service_date = pd.Timestamp(row.service_date)
        hour = int(row.service_hour)
        dong_name = str(row.dong_name)
        calendar = calendar_context(service_date, categories)
        pattern = pattern_for(
            pattern_lookup,
            dong_name=dong_name,
            month=int(service_date.month),
            hour=hour,
            pattern_type=calendar["pattern_type"],
        )
        static = dict(static_lookup.get(dong_name) or {})
        if not static:
            raise KeyError(f"Missing static features for {dong_name}")

        feature_row = dict(static)
        for field in WEATHER_FIELDS:
            feature_row[field] = pattern.get(field, feature_row.get(field))
        feature_row.update(
            {
                "hour": hour,
                "dong_name": dong_name,
                "weekday": calendar["weekday"],
                "day_type": calendar["day_type"],
                "is_holiday": calendar["is_holiday"],
            }
        )
        records.append({column: feature_row.get(column) for column in feature_columns})

    frame = pd.DataFrame(records, columns=feature_columns)
    missing_columns = [column for column in feature_columns if column not in frame.columns]
    if missing_columns:
        raise SystemExit(f"Missing feature columns: {missing_columns}")
    return frame


def zscore(values: pd.Series) -> pd.Series | None:
    std = float(values.std(ddof=0))
    if not math.isfinite(std) or std <= EPSILON:
        return None
    return (values - float(values.mean())) / std


def safe_corr(func, x: np.ndarray, y: np.ndarray) -> tuple[float | None, float | None]:
    if len(x) < 3 or np.std(x) <= EPSILON or np.std(y) <= EPSILON:
        return None, None
    result = func(x, y)
    statistic = getattr(result, "statistic", result[0])
    pvalue = getattr(result, "pvalue", result[1])
    if not math.isfinite(float(statistic)):
        return None, None
    return float(statistic), float(pvalue) if math.isfinite(float(pvalue)) else None


def normalize_for_validation(frame: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    normalized_parts = []
    per_dong = {}

    for dong_name, group in frame.groupby("dong_name", sort=True):
        pred_norm = zscore(group["prediction"])
        obs_norm = zscore(group["observed_boardings"])
        if pred_norm is None or obs_norm is None:
            per_dong[dong_name] = {
                "spearman_r": None,
                "spearman_p": None,
                "row_count": int(len(group)),
                "skipped": True,
            }
            continue

        normalized = group.copy()
        normalized["prediction_norm"] = pred_norm.to_numpy()
        normalized["observed_norm"] = obs_norm.to_numpy()
        spearman_r, spearman_p = safe_corr(
            spearmanr,
            normalized["prediction_norm"].to_numpy(),
            normalized["observed_norm"].to_numpy(),
        )
        normalized_mape = float(
            np.mean(
                np.abs(normalized["prediction_norm"] - normalized["observed_norm"])
                / (np.abs(normalized["observed_norm"]) + 1e-6)
            )
            * 100
        )

        per_dong[dong_name] = {
            "spearman_r": spearman_r,
            "spearman_p": spearman_p,
            "row_count": int(len(normalized)),
            "normalized_mape_pct": normalized_mape,
        }
        normalized_parts.append(normalized)

    if not normalized_parts:
        raise SystemExit("No dong had enough variance for normalized validation.")
    return pd.concat(normalized_parts, ignore_index=True), per_dong


def main() -> None:
    metrics = read_json(METRICS_PATH)
    cache = read_json(PATTERN_CACHE_PATH)
    feature_columns = list(metrics["feature_columns"])
    pipeline, bundle = load_model(MODEL_PATH)
    categories = model_categories(pipeline, feature_columns)

    model_feature_columns = list(bundle.get("feature_columns", feature_columns))
    if model_feature_columns != feature_columns:
        raise SystemExit("Feature columns in metrics JSON do not match model bundle.")

    transit = pd.read_csv(TRANSIT_PATH)
    observed = transit[transit["service_key"] == "total"].copy()
    observed["service_date"] = pd.to_datetime(observed["service_date"]).dt.date.astype(str)
    observed["service_hour"] = observed["service_hour"].astype(int)
    observed["observed_boardings"] = observed["boardings"].astype(float)
    observed = observed.sort_values(["dong_name", "service_date", "service_hour"]).reset_index(drop=True)

    features = build_feature_frame(observed, feature_columns, cache, categories)
    observed["prediction"] = pipeline.predict(features)

    normalized, per_dong = normalize_for_validation(observed)
    overall_spearman_r, overall_spearman_p = safe_corr(
        spearmanr,
        normalized["prediction_norm"].to_numpy(),
        normalized["observed_norm"].to_numpy(),
    )
    overall_pearson_r, overall_pearson_p = safe_corr(
        pearsonr,
        normalized["prediction_norm"].to_numpy(),
        normalized["observed_norm"].to_numpy(),
    )

    dong_mapes = [
        row["normalized_mape_pct"]
        for row in per_dong.values()
        if row.get("normalized_mape_pct") is not None
    ]
    dong_spearman = [
        row["spearman_r"]
        for row in per_dong.values()
        if row.get("spearman_r") is not None
    ]
    output = {
        "generated_at": now_kst_iso(),
        "validation_dataset": str(TRANSIT_PATH),
        "model": str(MODEL_PATH),
        "metrics_spec": str(METRICS_PATH),
        "pattern_cache": str(PATTERN_CACHE_PATH),
        "note": (
            "Observed=raw transit boardings (bus+subway), "
            "Predicted=inbound_boardings_per_1k_pop proxy. Different units — "
            "compared via per-dong z-score normalization and rank correlation."
        ),
        "row_count": int(len(observed)),
        "normalized_row_count": int(len(normalized)),
        "dongs": sorted(observed["dong_name"].unique().tolist()),
        "date_range": {
            "start": str(observed["service_date"].min()),
            "end": str(observed["service_date"].max()),
        },
        "calendar": {
            "known_public_holidays": PUBLIC_HOLIDAYS,
            "model_categorical_encoding": categories,
        },
        "overall": {
            "spearman_r": overall_spearman_r,
            "spearman_p": overall_spearman_p,
            "pearson_r": overall_pearson_r,
            "pearson_p": overall_pearson_p,
            "per_dong_spearman_mean": float(np.mean(dong_spearman)) if dong_spearman else None,
            "normalized_mape_pct": float(np.mean(dong_mapes)) if dong_mapes else None,
        },
        "per_dong": per_dong,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("2026 live-compatible validation")
    print(f"- rows: {output['row_count']} ({output['date_range']['start']} ~ {output['date_range']['end']})")
    print(f"- dongs: {len(output['dongs'])}")
    print(f"- overall Spearman r: {overall_spearman_r:.4f} (p={overall_spearman_p:.3g})")
    print(f"- overall Pearson r: {overall_pearson_r:.4f} (p={overall_pearson_p:.3g})")
    print(f"- mean per-dong Spearman r: {output['overall']['per_dong_spearman_mean']:.4f}")
    print(f"- normalized MAPE: {output['overall']['normalized_mape_pct']:.2f}%")
    print("- per-dong Spearman:")
    for dong_name, row in per_dong.items():
        value = row.get("spearman_r")
        label = "skipped" if value is None else f"{value:.4f}"
        print(f"  - {dong_name}: {label} ({row['row_count']} rows)")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
