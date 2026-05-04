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
npm run data:collect:weather
npm run data:features
npm run data:summary
```

`data:collect:citydata` writes raw local snapshots under `data/raw/citydata/`.
`data:collect:weather` writes KMA nowcast snapshots under `data/raw/weather/`.
Those directories are git-ignored. `data:features` writes a model-facing
public signal feature snapshot to `data/processed/features/latest.json` and
`public/feature-snapshot.json`. `data:summary` writes the small dashboard-facing
summary at `public/data-summary.json`.

Run the current live pipeline with:

```bash
npm run data:collect:live
```

## Feature Direction

The target feature table for the model should include:

- `target_datetime`
- `dong_name`
- `hour`, `weekday`, `is_weekend`, `time_band`
- `weather`, `temperature`, `precipitation`
- `live_population_min`, `live_population_max`
- `crowding_level`, `traffic_index`
- `subway_station_count`, `bus_stop_count`, `event_count`
- `demand_proxy_score` for pre-model demos only
- lag or transferred demand priors such as `demand_lag_1h` and
  `same_hour_last_week`

The current repository does not claim to have real KakaoT call logs. Public
signals are used as context and transfer features until a richer demand dataset
is available.

## Spec Mapping

The preprocessing layer changed from a taxi-call-first pipeline to a
public-data-first pipeline because restricted KakaoT call logs are not available
in this repository.

- Seoul citydata is used as current context, not as future demand itself.
- OSM geometry provides dong, road, transit, and road-network context.
- The presentation model uses public-transit boardings, weather, holiday, and
  lag features as the movement-demand proxy.
- `demand_proxy_score` is for demos and handoff checks, not a claim of exact
  taxi-call volume.

See `../docs/spec-alignment.md` for the full capstone-spec comparison.
