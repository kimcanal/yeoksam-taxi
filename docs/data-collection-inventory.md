# A-Eye Data Collection Inventory

This document records what can be collected for the Yeoksam taxi Digital Twin,
what was collected locally, and what still depends on API authorization.

## Target

Final modeling target is not direct KakaoT call volume. The practical public-data target is:

> dong-hour movement demand proxy for 1-hour-ahead prediction

The base spatial unit is the 9 Gangnam administrative dongs in `public/dongs.geojson`.

## Collected Locally

### TOPIS Traffic Volume Proxy

- Source: TOPIS monthly traffic volume workbook
- Site: https://topis.seoul.go.kr/refRoom/openRefRoom_2.do
- Period: 2023-01 ~ 2026-03
- Output: `data/processed/topis/topis_dong_hourly_2023-01_2026-03.csv`
- Rows: 256,176
- Coverage: all 9 target dongs
- Caveat: source is spot-level traffic count; dong values are spatial proxy features.

### Existing Weather Sample

- Source: KMA ASOS hourly observation, Seoul station 108
- Site: https://www.data.go.kr/data/15057210/openapi.do
- Long-range output: `data/processed/weather/seoul_asos_hourly_2023-01-01_2026-03-31.csv`
- Rows: 28,464
- Period: 2023-01-01 00:00 ~ 2026-03-31 23:00
- Caveat: station-level weather, not dong-level weather.

### Existing CityData Samples

- Source: Seoul realtime citydata
- Site: https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do
- Existing raw folder: `data/raw/citydata/`
- Caveat: realtime snapshots only; historical March data cannot be backfilled unless previously collected.

### Seoul CityData Road-Link Congestion

- Source: Seoul realtime citydata road traffic section
- Script: `npm run data:collect:citydata && npm run data:traffic`
- Latest dong summary: `data/processed/traffic/citydata_dong_traffic_latest.csv`
- Latest link snapshot: `public/traffic-snapshot.json`
- Coverage: all 9 target dongs in the latest run
- Caveat: source is road-link speed/congestion, not dong-level vehicle count. Dong values are spatially mapped live congestion proxy features.

### Seoul Dong-Level Public Transit

- Total transit boardings: `tpssPassengerCnt`
- Subway boardings: `tpssSubwayPassenger`
- Bus boardings: `tpssEmdBus`
- Dong master: `districtEmd`
- Latest OpenAPI output: `data/processed/transit/seoul_transit_dong_hourly_2026-03-01_2026-04-30.csv`
- Rows: 38,880
- Actual period: 2026-03-01 ~ 2026-04-29
- Caveat: current OpenAPI provides a recent rolling window, not the full 2023~2025 training period.

### Seoul Public-Transit OD History

- Source: 서울시 행정동 단위 대중교통 출발지/도착지 승객수 정보
- Site: https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do
- Script: `npm run data:collect:transit:od -- 2023-01:2025-12`
- Combined output: `data/processed/transit_od/seoul_transit_od_dong_hourly_2023-01_2025-12.csv`
- Rows: 229,176
- Complete months: 30 / 36
- Partial source months: 2023-06, 2025-01, 2025-02, 2025-06, 2025-07, 2025-09
- Caveat: source is public-transit OD, not taxi calls. Use it as historical directional movement demand.

### Seoul Living Population

- Source: 행정동 단위 서울 생활인구(내국인)
- Site: https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do
- Script: `npm run data:collect:living-pop -- 2023-01:2025-12`
- Combined output: `data/processed/living_population/seoul_living_population_dong_hourly_2023-01_2025-12.csv`
- Rows: 236,304
- Complete months: 35 / 36
- Partial source month: 2025-07
- Use: population normalization for traffic/transit/movement features.

### Static POI / Built Environment

- Source: local OSM-derived GeoJSON assets under `public/`
- Script: `npm run data:features:poi`
- Output: `data/processed/poi/dong_static_poi_features.csv`
- Rows: 9
- Use: static explanatory features for transit access, building density, road capacity, green area, and signal density.

### Korean Public Holidays

- Source: 한국천문연구원_특일 정보
- Site: https://www.data.go.kr/data/15012690/openapi.do
- Script: `npm run data:collect:holidays -- 2023:2026`
- Output: `data/processed/calendar/korean_public_holidays_2023_2026.csv`
- Rows: 79
- Use: derive `is_holiday`, `holiday_name`, day-before/after-holiday features.

### Joined Dong-Hour Feature Table

- Script: `npm run data:features:dong-hour`
- Output: `data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv`
- Rows: 236,736
- Grain: 9 target dongs x date x hour
- Inputs: TOPIS, transit OD, KMA ASOS weather, Korean holidays, living population, static POI
- Validation: weather missing rows 0; POI missing rows 0; living population missing rows 432; transit OD missing rows 7,776 due to partial source months.

## Recommended Next Collection Order

1. Join TOPIS + ASOS + transit + transit OD + holidays into one dong-hour feature table.
2. Add living population / living movement data if storage allows.
3. Keep realtime citydata running going forward for link-level congestion snapshots.
4. Add bus-stop / station-level detail only if the dong-hour model needs more spatial resolution.

## Presentation-Safe Wording

Use:

> 대중교통 승차량은 행정동 단위 원천 데이터를 사용하고, 차량 교통량과 혼잡도는 TOPIS 지점 데이터와 도로 링크 데이터를 행정동 경계에 공간 매핑해 보조 feature로 구성했습니다.

Avoid saying:

- 택시 호출량 예측
- 실시간 택시 데이터
- 행정동별 실제 차량 교통량 원천 데이터
