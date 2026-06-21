# Supply Proxy Presentation Defense

## One-Line Position

The supply side is not a trained taxi-supply forecasting model. It is a
Seoul/Gangnam supply proxy simulator used to quantify demand-supply imbalance
for visualization and downstream dispatch-policy discussion.

## What To Say

- "수요 모델은 별도 백엔드 모델 산출값을 사용했습니다."
- "공급은 실제 택시 GPS나 공차 상태 데이터가 없어 검증된 예측 모델로 주장하지 않습니다."
- "대신 서울/강남 로컬 피처와 도로링크 집계 통계를 사용해 공급 proxy 시뮬레이터를 만들었습니다."
- "수요와 공급 proxy는 실제 건수/차량 수가 아니라 같은 비교 단위의 model proxy units입니다."
- "핵심 산출물은 실제 공급량 예측이 아니라 동·시간대별 imbalance index입니다."

## What Not To Say

- "공급 모델을 학습했습니다."
- "실제 공급량을 예측합니다."
- "운영급 동적 배차가 가능합니다."
- "검증된 기사 반응 모델입니다."
- "train/validation/test 성능이 있습니다."

## If Asked About Train / Validation / Test

Answer:

> 공급 쪽은 검증 가능한 실제 공급 라벨, 예를 들면 택시 GPS, 공차/실차 상태,
> 기사 수락률, 호출 실패율이 없어서 supervised forecasting 모델로 학습하거나
> train/validation/test 성능을 주장하지 않았습니다. 현재는 도로링크 집계 통계와
> 한국 로컬 컨텍스트를 이용한 proxy simulator이고, 성능 평가는 shortage rank,
> 민감도, 시나리오 일관성 중심으로 제한했습니다.

## If Asked Where Korean Characteristics Come From

Grounded data:

- Korean demand observations in `deploy/backend/data/actual_demand.csv`
- Gangnam/Yeoksam POI in `deploy/backend/data/poi/gangnam_poi_kr.csv`
- Seoul Metro hourly station passenger spreadsheets
- Seoul traffic-volume spreadsheets
- Gangnam weather data
- Seoul Open Data Plaza source family: <https://data.seoul.go.kr/>

Heuristic prior:

- Night-operation window: 22:00-04:00
- Peak late-night friction: 23:00-02:00
- Weekend late-night pressure through taxi day-code

The heuristic prior is explicitly marked in the API as
`korea_policy_operating_prior_heuristic` and
`heuristic_not_observed_supply`.

## If Asked Why Supply Follows Demand

Answer:

> 공급은 수요를 그대로 복사하지 않습니다. 도로링크/요일/시간/날씨 기반의 공급
> prior를 먼저 만들고, 수요 모델 산출값은 같은 요일 baseline 대비 변화량으로만
> 제한적으로 후보정합니다. 그래서 spike를 그대로 따라가지 않도록 confidence
> weighting과 temporal smoothing을 적용했습니다.

## If Asked What Would Make It A Real Supply Model

Needed data:

- taxi GPS availability;
- empty-car cruising state;
- occupied/available vehicle state;
- dispatch acceptance or cancellation;
- unserved calls or wait-time ground truth;
- corporate/private taxi operation-rate by hour.

Only after one of these labels exists should the project claim supply forecast
MAE/RMSE, train/validation/test split, or operational dispatch reliability.

## Safer Slide Title

Use:

> 수요-공급 불균형 정량화를 위한 공급 Proxy 시뮬레이터

Avoid:

> 택시 공급 예측 모델
