from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.append(str(SCRIPT_DIR))

from pipeline import (
    DEFAULT_MODEL_DIR,
    DEFAULT_OUTPUT_PATH,
    floor_to_hour,
    now_kst,
    predict_forecast,
    resolve_weather_snapshot,
    write_forecast_json,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT_PATH))
    parser.add_argument("--weather-source", default="kma", choices=["kma", "citydata", "manual"])
    parser.add_argument("--citydata-base-url", default="http://127.0.0.1:55555")
    parser.add_argument("--weather")
    parser.add_argument("--temp-c", type=float, default=0.0)
    parser.add_argument("--humidity", type=float, default=0.0)
    parser.add_argument("--precipitation-mm", type=float, default=0.0)
    parser.add_argument("--precipitation-type")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    weather = resolve_weather_snapshot(
        args.weather_source,
        citydata_base_url=args.citydata_base_url,
        weather=args.weather,
        temp_c=args.temp_c,
        humidity=args.humidity,
        precipitation_mm=args.precipitation_mm,
        precipitation_type=args.precipitation_type,
    )
    forecast_payload = predict_forecast(
        model_dir=args.model_dir,
        weather=weather,
        feature_datetime=floor_to_hour(now_kst()),
    )
    output_path = write_forecast_json(forecast_payload, args.output)
    print(
        json.dumps(
            {
                "output": str(output_path.resolve()),
                "target_datetime": forecast_payload["target_datetime"],
                "weather": forecast_payload["weather"],
                "region_count": len(forecast_payload["regions"]),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
