# %% [markdown]
# # Dong-Hour Demand Proxy Model
#
# Colab-ready script for the A-Eye / Yeoksam taxi Digital Twin project.
#
# What this model predicts:
# - 1-hour-ahead **movement-demand proxy**
# - Target: `inbound_boardings_per_1k_pop` shifted by +1 hour
# - This is **not** a direct taxi-call model because real KakaoT call logs are not available.
#
# Required input CSV:
# - `dong_hour_features_v2_2023-01_2025-12.csv`

# %%
# 1. Setup

from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path


def ensure_packages() -> None:
    """Install only packages that Colab may be missing."""
    try:
        import joblib  # noqa: F401
        import numpy  # noqa: F401
        import pandas  # noqa: F401
        import sklearn  # noqa: F401
    except ImportError:
        subprocess.check_call(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "-q",
                "scikit-learn",
                "joblib",
            ]
        )


ensure_packages()

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


# %%
# 2. Locate or upload data

EXPECTED_FILE = "dong_hour_features_v2_2023-01_2025-12.csv"
OUT_DIR = Path("/content/model_outputs")
if not Path("/content").exists():
    OUT_DIR = Path("data/processed/model_colab_outputs")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def running_in_colab() -> bool:
    try:
        import google.colab  # type: ignore  # noqa: F401

        return True
    except Exception:
        return False


def find_dataset() -> Path | None:
    candidates = [
        Path("/content") / EXPECTED_FILE,
        Path(EXPECTED_FILE),
        Path("data/processed/features") / EXPECTED_FILE,
    ]
    candidates.extend(Path("/content").glob("dong_hour_features_v2*.csv") if Path("/content").exists() else [])
    candidates.extend(Path(".").glob("**/dong_hour_features_v2*.csv"))

    seen: set[Path] = set()
    for path in candidates:
        path = path.resolve()
        if path in seen:
            continue
        seen.add(path)
        if path.exists() and path.is_file():
            return path
    return None


DATA_PATH = find_dataset()

if DATA_PATH is None and running_in_colab():
    from google.colab import files  # type: ignore

    print("CSV 파일을 업로드하세요:", EXPECTED_FILE)
    uploaded = files.upload()
    print("uploaded:", list(uploaded.keys()))
    DATA_PATH = find_dataset()

if DATA_PATH is None:
    raise FileNotFoundError(
        "Cannot find dong_hour_features_v2 CSV. "
        "In Colab, upload dong_hour_features_v2_2023-01_2025-12.csv first."
    )

print("DATA_PATH =", DATA_PATH)
print("OUT_DIR   =", OUT_DIR)


# %%
# 3. Load data

df = pd.read_csv(DATA_PATH)
df["datetime_kst"] = pd.to_datetime(df["datetime_kst"])
df = df.sort_values(["dong_name", "datetime_kst"]).reset_index(drop=True)

print("shape:", df.shape)
print("period:", df["datetime_kst"].min(), "~", df["datetime_kst"].max())
print("dongs:", sorted(df["dong_name"].dropna().unique()))
df.head()


# %%
# 4. Build target and features

TARGET_BASE = "inbound_boardings_per_1k_pop"
TARGET = "target_inbound_boardings_per_1k_pop_t_plus_1h"
HORIZON_HOURS = 1

df[TARGET] = df.groupby("dong_name")[TARGET_BASE].shift(-HORIZON_HOURS)

numeric_features = [
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

categorical_features = [
    "dong_name",
    "weekday",
    "day_type",
    "is_holiday",
    "topis_assignment_type",
    "living_population_available",
    "transit_od_available",
]

feature_cols = [column for column in numeric_features + categorical_features if column in df.columns]
numeric_features = [column for column in numeric_features if column in feature_cols]
categorical_features = [column for column in categorical_features if column in feature_cols]

supervised = df.dropna(subset=[TARGET, TARGET_BASE]).copy()
train_mask = supervised["datetime_kst"] <= pd.Timestamp("2024-12-31 23:59:59")
test_mask = supervised["datetime_kst"] >= pd.Timestamp("2025-01-01 00:00:00")

train_df = supervised[train_mask].copy()
test_df = supervised[test_mask].copy()

X_train = train_df[feature_cols]
y_train = train_df[TARGET]
X_test = test_df[feature_cols]
y_test = test_df[TARGET]

print("features:", len(feature_cols))
print("train:", X_train.shape, "period:", train_df["datetime_kst"].min(), "~", train_df["datetime_kst"].max())
print("test :", X_test.shape, "period:", test_df["datetime_kst"].min(), "~", test_df["datetime_kst"].max())

if X_train.empty or X_test.empty:
    raise ValueError("Train or test split is empty. Check CSV period and datetime_kst column.")


# %%
# 5. Train model

try:
    onehot = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
except TypeError:
    onehot = OneHotEncoder(handle_unknown="ignore", sparse=False)

numeric_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ]
)

categorical_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", onehot),
    ]
)

preprocess = ColumnTransformer(
    transformers=[
        ("num", numeric_pipeline, numeric_features),
        ("cat", categorical_pipeline, categorical_features),
    ],
    remainder="drop",
)

model = HistGradientBoostingRegressor(
    max_iter=300,
    learning_rate=0.05,
    max_leaf_nodes=31,
    random_state=42,
)

pipe = Pipeline(
    steps=[
        ("preprocess", preprocess),
        ("model", model),
    ]
)

pipe.fit(X_train, y_train)
pred = pipe.predict(X_test)
print("trained")


# %%
# 6. Evaluate

baseline = X_test[TARGET_BASE].fillna(X_train[TARGET_BASE].median())


def metric_bundle(y_true, y_pred) -> dict[str, float]:
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    nonzero = np.abs(y_true) > 1e-9
    mape = np.mean(np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero])) * 100
    return {
        "R2": float(r2_score(y_true, y_pred)),
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "RMSE": float(math.sqrt(mean_squared_error(y_true, y_pred))),
        "MAPE_pct": float(mape),
    }


model_metrics = metric_bundle(y_test.to_numpy(), pred)
baseline_metrics = metric_bundle(y_test.to_numpy(), baseline.to_numpy())

print("Model")
print(json.dumps(model_metrics, indent=2, ensure_ascii=False))
print("\nPersistence baseline")
print(json.dumps(baseline_metrics, indent=2, ensure_ascii=False))

metrics_df = pd.DataFrame(
    [
        {"metric": key, "model": value, "baseline": baseline_metrics[key]}
        for key, value in model_metrics.items()
    ]
)
metrics_df


# %%
# 7. Save predictions, metrics, and model

pred_df = test_df[["datetime_kst", "dong_name", TARGET_BASE, TARGET]].copy()
pred_df["prediction"] = pred
pred_df["baseline_prediction"] = baseline.to_numpy()
pred_df["absolute_error"] = (pred_df[TARGET] - pred_df["prediction"]).abs()

predictions_path = OUT_DIR / "dong_demand_proxy_predictions_2025.csv"
metrics_path = OUT_DIR / "metrics.csv"
model_path = OUT_DIR / "dong_demand_proxy_model.joblib"

pred_df.to_csv(predictions_path, index=False)
metrics_df.to_csv(metrics_path, index=False)
joblib.dump(pipe, model_path)

print("saved:")
print(predictions_path)
print(metrics_path)
print(model_path)


# %%
# 8. Feature importance

sample_size = min(5000, len(X_test))
sample = test_df.sample(n=sample_size, random_state=42)

result = permutation_importance(
    pipe,
    sample[feature_cols],
    sample[TARGET],
    n_repeats=5,
    random_state=42,
    n_jobs=-1,
)

importance = (
    pd.DataFrame(
        {
            "feature": feature_cols,
            "importance_mean": result.importances_mean,
            "importance_std": result.importances_std,
        }
    )
    .sort_values("importance_mean", ascending=False)
    .reset_index(drop=True)
)

importance_path = OUT_DIR / "feature_importance.csv"
importance.to_csv(importance_path, index=False)
print("saved:", importance_path)
importance.head(20)


# %%
# 9. Make forecast JSON for map
#
# This is a backtest-style forecast using the latest feature rows in the dataset.
# For true future prediction, replace these latest rows with future feature rows:
# future time/calendar + forecast weather + expected/lagged traffic and movement features.

final_pipe = Pipeline(
    steps=[
        ("preprocess", preprocess),
        (
            "model",
            HistGradientBoostingRegressor(
                max_iter=300,
                learning_rate=0.05,
                max_leaf_nodes=31,
                random_state=42,
            ),
        ),
    ]
)
final_pipe.fit(supervised[feature_cols], supervised[TARGET])

latest_time = df["datetime_kst"].max()
latest_rows = df[df["datetime_kst"] == latest_time].copy()
latest_rows["raw_prediction"] = final_pipe.predict(latest_rows[feature_cols])

min_pred = latest_rows["raw_prediction"].min()
max_pred = latest_rows["raw_prediction"].max()
if math.isclose(float(min_pred), float(max_pred)):
    latest_rows["score"] = 0.5
else:
    latest_rows["score"] = (latest_rows["raw_prediction"] - min_pred) / (max_pred - min_pred)


def weather_label(row) -> str:
    if float(row.get("snow_depth_cm") or 0) > 0:
        return "snow"
    if float(row.get("precipitation_mm") or 0) > 0:
        return "rain"
    return "clear"


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
    "target_datetime": (latest_time + pd.Timedelta(hours=HORIZON_HOURS)).strftime(
        "%Y-%m-%dT%H:%M:%S+09:00"
    ),
    "weather": weather_label(latest_rows.iloc[0]),
    "generated_at": pd.Timestamp.now(tz="Asia/Seoul").strftime("%Y-%m-%dT%H:%M:%S%z"),
    "model_target": TARGET,
    "regions": regions,
}

forecast_path = OUT_DIR / "forecast_latest_model_backtest.json"
forecast_path.write_text(
    json.dumps(forecast, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

print("saved:", forecast_path)
forecast


# %%
# 10. Download outputs in Colab

if running_in_colab():
    from google.colab import files  # type: ignore

    print("Download these if needed:")
    for output in [
        metrics_path,
        predictions_path,
        importance_path,
        forecast_path,
        model_path,
    ]:
        print(output)
    # Uncomment one by one if you want automatic browser downloads.
    # files.download(metrics_path)
    # files.download(predictions_path)
    # files.download(importance_path)
    # files.download(forecast_path)
    # files.download(model_path)

