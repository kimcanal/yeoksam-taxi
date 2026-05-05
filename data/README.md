# Data Directory

This directory keeps the capstone data pipeline explicit without committing
large or frequently changing raw files.

## Layout

- `raw/`: local API collection output. Ignored by git except `.gitkeep`.
- `processed/`: local preprocessing outputs. Ignored by git except `.gitkeep`.
- `samples/`: small committed sample inputs used for demos and reproducibility.

## Recommended Flow

```bash
npm run data:collect:citydata
npm run data:collect:citydata-history
npm run data:traffic
npm run data:collect:weather
npm run data:collect:weather:asos -- 2023-01-01:2026-03-31 108
npm run data:collect:holidays -- 2023:2026
npm run data:collect:transit -- 2023-01-01:2025-12-31
npm run data:collect:transit:od -- 2023-01:2025-12
npm run data:combine:transit:od -- --start 2023-01 --end 2025-12
npm run data:process:metro-station-hourly -- data/raw/metro
npm run data:collect:living-pop -- 2023-01:2025-12
npm run data:combine:living-pop -- --start 2023-01 --end 2025-12
npm run data:collect:topis -- 2026-03
npm run data:features:poi
npm run data:features:dong-hour
npm run model:evaluate:feature-sets
npm run model:train:live-compatible
npm run model:build-pattern-cache
npm run model:live:demand-cycle
```

For the live/demo path, `npm run model:live:demand-cycle` is the preferred
single command after model training. It refreshes the public feature snapshot,
forecast JSON, dispatch plan, data summary, and validation log from the latest
available live inputs.

For a presentation-safe local loop, run:

```bash
npm run model:live:loop -- 10
```

This runs the live cycle every 10 minutes on the local machine that already has
the model artifact and ignored processed data.

To accumulate timestamped citydata snapshots for later live validation, run the
single-shot history collector from a local cron or GitHub Action:

```bash
npm run data:collect:citydata-history
```

It writes `data/raw/citydata_history/YYYY-MM-DD/HH-MM.json`, which is ignored by
git because the snapshots grow continuously.

To avoid restoring the full 77MB feature CSV in CI, build the compact historical
pattern cache:

```bash
npm run model:build-pattern-cache
```

The cache is written to `data/processed/model_live_compatible/pattern_cache.json`
and can be used by `scripts/predict_dong_demand_proxy.py` when the full feature
table is absent.

The dashboard should read small public summaries, not all raw samples:

- `public/data-summary.json`
- `public/feature-snapshot.json`
- `public/forecast/latest.json`
- `public/dispatch-plan.json`
- `public/metro-station-activity.json`
- `public/model-observability.json`

This keeps the repository light while still making the data flow inspectable.

## Seoul Metro Station-Hour Data

The station-hour processor expects the public CSV from:

- 서울교통공사_역별 일별 시간대별 승하차인원 정보
- https://www.data.go.kr/data/15048032/fileData.do

Place the downloaded CSV under `data/raw/metro/`, then run:

```bash
npm run data:process:metro-station-hourly -- data/raw/metro
```

The script maps OSM station points in `public/transit.geojson` to the 9 dong
boundaries in `public/dongs.geojson`, then writes:

- `data/processed/station_hourly/seoul_metro_station_dong_hourly.csv`
- `data/processed/station_hourly/seoul_metro_station_hourly_by_station.csv`
- `data/processed/station_hourly/seoul_metro_station_dong_map.csv`
- `public/metro-station-activity.json`

This data refines station-area movement pressure inside a dong. It is not a
direct taxi-call label.

## Source Docs

Each major local data folder has a `SOURCES.md` file describing source pages,
collection commands, row meaning, and caveats:

- `data/SOURCES.md`
- `data/raw/SOURCES.md`
- `data/processed/SOURCES.md`
- `data/processed/topis/SOURCES.md`
- `data/processed/transit/SOURCES.md`
- `data/processed/transit_od/SOURCES.md`
- `data/processed/living_population/SOURCES.md`
- `data/processed/poi/SOURCES.md`
- `data/processed/weather/SOURCES.md`
- `data/processed/calendar/SOURCES.md`

## TOPIS Traffic Volume

TOPIS monthly traffic volume is collected as spot-level vehicle counts, then
mapped to the 9 target dongs with two assignment modes:

- `polygon`: the TOPIS spot coordinate is inside the dong boundary.
- `nearest_corridor`: the spot is inside the 9-dong bounding box and is mapped
  to the nearest dong.
- `nearest_fill`: the dong still has no mapped TOPIS spot, so the nearest spot
  is used as a proxy.

Run:

```bash
npm run data:collect:topis -- 2026-03
```

Outputs are local-only under `data/processed/topis/`:

- `topis_dong_spot_mapping_YYYY-MM.csv`
- `topis_spot_hourly_YYYY-MM.csv`
- `topis_dong_hourly_YYYY-MM.csv`
- `topis_dong_hourly_YYYY-MM.meta.json`

Collected local range:

- `topis_dong_hourly_2023-01_2026-03.csv`
- `topis_collection_summary_2023-01_2026-03.json`
