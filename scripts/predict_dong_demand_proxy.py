#!/usr/bin/env python3
"""Generate map-ready dong demand proxy forecasts from the trained model.

The trained model predicts t+1h from features at time t. Therefore, when a user
asks for demand at TARGET_DATETIME, this script uses feature rows at:

    TARGET_DATETIME - horizon_hours

If exact historical feature rows exist, they are used directly. If not, the
script builds approximate feature rows from historical rows with the same
dong/hour/day type. This fallback is useful for future demo dates, but it should
be described as pattern-based prediction rather than observed-feature prediction.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


DEFAULT_DATASET = "data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv"
DEFAULT_MODEL = "data/processed/model/dong_demand_proxy_model.joblib"
DEFAULT_OUT = "public/forecast/latest.json"
DEFAULT_HOLIDAYS = "data/processed/calendar/korean_public_holidays_2023_2026.csv"
DEFAULT_PATTERN_CACHE = "data/processed/model_live_compatible/pattern_cache.json"

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
    parser.add_argument(
        "target_datetime",
        help="Forecast target datetime, e.g. '2025-03-10 18:00' or '2025-03-10T18:00:00+09:00'.",
    )
    parser.add_argument("--dataset", default=DEFAULT_DATASET)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--holidays", default=DEFAULT_HOLIDAYS)
    parser.add_argument(
        "--pattern-cache",
        default=DEFAULT_PATTERN_CACHE,
        help="Optional compact pattern cache used when the full feature table is unavailable.",
    )
    parser.add_argument(
        "--weather-snapshot",
        default=None,
        help="Optional latest KMA nowcast JSON. Overrides weather columns in generated rows.",
    )
    parser.add_argument("--out", default=DEFAULT_OUT)
    parser.add_argument(
        "--strategy",
        choices=["auto", "exact", "pattern"],
        default="auto",
        help="exact uses observed feature rows. pattern uses historical same-hour averages. auto tries exact first.",
    )
    parser.add_argument(
        "--write-public",
        action="store_true",
        help="Write to public/forecast/latest.json. Without this, --out is still written if explicitly set.",
    )
    return parser.parse_args()


def parse_kst_naive(value: str) -> pd.Timestamp:
    timestamp = pd.Timestamp(value)
    if timestamp.tzinfo is not None:
        timestamp = timestamp.tz_convert("Asia/Seoul").tz_localize(None)
    return timestamp.floor("h")


def normalize_scores(values: list[float]) -> list[float]:
    arr = np.asarray(values, dtype=float)
    min_value = float(np.min(arr))
    max_value = float(np.max(arr))
    if math.isclose(min_value, max_value):
        return [0.5 for _ in arr]
    return [float((value - min_value) / (max_value - min_value)) for value in arr]


def day_type_for(timestamp: pd.Timestamp) -> str:
    return "주말" if timestamp.weekday() >= 5 else "평일"


def weekday_label(timestamp: pd.Timestamp) -> str:
    return ["월", "화", "수", "목", "금", "토", "일"][timestamp.weekday()]


def weather_label(row: pd.Series) -> str:
    if float(row.get("snow_depth_cm") or 0) >= 0.5:
        return "snow"
    if float(row.get("precipitation_mm") or 0) > 0:
        return "rain"
    return "clear"


def parse_float(value) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text in {"강수없음", "없음", "-"}:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return None


def load_model_bundle(path: Path) -> tuple[object, list[str], str, int, str | None]:
    bundle = joblib.load(path)
    if isinstance(bundle, dict):
        return (
            bundle["pipeline"],
            list(bundle["feature_columns"]),
            str(bundle["target_col"]),
            int(bundle.get("horizon_hours", 1)),
            bundle.get("feature_set"),
        )

    raise TypeError(
        "Expected model joblib produced by scripts/train_dong_demand_proxy.py. "
        "Run `npm run model:train:demand-proxy` locally first."
    )


def load_holidays(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}

    holidays: dict[str, dict[str, str]] = {}
    frame = pd.read_csv(path)
    for date, group in frame.groupby("date", sort=False):
        names = [
            str(name)
            for name in group.get("date_name", pd.Series(dtype=str)).dropna().tolist()
            if str(name)
        ]
        holidays[str(date)] = {
            "is_holiday": "Y" if (group.get("is_holiday") == "Y").any() else "N",
            "holiday_names": "|".join(dict.fromkeys(names)),
        }
    return holidays


def load_weather_overrides(path: Path | None) -> dict[str, float]:
    if path is None or not path.exists():
        return {}

    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return {}

    response_data = data.get("data")
    if not isinstance(response_data, dict):
        return {}

    items = (
        response_data.get("response", {})
        .get("body", {})
        .get("items", {})
        .get("item")
    )
    if not isinstance(items, list):
        return {}

    by_category = {item.get("category"): item.get("obsrValue") for item in items if isinstance(item, dict)}
    mapping = {
        "T1H": "temperature_c",
        "RN1": "precipitation_mm",
        "REH": "humidity_pct",
        "WSD": "wind_speed_ms",
    }
    overrides: dict[str, float] = {}
    for category, column in mapping.items():
        parsed = parse_float(by_category.get(category))
        if parsed is not None:
            overrides[column] = parsed
    return overrides


def holiday_context(timestamp: pd.Timestamp, holidays: dict[str, dict[str, str]]) -> dict[str, str]:
    date = timestamp.strftime("%Y-%m-%d")
    return holidays.get(date, {"is_holiday": "N", "holiday_names": ""})


def exact_rows(df: pd.DataFrame, feature_datetime: pd.Timestamp) -> pd.DataFrame:
    rows = df[df["datetime_kst"] == feature_datetime].copy()
    rows = rows[rows["dong_name"].isin(TARGET_DONGS)].copy()
    return rows.sort_values("dong_name")


def load_dataset(path: Path) -> pd.DataFrame | None:
    if not path.exists():
        return None
    df = pd.read_csv(path)
    df["datetime_kst"] = pd.to_datetime(df["datetime_kst"])
    return df.sort_values(["dong_name", "datetime_kst"]).reset_index(drop=True)


def load_pattern_cache(path: Path) -> dict | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def pattern_rows(
    df: pd.DataFrame,
    feature_datetime: pd.Timestamp,
    feature_columns: list[str],
    holidays: dict[str, dict[str, str]],
) -> pd.DataFrame:
    hour = int(feature_datetime.hour)
    month = int(feature_datetime.month)
    day_type = day_type_for(feature_datetime)
    weekday = weekday_label(feature_datetime)
    date = feature_datetime.strftime("%Y-%m-%d")
    holiday = holiday_context(feature_datetime, holidays)
    month_mask = df["datetime_kst"].dt.month == month

    numeric_columns = [
        column
        for column in feature_columns
        if column in df.columns and pd.api.types.is_numeric_dtype(df[column])
    ]

    rows: list[dict] = []
    for dong in TARGET_DONGS:
        if holiday["is_holiday"] == "Y" and "is_holiday" in df.columns:
            base = df[
                (df["dong_name"] == dong)
                & (df["hour"] == hour)
                & (df["is_holiday"] == "Y")
                & month_mask
            ]
            if base.empty:
                base = df[
                    (df["dong_name"] == dong)
                    & (df["hour"] == hour)
                    & (df["is_holiday"] == "Y")
                ]
        else:
            base = df[
                (df["dong_name"] == dong)
                & (df["hour"] == hour)
                & (df["day_type"] == day_type)
                & month_mask
            ]
            if "is_holiday" in base.columns:
                base = base[base["is_holiday"] != "Y"]

        if base.empty:
            base = df[(df["dong_name"] == dong) & (df["hour"] == hour) & month_mask]
        if base.empty:
            base = df[(df["dong_name"] == dong) & (df["hour"] == hour)]
        if base.empty:
            base = df[df["dong_name"] == dong]

        latest = df[df["dong_name"] == dong].sort_values("datetime_kst").iloc[-1]
        row = latest.to_dict()
        row.update(
            {
                "datetime_kst": feature_datetime,
                "date": date,
                "hour": hour,
                "weekday": weekday,
                "day_type": day_type,
                "dong_name": dong,
                "is_holiday": holiday["is_holiday"],
                "holiday_names": holiday["holiday_names"],
                "transit_od_available": "Y",
                "living_population_available": "Y",
            }
        )

        for column in numeric_columns:
            value = base[column].mean(skipna=True)
            if pd.notna(value):
                row[column] = float(value)

        rows.append(row)

    return pd.DataFrame(rows)


def pattern_rows_from_cache(
    cache: dict,
    feature_datetime: pd.Timestamp,
    feature_columns: list[str],
    holidays: dict[str, dict[str, str]],
) -> pd.DataFrame:
    hour = int(feature_datetime.hour)
    month = int(feature_datetime.month)
    day_type = day_type_for(feature_datetime)
    weekday = weekday_label(feature_datetime)
    date = feature_datetime.strftime("%Y-%m-%d")
    holiday = holiday_context(feature_datetime, holidays)
    pattern_type = "holiday" if holiday["is_holiday"] == "Y" else ("weekend" if day_type == "주말" else "weekday")

    patterns = cache.get("patterns", [])
    latest_by_dong = cache.get("latest_by_dong", {})
    cached_features = set(cache.get("feature_columns", []))
    missing_cached_features = [column for column in feature_columns if column not in cached_features]
    if missing_cached_features:
        raise SystemExit(f"Pattern cache is missing model features: {missing_cached_features}")

    by_key = {
        (
            str(row.get("dong_name")),
            int(row.get("month")),
            int(row.get("hour")),
            str(row.get("pattern_type")),
        ): row
        for row in patterns
    }

    rows: list[dict] = []
    for dong in TARGET_DONGS:
        latest = dict(latest_by_dong.get(dong) or {})
        if not latest:
            raise SystemExit(f"Pattern cache has no latest row for {dong}")

        pattern = (
            by_key.get((dong, month, hour, pattern_type))
            or by_key.get((dong, month, hour, "any"))
            or by_key.get((dong, month, hour, "weekday"))
            or by_key.get((dong, month, hour, "weekend"))
            or {}
        )
        row = dict(latest)
        row.update(pattern)
        row.update(
            {
                "datetime_kst": feature_datetime,
                "date": date,
                "hour": hour,
                "weekday": weekday,
                "day_type": day_type,
                "dong_name": dong,
                "is_holiday": holiday["is_holiday"],
                "holiday_names": holiday["holiday_names"],
                "transit_od_available": row.get("transit_od_available", "Y"),
                "living_population_available": row.get("living_population_available", "Y"),
            }
        )
        rows.append(row)

    return pd.DataFrame(rows)


def apply_weather_overrides(rows: pd.DataFrame, overrides: dict[str, float]) -> pd.DataFrame:
    if not overrides:
        return rows
    rows = rows.copy()
    for column, value in overrides.items():
        if column in rows.columns:
            rows[column] = value
    if "snow_depth_cm" in rows.columns and "precipitation_mm" in overrides:
        rows["snow_depth_cm"] = 0.0
    return rows


def main() -> None:
    args = parse_args()
    dataset_path = Path(args.dataset)
    model_path = Path(args.model)
    out_path = Path(args.out)
    pattern_cache_path = Path(args.pattern_cache)

    pipeline, feature_columns, target_col, horizon_hours, feature_set = load_model_bundle(model_path)
    holidays = load_holidays(Path(args.holidays))
    weather_overrides = load_weather_overrides(
        Path(args.weather_snapshot) if args.weather_snapshot else None
    )

    df = load_dataset(dataset_path)
    pattern_cache = load_pattern_cache(pattern_cache_path)

    target_datetime = parse_kst_naive(args.target_datetime)
    feature_datetime = target_datetime - pd.Timedelta(hours=horizon_hours)
    target_holiday = holiday_context(target_datetime, holidays)

    rows = pd.DataFrame()
    strategy_used = "pattern"
    pattern_cache_used = False
    if df is not None:
        rows = exact_rows(df, feature_datetime)
        strategy_used = "exact"

    if args.strategy == "pattern" or (args.strategy == "auto" and len(rows) < len(TARGET_DONGS)):
        if df is not None:
            rows = pattern_rows(df, feature_datetime, feature_columns, holidays)
        elif pattern_cache is not None:
            rows = pattern_rows_from_cache(pattern_cache, feature_datetime, feature_columns, holidays)
            pattern_cache_used = True
        else:
            raise SystemExit(
                f"Cannot build pattern rows. Missing dataset {dataset_path} and pattern cache {pattern_cache_path}."
            )
        strategy_used = "pattern"
    elif args.strategy == "exact" and len(rows) < len(TARGET_DONGS):
        raise SystemExit(
            f"Exact feature rows for {feature_datetime} are incomplete: {len(rows)}/{len(TARGET_DONGS)}."
        )
    rows = apply_weather_overrides(rows, weather_overrides)

    missing_features = [column for column in feature_columns if column not in rows.columns]
    if missing_features:
        raise SystemExit(f"Missing model features: {missing_features}")

    rows["raw_prediction"] = pipeline.predict(rows[feature_columns])
    rows["score"] = normalize_scores(rows["raw_prediction"].tolist())

    regions = []
    for _, row in rows.sort_values("score", ascending=False).iterrows():
        confidence = 0.78 if strategy_used == "exact" else 0.58
        if row.get("transit_od_available") != "Y":
            confidence -= 0.1
        if row.get("living_population_available") != "Y":
            confidence -= 0.1

        regions.append(
            {
                "dong_name": row["dong_name"],
                "score": round(float(row["score"]), 4),
                "confidence": round(max(confidence, 0.4), 4),
                "raw_prediction": round(float(row["raw_prediction"]), 6),
            }
        )

    forecast = {
        "source": "model",
        "target_datetime": target_datetime.strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "feature_datetime": feature_datetime.strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "strategy": strategy_used,
        "pattern_cache_used": pattern_cache_used,
        "feature_set": feature_set,
        "model_feature_set": model_path.parent.name,
        "weather_override_applied": bool(weather_overrides),
        "calendar": {
            "weekday": weekday_label(target_datetime),
            "day_type": day_type_for(target_datetime),
            "is_holiday": target_holiday["is_holiday"],
            "holiday_names": target_holiday["holiday_names"],
        },
        "weather": weather_label(rows.iloc[0]),
        "generated_at": pd.Timestamp.now(tz="Asia/Seoul").strftime("%Y-%m-%dT%H:%M:%S%z"),
        "model_target": target_col,
        "regions": regions,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(forecast, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {out_path}")
    print(json.dumps(forecast, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
