#!/usr/bin/env python3
"""Train a live-compatible dong demand proxy model.

This model intentionally excludes delayed public-data features such as current
public-transit OD and living population. It is meant for the live dashboard
where only calendar, weather, static built-environment features, and dong
identity are reliably available at inference time.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


DEFAULT_DATASET = "data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv"
DEFAULT_OUT_DIR = "data/processed/model_live_compatible"
DEFAULT_TARGET_BASE = "inbound_boardings_per_1k_pop"

LIVE_NUMERIC_FEATURES = [
    "hour",
    "temperature_c",
    "precipitation_mm",
    "wind_speed_ms",
    "humidity_pct",
    "sea_level_pressure_hpa",
    "snow_depth_cm",
    "cloud_total_tenths",
    "visibility_10m",
    "dong_area_m2",
    "building_count",
    "building_footprint_area_m2",
    "estimated_floor_area_m2",
    "avg_building_height_m",
    "commercial_building_count",
    "apartments_building_count",
    "hotel_building_count",
    "bus_stop_count",
    "subway_station_count",
    "transit_importance_sum",
    "traffic_signal_count",
    "road_count",
    "road_length_m",
    "arterial_road_length_m",
    "connector_road_length_m",
    "local_road_length_m",
    "green_area_m2",
    "water_area_m2",
    "nonroad_feature_count",
]

LIVE_CATEGORICAL_FEATURES = [
    "dong_name",
    "weekday",
    "day_type",
    "is_holiday",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=DEFAULT_DATASET)
    parser.add_argument("--out-dir", default=DEFAULT_OUT_DIR)
    parser.add_argument("--target-base", default=DEFAULT_TARGET_BASE)
    parser.add_argument("--horizon-hours", type=int, default=1)
    parser.add_argument("--train-end", default="2024-12-31 23:59:59")
    parser.add_argument("--test-start", default="2025-01-01 00:00:00")
    parser.add_argument("--permutation-sample", type=int, default=5000)
    return parser.parse_args()


def make_one_hot_encoder():
    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


def build_pipeline(numeric_features: list[str], categorical_features: list[str]) -> Pipeline:
    numeric = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", make_one_hot_encoder()),
        ]
    )
    preprocess = ColumnTransformer(
        transformers=[
            ("num", numeric, numeric_features),
            ("cat", categorical, categorical_features),
        ],
        remainder="drop",
    )
    model = HistGradientBoostingRegressor(
        max_iter=300,
        learning_rate=0.05,
        max_leaf_nodes=31,
        random_state=42,
    )
    return Pipeline(steps=[("preprocess", preprocess), ("model", model)])


def rmse(y_true, y_pred) -> float:
    return math.sqrt(mean_squared_error(y_true, y_pred))


def mape(y_true, y_pred) -> float:
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    mask = np.abs(y_true) > 1e-9
    if not mask.any():
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def metric_bundle(y_true, y_pred) -> dict[str, float]:
    return {
        "r2": float(r2_score(y_true, y_pred)),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(rmse(y_true, y_pred)),
        "mape_pct": float(mape(y_true, y_pred)),
    }


def main() -> None:
    args = parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.dataset)
    df["datetime_kst"] = pd.to_datetime(df["datetime_kst"])
    df = df.sort_values(["dong_name", "datetime_kst"]).reset_index(drop=True)

    target_col = f"target_{args.target_base}_t_plus_{args.horizon_hours}h"
    df[target_col] = df.groupby("dong_name")[args.target_base].shift(-args.horizon_hours)

    feature_cols = [
        column
        for column in LIVE_NUMERIC_FEATURES + LIVE_CATEGORICAL_FEATURES
        if column in df.columns
    ]
    numeric_features = [column for column in LIVE_NUMERIC_FEATURES if column in feature_cols]
    categorical_features = [column for column in LIVE_CATEGORICAL_FEATURES if column in feature_cols]

    supervised = df.dropna(subset=[target_col, args.target_base]).copy()
    train_df = supervised[supervised["datetime_kst"] <= pd.Timestamp(args.train_end)].copy()
    test_df = supervised[supervised["datetime_kst"] >= pd.Timestamp(args.test_start)].copy()
    if train_df.empty or test_df.empty:
        raise SystemExit("Train or test split is empty.")

    eval_pipeline = build_pipeline(numeric_features, categorical_features)
    eval_pipeline.fit(train_df[feature_cols], train_df[target_col])
    pred = eval_pipeline.predict(test_df[feature_cols])

    metrics = {
        "model": metric_bundle(test_df[target_col], pred),
        "target": target_col,
        "target_base": args.target_base,
        "horizon_hours": args.horizon_hours,
        "dataset": args.dataset,
        "feature_set": "live_compatible_calendar_weather_static",
        "feature_columns": feature_cols,
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "row_counts": {
            "raw": int(len(df)),
            "supervised": int(len(supervised)),
            "train": int(len(train_df)),
            "test": int(len(test_df)),
        },
        "split": {
            "train_end": args.train_end,
            "test_start": args.test_start,
            "train_min_datetime": str(train_df["datetime_kst"].min()),
            "train_max_datetime": str(train_df["datetime_kst"].max()),
            "test_min_datetime": str(test_df["datetime_kst"].min()),
            "test_max_datetime": str(test_df["datetime_kst"].max()),
        },
        "interpretation": (
            "Live-compatible 1-hour-ahead movement-demand proxy model. "
            "Excludes current public-transit OD, living population, and TOPIS monthly traffic volume."
        ),
    }

    predictions = test_df[["datetime_kst", "dong_name", args.target_base, target_col]].copy()
    predictions["prediction"] = pred
    predictions["absolute_error"] = (predictions[target_col] - predictions["prediction"]).abs()
    predictions_path = out_dir / "dong_demand_proxy_live_predictions_2025.csv"
    predictions.to_csv(predictions_path, index=False)

    sample_n = min(args.permutation_sample, len(test_df))
    importance_rows = []
    if sample_n > 0:
        sample = test_df.sample(n=sample_n, random_state=42)
        result = permutation_importance(
            eval_pipeline,
            sample[feature_cols],
            sample[target_col],
            n_repeats=5,
            random_state=42,
            n_jobs=-1,
        )
        importance_rows = sorted(
            [
                {
                    "feature": feature,
                    "importance_mean": float(mean),
                    "importance_std": float(std),
                }
                for feature, mean, std in zip(
                    feature_cols,
                    result.importances_mean,
                    result.importances_std,
                    strict=False,
                )
            ],
            key=lambda row: row["importance_mean"],
            reverse=True,
        )

    importance_path = out_dir / "dong_demand_proxy_live_feature_importance.json"
    importance_path.write_text(json.dumps(importance_rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    metrics_path = out_dir / "dong_demand_proxy_live_metrics.json"
    metrics_path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    production_pipeline = build_pipeline(numeric_features, categorical_features)
    production_pipeline.fit(supervised[feature_cols], supervised[target_col])
    model_path = out_dir / "dong_demand_proxy_model.joblib"
    joblib.dump(
        {
            "pipeline": production_pipeline,
            "feature_columns": feature_cols,
            "target_col": target_col,
            "target_base": args.target_base,
            "horizon_hours": args.horizon_hours,
            "feature_set": "live_compatible_calendar_weather_static",
        },
        model_path,
    )

    sources_path = out_dir / "SOURCES.md"
    sources_path.write_text(
        "# Live-Compatible Demand Proxy Model\n\n"
        "This artifact is trained for live/demo inference.\n\n"
        "It uses only:\n\n"
        "- calendar features: hour, weekday, day_type, is_holiday\n"
        "- weather features: temperature, precipitation, wind, humidity, pressure, cloud, visibility\n"
        "- static dong/POI features: buildings, roads, transit stops, traffic signals, green/water area\n"
        "- dong identity\n\n"
        "It excludes delayed public-transit OD, living population, and TOPIS monthly traffic volume.\n\n"
        f"Metrics are stored in `{metrics_path.name}`.\n",
        encoding="utf-8",
    )

    print(f"Wrote {metrics_path}")
    print(f"Wrote {predictions_path}")
    print(f"Wrote {importance_path}")
    print(f"Wrote {model_path}")
    print(json.dumps(metrics["model"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
