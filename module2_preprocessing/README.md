# Module 2: Preprocessing And Feature Engineering

This module describes the current public-data preprocessing path before the
final taxi demand model arrives.

## Current Inputs

- Seoul citydata (`OA-21285`) through `/api/realtime` and
  `scripts/collect-citydata.mjs`
- KMA weather nowcast through `/api/weather`
- OSM dong/road/transit geometry through `public/*.geojson`
- Demo or model forecast output through `public/forecast/latest.json`

## Current Commands

```bash
npm run data:collect:citydata
npm run data:summary
```

`data:collect:citydata` writes raw local snapshots under `data/raw/citydata/`.
That directory is git-ignored. `data:summary` writes the small dashboard-facing
summary at `public/data-summary.json`.

## Feature Direction

The target feature table for the model should include:

- `target_datetime`
- `dong_name`
- `hour`, `weekday`, `is_weekend`, `time_band`
- `weather`, `temperature`, `precipitation`
- `live_population_min`, `live_population_max`
- `crowding_level`, `traffic_index`
- lag or transferred demand priors such as `demand_lag_1h` and
  `same_hour_last_week`

The current repository does not claim to have real KakaoT call logs. Public
signals are used as context and transfer features until a richer demand dataset
is available.
