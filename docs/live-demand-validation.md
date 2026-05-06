# Live Demand Forecast Validation

This document explains how we validate the dong-level demand proxy model in a
live/demo environment.

## What We Can Validate Live

The current model predicts:

```text
1-hour-ahead inbound movement-demand proxy per 1,000 living population
```

It does not predict direct KakaoT taxi calls because no KakaoT call log is
available.

In live operation, we can validate these parts immediately:

- Seoul citydata API call succeeds.
- KMA weather API call succeeds.
- Road-link congestion is filtered to the 9 target dongs.
- Calendar context is correct, including public holidays.
- The model produces a map-ready forecast JSON.
- Each forecast is logged with the live traffic/weather context at generation
  time.

True demand accuracy can only be scored later when a matching observed demand
proxy or real taxi-call label is available.

## Live Cycle Command

Run one live collection and prediction cycle:

```bash
npm run model:live:demand-cycle
```

For local presentation logging, keep the cycle running every 10 minutes:

```bash
npm run model:live:loop -- 10
```

This loop is intentionally local-first because the model artifact and full
feature table are local processed artifacts, not committed CI assets.

The GitHub workflow `.github/workflows/forecast-cron.yml` is guarded by the
`ENABLE_FORECAST_CRON=true` repository variable. Enable it only after the live
model and feature table can be restored in CI through artifact URLs.

Forecast cron artifact inputs:

- `LIVE_MODEL_URL`: signed/public URL for
  `data/processed/model_live_compatible/dong_demand_proxy_model.joblib`
- `LIVE_FEATURE_TABLE_URL`: optional signed/public URL for
  `data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv`
- `LIVE_PATTERN_CACHE_URL`: signed/public URL for
  `data/processed/model_live_compatible/pattern_cache.json`. This can replace
  the full 77MB feature table for pattern fallback inference.
- `LIVE_HOLIDAYS_URL`: optional signed/public URL for
  `data/processed/calendar/korean_public_holidays_2023_2026.csv`
- `TRAFFIC_MODEL_URL`: signed/public URL for
  `data/processed/model_traffic_forecast/traffic_forecast_model.joblib`
- `TRAFFIC_PATTERN_CACHE_URL`: signed/public URL for
  `data/processed/model_traffic_forecast/traffic_pattern_cache.json`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

If `dong_demand_proxy_model.joblib` and `pattern_cache.json` are committed under
`data/processed/model_live_compatible/`, the URL secrets are not needed for those
two files.

The citydata history workflow `.github/workflows/citydata-history.yml` is guarded
by `ENABLE_CITYDATA_HISTORY=true` and stores each run as a 30-day GitHub Actions
artifact instead of committing growing raw API snapshots to the repository.

This performs:

```text
collect Seoul citydata
collect KMA nowcast weather
extract dong-level road congestion
write public/feature-snapshot.json
predict next-hour dong demand proxy
write public/forecast/latest.json
write public/traffic-forecast/latest.json
write public/population-pressure-summary.json
write public/demand-guardrail-summary.json
write public/dispatch-plan.json
write public/data-summary.json
write public/model-observability.json
write public/overnight-status.json
append validation log
```

To forecast a specific target hour:

```bash
npm run model:live:demand-cycle -- "2026-05-05 15:00"
```

To skip API collection and only regenerate forecast/log from the latest
snapshots:

```bash
npm run model:live:demand-cycle -- "2026-05-05 15:00" --skip-collect
```

To store raw citydata history for future validation:

```bash
npm run data:collect:citydata-history
```

To build the compact pattern cache used by CI-safe pattern inference:

```bash
npm run model:build-pattern-cache
```

## Outputs

- `public/forecast/latest.json`
  - latest forecast consumed by the map
- `public/dispatch-plan.json`
  - latest supply-demand imbalance and dispatch-priority bands
- `public/data-summary.json`
  - lightweight status summary consumed by the data page
- `public/feature-snapshot.json`
  - latest live public-signal feature snapshot for inspection
- `public/traffic-snapshot.json`
  - latest filtered citydata road-link snapshot
- `public/traffic-forecast/latest.json`
  - next-hour dong-level traffic/congestion forecast
- `public/population-pressure-summary.json`
  - citydata POI 1-hour population forecast aggregated into dong-level
    living/floating-population pressure proxy
- `public/demand-guardrail-summary.json`
  - monitoring priority and confidence guardrails combining demand, traffic,
    population and validation signals
- `public/model-observability.json`
  - feature importance, live validation logs, 2026 proxy validation and baseline
    readiness
- `public/overnight-status.json`
  - compact status payload for hourly Action results
- `docs/overnight-model-qa-status.md`
  - Markdown summary of the latest Action/live-cycle output
- `data/processed/traffic/citydata_dong_traffic_latest.json`
  - latest dong-level live congestion summary
- `data/processed/live_validation/latest.json`
  - latest combined validation record
- `data/processed/live_validation/live_forecast_log.jsonl`
  - append-only live forecast log
- `data/processed/live_validation/demand_guardrail_summary.json`
  - processed copy of the public guardrail summary
- `data/processed/live_validation/population_pressure_summary.json`
  - processed copy of the public population pressure summary

## Holiday Handling

Future/pattern prediction now reads:

```text
data/processed/calendar/korean_public_holidays_2023_2026.csv
```

For example, `2026-05-05` is recorded as:

```text
어린이날 / is_holiday = Y
```

The forecast JSON includes this calendar block:

```json
{
  "calendar": {
    "weekday": "화",
    "day_type": "평일",
    "is_holiday": "Y",
    "holiday_names": "어린이날"
  }
}
```

## Why This Is Not Yet Automatic Retraining

Automatic retraining requires new labeled rows:

```text
features at time t -> observed demand proxy at time t+1h
```

The live APIs provide current weather and road congestion, but they do not
provide the actual taxi-call target. Public-transit OD and living-population
datasets are also published with delay, not as immediate live labels.

So the right sequence is:

1. Keep logging hourly forecasts and live traffic/weather context.
2. When new official monthly data appears, rebuild the feature table.
3. Backfill labels for the logged prediction hours.
4. Re-score model accuracy.
5. Retrain or add a live calibration model if accuracy improves.

## More Data That Would Improve Validation

High priority:

- Real taxi-call or pickup/dropoff labels, even aggregated by dong/hour.
- 2026 public-transit OD when Seoul publishes it.
- 2026 living-population monthly data when Seoul publishes it.
- Continuing TOPIS monthly traffic through the latest available month.

Useful live supplements:

- Longer citydata road-congestion history collected every 5 minutes.
- Event/crowd snapshots around Gangnam Station, COEX, Sinsa/Garosugil, and
  Cheongdam.
- Weather forecast values for the target hour, not only nowcast values.
- Seoul Metro station/day/hour passenger counts mapped to the 9 target dongs for
  station-area hotspot pressure.

## Presentation Wording

Use:

```text
The service runs an hourly live inference loop. It combines historical dong-hour
mobility patterns with live weather and road-congestion context, then produces a
1-hour-ahead demand proxy score for each target dong. Every forecast is logged
with the exact live API snapshots used for later validation.
```

Avoid:

```text
The model is automatically retrained in real time.
```

That becomes true only after fresh labeled demand rows are available.

## Feature Availability Evaluation

We separately measured model performance under different feature-availability
assumptions. This is important because the full backtest uses delayed public
datasets that are not all available at live inference time.

Command:

```bash
npm run model:evaluate:feature-sets
```

Outputs:

- `data/processed/model_feature_set_eval/demand_proxy_feature_set_eval.csv`
- `data/processed/model_feature_set_eval/demand_proxy_feature_set_eval.json`

Latest result:

| feature set | live meaning | R2 | MAE | RMSE | MAPE |
| --- | --- | ---: | ---: | ---: | ---: |
| `full_observed` | upper-bound backtest with current OD + living population | 0.9888 | 2.53 | 5.68 | 21.49% |
| `no_transit_od` | removes current public-transit OD | 0.9542 | 4.40 | 11.51 | 37.79% |
| `live_compatible_proxy` | calendar + weather + static POI + traffic proxy | 0.9509 | 4.69 | 11.91 | 36.89% |
| `live_proxy_plus_7d_od_lag` | live-compatible plus previous-week OD lag | 0.9516 | 4.31 | 11.82 | 40.19% |
| `strict_calendar_weather_static` | calendar + weather + static POI only | 0.9586 | 4.37 | 10.94 | 34.57% |
| `current_observed_persistence` | current observed OD as naive baseline, not live-available | 0.6156 | 13.53 | 33.33 | 63.25% |
| `same_target_hour_last_week` | same target hour one week earlier | 0.8643 | 4.19 | 19.70 | 19.68% |

Interpretation:

- The reported `full_observed` score should be described as an offline upper
  bound because it uses current public-transit OD and living-population features.
- Removing delayed OD lowers performance, but the model still keeps meaningful
  signal from dong identity, hour, holiday, weather, static POI, and traffic
  proxy features.
- The live dashboard may still use pattern fallback when exact future rows are
  unavailable, but the served artifact is the dedicated live-compatible model.
- The one-week baseline is useful as an additional sanity check, not a final
  service model.

## Live-Compatible Model Artifact

The live cycle now prefers a separate live-compatible model artifact:

```text
data/processed/model_live_compatible/dong_demand_proxy_model.joblib
```

Training command:

```bash
npm run model:train:live-compatible
```

Latest split-test result:

```text
R2   = 0.9585
MAE  = 4.3672
RMSE = 10.9429
MAPE = 34.57%
```

This model excludes:

- current public-transit OD
- living population
- TOPIS monthly traffic volume

It uses:

- hour / weekday / day type / holiday
- weather
- dong identity
- static POI and built-environment features

The live cycle calls this model, applies the latest KMA nowcast weather snapshot
when available, then computes dispatch recommendations from live citydata road
congestion:

```bash
npm run model:live:demand-cycle
```

The forecast JSON records this explicitly:

```json
{
  "feature_set": "live_compatible_calendar_weather_static",
  "model_feature_set": "model_live_compatible",
  "weather_override_applied": true
}
```
