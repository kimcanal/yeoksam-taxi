#!/usr/bin/env python3
"""Compare demand proxy models with different feature availability assumptions.

This script is intentionally separate from the production training script. Its
job is to answer a validation question:

    How much performance remains when delayed public-data features are removed?

The target is still the 1-hour-ahead movement-demand proxy. Results should be
used for team explanation and model-risk documentation, not as the dashboard
model artifact.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


DEFAULT_DATASET = "data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv"
DEFAULT_OUT_DIR = "data/processed/model_feature_set_eval"
DEFAULT_TARGET_BASE = "inbound_boardings_per_1k_pop"

NUMERIC_FEATURES = [
    "hour",
    "traffic_volume_proxy",
    "topis_source_spot_count",
    "topis_missing_value_rows",
    "living_population_total",
    "living_population_20s",
    "living_population_30s",
    "living_population_40s",
    "living_population_50s",
    "traffic_volume_proxy_per_1k_pop",
    "outbound_boardings",
    "inbound_boardings",
    "net_inbound_boardings",
    "outbound_boardings_per_1k_pop",
    "inbound_boardings_per_1k_pop",
    "net_inbound_boardings_per_1k_pop",
    "within_target_outbound_boardings",
    "within_target_inbound_boardings",
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

CATEGORICAL_FEATURES = [
    "dong_name",
    "weekday",
    "day_type",
    "is_holiday",
    "topis_assignment_type",
    "living_population_available",
    "transit_od_available",
]

TRANSIT_OD_FEATURES = {
    "outbound_boardings",
    "inbound_boardings",
    "net_inbound_boardings",
    "outbound_boardings_per_1k_pop",
    "inbound_boardings_per_1k_pop",
    "net_inbound_boardings_per_1k_pop",
    "within_target_outbound_boardings",
    "within_target_inbound_boardings",
    "transit_od_available",
}

LIVING_POP_FEATURES = {
    "living_population_total",
    "living_population_20s",
    "living_population_30s",
    "living_population_40s",
    "living_population_50s",
    "traffic_volume_proxy_per_1k_pop",
    "living_population_available",
}

TRAFFIC_PROXY_FEATURES = {
    "traffic_volume_proxy",
    "topis_source_spot_count",
    "topis_missing_value_rows",
    "topis_assignment_type",
}

LAG_SOURCE_FEATURES = [
    "outbound_boardings",
    "inbound_boardings",
    "net_inbound_boardings",
    "outbound_boardings_per_1k_pop",
    "inbound_boardings_per_1k_pop",
    "net_inbound_boardings_per_1k_pop",
    "within_target_outbound_boardings",
    "within_target_inbound_boardings",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=DEFAULT_DATASET)
    parser.add_argument("--out-dir", default=DEFAULT_OUT_DIR)
    parser.add_argument("--target-base", default=DEFAULT_TARGET_BASE)
    parser.add_argument("--horizon-hours", type=int, default=1)
    parser.add_argument("--train-end", default="2024-12-31 23:59:59")
    parser.add_argument("--test-start", default="2025-01-01 00:00:00")
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


def metrics(y_true, y_pred) -> dict[str, float]:
    return {
        "r2": float(r2_score(y_true, y_pred)),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(rmse(y_true, y_pred)),
        "mape_pct": float(mape(y_true, y_pred)),
    }


def feature_columns_for_set(
    name: str,
    base_columns: list[str],
    lag_columns: list[str],
) -> tuple[list[str], str]:
    base = list(base_columns)
    if name == "full_observed":
        return base, "Uses all observed features, including current public-transit OD and living population."

    if name == "no_transit_od":
        removed = TRANSIT_OD_FEATURES
        return [column for column in base if column not in removed], (
            "Removes current public-transit OD features but keeps delayed living population and TOPIS traffic proxy."
        )

    if name == "live_compatible_proxy":
        removed = TRANSIT_OD_FEATURES | LIVING_POP_FEATURES
        return [column for column in base if column not in removed], (
            "Uses calendar, weather, static POI, and traffic proxy features; excludes delayed OD and living population."
        )

    if name == "strict_calendar_weather_static":
        removed = TRANSIT_OD_FEATURES | LIVING_POP_FEATURES | TRAFFIC_PROXY_FEATURES
        return [column for column in base if column not in removed], (
            "Uses only calendar, weather, dong identity, and static built-environment features."
        )

    if name == "live_proxy_plus_7d_od_lag":
        removed = TRANSIT_OD_FEATURES | LIVING_POP_FEATURES
        live_base = [column for column in base if column not in removed]
        return live_base + lag_columns, (
            "Live-compatible proxy set plus previous-week same-hour public-transit OD lag features."
        )

    raise ValueError(f"Unknown feature set: {name}")


def split_feature_types(feature_cols: list[str], df: pd.DataFrame) -> tuple[list[str], list[str]]:
    numeric = [
        column
        for column in feature_cols
        if column in df.columns and pd.api.types.is_numeric_dtype(df[column])
    ]
    categorical = [column for column in feature_cols if column in CATEGORICAL_FEATURES]
    return numeric, categorical


def evaluate_feature_set(
    name: str,
    description: str,
    df: pd.DataFrame,
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    feature_cols: list[str],
    target_col: str,
) -> dict:
    numeric, categorical = split_feature_types(feature_cols, df)
    pipeline = build_pipeline(numeric, categorical)
    pipeline.fit(train_df[feature_cols], train_df[target_col])
    pred = pipeline.predict(test_df[feature_cols])

    return {
        "feature_set": name,
        "description": description,
        "feature_count": len(feature_cols),
        "numeric_feature_count": len(numeric),
        "categorical_feature_count": len(categorical),
        "metrics": metrics(test_df[target_col], pred),
        "features": feature_cols,
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
    df["target_same_hour_last_week"] = df.groupby("dong_name")[target_col].shift(168)

    for column in LAG_SOURCE_FEATURES:
        if column in df.columns:
            df[f"{column}_lag_168h"] = df.groupby("dong_name")[column].shift(168)

    base_feature_cols = [
        column for column in NUMERIC_FEATURES + CATEGORICAL_FEATURES if column in df.columns
    ]
    lag_feature_cols = [
        f"{column}_lag_168h"
        for column in LAG_SOURCE_FEATURES
        if f"{column}_lag_168h" in df.columns
    ]

    supervised = df.dropna(subset=[target_col, args.target_base]).copy()
    train_df = supervised[supervised["datetime_kst"] <= pd.Timestamp(args.train_end)].copy()
    test_df = supervised[supervised["datetime_kst"] >= pd.Timestamp(args.test_start)].copy()
    if train_df.empty or test_df.empty:
        raise SystemExit("Train or test split is empty.")

    feature_set_names = [
        "full_observed",
        "no_transit_od",
        "live_compatible_proxy",
        "live_proxy_plus_7d_od_lag",
        "strict_calendar_weather_static",
    ]

    results = []
    for name in feature_set_names:
        feature_cols, description = feature_columns_for_set(name, base_feature_cols, lag_feature_cols)
        results.append(
            evaluate_feature_set(
                name=name,
                description=description,
                df=df,
                train_df=train_df,
                test_df=test_df,
                feature_cols=feature_cols,
                target_col=target_col,
            )
        )

    baseline_rows = []
    current_observed_pred = test_df[args.target_base].fillna(train_df[args.target_base].median())
    baseline_rows.append(
        {
            "baseline": "current_observed_persistence",
            "description": "Predicts t+1h using observed current t public-transit OD target base. Strong but not live-available when OD is delayed.",
            "metrics": metrics(test_df[target_col], current_observed_pred),
            "row_count": int(len(test_df)),
        }
    )
    last_week = test_df.dropna(subset=["target_same_hour_last_week"])
    baseline_rows.append(
        {
            "baseline": "same_target_hour_last_week",
            "description": "Predicts t+1h using the same forecast target hour from one week earlier.",
            "metrics": metrics(last_week[target_col], last_week["target_same_hour_last_week"]),
            "row_count": int(len(last_week)),
        }
    )

    payload = {
        "target": target_col,
        "target_base": args.target_base,
        "horizon_hours": args.horizon_hours,
        "dataset": args.dataset,
        "split": {
            "train_end": args.train_end,
            "test_start": args.test_start,
            "train_rows": int(len(train_df)),
            "test_rows": int(len(test_df)),
            "train_period": [
                str(train_df["datetime_kst"].min()),
                str(train_df["datetime_kst"].max()),
            ],
            "test_period": [
                str(test_df["datetime_kst"].min()),
                str(test_df["datetime_kst"].max()),
            ],
        },
        "feature_set_results": results,
        "baselines": baseline_rows,
        "interpretation": {
            "full_observed": "Backtest upper bound using delayed features that are not all available live.",
            "live_compatible_proxy": "Closer to live inference assumptions, but traffic proxy still comes from historical TOPIS in this table.",
            "live_proxy_plus_7d_od_lag": "Tests whether lagged OD can recover some signal without current OD.",
        },
    }

    json_path = out_dir / "demand_proxy_feature_set_eval.json"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    rows = []
    for result in results:
        rows.append(
            {
                "kind": "model",
                "name": result["feature_set"],
                "feature_count": result["feature_count"],
                **result["metrics"],
                "description": result["description"],
            }
        )
    for baseline in baseline_rows:
        rows.append(
            {
                "kind": "baseline",
                "name": baseline["baseline"],
                "feature_count": "",
                **baseline["metrics"],
                "description": baseline["description"],
            }
        )

    csv_path = out_dir / "demand_proxy_feature_set_eval.csv"
    pd.DataFrame(rows).to_csv(csv_path, index=False)

    print(f"Wrote {json_path}")
    print(f"Wrote {csv_path}")
    print(pd.DataFrame(rows)[["kind", "name", "r2", "mae", "rmse", "mape_pct", "feature_count"]])


if __name__ == "__main__":
    main()
