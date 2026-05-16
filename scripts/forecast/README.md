# Forecast Model Pipeline

This directory contains the offline training and batch-inference flow for the
`strict_calendar_weather_static` forecast path that the frontend reads from
`public/forecast/latest.json`.

## What this pipeline assumes

- It trains only on calendar, weather, dong identity, and static built-environment features.
- It does not depend on delayed living-population or transit OD tables.
- It can derive a minimal static feature table from `data/config/gangnam-pois.json`.
- If you have a richer static feature CSV, you can pass it at train time.

## Training CSV contract

Required columns:

- `dong_name`
- `feature_datetime`
- `target_inbound_boardings_per_1k_pop_t_plus_1h`
- `weather`

Optional columns:

- `target_datetime`
- `temp_c`
- `humidity`
- `precipitation_mm`
- `is_holiday`
- `holiday_names`
- `day_type`

If your training table uses different column names, pass the matching CLI flags.

## Train a model

```bash
.venv/bin/python scripts/forecast/train_model.py \
  --training-csv /path/to/strict_calendar_weather_static_train.csv \
  --output-dir .tmp/forecast-model \
  --backend auto
```

Backend order:

- `lightgbm` if installed
- `xgboost` if installed
- `sklearn` HistGradientBoosting fallback for local validation

Artifacts written under the model directory:

- `model.joblib`
- `metadata.json`
- `static_features_snapshot.csv`

## Generate a forecast once

```bash
.venv/bin/python scripts/forecast/run_inference.py \
  --model-dir .tmp/forecast-model \
  --weather-source kma
```

Weather sources:

- `kma`: fetches current KMA nowcast using the same env keys as the Next route
- `citydata`: reads weather from `<base-url>/api/realtime`
- `manual`: pass `--weather`, `--temp-c`, `--humidity`, `--precipitation-mm`

## Write the frontend JSON

```bash
.venv/bin/python scripts/forecast/build_latest_forecast.py \
  --model-dir .tmp/forecast-model \
  --output public/forecast/latest.json \
  --weather-source kma
```

The output contract matches `src/components/map-simulator/forecast-contract.ts`.

## Notes

- Local training tables and model artifacts stay outside the committed repo data tree.
- For production, point your scheduler at `build_latest_forecast.py`.
- If you want the exact experiment feature table, supply your own static CSV rather
  than relying on the POI-derived default features.
