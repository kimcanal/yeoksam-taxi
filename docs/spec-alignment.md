# Specification Alignment

이 문서는 원래 캡스톤 명세와 현재 `yeoksam-taxi` 구현이 어디에서 달라졌는지 한 장으로 설명하기 위한 기준 문서입니다.

## Short Answer

현재 저장소는 명세를 그대로 복제한 `3x3 SUMO` 평가 baseline이 아니라, 같은 역삼/강남역 마이크로 영역을 실제 지도 위에서 보여주는 `9개 행정동 OSM + Three.js` 디지털트윈 companion입니다.

발표에서는 다음처럼 말하는 것이 가장 정확합니다.

> 명세의 핵심 흐름인 시뮬레이션, 데이터 전처리, 수요 예측은 유지하되, 발표와 서비스 연결을 위해 실제 행정동/OSM 기반 웹 디지털트윈으로 확장했습니다.

## Major Changes

| 명세 기준 | 현재 구현 | 왜 바꿨는가 | 발표 표현 |
| --- | --- | --- | --- |
| 3x3 추상 블록 시뮬레이션 | 강남 9개 행정동 OSM 도로망 | 실제 도로, 건물, 교차로, 행정동 단위 설명이 가능함 | `3x3 baseline을 보완하는 9-dong spatial layer` |
| SUMO/Carla 중심 로컬 시뮬레이터 | Next.js + Three.js 웹 3D viewer | 설치 없이 배포 URL로 시연 가능하고 발표 공유가 쉬움 | `웹 기반 디지털트윈 companion` |
| 택시 호출량 직접 예측 | 백엔드 API가 제공하는 동별 수요 곡선 표시 | 실제 KakaoT 호출 로그가 공개되어 있지 않음 | `백엔드 수요 API를 시각화하는 프론트` |
| 향후 30분 5분 단위 예측 | 백엔드가 정한 시간 단위의 응답 표시 | 예측 단위와 모델은 백엔드가 결정함 | `프론트는 예측값을 계산하지 않음` |
| 실제 택시 GPS/공급 데이터 | 3D 지도용 차량 애니메이션 | 실시간 택시 공급 데이터가 없음 | `visual vehicle layer` |
| 운영급 운영 최적화 | 백엔드 결과를 그래프와 지도 선택 상태로 표시 | 정책 계산은 백엔드 책임 | `수요 API 결과를 화면에서 확인` |

## Module Mapping

### Module 1: Digital Twin Simulation

명세의 최소 3x3 블록 요구를 실제 9개 행정동 OSM 장면으로 확장했습니다. 구현은 `src/`의 Next.js 앱과 `src/components/map-simulator/`의 Three.js runtime에 있습니다.

포함하는 것:

- OSM 기반 도로, 건물, 비도로 지면, 지하철/버스 landmark
- 택시와 일반 차량의 road-level motion
- local scenario preset
- 날씨, 시간, backend demand curve, selected-dong minimap highlight

주의해서 말할 점:

- 전체 강남/서울 traffic replica가 아닙니다.
- 법적/운영급 도로 데이터가 아닙니다.
- active SUMO baseline을 대체하는 것이 아니라 발표용 spatial companion입니다.

### Module 2: Preprocessing And Feature Engineering

택시 호출 원천 로그 대신 공개 데이터를 먼저 연결했습니다.

현재 repo에 있는 흐름:

- static POI and map-context configuration: `src/components/map-simulator/config/*.json`
- backend demand API handoff: `NEXT_PUBLIC_DEMAND_API_ENDPOINT`
- OSM geometry: `public/*.geojson`, `public/road-network.json`

발표 자료의 모델 실험, feature CSV, validation 결과는 백엔드 또는 별도 분석 저장소에서 설명합니다. 이 repo는 그 결과를 백엔드 API 계약과 지도 시각화 구조에 연결합니다.

### Module 3: Demand Prediction

원래 명세의 `택시 호출량 5분 단위 예측`은 현재 프론트 저장소에서 직접 구현하지 않습니다.

현재 책임 분리는 다음과 같습니다.

- Backend: 모델, target, feature, r 보정, 저장, 검증, 정책 해석
- Frontend: `{ dong, weekday }` 요청, 응답 검증, 그래프/미니맵 표시

서비스 handoff는 백엔드 수요 API 계약으로 받습니다. 백엔드가 동/요일 기준 0-23시 수요 예측값을 제공하면, 프론트는 그 값을 그대로 그래프와 지도 선택 상태로 표시합니다.

### Module 4: Backend Demand API Handoff

현재 저장소는 운영 정책을 계산하지 않습니다. 백엔드가 동/요일/시간 기준으로 0-23시 수요 예측값을 내려주면, 프론트는 선택된 동의 시간대별 값을 그래프와 지도 패널에 표시하는 역할에 집중합니다.

```text
request = { dong, weekday }
response = [{ hour: 0, demand: number }, ... { hour: 23, demand: number }]
```

해석은 단순합니다.

- 백엔드는 생활인구 예측치와 보정 계수 기반의 수요값을 계산합니다.
- 프론트는 해당 값을 시간대별 추세선으로 보여줍니다.
- 3D 지도는 선택된 동과 지도 위치 맥락을 보여주는 시각 레이어로 남깁니다.

이 단계의 목적은 정책 최적화가 아니라, 예측 결과가 서비스 화면에서 어떻게 읽히는지 보여주는 것입니다.

## What To Say

- `백엔드 수요 API를 시각화하는 프론트`
- `프론트는 예측값과 배차 정책을 계산하지 않는다`
- `실제 호출 데이터 확보 시 target을 교체해 확장 가능`
- `9개 행정동 OSM 기반 웹 디지털트윈`
- `명세의 3x3 baseline을 보완하는 발표/서비스 연결 레이어`

## What Not To Say

- `택시 호출량을 직접 예측했다`
- `실시간 택시 데이터를 사용했다`
- `KakaoT 호출 로그를 학습했다`
- `운영급 택시 운영 최적화 시스템이다`
- `전체 강남 또는 서울 traffic digital twin이다`

## Current Limitation Summary

- 실제 택시 호출량, GPS, 기사 수락률 데이터는 없습니다.
- 공개 지도/POI 맥락은 수요 해석을 돕는 보조 레이어이지 미래 수요 정답지가 아닙니다.
- OSM은 prototype geometry backbone으로 적합하지만 법적 road-operation source는 아닙니다.
- 현재 프론트는 백엔드 수요 예측 결과를 설명하는 시각화 prototype입니다.
