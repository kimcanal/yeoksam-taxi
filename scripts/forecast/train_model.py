from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.append(str(SCRIPT_DIR))

from pipeline import DEFAULT_MODEL_DIR, DEFAULT_TARGET_COLUMN, TrainingColumnSpec, train_forecast_model


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--training-csv", required=True)
    parser.add_argument("--output-dir", default=str(DEFAULT_MODEL_DIR))
    parser.add_argument("--target-column", default=DEFAULT_TARGET_COLUMN)
    parser.add_argument("--backend", default="auto", choices=["auto", "lightgbm", "xgboost", "histgb"])
    parser.add_argument("--validation-ratio", type=float, default=0.2)
    parser.add_argument("--static-features-csv")
    parser.add_argument("--dong-column", default="dong_name")
    parser.add_argument("--feature-datetime-column", default="feature_datetime")
    parser.add_argument("--target-datetime-column", default="target_datetime")
    parser.add_argument("--weather-column", default="weather")
    parser.add_argument("--temp-column", default="temp_c")
    parser.add_argument("--humidity-column", default="humidity")
    parser.add_argument("--precipitation-column", default="precipitation_mm")
    parser.add_argument("--holiday-flag-column", default="is_holiday")
    parser.add_argument("--holiday-name-column", default="holiday_names")
    parser.add_argument("--day-type-column", default="day_type")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    backend = "hist_gradient_boosting" if args.backend == "histgb" else args.backend
    bundle = train_forecast_model(
        training_csv=args.training_csv,
        output_dir=args.output_dir,
        target_column=args.target_column,
        backend=backend,
        validation_ratio=args.validation_ratio,
        static_features_csv=args.static_features_csv,
        column_spec=TrainingColumnSpec(
            dong_name=args.dong_column,
            feature_datetime=args.feature_datetime_column,
            target_datetime=args.target_datetime_column,
            weather=args.weather_column,
            temp_c=args.temp_column,
            humidity=args.humidity_column,
            precipitation_mm=args.precipitation_column,
            is_holiday=args.holiday_flag_column,
            holiday_names=args.holiday_name_column,
            day_type=args.day_type_column,
        ),
    )
    summary = {
        "model_dir": str(Path(args.output_dir).resolve()),
        "backend": bundle["backend"],
        "feature_set": bundle["feature_set"],
        "metrics": bundle["metrics"],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
