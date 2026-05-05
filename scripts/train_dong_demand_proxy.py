#!/usr/bin/env python3
"""Train a dong-hour movement-demand proxy model.

Default target:
    1-hour-ahead inbound_boardings_per_1k_pop

The model predicts a public-data movement demand proxy, not direct taxi calls.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


DEFAULT_DATASET = "data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv"
DEFAULT_OUT_DIR = "data/processed/model"
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=DEFAULT_DATASET)
    parser.add_argument("--out-dir", default=DEFAULT_OUT_DIR)
    parser.add_argument("--target-base", default=DEFAULT_TARGET_BASE)
    parser.add_argument("--horizon-hours", type=int, default=1)
    parser.add_argument("--train-end", default="2024-12-31 23:59:59")
    parser.add_argument("--test-start", default="2025-01-01 00:00:00")
    parser.add_argument("--write-public-forecast", action="store_true")
    parser.add_argument("--permutation-sample", type=int, default=5000)
    return parser.parse_args()


def require_ml_deps():
    try:
        import joblib  # noqa: F401
        import numpy  # noqa: F401
        import pandas  # noqa: F401
        import sklearn  # noqa: F401
    except ImportError as error:
        raise SystemExit(
            "Missing ML dependency. In Colab run `!pip -q install scikit-learn joblib`, "
            "or locally install pandas/numpy/scikit-learn/joblib."
        ) from error


def rmse(y_true, y_pred) -> float:
    from sklearn.metrics import mean_squared_error

    return math.sqrt(mean_squared_error(y_true, y_pred))


def mape(y_true, y_pred) -> float:
    import numpy as np

    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    mask = np.abs(y_true) > 1e-9
    if not mask.any():
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def metric_bundle(y_true, y_pred) -> dict:
    from sklearn.metrics import mean_absolute_error, r2_score

    return {
        "r2": float(r2_score(y_true, y_pred)),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(rmse(y_true, y_pred)),
        "mape_pct": float(mape(y_true, y_pred)),
    }


def make_one_hot_encoder():
    from sklearn.preprocessing import OneHotEncoder

    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


def build_pipeline(numeric_features: list[str], categorical_features: list[str]):
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import HistGradientBoostingRegressor
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

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
    preprocessor = ColumnTransformer(
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
    return Pipeline(steps=[("preprocess", preprocessor), ("model", model)])


def weather_label(row) -> str:
    precipitation = float(row.get("precipitation_mm") or 0)
    snow = float(row.get("snow_depth_cm") or 0)
    if snow > 0:
        return "snow"
    if precipitation > 0:
        return "rain"
    return "clear"


def normalize_scores(values):
    import numpy as np

    arr = np.asarray(values, dtype=float)
    min_value = float(np.min(arr))
    max_value = float(np.max(arr))
    if math.isclose(min_value, max_value):
        return [0.5 for _ in arr]
    return [float((value - min_value) / (max_value - min_value)) for value in arr]


def main() -> None:
    args = parse_args()
    require_ml_deps()

    import joblib
    import numpy as np
    import pandas as pd
    from sklearn.inspection import permutation_importance

    dataset_path = Path(args.dataset)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(dataset_path)
    df["datetime_kst"] = pd.to_datetime(df["datetime_kst"])
    df = df.sort_values(["dong_name", "datetime_kst"]).reset_index(drop=True)

    target_col = f"target_{args.target_base}_t_plus_{args.horizon_hours}h"
    df[target_col] = df.groupby("dong_name")[args.target_base].shift(-args.horizon_hours)

    feature_cols = [column for column in NUMERIC_FEATURES + CATEGORICAL_FEATURES if column in df.columns]
    numeric_features = [column for column in NUMERIC_FEATURES if column in feature_cols]
    categorical_features = [column for column in CATEGORICAL_FEATURES if column in feature_cols]

    supervised = df.dropna(subset=[target_col]).copy()
    supervised = supervised[supervised[args.target_base].notna()]
    train_mask = supervised["datetime_kst"] <= pd.Timestamp(args.train_end)
    test_mask = supervised["datetime_kst"] >= pd.Timestamp(args.test_start)

    train_df = supervised[train_mask].copy()
    test_df = supervised[test_mask].copy()
    if train_df.empty or test_df.empty:
        raise SystemExit("Train or test split is empty. Check --train-end and --test-start.")

    X_train = train_df[feature_cols]
    y_train = train_df[target_col]
    X_test = test_df[feature_cols]
    y_test = test_df[target_col]

    pipeline = build_pipeline(numeric_features, categorical_features)
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    baseline_pred = test_df[args.target_base].fillna(train_df[args.target_base].median())
    metrics = {
        "model": metric_bundle(y_test, y_pred),
        "persistence_baseline": metric_bundle(y_test, baseline_pred),
        "target": target_col,
        "target_base": args.target_base,
        "horizon_hours": args.horizon_hours,
        "dataset": str(dataset_path),
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
        "feature_columns": feature_cols,
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "interpretation": "1-hour-ahead public-data movement-demand proxy, not direct taxi calls.",
    }

    predictions = test_df[["datetime_kst", "dong_name", args.target_base, target_col]].copy()
    predictions["prediction"] = y_pred
    predictions["baseline_prediction"] = baseline_pred.to_numpy()
    predictions_path = out_dir / "dong_demand_proxy_predictions_2025.csv"
    predictions.to_csv(predictions_path, index=False)

    importance_rows = []
    sample_n = min(args.permutation_sample, len(X_test))
    if sample_n > 0:
        sample = test_df.sample(n=sample_n, random_state=42)
        result = permutation_importance(
            pipeline,
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
    importance_path = out_dir / "dong_demand_proxy_feature_importance.json"
    importance_path.write_text(json.dumps(importance_rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    metrics_path = out_dir / "dong_demand_proxy_metrics.json"
    metrics_path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    model_path = out_dir / "dong_demand_proxy_model.joblib"
    joblib.dump(
        {
            "pipeline": pipeline,
            "feature_columns": feature_cols,
            "target_col": target_col,
            "target_base": args.target_base,
            "horizon_hours": args.horizon_hours,
        },
        model_path,
    )

    final_pipeline = build_pipeline(numeric_features, categorical_features)
    final_pipeline.fit(supervised[feature_cols], supervised[target_col])
    latest_datetime = df["datetime_kst"].max()
    latest_rows = df[df["datetime_kst"] == latest_datetime].copy()
    latest_rows["raw_prediction"] = final_pipeline.predict(latest_rows[feature_cols])
    latest_rows["score"] = normalize_scores(latest_rows["raw_prediction"])
    target_datetime = latest_datetime + pd.Timedelta(hours=args.horizon_hours)
    regions = []
    for _, row in latest_rows.sort_values("score", ascending=False).iterrows():
        confidence = 0.74
        if row.get("transit_od_available") != "Y":
            confidence -= 0.12
        if row.get("living_population_available") != "Y":
            confidence -= 0.12
        regions.append(
            {
                "dong_name": row["dong_name"],
                "score": round(float(row["score"]), 4),
                "confidence": round(max(confidence, 0.45), 4),
                "raw_prediction": round(float(row["raw_prediction"]), 6),
            }
        )
    forecast = {
        "source": "model",
        "target_datetime": target_datetime.strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "weather": weather_label(latest_rows.iloc[0]),
        "generated_at": pd.Timestamp.now(tz="Asia/Seoul").strftime("%Y-%m-%dT%H:%M:%S%z"),
        "model_target": target_col,
        "regions": regions,
    }
    forecast_path = out_dir / "forecast_latest_model_backtest.json"
    forecast_path.write_text(json.dumps(forecast, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.write_public_forecast:
        public_path = Path("public/forecast/latest.json")
        public_path.parent.mkdir(parents=True, exist_ok=True)
        public_path.write_text(json.dumps(forecast, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {metrics_path}")
    print(f"Wrote {predictions_path}")
    print(f"Wrote {importance_path}")
    print(f"Wrote {model_path}")
    print(f"Wrote {forecast_path}")
    print(json.dumps(metrics["model"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
