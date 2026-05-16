# Transit Data Contract

This project keeps public-transit sources source-faithful first, then builds
model-friendly derived tables.

## Rules

1. Raw source archives stay unfiltered under `data/raw/` or the shared-data raw
   folder.
2. Processed tables are filtered to the 9 target Gangnam administrative dongs in
   `public/dongs.geojson`.
3. Bus and subway are preserved separately whenever the source provides separate
   fields.
4. A combined `total` value is treated as source data only when the source
   provides a total column. Code-created sums must be documented as derived.
5. Model tables may include derived totals for compatibility, but source and
   mode-specific tables remain available for QA.

## Current Layers

| Layer | Source | Grain | Mode handling | Role |
| --- | --- | --- | --- | --- |
| Recent dong boardings | OA-21223/OA-21224/OA-21225 | dong x date x hour | `total`, `subway`, `bus` service rows | live/recent inspection |
| Historical OD | OA-21226 | dong x date x hour | combined public-transit OD source | current 1-hour movement proxy target |
| Mode-specific OD | OA-21227 | dong x date | source `total`, `subway`, `bus` columns | mode analysis and QA |
| Citydata POI transit | OA-21285 | POI snapshot | bus/subway fields preserved, total score derived | live POI pressure |

## Safe Wording

Use:

> 시간 단위 예측 타깃은 OA-21226의 대중교통 OD 합계이고, 수단별 버스/지하철 분석은 OA-21227과 citydata의 분리 컬럼으로 별도 관리합니다.

Avoid:

> 버스와 지하철을 임의로 합쳐 택시 수요로 사용했습니다.
