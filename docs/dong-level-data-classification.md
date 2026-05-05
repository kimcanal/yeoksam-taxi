# Dong-Level Data Classification

This project should be explicit about what is true dong-level source data and
what is spatially mapped proxy data.

## Target Dongs

All dong-level outputs use the 9 target Gangnam dongs in `public/dongs.geojson`:

- 역삼1동
- 역삼2동
- 논현1동
- 논현2동
- 삼성1동
- 삼성2동
- 신사동
- 청담동
- 대치4동

## True Administrative-Dong Sources

These sources already contain administrative-dong identifiers in the raw data.

| Source | Local output | Period | Meaning |
| --- | --- | --- | --- |
| Seoul dong-level total transit boardings | `data/processed/transit/` | latest rolling window | hourly boardings by dong |
| Seoul dong-level subway boardings | `data/processed/transit/` | latest rolling window | hourly subway boardings by dong |
| Seoul dong-level bus boardings | `data/processed/transit/` | latest rolling window | hourly bus boardings by dong |
| Seoul public-transit OD | `data/processed/transit_od/` | 2023-01 ~ 2025-12 | hourly origin/destination movement by dong |
| Seoul living population | `data/processed/living_population/` | 2023-01 ~ 2025-12 | hourly local population by dong |

These are the cleanest sources for movement demand proxy modeling.

## Spatially Mapped Proxy Sources

These sources do not start as dong-level tables. We map them into dongs using
coordinates, road-link geometry, and `public/dongs.geojson`.

| Source | Local output | Period | Dong assignment |
| --- | --- | --- | --- |
| TOPIS monthly traffic volume | `data/processed/topis/` | 2023-01 ~ 2026-03 | sensor spot -> polygon / nearest corridor / nearest fill |
| Seoul citydata road traffic | `data/processed/traffic/` | realtime snapshots only | road link geometry -> primary dong |
| KMA ASOS weather | `data/processed/weather/` | 2023-01-01 ~ 2026-03-31 | station-level Seoul weather applied to all target dongs |
| OSM-derived POI/static features | `data/processed/poi/` | static | geometry assigned to dong by representative point |

These should be described as supporting features, not true dong-level raw
traffic counts.

## Current Training Table

The joined feature table is:

- `data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv`

It combines:

- TOPIS traffic volume proxy
- Seoul public-transit OD
- KMA ASOS weather
- Korean public holidays
- Seoul living population for normalization
- static POI / built-environment features

The table is suitable for a dong-hour movement-demand model. It is not a direct
taxi-call label table.

## Presentation-Safe Wording

Use:

> 대중교통 데이터는 행정동 단위 원천 데이터를 사용했고, 차량 교통량과 혼잡도는 TOPIS 지점 데이터와 citydata 도로 링크 데이터를 행정동 경계에 공간 매핑한 보조 feature로 구성했습니다.

Avoid:

- 행정동별 실제 차량 교통량 원천 데이터
- 실시간 택시 호출량
- 택시 호출량을 직접 학습
