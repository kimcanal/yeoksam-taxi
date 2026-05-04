# Specification Alignment

이 문서는 원래 캡스톤 명세와 현재 `yeoksam-taxi` 구현이 어디에서 달라졌는지 한 장으로 설명하기 위한 기준 문서입니다.

## Short Answer

현재 저장소는 명세를 그대로 복제한 `3x3 SUMO` 평가 baseline이 아니라, 같은 역삼/강남역 마이크로 영역을 실제 지도 위에서 보여주는 `9개 행정동 OSM + Three.js` 디지털트윈 companion입니다.

발표에서는 다음처럼 말하는 것이 가장 정확합니다.

> 명세의 핵심 흐름인 시뮬레이션, 데이터 전처리, 수요 예측, 배차 판단은 유지하되, 발표와 서비스 연결을 위해 실제 행정동/OSM 기반 웹 디지털트윈으로 확장했습니다.

## Major Changes

| 명세 기준 | 현재 구현 | 왜 바꿨는가 | 발표 표현 |
| --- | --- | --- | --- |
| 3x3 추상 블록 시뮬레이션 | 강남 9개 행정동 OSM 도로망 | 실제 도로, 건물, 교차로, 행정동 단위 설명이 가능함 | `3x3 baseline을 보완하는 9-dong spatial layer` |
| SUMO/Carla 중심 로컬 시뮬레이터 | Next.js + Three.js 웹 3D viewer | 설치 없이 배포 URL로 시연 가능하고 발표 공유가 쉬움 | `웹 기반 디지털트윈 companion` |
| 택시 호출량 직접 예측 | 대중교통 승차량 기반 이동 수요 proxy | 실제 KakaoT 호출 로그가 공개되어 있지 않음 | `대중교통 승차량 기반 이동 수요 proxy` |
| 향후 30분 5분 단위 예측 | 1시간 뒤 동별 수요 proxy 예측 | 공개 데이터의 시간 단위와 현재 모델 실험 범위에 맞춤 | `1시간 뒤 이동 수요 예측` |
| 실제 택시 GPS/공급 데이터 | 샘플 공급량과 3D taxi distribution proxy | 실시간 택시 공급 데이터가 없음 | `simulated supply proxy` |
| 운영급 배차 최적화 | 단순 imbalance 기반 배차 판단 | 프로토타입 단계에서 설명 가능한 정책 우선 | `수요 높고 공급 낮은 동을 우선순위화` |

## Module Mapping

### Module 1: Digital Twin Simulation

명세의 최소 3x3 블록 요구를 실제 9개 행정동 OSM 장면으로 확장했습니다. 구현은 `src/`의 Next.js 앱과 `src/components/map-simulator/`의 Three.js runtime에 있습니다.

포함하는 것:

- OSM 기반 도로, 건물, 비도로 지면, 지하철/버스 landmark
- 택시와 일반 차량의 road-level motion
- pickup/dropoff marker와 local scenario preset
- 날씨, 시간, demand heatmap, dispatch context

주의해서 말할 점:

- 전체 강남/서울 traffic replica가 아닙니다.
- 법적/운영급 도로 데이터가 아닙니다.
- active SUMO baseline을 대체하는 것이 아니라 발표용 spatial companion입니다.

### Module 2: Preprocessing And Feature Engineering

택시 호출 원천 로그 대신 공개 데이터를 먼저 연결했습니다.

현재 repo에 있는 흐름:

- Seoul citydata snapshot: `/api/realtime`, `scripts/collect-citydata.mjs`
- KMA weather nowcast: `/api/weather`, `scripts/collect-weather.mjs`
- OSM geometry: `public/*.geojson`, `public/road-network.json`
- feature snapshot: `scripts/build-feature-snapshot.mjs`

발표 자료의 모델 실험은 별도 분석 단계에서 만든 대중교통 OD + 날씨 + 휴일 + lag feature CSV를 기준으로 설명합니다. repo는 그 결과를 `/presentation`, `public/forecast/latest.json`, `public/dispatch-plan.json` 쪽 서비스 구조와 연결합니다.

### Module 3: Demand Prediction

원래 명세의 `택시 호출량 5분 단위 예측`은 현재 구현에서 `대중교통 승차량 기반 1시간 뒤 이동 수요 proxy 예측`으로 바뀌었습니다.

현재 모델 설명:

- Model: `HistGradientBoostingRegressor`
- Target: `target_transit_boardings_t_plus_1h`
- Unit: 강남 9개 동, 날짜/시간 단위
- Output interpretation: 실제 택시 호출량이 아니라 근미래 이동 수요 신호

서비스 handoff는 `public/forecast/latest.json` 계약으로 받습니다. 이 계약은 나중에 실제 택시 호출 데이터가 확보되면 `source: "model"`과 region score를 같은 형태로 교체할 수 있게 만든 것입니다.

### Module 4: Dynamic Dispatch And Incentive Policy

현재 배차 정책은 실제 기사 수락률/택시 GPS 기반 최적화가 아니라 간단한 imbalance rule입니다.

```text
imbalance_score = predicted_demand_score / (idle_taxis + 1)
```

해석은 단순합니다.

- demand가 높고 idle taxi가 적으면 우선 이동
- demand가 높지만 supply가 있으면 커버 보강 또는 유지
- demand가 낮으면 관찰

이 단계의 목적은 운영 최적화가 아니라, 예측 결과가 서비스 판단으로 어떻게 이어지는지 보여주는 prototype입니다.

## What To Say

- `대중교통 승차량 기반 이동 수요 proxy`
- `공개 데이터로 만든 1시간 뒤 동별 수요 신호`
- `실제 호출 데이터 확보 시 target을 교체해 확장 가능`
- `9개 행정동 OSM 기반 웹 디지털트윈`
- `명세의 3x3 baseline을 보완하는 발표/서비스 연결 레이어`

## What Not To Say

- `택시 호출량을 직접 예측했다`
- `실시간 택시 데이터를 사용했다`
- `KakaoT 호출 로그를 학습했다`
- `운영급 배차 최적화 시스템이다`
- `전체 강남 또는 서울 traffic digital twin이다`

## Current Limitation Summary

- 실제 택시 호출량, GPS, 기사 수락률 데이터는 없습니다.
- 서울 citydata는 현재 상황 layer이지 미래 수요 정답지가 아닙니다.
- 대중교통 수요와 택시 수요는 같지 않으므로 proxy로 해석해야 합니다.
- OSM은 prototype geometry backbone으로 적합하지만 법적 road-operation source는 아닙니다.
- 현재 dispatch는 설명 가능한 rule-based prototype입니다.
