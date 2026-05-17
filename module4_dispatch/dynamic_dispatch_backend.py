from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
from joblib import dump, load
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error

SEOUL_TZ = ZoneInfo("Asia/Seoul")
DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
DEFAULT_MODEL_PATH = DEFAULT_ARTIFACT_DIR / "dispatch_model.joblib"
DEFAULT_DATASET_PATH = DEFAULT_ARTIFACT_DIR / "synthetic_dispatch_history.csv"

DONG_PROFILES: dict[str, dict[str, float]] = {
    "역삼1동": {"demand_weight": 1.35, "nightlife_weight": 0.65, "supply_weight": 1.10},
    "역삼2동": {"demand_weight": 0.78, "nightlife_weight": 0.35, "supply_weight": 0.85},
    "논현1동": {"demand_weight": 1.18, "nightlife_weight": 1.20, "supply_weight": 0.92},
    "논현2동": {"demand_weight": 0.98, "nightlife_weight": 0.95, "supply_weight": 0.88},
    "삼성1동": {"demand_weight": 1.12, "nightlife_weight": 0.48, "supply_weight": 1.04},
    "삼성2동": {"demand_weight": 1.08, "nightlife_weight": 0.42, "supply_weight": 1.00},
    "청담동": {"demand_weight": 0.92, "nightlife_weight": 1.05, "supply_weight": 0.86},
    "신사동": {"demand_weight": 1.05, "nightlife_weight": 1.10, "supply_weight": 0.90},
    "대치4동": {"demand_weight": 0.88, "nightlife_weight": 0.22, "supply_weight": 1.05},
}

KOREA_HOLIDAYS = {
    "2025-01-01",
    "2025-01-28",
    "2025-01-29",
    "2025-01-30",
    "2025-03-01",
    "2025-05-05",
    "2025-05-06",
    "2025-06-06",
    "2025-08-15",
    "2025-10-03",
    "2025-10-05",
    "2025-10-06",
    "2025-10-07",
    "2025-10-08",
    "2025-10-09",
    "2025-12-25",
    "2026-01-01",
    "2026-02-16",
    "2026-02-17",
    "2026-02-18",
    "2026-03-01",
    "2026-05-05",
    "2026-05-24",
    "2026-06-06",
    "2026-08-15",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-10-03",
    "2026-10-09",
    "2026-12-25",
}


@dataclass(frozen=True)
class SyntheticDataConfig:
    months: int = 6
    freq: str = "30min"
    seed: int = 42


@dataclass(frozen=True)
class TrainingMetrics:
    demand_rmse: float
    surge_rmse: float
    train_rows: int
    test_rows: int
    model_backend: str


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def round_float(value: float, digits: int = 4) -> float:
    return float(round(float(value), digits))


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def normalize_timestamp(value: Any) -> pd.Timestamp:
    timestamp = pd.Timestamp(value)
    if timestamp.tzinfo is None:
        return timestamp.tz_localize(SEOUL_TZ)
    return timestamp.tz_convert(SEOUL_TZ)


def is_holiday_timestamp(timestamp: pd.Timestamp) -> int:
    return int(timestamp.strftime("%Y-%m-%d") in KOREA_HOLIDAYS)


def is_night_hour(hour: float) -> bool:
    return hour >= 22.0 or hour < 5.0


def is_peak_hour(hour: float) -> bool:
    return 7.0 <= hour <= 9.0 or 17.0 <= hour <= 20.0


def choose_regressor():
    try:
        from lightgbm import LGBMRegressor

        return "lightgbm", LGBMRegressor(
            n_estimators=400,
            learning_rate=0.05,
            num_leaves=31,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=42,
        )
    except ModuleNotFoundError:
        pass

    try:
        from xgboost import XGBRegressor

        return "xgboost", XGBRegressor(
            n_estimators=400,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=42,
        )
    except ModuleNotFoundError:
        pass

    return "random_forest", RandomForestRegressor(
        n_estimators=220,
        max_depth=16,
        min_samples_leaf=4,
        n_jobs=-1,
        random_state=42,
    )


def seasonal_temperature(timestamp: pd.Timestamp, rng: np.random.Generator) -> float:
    day_of_year = timestamp.dayofyear
    hour = timestamp.hour + timestamp.minute / 60
    annual = 12 * math.sin((2 * math.pi * (day_of_year - 35)) / 365.25)
    diurnal = 5 * math.sin((2 * math.pi * (hour - 14)) / 24)
    return 16 + annual + diurnal + rng.normal(0, 1.4)


def synthetic_precipitation(timestamp: pd.Timestamp, rng: np.random.Generator) -> float:
    month = timestamp.month
    event_probability = 0.07
    if month in {6, 7, 8, 9}:
        event_probability = 0.18
    elif month in {11, 12, 1, 2}:
        event_probability = 0.09

    if rng.random() > event_probability:
        return 0.0
    return float(rng.gamma(shape=1.7, scale=4.2))


def synthetic_live_congestion(
    hour: float,
    day_of_week: int,
    precipitation_mm: float,
    dong_profile: dict[str, float],
    rng: np.random.Generator,
) -> float:
    rush_boost = 1.45 if is_peak_hour(hour) else 0.0
    nightlife_boost = 1.1 if is_night_hour(hour) else 0.0
    weekend_night = 0.7 if day_of_week >= 4 and is_night_hour(hour) else 0.0
    rain_boost = min(1.3, precipitation_mm / 8.0)
    base = (
        1.1
        + rush_boost * dong_profile["demand_weight"]
        + nightlife_boost * dong_profile["nightlife_weight"]
        + weekend_night * dong_profile["nightlife_weight"]
        + rain_boost
        + rng.normal(0, 0.22)
    )
    return float(clamp(base, 1.0, 5.0))


def synthetic_short_trip_ratio(
    hour: float,
    day_of_week: int,
    precipitation_mm: float,
    dong_profile: dict[str, float],
    rng: np.random.Generator,
) -> float:
    value = (
        0.18
        + (0.24 if is_night_hour(hour) else 0.0) * dong_profile["nightlife_weight"]
        + (0.09 if is_peak_hour(hour) else 0.0)
        + min(0.08, precipitation_mm / 60.0)
        + (0.04 if day_of_week >= 4 and is_night_hour(hour) else 0.0)
        + rng.normal(0, 0.025)
    )
    return float(clamp(value, 0.05, 0.88))


def synthetic_active_supply(
    hour: float,
    day_of_week: int,
    precipitation_mm: float,
    congestion_score: float,
    dong_profile: dict[str, float],
    rng: np.random.Generator,
) -> int:
    if is_night_hour(hour):
        base = 1080
    elif is_peak_hour(hour):
        base = 1180
    else:
        base = 1820

    supply = (
        base * dong_profile["supply_weight"]
        - (120 if is_peak_hour(hour) else 0)
        - (90 if day_of_week >= 4 and is_night_hour(hour) else 0)
        - (precipitation_mm * 7.5)
        - ((congestion_score - 1) * 75)
        + rng.normal(0, 70)
    )
    return int(round(clamp(supply, 900, 2500)))


def estimate_effective_supply(
    current_active_supply: int,
    short_trip_ratio: float,
    live_congestion_score: float,
    hour_of_day: float,
) -> int:
    congestion_factor = clamp(1.08 - ((live_congestion_score - 1.0) * 0.14), 0.42, 1.05)
    acceptance_factor = clamp(1.0 - short_trip_ratio * 0.42, 0.38, 1.0)

    if 22.0 <= hour_of_day or hour_of_day < 2.0:
        short_trip_acceptance = 0.23 + (1.0 - short_trip_ratio) * 0.77
        acceptance_factor = min(acceptance_factor, clamp(short_trip_acceptance, 0.23, 1.0))

    effective_supply = current_active_supply * congestion_factor * acceptance_factor
    return int(round(max(1.0, effective_supply)))


def synthetic_demand_volume(
    hour: float,
    day_of_week: int,
    is_holiday: int,
    weather_temp: float,
    precipitation_mm: float,
    short_trip_ratio: float,
    live_congestion_score: float,
    dong_profile: dict[str, float],
    rng: np.random.Generator,
) -> int:
    commute = 210 if is_peak_hour(hour) else 0
    late_night = 240 if is_night_hour(hour) else 0
    friday_night = 180 if day_of_week in {4, 5} and is_night_hour(hour) else 0
    rain_boost = min(160, precipitation_mm * 18)
    cold_hot_boost = max(0.0, abs(weather_temp - 18.0) * 4.2)
    holiday_boost = 120 if is_holiday else 0
    congestion_proxy = max(0.0, (live_congestion_score - 2.0) * 40)
    short_trip_pressure = short_trip_ratio * 140

    demand_mean = (
        110
        + dong_profile["demand_weight"] * (130 + commute + congestion_proxy)
        + dong_profile["nightlife_weight"] * (late_night + friday_night)
        + holiday_boost
        + rain_boost
        + short_trip_pressure
        + cold_hot_boost
        + rng.normal(0, 18)
    )
    return int(rng.poisson(max(30.0, demand_mean)))


def synthetic_optimal_surge(
    actual_demand_volume: int,
    effective_supply: int,
    hour: float,
    short_trip_ratio: float,
    live_congestion_score: float,
    dong_profile: dict[str, float],
    rng: np.random.Generator,
) -> float:
    imbalance_ratio = actual_demand_volume / max(effective_supply, 1)
    surge = (
        1.0
        + max(0.0, imbalance_ratio - 0.86) * 0.52
        + max(0.0, live_congestion_score - 2.2) * 0.08
        + max(0.0, short_trip_ratio - 0.42) * 0.25
        + (0.06 if is_night_hour(hour) else 0.0) * dong_profile["nightlife_weight"]
        + rng.normal(0, 0.025)
    )
    return round_float(clamp(surge, 1.0, 2.0), 3)


def generate_synthetic_gangnam_taxi_data(config: SyntheticDataConfig = SyntheticDataConfig()) -> pd.DataFrame:
    """Generate six months of dong-level synthetic Gangnam dispatch history."""

    rng = np.random.default_rng(config.seed)
    end = pd.Timestamp.now(tz=SEOUL_TZ).floor(config.freq)
    start = end - pd.DateOffset(months=config.months)
    timeline = pd.date_range(start=start, end=end, freq=config.freq, tz=SEOUL_TZ, inclusive="left")

    rows: list[dict[str, Any]] = []
    for timestamp in timeline:
        hour = timestamp.hour + timestamp.minute / 60
        day_of_week = timestamp.dayofweek
        holiday_flag = is_holiday_timestamp(timestamp)
        weather_temp = seasonal_temperature(timestamp, rng)
        precipitation_mm = synthetic_precipitation(timestamp, rng)

        for dong_name, profile in DONG_PROFILES.items():
            congestion_score = synthetic_live_congestion(
                hour=hour,
                day_of_week=day_of_week,
                precipitation_mm=precipitation_mm,
                dong_profile=profile,
                rng=rng,
            )
            short_trip_ratio = synthetic_short_trip_ratio(
                hour=hour,
                day_of_week=day_of_week,
                precipitation_mm=precipitation_mm,
                dong_profile=profile,
                rng=rng,
            )
            current_active_supply = synthetic_active_supply(
                hour=hour,
                day_of_week=day_of_week,
                precipitation_mm=precipitation_mm,
                congestion_score=congestion_score,
                dong_profile=profile,
                rng=rng,
            )
            effective_supply = estimate_effective_supply(
                current_active_supply=current_active_supply,
                short_trip_ratio=short_trip_ratio,
                live_congestion_score=congestion_score,
                hour_of_day=hour,
            )
            actual_demand_volume = synthetic_demand_volume(
                hour=hour,
                day_of_week=day_of_week,
                is_holiday=holiday_flag,
                weather_temp=weather_temp,
                precipitation_mm=precipitation_mm,
                short_trip_ratio=short_trip_ratio,
                live_congestion_score=congestion_score,
                dong_profile=profile,
                rng=rng,
            )
            optimal_surge_multiplier = synthetic_optimal_surge(
                actual_demand_volume=actual_demand_volume,
                effective_supply=effective_supply,
                hour=hour,
                short_trip_ratio=short_trip_ratio,
                live_congestion_score=congestion_score,
                dong_profile=profile,
                rng=rng,
            )

            rows.append(
                {
                    "timestamp": timestamp.isoformat(),
                    "dong_name": dong_name,
                    "hour_of_day": round_float(hour, 2),
                    "day_of_week": int(day_of_week),
                    "is_holiday": int(holiday_flag),
                    "weather_temp": round_float(weather_temp, 2),
                    "precipitation_mm": round_float(precipitation_mm, 2),
                    "current_active_supply": int(current_active_supply),
                    "short_trip_ratio": round_float(short_trip_ratio, 4),
                    "live_congestion_score": round_float(congestion_score, 3),
                    "actual_demand_volume": int(actual_demand_volume),
                    "optimal_surge_multiplier": float(optimal_surge_multiplier),
                }
            )

    return pd.DataFrame(rows)


def enrich_request_features(frame: pd.DataFrame) -> pd.DataFrame:
    enriched = frame.copy()
    enriched["timestamp"] = enriched["timestamp"].map(normalize_timestamp)
    enriched["dong_name"] = enriched["dong_name"].astype(str)
    enriched["hour_of_day"] = enriched["timestamp"].map(lambda ts: round_float(ts.hour + ts.minute / 60, 2))
    enriched["day_of_week"] = enriched["timestamp"].map(lambda ts: int(ts.dayofweek))
    enriched["is_holiday"] = enriched.apply(
        lambda row: int(row["is_holiday"]) if pd.notna(row.get("is_holiday")) else is_holiday_timestamp(row["timestamp"]),
        axis=1,
    )

    if "weather_temp" not in enriched.columns:
        enriched["weather_temp"] = 18.0
    else:
        enriched["weather_temp"] = pd.to_numeric(enriched["weather_temp"], errors="coerce").fillna(18.0)

    if "precipitation_mm" not in enriched.columns:
        enriched["precipitation_mm"] = 0.0
    else:
        enriched["precipitation_mm"] = pd.to_numeric(enriched["precipitation_mm"], errors="coerce").fillna(0.0)

    def fallback_short_trip_ratio(row: pd.Series) -> float:
        if pd.notna(row.get("short_trip_ratio")):
            return clamp(float(row["short_trip_ratio"]), 0.05, 0.88)
        profile = DONG_PROFILES.get(row["dong_name"], {"nightlife_weight": 0.6})
        base = 0.20 + (0.18 if is_night_hour(float(row["hour_of_day"])) else 0.0) * profile["nightlife_weight"]
        return clamp(base, 0.05, 0.88)

    def fallback_congestion(row: pd.Series) -> float:
        if pd.notna(row.get("live_congestion_score")):
            return clamp(float(row["live_congestion_score"]), 1.0, 5.0)
        profile = DONG_PROFILES.get(row["dong_name"], {"demand_weight": 1.0, "nightlife_weight": 0.6})
        return synthetic_live_congestion(
            hour=float(row["hour_of_day"]),
            day_of_week=int(row["day_of_week"]),
            precipitation_mm=float(row["precipitation_mm"]),
            dong_profile=profile,
            rng=np.random.default_rng(7),
        )

    def fallback_supply(row: pd.Series) -> int:
        if pd.notna(row.get("current_active_supply")):
            return int(max(1, round(float(row["current_active_supply"]))))
        profile = DONG_PROFILES.get(row["dong_name"], {"supply_weight": 1.0})
        base = 1100 if is_night_hour(float(row["hour_of_day"])) else 1700
        adjusted = base * profile["supply_weight"] - (float(row["live_congestion_score"]) - 1.0) * 80
        return int(round(clamp(adjusted, 900, 2500)))

    enriched["short_trip_ratio"] = enriched.apply(fallback_short_trip_ratio, axis=1)
    enriched["live_congestion_score"] = enriched.apply(fallback_congestion, axis=1)
    enriched["current_active_supply"] = enriched.apply(fallback_supply, axis=1)
    return enriched


def build_feature_matrix(frame: pd.DataFrame) -> pd.DataFrame:
    features = enrich_request_features(frame)
    hour = features["hour_of_day"]
    dow = features["day_of_week"]

    encoded = pd.DataFrame(
        {
            "hour_sin": np.sin(2 * np.pi * hour / 24.0),
            "hour_cos": np.cos(2 * np.pi * hour / 24.0),
            "dow_sin": np.sin(2 * np.pi * dow / 7.0),
            "dow_cos": np.cos(2 * np.pi * dow / 7.0),
            "is_holiday": features["is_holiday"].astype(float),
            "weather_temp": features["weather_temp"].astype(float),
            "precipitation_mm": features["precipitation_mm"].astype(float),
            "current_active_supply": features["current_active_supply"].astype(float),
            "short_trip_ratio": features["short_trip_ratio"].astype(float),
            "live_congestion_score": features["live_congestion_score"].astype(float),
            "is_night_shift": hour.map(lambda value: 1.0 if is_night_hour(float(value)) else 0.0),
            "is_peak_hour": hour.map(lambda value: 1.0 if is_peak_hour(float(value)) else 0.0),
            "supply_demand_pressure_proxy": (
                features["live_congestion_score"].astype(float)
                * (1.0 + features["short_trip_ratio"].astype(float))
                / np.maximum(features["current_active_supply"].astype(float), 1.0)
            )
            * 1000.0,
        }
    )

    dong_dummies = pd.get_dummies(features["dong_name"], prefix="dong", dtype=float)
    return pd.concat([encoded, dong_dummies], axis=1)


def align_feature_matrix(frame: pd.DataFrame, feature_columns: list[str]) -> pd.DataFrame:
    aligned = frame.copy()
    for column_name in feature_columns:
        if column_name not in aligned.columns:
            aligned[column_name] = 0.0
    return aligned[feature_columns].astype(float)


def chronological_train_test_split(frame: pd.DataFrame, test_ratio: float = 0.2) -> tuple[pd.DataFrame, pd.DataFrame]:
    ordered = frame.sort_values("timestamp").reset_index(drop=True)
    split_index = max(1, int(len(ordered) * (1 - test_ratio)))
    train = ordered.iloc[:split_index].copy()
    test = ordered.iloc[split_index:].copy()
    if test.empty:
        test = ordered.iloc[-1:].copy()
    return train, test


def train_dispatch_models(dataset: pd.DataFrame) -> dict[str, Any]:
    working = dataset.copy()
    working["timestamp"] = pd.to_datetime(working["timestamp"], utc=True).dt.tz_convert(SEOUL_TZ)

    train_frame, test_frame = chronological_train_test_split(working)
    train_x = build_feature_matrix(train_frame)
    test_x = build_feature_matrix(test_frame)
    feature_columns = list(train_x.columns)
    test_x = align_feature_matrix(test_x, feature_columns)

    backend_name, demand_model = choose_regressor()
    _, surge_model = choose_regressor()

    demand_model.fit(train_x, train_frame["actual_demand_volume"])
    surge_model.fit(train_x, train_frame["optimal_surge_multiplier"])

    demand_predictions = demand_model.predict(test_x)
    surge_predictions = surge_model.predict(test_x)
    metrics = TrainingMetrics(
        demand_rmse=round_float(math.sqrt(mean_squared_error(test_frame["actual_demand_volume"], demand_predictions)), 4),
        surge_rmse=round_float(math.sqrt(mean_squared_error(test_frame["optimal_surge_multiplier"], surge_predictions)), 4),
        train_rows=len(train_frame),
        test_rows=len(test_frame),
        model_backend=backend_name,
    )

    return {
        "demand_model": demand_model,
        "surge_model": surge_model,
        "feature_columns": feature_columns,
        "metrics": asdict(metrics),
        "generated_at": datetime.now(tz=SEOUL_TZ).isoformat(),
    }


def save_model_bundle(bundle: dict[str, Any], output_path: Path = DEFAULT_MODEL_PATH) -> Path:
    ensure_parent(output_path)
    dump(bundle, output_path)
    return output_path


def load_model_bundle(model_path: Path = DEFAULT_MODEL_PATH) -> dict[str, Any]:
    return load(model_path)


@dataclass
class DispatchRequestData:
    timestamp: str
    dong_name: str
    weather_temp: float = 18.0
    precipitation_mm: float = 0.0
    current_active_supply: int | None = None
    short_trip_ratio: float | None = None
    live_congestion_score: float | None = None
    is_holiday: int | None = None


class DynamicDispatcher:
    """Predicts demand, estimates effective supply, and returns dispatch policy."""

    def __init__(
        self,
        bundle: dict[str, Any],
        *,
        surge_cap_multiplier: float = 2.0,
        incentive_cap_krw: int = 5_000,
        av_active_count: int = 7,
        av_demand_threshold: int = 260,
    ) -> None:
        self.bundle = bundle
        self.surge_cap_multiplier = surge_cap_multiplier
        self.incentive_cap_krw = incentive_cap_krw
        self.av_active_count = av_active_count
        self.av_demand_threshold = av_demand_threshold

    @classmethod
    def from_model_path(cls, model_path: Path = DEFAULT_MODEL_PATH) -> "DynamicDispatcher":
        return cls(load_model_bundle(model_path))

    def predict(self, request: DispatchRequestData | dict[str, Any]) -> dict[str, Any]:
        payload = asdict(request) if isinstance(request, DispatchRequestData) else dict(request)
        feature_frame = pd.DataFrame([payload])
        enriched = enrich_request_features(feature_frame)
        feature_matrix = build_feature_matrix(feature_frame)
        aligned = align_feature_matrix(feature_matrix, self.bundle["feature_columns"])

        predicted_demand = max(0, int(round(float(self.bundle["demand_model"].predict(aligned)[0]))))
        predicted_surge = float(self.bundle["surge_model"].predict(aligned)[0])

        row = enriched.iloc[0]
        effective_supply = estimate_effective_supply(
            current_active_supply=int(row["current_active_supply"]),
            short_trip_ratio=float(row["short_trip_ratio"]),
            live_congestion_score=float(row["live_congestion_score"]),
            hour_of_day=float(row["hour_of_day"]),
        )
        av_active = self.should_allocate_av(float(row["hour_of_day"]), predicted_demand)
        if av_active:
            effective_supply += self.av_active_count

        predicted_imbalance_score = (predicted_demand - effective_supply) / max(effective_supply, 1)
        recommended_surge = clamp(
            max(
                1.0,
                predicted_surge,
                1.0 + max(0.0, predicted_imbalance_score) * 0.55,
            ),
            1.0,
            self.surge_cap_multiplier,
        )
        driver_incentive_output = self.driver_incentive_output(recommended_surge)

        return {
            "timestamp": normalize_timestamp(payload["timestamp"]).isoformat(),
            "dong_name": str(row["dong_name"]),
            "predicted_demand_volume": predicted_demand,
            "estimated_effective_supply": int(effective_supply),
            "predicted_imbalance_score": round_float(predicted_imbalance_score, 4),
            "recommended_surge_multiplier": round_float(recommended_surge, 3),
            "driver_incentive_output_krw": int(driver_incentive_output),
            "av_allocation_flag": av_active,
            "model_backend": self.bundle["metrics"]["model_backend"],
            "model_metrics": self.bundle["metrics"],
        }

    def should_allocate_av(self, hour_of_day: float, predicted_demand: int) -> bool:
        return is_night_hour(hour_of_day) and predicted_demand >= self.av_demand_threshold

    def driver_incentive_output(self, surge_multiplier: float) -> int:
        gross_bonus = (surge_multiplier - 1.0) * self.incentive_cap_krw
        driver_bonus = gross_bonus * 0.85
        return int(round(clamp(driver_bonus, 0.0, self.incentive_cap_krw * 0.85) / 100.0) * 100)


def ensure_trained_dispatcher(
    model_path: Path = DEFAULT_MODEL_PATH,
    dataset_path: Path = DEFAULT_DATASET_PATH,
    config: SyntheticDataConfig = SyntheticDataConfig(),
) -> DynamicDispatcher:
    if model_path.exists():
        return DynamicDispatcher.from_model_path(model_path)

    dataset = generate_synthetic_gangnam_taxi_data(config)
    ensure_parent(dataset_path)
    dataset.to_csv(dataset_path, index=False)
    bundle = train_dispatch_models(dataset)
    save_model_bundle(bundle, model_path)
    return DynamicDispatcher(bundle)


def create_fastapi_app(model_path: Path = DEFAULT_MODEL_PATH):
    try:
        from fastapi import FastAPI, HTTPException
        from pydantic import BaseModel, Field
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "FastAPI serving requires `fastapi`, `uvicorn`, and `pydantic` to be installed."
        ) from exc

    dispatcher = ensure_trained_dispatcher(model_path=model_path)
    app = FastAPI(title="Gangnam Dynamic Dispatch Backend", version="1.0.0")

    class DispatchRequest(BaseModel):
        timestamp: datetime = Field(..., description="ISO 8601 request timestamp")
        dong_name: str = Field(..., description="Gangnam dong name, e.g. 역삼1동")
        weather_temp: float = Field(18.0, description="Current air temperature in Celsius")
        precipitation_mm: float = Field(0.0, description="Current precipitation in mm")
        current_active_supply: int | None = Field(None, description="Current active taxi supply in the dong")
        short_trip_ratio: float | None = Field(None, description="Current 1-2km short-trip ratio")
        live_congestion_score: float | None = Field(None, description="Live congestion score on a 1-5 scale")
        is_holiday: int | None = Field(None, description="Holiday flag, 0 or 1")

    class DispatchResponse(BaseModel):
        timestamp: str
        dong_name: str
        predicted_demand_volume: int
        estimated_effective_supply: int
        predicted_imbalance_score: float
        recommended_surge_multiplier: float
        driver_incentive_output_krw: int
        av_allocation_flag: bool
        model_backend: str
        model_metrics: dict[str, Any]

    @app.get("/health")
    def health() -> dict[str, Any]:
        return {
            "ok": True,
            "artifact": str(model_path),
            "generated_at": dispatcher.bundle["generated_at"],
        }

    @app.post("/dispatch/policy", response_model=DispatchResponse)
    def dispatch_policy(request: DispatchRequest) -> dict[str, Any]:
        try:
            return dispatcher.predict(
                DispatchRequestData(
                    timestamp=request.timestamp.isoformat(),
                    dong_name=request.dong_name,
                    weather_temp=request.weather_temp,
                    precipitation_mm=request.precipitation_mm,
                    current_active_supply=request.current_active_supply,
                    short_trip_ratio=request.short_trip_ratio,
                    live_congestion_score=request.live_congestion_score,
                    is_holiday=request.is_holiday,
                )
            )
        except Exception as exc:  # pragma: no cover - FastAPI path only
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Gangnam dynamic dispatch model backend")
    parser.add_argument("--months", type=int, default=6)
    parser.add_argument("--freq", default="30min")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--model-path", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--dataset-path", type=Path, default=DEFAULT_DATASET_PATH)
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8010)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = SyntheticDataConfig(months=args.months, freq=args.freq, seed=args.seed)
    dataset = generate_synthetic_gangnam_taxi_data(config)
    ensure_parent(args.dataset_path)
    dataset.to_csv(args.dataset_path, index=False)

    bundle = train_dispatch_models(dataset)
    save_model_bundle(bundle, args.model_path)
    print(
        json.dumps(
            {
                "dataset_path": str(args.dataset_path.resolve()),
                "model_path": str(args.model_path.resolve()),
                "metrics": bundle["metrics"],
                "generated_at": bundle["generated_at"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )

    if not args.serve:
        return 0

    try:
        import uvicorn
    except ModuleNotFoundError as exc:  # pragma: no cover - runtime dependency only
        raise RuntimeError("Serving requires `uvicorn` to be installed.") from exc

    app = create_fastapi_app(model_path=args.model_path)
    uvicorn.run(app, host=args.host, port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
