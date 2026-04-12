# A-Eye Dataset Acquisition Playbook

This note is for the pre-real-data phase.

Goal:

- keep the current map/dong-based simulator moving with public data first
- avoid waiting for a perfect taxi raw feed
- make later dispatch-data insertion easy

## 1. What To Collect First

If we optimize for "usable soon" rather than "perfect taxi telemetry", the best first stack is:

1. taxi hourly by dong: the data you already found
2. dong-level living population
3. dong-level public-transit boardings
4. dong-level OD / mobility movement
5. Gangnam-area realtime context
6. weather
7. taxi stand locations

That gives us a workable demand/supply proxy before any restricted taxi GPS arrives.

## 2. Site-By-Site Source List

### A. Seoul Open Data Plaza

Base site:

- https://data.seoul.go.kr/
- Open API guide: https://data.seoul.go.kr/together/guide/useGuide.do

The Seoul portal explicitly says OpenAPI use requires an issued auth key.

Recommended key name in our repo:

- `SEOUL_OPEN_API_KEY`

This one key is the most important key for this project.

#### A-1. Dong-level living population

- Dataset: `서울시 관내이동 생활인구 (행정동별)`
- Page: https://data.seoul.go.kr/dataList/OA-22851/S/1/datasetView.do
- Why we want it:
  - best dong-level baseline for "people currently present"
  - useful as the default demand prior
- Access type:
  - `Sheet`
  - `OpenAPI`
  - `File`
- Important notes from the page:
  - Sheet/OpenAPI only provide recent data
  - the page says Sheet/OpenAPI provide up to "5 days ago same-day data"
- What to extract:
  - date
  - hour
  - dong code
  - dong name
  - living population
- How we should use it:
  - build hourly demand baseline per dong
  - combine with taxi hourly dong data as a weighted feature

#### A-2. Dong-level total public-transit boardings

- Dataset: `서울시 행정동별 대중교통 총 승차 승객수 정보`
- Page: https://data.seoul.go.kr/dataList/OA-21223/S/1/datasetView.do
- Why we want it:
  - fast proxy for station / corridor demand
  - very useful when taxi-only data is sparse
- Access type:
  - `Sheet`
  - `OpenAPI`
- Important notes from the page:
  - 1 day / 1 hour / dong unit
  - updated daily
  - references the dong master dataset
- What to extract:
  - service date
  - hour
  - dong code
  - total transit boardings

#### A-3. Dong-level subway boardings

- Dataset: `서울시 행정동별 지하철 총 승차 승객수 정보`
- Page: https://data.seoul.go.kr/dataList/OA-21224/S/1/datasetView.do
- Why we want it:
  - Gangnam / Yeoksam / Samseong area demand is strongly subway-driven
  - helps explain late evening peaks and commute peaks
- Access type:
  - `Sheet`
  - `OpenAPI`
- Important notes from the page:
  - 1 day / 1 hour / dong unit
  - updated daily
- What to extract:
  - service date
  - hour
  - dong code
  - subway boardings

#### A-4. Dong-level bus boardings

- Dataset: `서울시 행정동별 버스 총 승차 승객수 정보`
- Page: https://data.seoul.go.kr/dataList/OA-21225/A/1/datasetView.do
- Why we want it:
  - covers demand that subway alone misses
  - useful around curbside pickup logic and road-side hot spots
- Access type:
  - `Sheet`
  - `OpenAPI`
- Important notes from the page:
  - 1 day / 1 hour / dong unit
  - updated daily
- What to extract:
  - service date
  - hour
  - dong code
  - bus boardings

#### A-5. Dong-level public-transit OD

- Dataset: `서울시 행정동 단위 대중교통 출발지/도착지 승객수 정보`
- Page: https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do
- Why we want it:
  - gives actual dong-to-dong directional movement
  - very useful later for dispatch repositioning logic
- Access type:
  - `File` download
- Important notes from the page:
  - 1 day / 1 hour / dong unit
  - updated daily
  - the page lists known missing 2022 dates
- What to extract:
  - date
  - hour
  - origin dong code
  - destination dong code
  - boardings / passenger count
- Practical note:
  - this is file-based, not key-based
  - once the ZIP files are present locally, I can parse them directly

#### A-6. Dong-level public-transit OD by mode

- Dataset: `서울시 행정동 단위 대중교통 수단 출발지/도착지 승객수 정보`
- Page: https://data.seoul.go.kr/dataList/OA-21227/F/1/datasetView.do
- Why we want it:
  - separates bus vs subway behavior
  - good for demand explanation and feature engineering
- Access type:
  - `File` download
- Important notes from the page:
  - 1 day unit
  - dong-level
  - monthly ZIP drops are visible on the page
- What to extract:
  - date
  - origin dong code
  - destination dong code
  - mode
  - passenger count

#### A-7. Realtime Gangnam-area context

- Dataset: `서울시 실시간 도시데이터`
- Page: https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do
- Guide page: https://data.seoul.go.kr/dataVisual/seoul/guide.do
- Why we want it:
  - gives area-level realtime context around places like Gangnam Station
  - includes population, congestion, weather, transit and event context
- Access type:
  - `OpenAPI`
- Important notes from the page:
  - one call returns one place at a time
  - sample key only works for a limited sample place
  - non-sample usage requires an issued key
- What to extract:
  - place code or place name
  - realtime population metrics
  - road congestion summary
  - transit summary
  - weather/environment summary
- Good target places:
  - `강남역`
  - `선릉역`
  - `삼성역`
  - `압구정역`

#### A-8. Dong master / code mapping

- Dataset: `서울시 읍면동마스터 정보`
- Page: https://data.seoul.go.kr/dataList/OA-21234/S/1/datasetView.do
- Why we want it:
  - joins every dong-level table cleanly
  - gives stable dong code mapping
- Access type:
  - `Sheet`
  - `OpenAPI`
  - `File`
- What to extract:
  - dong code
  - dong name
  - gu / district info
- This is mandatory if we want robust joins.

#### A-9. Bus-stop level detail

- Dataset: `서울시 노선별 정류장별 총 승차 승객수 정보`
- Page: https://data.seoul.go.kr/dataList/OA-21219/A/1/datasetView.do
- Why we want it:
  - useful for hotspot placement near specific roads / stops
  - stronger than dong-only data when tuning pickup hotspots
- Access type:
  - `Sheet`
  - `OpenAPI`
  - `File`
- Important notes from the page:
  - 1 day / 1 hour / route-stop unit
  - Sheet/OpenAPI only serve recent 30 days
- Use later, after the dong pipeline is stable.

#### A-10. Taxi stand locations

- Dataset: `서울시 택시승차대 현황`
- Page: https://data.seoul.go.kr/dataList/OA-22228/F/1/datasetView.do
- Why we want it:
  - fixed supply-side curbside anchors
  - can improve pickup/dropoff realism without heavy simulation cost
- Access type:
  - `File`
- What to extract:
  - stand type
  - installation date
  - coordinates
  - gu
  - address

#### A-11. Optional near-realtime local footfall

- Dataset: `스마트서울 도시데이터 센서(S-DOT) 유동인구 측정 정보 (실시간)`
- Page: https://data.seoul.go.kr/dataList/OA-22832/S/1/datasetView.do
- Why we want it:
  - useful for hotspot tuning near actual sensor points
  - better as a supplement than as a citywide base
- Access type:
  - `File`
- Important notes from the page:
  - 10-minute data
  - 126 sensors, not full-city dong coverage

### B. Seoul "Capital Region Living Migration" pages

This is still on the Seoul portal, but conceptually separate from the regular transport tables.

#### B-1. Mobility by mode, hourly, destination dong

- Dataset: `수도권 생활이동 (도착 행정동 기준 시간대별 성연령별 수단 데이터 (내국인))`
- Page: https://data.seoul.go.kr/dataList/OA-22655/F/1/datasetView.do
- Why we want it:
  - hourly movement by mode
  - stronger than plain living population when we want directional demand
- Access type:
  - `File`
- Important notes from the page:
  - monthly updates
  - source is described as Seoul + KT developed mobility data
  - modes include flight, train, express bus, subway, metropolitan bus, bus, walk, vehicle, other
- What to extract:
  - date
  - hour
  - destination dong code
  - sex
  - age band
  - mode
  - movement volume

#### B-2. Capital region mobility manual / FAQ

- Page: https://data.seoul.go.kr/dataVisual/seoul/capitalRegionLivingMigration.do
- Why we want it:
  - explains coding rules
  - confirms Seoul-area records are at dong level
  - states the more detailed version is on the Big Data Campus at 250m / 20 minutes

### C. KMA / Public Data Portal

#### C-1. Weather forecast

- Dataset: `기상청_단기예보 조회서비스(기상청API허브 연계)`
- Page: https://www.data.go.kr/data/15139470/openapi.do
- Why we want it:
  - rain / temperature / sky / precipitation are powerful demand modifiers
- Access type:
  - `OpenAPI`
- Key we need:
  - `KMA_API_KEY`
- Important notes from the page:
  - application is through the public portal page
  - actual request URL redirects to the KMA API Hub
- What to extract:
  - base date / time
  - forecast date / time
  - temperature
  - precipitation type
  - precipitation amount
  - sky / cloud

#### C-2. Holiday / special-day calendar

- Dataset: `한국천문연구원_특일 정보`
- Page: https://www.data.go.kr/data/15012690/openapi.do
- Why we want it:
  - holiday effects are often stronger than normal weekday effects
  - long weekends, substitute holidays, and year-end patterns can distort taxi demand heavily
- Access type:
  - `OpenAPI`
- Key we need:
  - `HOLIDAY_API_KEY`
- What to extract:
  - date
  - holiday name
  - holiday flag
  - special-day / substitute-holiday flag when available
- How we should use it:
  - build `is_holiday`, `is_long_weekend`, `holiday_name` features
  - treat Friday-night-before-holiday and last-day-of-holiday as separate cases

#### C-3. Air quality / dust conditions

- Dataset family: `한국환경공단 에어코리아 대기오염정보`
- Example public page: https://www.data.go.kr/tcs/puc/selectPublicUseCaseView.do?prcuseCaseSn=1049386
- Why we want it:
  - not as strong as weather, but useful as an environmental modifier
  - especially helpful when visibility, fine dust, and seasonal discomfort affect short-distance travel behavior
- Access type:
  - `OpenAPI`
- Key we need:
  - `AIR_QUALITY_API_KEY`
- What to extract:
  - station name
  - timestamp
  - PM10
  - PM2.5
  - ozone
  - integrated air-quality grade when available
- Practical note:
  - use this as a secondary feature, not a first-wave dependency
  - if station-level data is noisy, aggregate to a Gangnam-area daily/hourly feature

### D. Seoul Big Data Campus

Base site:

- https://bigdata.seoul.go.kr/

This is for the higher-resolution phase, not for immediate public scraping.

#### D-1. Restricted / advanced mobility resolution

- The Seoul mobility FAQ says the Big Data Campus provides a more detailed `250m grid / 20-minute` version of capital-region movement.
- Page used as source: https://data.seoul.go.kr/dataVisual/seoul/capitalRegionLivingMigration.do
- Why this matters:
  - if dong-level features stop being enough, this is the next realistic step

#### D-2. Taxi raw / iDTG direction

- Official notice / analysis summary:
  - https://bigdata.seoul.go.kr/noti/selectNoti.do?ac_type=A4&bbs_seq=367&currentPage=3&r_id=P260&tr_code=sweb
- Why this matters:
  - the page explicitly references taxi `iDTG` GPS logs from about 70,000 Seoul taxis
  - this is the closest thing to a true taxi raw source I found
- Limitation:
  - I did not find a direct public self-serve OpenAPI page for this dataset
  - treat this as a restricted / campus-access data source, not a normal public API

## 3. What I Recommend You Actually Get

### Minimum useful set

Get these first:

1. `SEOUL_OPEN_API_KEY`
2. `KMA_API_KEY`
3. `HOLIDAY_API_KEY`
4. your existing taxi-hourly-by-dong data source

And use these datasets first:

1. `OA-22851` living population
2. `OA-21223` total transit boardings
3. `OA-21224` subway boardings
4. `OA-21225` bus boardings
5. `OA-21234` dong master
6. `OA-21285` realtime city data
7. holiday / special-day calendar
8. `OA-22228` taxi stand file

That is enough to build a solid v1 demand feature pipeline.

### Strong v2 add-ons

Add next:

1. `OA-21226` dong-level public-transit OD
2. `OA-21227` dong-level public-transit OD by mode
3. `OA-22655` capital-region movement by mode
4. `OA-21219` route-stop hourly boarding detail
5. `OA-22832` S-DOT footfall
6. air-quality features

### High-resolution later

Only after the above is stable:

1. Big Data Campus 250m / 20-minute mobility
2. taxi iDTG / GPS-class data

## 4. What I Need From You To Start Pulling Data

### Seoul portal

If you issue a Seoul Open Data key, I can immediately start on:

- `OA-22851`
- `OA-21223`
- `OA-21224`
- `OA-21225`
- `OA-21234`
- `OA-21219`
- `OA-21285`

### KMA

If you issue a KMA key, I can immediately start weather ingestion.

### Holiday / special-day API

If you issue a holiday API key, I can immediately start calendar-feature ingestion.

### Air-quality API

If you issue an air-quality API key, I can immediately start environmental-feature ingestion.

### File-only sources

For these, there is no normal API key path:

- `OA-21226`
- `OA-21227`
- `OA-22655`
- `OA-22228`
- `OA-22832`

Once those ZIP / CSV files are present in the workspace, I can parse them directly.

## 5. Suggested Local Naming

Use these environment variable names:

- `SEOUL_OPEN_API_KEY`
- `KMA_API_KEY`
- `HOLIDAY_API_KEY`
- `AIR_QUALITY_API_KEY`
- `SEOUL_REALTIME_PLACE_NAME`
- `TAXI_HOURLY_DONG_DATA_PATH`

Suggested default place:

- `SEOUL_REALTIME_PLACE_NAME=강남역`

## 6. Practical Build Order For This Repo

### Phase 1

- taxi hourly by dong
- living population
- total transit / subway / bus boardings
- holiday calendar
- dong master

Result:

- a clean hourly dong feature table

### Phase 2

- realtime city data
- weather
- optional air quality
- taxi stand locations

Result:

- a better real-scene simulator overlay

### Phase 3

- public-transit OD
- capital-region mobility by mode

Result:

- dispatch repositioning and demand-shift logic can become smarter

### Phase 4

- Big Data Campus detailed mobility
- taxi iDTG class data

Result:

- lane/road-level dispatch research becomes much more realistic

## 7. Suggested Feature Table

For this repo, I recommend converging everything into one dong-hour feature table first.

### Required columns

- `timestamp_kst`
- `service_date`
- `service_hour`
- `dong_code`
- `dong_name`
- `gu_name`

### Core taxi columns

- `taxi_pickups_hourly`
- `taxi_dropoffs_hourly`
- `taxi_supply_proxy_hourly`
- `taxi_demand_index`

### Population / movement columns

- `living_population`
- `inbound_mobility_volume`
- `mobility_vehicle_volume`
- `mobility_walk_volume`

### Transit columns

- `transit_boardings_total`
- `subway_boardings_total`
- `bus_boardings_total`

### Realtime scene columns

- `realtime_place_name`
- `realtime_population_density`
- `realtime_congestion_level`

### Weather / environment columns

- `temperature_c`
- `precipitation_type`
- `precipitation_mm`
- `sky_code`
- `pm10`
- `pm25`

### Calendar columns

- `day_of_week`
- `is_weekend`
- `is_holiday`
- `holiday_name`
- `is_long_weekend`

### Supply-side columns

- `nearby_taxi_stand_count`
- `nearby_major_bus_stop_count`
- `nearby_subway_station_count`

## 8. What I Need From You, Concretely

If you want me to start extracting immediately, the fastest handoff is:

1. issue `SEOUL_OPEN_API_KEY`
2. issue `KMA_API_KEY`
3. issue `HOLIDAY_API_KEY`
4. optionally issue `AIR_QUALITY_API_KEY`
5. place your taxi hourly-by-dong source file in the workspace

After that, I can move straight to:

1. fetch script scaffolding
2. raw snapshot download
3. normalization into a dong-hour table
4. wiring that table back into the simulator / dispatch planner
## 9. Bottom Line

Your finding is normal:

- public taxi data is often only available at `dong + hourly` level
- truly useful taxi raw data is usually restricted

So the right move right now is:

- keep taxi hourly by dong as the taxi anchor
- enrich it with Seoul dong mobility / transit / population / weather data
- leave true raw taxi telemetry for the later restricted-data phase
