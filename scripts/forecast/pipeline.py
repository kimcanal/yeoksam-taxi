from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
from joblib import dump, load
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

REPO_ROOT = Path(__file__).resolve().parents[2]
SEOUL_TZ = ZoneInfo("Asia/Seoul")
DEFAULT_MODEL_DIR = REPO_ROOT / ".tmp" / "forecast-model"
DEFAULT_OUTPUT_PATH = REPO_ROOT / "public" / "forecast" / "latest.json"
DEFAULT_POI_CONFIG_PATH = REPO_ROOT / "data" / "config" / "gangnam-pois.json"
DEFAULT_TARGET_COLUMN = "target_inbound_boardings_per_1k_pop_t_plus_1h"
DEFAULT_TARGET_UNIT = "target_inbound_boardings_per_1k_pop_t_plus_1h"
DEFAULT_DONGS = [
    "역삼1동",
    "역삼2동",
    "논현1동",
    "논현2동",
    "삼성1동",
    "삼성2동",
    "청담동",
    "신사동",
    "대치4동",
]


@dataclass(frozen=True)
class TrainingColumnSpec:
    dong_name: str = "dong_name"
    feature_datetime: str = "feature_datetime"
    target_datetime: str = "target_datetime"
    weather: str = "weather"
    temp_c: str = "temp_c"
    humidity: str = "humidity"
    precipitation_mm: str = "precipitation_mm"
    is_holiday: str = "is_holiday"
    holiday_names: str = "holiday_names"
    day_type: str = "day_type"


@dataclass(frozen=True)
class WeatherSnapshot:
    weather: str
    temp_c: float
    humidity: float
    precipitation_mm: float
    precipitation_type: str
    observed_at: str
    source: str


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def now_kst() -> pd.Timestamp:
    return pd.Timestamp.now(tz=SEOUL_TZ)


def floor_to_hour(value: pd.Timestamp) -> pd.Timestamp:
    return value.floor("h")


def parse_seoul_timestamp(value: Any) -> pd.Timestamp:
    timestamp = pd.Timestamp(value)
    if timestamp.tzinfo is None:
        return timestamp.tz_localize(SEOUL_TZ)
    return timestamp.tz_convert(SEOUL_TZ)


def to_iso(value: pd.Timestamp) -> str:
    return value.isoformat()


def normalize_text(value: Any, fallback: str = "") -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return fallback
    text = str(value).strip()
    return text if text else fallback


def parse_float(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None:
            return fallback
        if isinstance(value, str):
            cleaned = "".join(
                char for char in value if char.isdigit() or char in {".", "-", "+"}
            )
            if not cleaned:
                return fallback
            return float(cleaned)
        return float(value)
    except (TypeError, ValueError):
        return fallback


def normalize_weather_label(value: Any, precipitation_mm: float = 0.0) -> str:
    text = normalize_text(value).lower()
    if any(token in text for token in ("눈", "snow", "sleet", "진눈")):
        return "snow"
    if any(token in text for token in ("비", "rain", "shower", "소나기")):
        return "rain"
    if any(token in text for token in ("흐", "cloud", "overcast")):
        return "cloudy"
    if any(token in text for token in ("맑", "clear", "sun")):
        return "clear"
    if precipitation_mm > 0:
        return "rain"
    return "clear"


def normalize_holiday_flag(value: Any) -> float:
    text = normalize_text(value).lower()
    if text in {"y", "yes", "true", "1"}:
        return 1.0
    return 0.0


def infer_day_type(timestamp: pd.Timestamp, is_holiday: float) -> str:
    if is_holiday >= 0.5:
        return "휴일"
    if timestamp.dayofweek >= 5:
        return "주말"
    return "평일"


def weekday_label(timestamp: pd.Timestamp) -> str:
    return ["월", "화", "수", "목", "금", "토", "일"][timestamp.dayofweek]


def safe_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float | None:
    denominator = np.where(np.abs(y_true) < 1e-6, np.nan, np.abs(y_true))
    values = np.abs(y_true - y_pred) / denominator
    if np.isnan(values).all():
        return None
    return float(np.nanmean(values) * 100.0)


def confidence_from_errors(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    scale = max(float(np.std(y_true)), float(np.mean(np.abs(y_true))), 1.0)
    raw_confidence = 1.0 - min(1.0, rmse / scale)
    return float(np.clip(raw_confidence, 0.05, 0.95))


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    ensure_directory(path.parent)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def load_default_static_features(config_path: Path = DEFAULT_POI_CONFIG_PATH) -> pd.DataFrame:
    payload = load_json(config_path)
    counters: dict[str, dict[str, float]] = {
        dong: {
            "official_anchor_count": 0.0,
            "supplemental_anchor_count": 0.0,
            "citydata_enabled_count": 0.0,
            "station_anchor_count": 0.0,
            "commercial_anchor_count": 0.0,
            "office_anchor_count": 0.0,
            "nightlife_anchor_count": 0.0,
            "tourism_anchor_count": 0.0,
            "road_corridor_anchor_count": 0.0,
            "context_anchor_count": 0.0,
            "category_diversity": 0.0,
            "mean_anchor_lat": 0.0,
            "mean_anchor_lon": 0.0,
        }
        for dong in DEFAULT_DONGS
    }
    category_sets: dict[str, set[str]] = {dong: set() for dong in DEFAULT_DONGS}
    lat_lists: dict[str, list[float]] = {dong: [] for dong in DEFAULT_DONGS}
    lon_lists: dict[str, list[float]] = {dong: [] for dong in DEFAULT_DONGS}

    def apply_entry(entry: dict[str, Any], supplemental: bool) -> None:
        dong_name = normalize_text(entry.get("coverage_dong"))
        if not dong_name or dong_name not in counters:
            return
        category = normalize_text(entry.get("category"))
        stats = counters[dong_name]
        if supplemental:
            stats["supplemental_anchor_count"] += 1.0
        else:
            stats["official_anchor_count"] += 1.0
        if bool(entry.get("collection_enabled", False)) and not supplemental:
            stats["citydata_enabled_count"] += 1.0
        if "station" in category:
            stats["station_anchor_count"] += 1.0
        if "commercial" in category:
            stats["commercial_anchor_count"] += 1.0
        if "office" in category:
            stats["office_anchor_count"] += 1.0
        if "nightlife" in category:
            stats["nightlife_anchor_count"] += 1.0
        if "tourism" in category:
            stats["tourism_anchor_count"] += 1.0
        if "road" in category:
            stats["road_corridor_anchor_count"] += 1.0
        if category.endswith("_context") or category == "station_context":
            stats["context_anchor_count"] += 1.0
        if category:
            category_sets[dong_name].add(category)
        lat_value = parse_float(entry.get("lat"), fallback=float("nan"))
        lon_value = parse_float(entry.get("lon"), fallback=float("nan"))
        if not math.isnan(lat_value):
            lat_lists[dong_name].append(lat_value)
        if not math.isnan(lon_value):
            lon_lists[dong_name].append(lon_value)

    for entry in payload.get("citydata_collection", []):
        apply_entry(entry, supplemental=False)
    for entry in payload.get("supplemental_watchlist", []):
        apply_entry(entry, supplemental=True)

    rows: list[dict[str, Any]] = []
    for dong_name in DEFAULT_DONGS:
        stats = counters[dong_name]
        stats["category_diversity"] = float(len(category_sets[dong_name]))
        if lat_lists[dong_name]:
            stats["mean_anchor_lat"] = float(np.mean(lat_lists[dong_name]))
        if lon_lists[dong_name]:
            stats["mean_anchor_lon"] = float(np.mean(lon_lists[dong_name]))
        row = {"dong_name": dong_name}
        row.update(stats)
        rows.append(row)
    return pd.DataFrame(rows)


def load_static_features(static_features_csv: str | None) -> pd.DataFrame:
    if not static_features_csv:
        return load_default_static_features()
    frame = pd.read_csv(static_features_csv)
    if "dong_name" not in frame.columns:
        raise ValueError("Static feature CSV must include a dong_name column.")
    numeric_columns = [
        column for column in frame.columns if column == "dong_name" or pd.api.types.is_numeric_dtype(frame[column])
    ]
    trimmed = frame[numeric_columns].copy()
    trimmed["dong_name"] = trimmed["dong_name"].map(lambda value: normalize_text(value))
    trimmed = trimmed.dropna(subset=["dong_name"])
    trimmed = trimmed.groupby("dong_name", as_index=False).first()
    trimmed = trimmed.set_index("dong_name").reindex(DEFAULT_DONGS).fillna(0.0).reset_index()
    return trimmed


def resolve_training_column(frame: pd.DataFrame, preferred: str, fallbacks: tuple[str, ...] = ()) -> str:
    for column_name in (preferred, *fallbacks):
        if column_name in frame.columns:
            return column_name
    raise ValueError(f"Required training column not found: {preferred}")


def prepare_training_frame(
    raw_frame: pd.DataFrame,
    static_features: pd.DataFrame,
    target_column: str,
    column_spec: TrainingColumnSpec,
) -> pd.DataFrame:
    dong_column = resolve_training_column(raw_frame, column_spec.dong_name)
    feature_datetime_column = resolve_training_column(
        raw_frame,
        column_spec.feature_datetime,
        ("timestamp", "observed_at", "feature_time"),
    )
    weather_column = resolve_training_column(
        raw_frame,
        column_spec.weather,
        ("weather_mode", "precipitation_type"),
    )
    if target_column not in raw_frame.columns:
        raise ValueError(f"Target column not found: {target_column}")

    working = pd.DataFrame(
        {
            "dong_name": raw_frame[dong_column].map(lambda value: normalize_text(value)),
            "feature_datetime": raw_frame[feature_datetime_column].map(parse_seoul_timestamp),
            "raw_weather": raw_frame[weather_column],
            "target_value": pd.to_numeric(raw_frame[target_column], errors="coerce"),
        }
    )

    if column_spec.target_datetime in raw_frame.columns:
        working["target_datetime"] = raw_frame[column_spec.target_datetime].map(parse_seoul_timestamp)
    else:
        working["target_datetime"] = working["feature_datetime"] + pd.Timedelta(hours=1)

    if column_spec.temp_c in raw_frame.columns:
        working["temp_c"] = raw_frame[column_spec.temp_c].map(parse_float)
    else:
        working["temp_c"] = 0.0

    if column_spec.humidity in raw_frame.columns:
        working["humidity"] = raw_frame[column_spec.humidity].map(parse_float)
    else:
        working["humidity"] = 0.0

    if column_spec.precipitation_mm in raw_frame.columns:
        working["precipitation_mm"] = raw_frame[column_spec.precipitation_mm].map(parse_float)
    else:
        working["precipitation_mm"] = 0.0

    if column_spec.is_holiday in raw_frame.columns:
        working["is_holiday"] = raw_frame[column_spec.is_holiday].map(normalize_holiday_flag)
    else:
        working["is_holiday"] = 0.0

    if column_spec.holiday_names in raw_frame.columns:
        working["holiday_names"] = raw_frame[column_spec.holiday_names].map(normalize_text)
    else:
        working["holiday_names"] = ""

    if column_spec.day_type in raw_frame.columns:
        working["day_type"] = raw_frame[column_spec.day_type].map(normalize_text)
    else:
        working["day_type"] = ""

    working = working.dropna(subset=["dong_name", "feature_datetime", "target_value"])
    working = working[working["dong_name"].isin(DEFAULT_DONGS)].copy()
    working["weather"] = working.apply(
        lambda row: normalize_weather_label(row["raw_weather"], row["precipitation_mm"]),
        axis=1,
    )
    working["day_type"] = working.apply(
        lambda row: row["day_type"] or infer_day_type(row["feature_datetime"], row["is_holiday"]),
        axis=1,
    )
    working["weekday_name"] = working["feature_datetime"].map(weekday_label)
    working["has_holiday_name"] = working["holiday_names"].map(lambda value: 1.0 if normalize_text(value) else 0.0)
    merged = working.merge(static_features, on="dong_name", how="left").fillna(0.0)
    return merged.sort_values(["feature_datetime", "dong_name"]).reset_index(drop=True)


def build_feature_frame(frame: pd.DataFrame) -> pd.DataFrame:
    feature_frame = frame.copy()
    hour_of_day = (
        feature_frame["feature_datetime"].dt.hour
        + feature_frame["feature_datetime"].dt.minute / 60.0
    )
    day_of_week = feature_frame["feature_datetime"].dt.dayofweek
    month_of_year = feature_frame["feature_datetime"].dt.month

    feature_frame["hour_sin"] = np.sin(2 * np.pi * hour_of_day / 24.0)
    feature_frame["hour_cos"] = np.cos(2 * np.pi * hour_of_day / 24.0)
    feature_frame["dow_sin"] = np.sin(2 * np.pi * day_of_week / 7.0)
    feature_frame["dow_cos"] = np.cos(2 * np.pi * day_of_week / 7.0)
    feature_frame["month_sin"] = np.sin(2 * np.pi * month_of_year / 12.0)
    feature_frame["month_cos"] = np.cos(2 * np.pi * month_of_year / 12.0)
    feature_frame["is_weekend"] = (day_of_week >= 5).astype(float)
    feature_frame["is_commute_peak"] = (
        ((hour_of_day >= 7.0) & (hour_of_day <= 9.5))
        | ((hour_of_day >= 17.0) & (hour_of_day <= 20.5))
    ).astype(float)
    feature_frame["is_evening_peak"] = ((hour_of_day >= 18.0) & (hour_of_day <= 23.0)).astype(float)
    feature_frame["is_late_night"] = ((hour_of_day >= 22.0) | (hour_of_day <= 4.0)).astype(float)

    base_columns = [
        column
        for column in feature_frame.columns
        if column
        not in {
            "raw_weather",
            "target_value",
            "feature_datetime",
            "target_datetime",
            "holiday_names",
        }
    ]
    encoded = pd.get_dummies(
        feature_frame[base_columns],
        columns=["dong_name", "weather", "day_type", "weekday_name"],
        dtype=float,
    )
    return encoded.astype(float)


def align_feature_columns(frame: pd.DataFrame, feature_columns: list[str]) -> pd.DataFrame:
    aligned = frame.copy()
    for column_name in feature_columns:
        if column_name not in aligned.columns:
            aligned[column_name] = 0.0
    return aligned[feature_columns].astype(float)


def chronological_split(frame: pd.DataFrame, validation_ratio: float) -> tuple[pd.DataFrame, pd.DataFrame]:
    if len(frame) <= 1:
        return frame.copy(), frame.copy()
    unique_times = list(pd.Series(frame["feature_datetime"].unique()).sort_values())
    if len(unique_times) < 2:
        split_index = max(1, len(frame) - 1)
        return frame.iloc[:split_index].copy(), frame.iloc[split_index:].copy()
    validation_steps = max(1, int(math.ceil(len(unique_times) * validation_ratio)))
    validation_times = set(unique_times[-validation_steps:])
    validation_frame = frame[frame["feature_datetime"].isin(validation_times)].copy()
    training_frame = frame[~frame["feature_datetime"].isin(validation_times)].copy()
    if training_frame.empty:
        training_frame = frame.iloc[:-1].copy()
        validation_frame = frame.iloc[-1:].copy()
    return training_frame, validation_frame


def build_estimator(backend: str):
    normalized = backend.lower()
    if normalized in {"auto", "lightgbm"}:
        try:
            from lightgbm import LGBMRegressor

            return "lightgbm", LGBMRegressor(
                n_estimators=500,
                learning_rate=0.05,
                num_leaves=31,
                subsample=0.9,
                colsample_bytree=0.9,
                random_state=42,
            )
        except ModuleNotFoundError:
            if normalized == "lightgbm":
                raise
    if normalized in {"auto", "xgboost"}:
        try:
            from xgboost import XGBRegressor

            return "xgboost", XGBRegressor(
                n_estimators=500,
                learning_rate=0.05,
                max_depth=6,
                subsample=0.9,
                colsample_bytree=0.9,
                objective="reg:squarederror",
                random_state=42,
            )
        except ModuleNotFoundError:
            if normalized == "xgboost":
                raise
    return "hist_gradient_boosting", HistGradientBoostingRegressor(
        learning_rate=0.05,
        max_depth=8,
        max_iter=500,
        random_state=42,
    )


def train_forecast_model(
    training_csv: str,
    output_dir: str | Path = DEFAULT_MODEL_DIR,
    target_column: str = DEFAULT_TARGET_COLUMN,
    backend: str = "auto",
    validation_ratio: float = 0.2,
    static_features_csv: str | None = None,
    column_spec: TrainingColumnSpec | None = None,
) -> dict[str, Any]:
    output_path = Path(output_dir)
    ensure_directory(output_path)
    spec = column_spec or TrainingColumnSpec()
    static_features = load_static_features(static_features_csv)
    raw_frame = pd.read_csv(training_csv)
    prepared = prepare_training_frame(raw_frame, static_features, target_column, spec)
    if prepared.empty:
        raise ValueError("No valid rows remained after preparing the training frame.")

    train_frame, validation_frame = chronological_split(prepared, validation_ratio)
    train_features = build_feature_frame(train_frame)
    validation_features = build_feature_frame(validation_frame)
    feature_columns = list(train_features.columns)
    validation_features = align_feature_columns(validation_features, feature_columns)

    backend_name, estimator = build_estimator(backend)
    estimator.fit(train_features, train_frame["target_value"].to_numpy())
    validation_predictions = estimator.predict(validation_features)
    y_true = validation_frame["target_value"].to_numpy()
    y_pred = np.asarray(validation_predictions, dtype=float)

    global_confidence = confidence_from_errors(y_true, y_pred)
    confidence_by_dong: dict[str, float] = {}
    validation_scored = validation_frame[["dong_name"]].copy()
    validation_scored["y_true"] = y_true
    validation_scored["y_pred"] = y_pred
    for dong_name, dong_rows in validation_scored.groupby("dong_name"):
        confidence_by_dong[dong_name] = confidence_from_errors(
            dong_rows["y_true"].to_numpy(),
            dong_rows["y_pred"].to_numpy(),
        )

    metrics = {
        "row_count": int(len(prepared)),
        "train_row_count": int(len(train_frame)),
        "validation_row_count": int(len(validation_frame)),
        "r2": float(r2_score(y_true, y_pred)) if len(validation_frame) > 1 else None,
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mape_pct": safe_mape(y_true, y_pred),
    }

    bundle = {
        "estimator": estimator,
        "feature_columns": feature_columns,
        "backend": backend_name,
        "feature_set": "strict_calendar_weather_static",
        "target_column": target_column,
        "target_unit": DEFAULT_TARGET_UNIT,
        "metrics": metrics,
        "global_confidence": global_confidence,
        "confidence_by_dong": confidence_by_dong,
        "static_features": static_features.to_dict(orient="records"),
        "dongs": DEFAULT_DONGS,
        "training_columns": {
            "dong_name": spec.dong_name,
            "feature_datetime": spec.feature_datetime,
            "target_datetime": spec.target_datetime,
            "weather": spec.weather,
            "temp_c": spec.temp_c,
            "humidity": spec.humidity,
            "precipitation_mm": spec.precipitation_mm,
            "is_holiday": spec.is_holiday,
            "holiday_names": spec.holiday_names,
            "day_type": spec.day_type,
        },
        "generated_at": to_iso(now_kst()),
    }

    dump(bundle, output_path / "model.joblib")
    write_json(output_path / "metadata.json", {key: value for key, value in bundle.items() if key != "estimator"})
    static_features.to_csv(output_path / "static_features_snapshot.csv", index=False)
    return bundle


def load_model_bundle(model_dir: str | Path = DEFAULT_MODEL_DIR) -> dict[str, Any]:
    return load(Path(model_dir) / "model.joblib")


def build_inference_rows(
    feature_datetime: pd.Timestamp,
    weather: WeatherSnapshot,
    static_features: pd.DataFrame,
) -> pd.DataFrame:
    rows = static_features.copy()
    rows["feature_datetime"] = feature_datetime
    rows["target_datetime"] = feature_datetime + pd.Timedelta(hours=1)
    rows["temp_c"] = weather.temp_c
    rows["humidity"] = weather.humidity
    rows["precipitation_mm"] = weather.precipitation_mm
    rows["weather"] = weather.weather
    rows["is_holiday"] = 0.0
    rows["holiday_names"] = ""
    rows["has_holiday_name"] = 0.0
    rows["day_type"] = rows["feature_datetime"].map(lambda value: infer_day_type(value, 0.0))
    rows["weekday_name"] = rows["feature_datetime"].map(weekday_label)
    return rows


def predict_forecast(
    model_dir: str | Path,
    weather: WeatherSnapshot,
    feature_datetime: pd.Timestamp | None = None,
) -> dict[str, Any]:
    bundle = load_model_bundle(model_dir)
    static_features = pd.DataFrame(bundle["static_features"])
    feature_time = floor_to_hour(feature_datetime or now_kst())
    inference_rows = build_inference_rows(feature_time, weather, static_features)
    encoded = build_feature_frame(inference_rows)
    aligned = align_feature_columns(encoded, bundle["feature_columns"])
    raw_predictions = np.asarray(bundle["estimator"].predict(aligned), dtype=float)
    prediction_min = float(np.min(raw_predictions))
    prediction_max = float(np.max(raw_predictions))
    if abs(prediction_max - prediction_min) < 1e-9:
        scores = np.full_like(raw_predictions, 0.5, dtype=float)
    else:
        scores = (raw_predictions - prediction_min) / (prediction_max - prediction_min)

    global_confidence = float(bundle.get("global_confidence") or 0.58)
    confidence_by_dong = bundle.get("confidence_by_dong") or {}
    regions = []
    for dong_name, score, raw_prediction in zip(inference_rows["dong_name"], scores, raw_predictions, strict=True):
        regions.append(
            {
                "dong_name": dong_name,
                "score": round(float(score), 4),
                "confidence": round(float(confidence_by_dong.get(dong_name, global_confidence)), 4),
                "raw_prediction": round(float(raw_prediction), 6),
            }
        )
    regions.sort(key=lambda item: item["raw_prediction"], reverse=True)

    target_datetime = feature_time + pd.Timedelta(hours=1)
    calendar = {
        "weekday": weekday_label(target_datetime),
        "day_type": infer_day_type(target_datetime, 0.0),
        "is_holiday": "N",
        "holiday_names": "",
    }

    return {
        "source": "model",
        "strategy": bundle.get("backend", "model"),
        "feature_set": bundle.get("feature_set"),
        "model_feature_set": bundle.get("feature_set"),
        "raw_prediction_unit": bundle.get("target_unit", DEFAULT_TARGET_UNIT),
        "proxy_source": weather.source,
        "note": (
            "Falls back to sklearn HistGradientBoosting locally when LightGBM/XGBoost is unavailable."
            if bundle.get("backend") == "hist_gradient_boosting"
            else None
        ),
        "calendar": calendar,
        "target_datetime": to_iso(target_datetime),
        "feature_datetime": to_iso(feature_time),
        "weather": weather.weather,
        "generated_at": to_iso(now_kst()),
        "regions": regions,
    }


def write_forecast_json(
    forecast_payload: dict[str, Any],
    output_path: str | Path = DEFAULT_OUTPUT_PATH,
) -> Path:
    path = Path(output_path)
    write_json(path, forecast_payload)
    return path


def fetch_json_url(url: str, headers: dict[str, str] | None = None) -> Any:
    request = Request(url, headers=headers or {})
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except URLError as exc:
        raise RuntimeError(f"Failed to fetch JSON from {url}: {exc}") from exc


def kma_base_time(reference_time: pd.Timestamp) -> tuple[str, str]:
    current = reference_time.tz_convert(SEOUL_TZ)
    hour = current.hour
    minute = current.minute
    if minute < 10:
        if hour == 0:
            previous_day = current - pd.Timedelta(days=1)
            return previous_day.strftime("%Y%m%d"), "2300"
        hour -= 1
    return current.strftime("%Y%m%d"), f"{hour:02d}00"


def resolve_kma_api_key() -> tuple[str, str]:
    candidates = [
        ("KMA_API_KEY", os.getenv("KMA_API_KEY")),
        ("DATA_GO_KR_API", os.getenv("DATA_GO_KR_API")),
        ("DATA_GO_KR_API_KEY", os.getenv("DATA_GO_KR_API_KEY")),
        ("apihub_kma_go_kr_api", os.getenv("apihub_kma_go_kr_api")),
    ]
    for name, value in candidates:
        if value:
            return name, value
    raise RuntimeError("No KMA API key was found in environment variables.")


def map_kma_precipitation_type(code: str) -> str:
    mapping = {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
        "5": "빗방울",
        "6": "빗방울눈날림",
        "7": "눈날림",
    }
    return mapping.get(code, "없음")


def fetch_kma_weather() -> WeatherSnapshot:
    credential_source, api_key = resolve_kma_api_key()
    base_date, base_time = kma_base_time(now_kst())
    params = urlencode(
        {
            "serviceKey": api_key,
            "numOfRows": "10",
            "pageNo": "1",
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": "61",
            "ny": "125",
        }
    )
    url = (
        "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst"
        f"?{params}"
    )
    payload = fetch_json_url(url)
    items = (
        payload.get("response", {})
        .get("body", {})
        .get("items", {})
        .get("item", [])
    )
    category_map = {
        normalize_text(item.get("category")): normalize_text(item.get("obsrValue"))
        for item in items
    }
    precipitation_mm = parse_float(category_map.get("RN1"), 0.0)
    precipitation_type = map_kma_precipitation_type(category_map.get("PTY", "0"))
    weather_label = normalize_weather_label(precipitation_type, precipitation_mm)
    observed_at = parse_seoul_timestamp(f"{base_date} {base_time[:2]}:{base_time[2:]}")
    return WeatherSnapshot(
        weather=weather_label,
        temp_c=parse_float(category_map.get("T1H"), 0.0),
        humidity=parse_float(category_map.get("REH"), 0.0),
        precipitation_mm=precipitation_mm,
        precipitation_type=precipitation_type,
        observed_at=to_iso(observed_at),
        source=f"kma:{credential_source}",
    )


def fetch_citydata_weather(base_url: str) -> WeatherSnapshot:
    payload = fetch_json_url(f"{base_url.rstrip('/')}/api/realtime")
    places = payload.get("places") or []
    if not places:
        raise RuntimeError("Citydata realtime endpoint returned no places.")
    weather_payload = places[0].get("weather") or {}
    precipitation_type = normalize_text(weather_payload.get("precipitation_type"), "없음")
    precipitation_mm = parse_float(weather_payload.get("precipitation"), 0.0)
    return WeatherSnapshot(
        weather=normalize_weather_label(precipitation_type, precipitation_mm),
        temp_c=parse_float(weather_payload.get("temp_c"), 0.0),
        humidity=0.0,
        precipitation_mm=precipitation_mm,
        precipitation_type=precipitation_type,
        observed_at=normalize_text(weather_payload.get("observed_at"), to_iso(now_kst())),
        source="citydata",
    )


def load_manual_weather(
    weather: str,
    temp_c: float,
    humidity: float,
    precipitation_mm: float,
    precipitation_type: str | None = None,
) -> WeatherSnapshot:
    normalized_weather = normalize_weather_label(weather, precipitation_mm)
    return WeatherSnapshot(
        weather=normalized_weather,
        temp_c=temp_c,
        humidity=humidity,
        precipitation_mm=precipitation_mm,
        precipitation_type=precipitation_type or normalized_weather,
        observed_at=to_iso(now_kst()),
        source="manual",
    )


def resolve_weather_snapshot(
    weather_source: str,
    *,
    citydata_base_url: str = "http://127.0.0.1:55555",
    weather: str | None = None,
    temp_c: float = 0.0,
    humidity: float = 0.0,
    precipitation_mm: float = 0.0,
    precipitation_type: str | None = None,
) -> WeatherSnapshot:
    normalized_source = weather_source.lower()
    if normalized_source == "kma":
        return fetch_kma_weather()
    if normalized_source == "citydata":
        return fetch_citydata_weather(citydata_base_url)
    if normalized_source == "manual":
        if not weather:
            raise RuntimeError("Manual weather source requires --weather.")
        return load_manual_weather(
            weather=weather,
            temp_c=temp_c,
            humidity=humidity,
            precipitation_mm=precipitation_mm,
            precipitation_type=precipitation_type,
        )
    raise RuntimeError(f"Unsupported weather source: {weather_source}")
