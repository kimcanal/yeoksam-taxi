# POI Flow Analysis Scope

이 문서는 현재 명세(`docs/spec-alignment.md`, `docs/team-data-model-brief.md`)와 지도 구현(`public/dongs.geojson`, `public/*.geojson`, `src/components/MapSimulator.tsx`)을 기준으로 POI 기반 유동인구 분석 작업 범위를 정리한다.

## Goal

현재 프로젝트의 안전한 목표는 실제 택시 호출량 예측이 아니라, 강남 9개 행정동의 공개데이터 기반 `movement-demand pressure`를 설명하는 것이다.

이번 POI 작업의 목표는 다음이다.

- 행정동별 용도/상권/교통/이벤트 성격을 설명 가능한 점수로 만든다.
- 삼성1동과 역삼1동처럼 오차가 자주 커지는 동의 POI 차이를 정량/정성으로 비교한다.
- 기존 지도 heatmap, POI marker, forecast/pressure JSON과 연결할 수 있는 산출물 계약을 만든다.
- 버스/지하철, raw/processed, source/derived 값을 임의로 섞지 않는다.

## Map Scope

지도 기준 공간 단위는 `public/dongs.geojson`의 9개 행정동으로 고정한다.

- 역삼1동
- 역삼2동
- 논현1동
- 논현2동
- 삼성1동
- 삼성2동
- 신사동
- 청담동
- 대치4동

지도에서 이미 사용하는 공간 레이어는 다음이다.

| Layer | Local file | POI 분석에서의 역할 |
| --- | --- | --- |
| 행정동 경계 | `public/dongs.geojson` | 모든 집계와 지도 색상의 기준 단위 |
| 도로 | `public/roads.geojson`, `public/road-network.json` | 접근성, 도로량, 배차 coverability proxy |
| 건물 | `public/buildings.geojson` | 건물 밀도, 고층/업무지 성격, 상업/주거 proxy |
| 대중교통 | `public/transit.geojson` | 역/정류장 접근성, transit hub score |
| 신호/비도로 | `public/traffic-signals.geojson`, `public/non-road.geojson` | 도로 복잡도, 녹지/비도로 성격 보조 |
| 실시간 POI | `public/poi-features.json` | citydata 기반 live POI 인구/혼잡/상권 pressure |

압구정로데오, 양재역, 교대역 같은 인접 POI는 현재 target dong에 직접 귀속하지 않는다. 경계 매핑이 명시되기 전까지는 watch point로만 둔다.

## Data Scope

이번 작업에 포함하는 데이터는 다음이다.

| Data | Grain | Use | Rule |
| --- | --- | --- | --- |
| OSM static POI/building/road features | dong | 동별 기본 용도 성격 | 정적 feature로 사용 |
| Seoul citydata POI snapshot | POI, latest | 실시간 유동인구/상권 pressure | live context로 사용 |
| Public-transit OD OA-21226 | dong-hour | 기존 1시간 이동수요 target | bus/subway split으로 말하지 않음 |
| Mode-specific OD OA-21227 | dong-date | 버스/지하철 분리 QA | 수단별 값 보존 |
| Living population | dong-hour | 인구 대비 정규화 | 결측 여부 표시 |
| TOPIS/citydata road traffic | spot/link -> dong proxy | 도로/공급 측 pressure | 행정동 원천값으로 말하지 않음 |
| Event/holiday notes | date, venue/context | 오차 설명 feature | venue/event shock로 분리 |

원칙:

- raw archive/API response는 원본 그대로 보존한다.
- processed table은 9개 target dong 관련 행만 남긴다.
- source가 bus/subway를 분리하면 분리 컬럼을 유지한다.
- 코드가 만든 합산값은 `derived` 또는 `score`로 표시한다.
- 현재 산출물은 택시 호출량이 아니라 유동인구/이동수요 proxy로 설명한다.

## Model Scope

### 1. POI Land-use Profile

우선 구현할 핵심 산출물이다. 각 행정동에 대해 다음 점수를 만든다.

| Score | Meaning | Main signals |
| --- | --- | --- |
| `office_score` | 업무지/오피스 성격 | 추정 연면적, 평균 건물 높이, 역세권, 평일/주간 유입 |
| `retail_food_score` | 상업/음식/소비 성격 | 상업 건물 수, citydata 상권/결제/음식 카테고리 |
| `nightlife_score` | 야간 상업/여가 가능성 | 야간 시간대 pressure, 음식/여가 POI, 신논현/강남역권 |
| `residential_score` | 주거 성격 | 공동주택 건물 수, 야간 생활인구 안정성, 낮은 이벤트성 |
| `mice_event_score` | 전시/MICE/대형 행사 성격 | COEX/SETEC 인접성, event flags, POI category |
| `transit_hub_score` | 대중교통 결절성 | 지하철역 수, 버스정류장 수, transit importance, bus/subway live flow |

이 점수는 supervised land-use classifier가 아니라 설명 가능한 rule-based profile이다. 동 수가 9개뿐이므로 초기에는 학습형 분류기보다 이 방식이 발표와 검증에 맞다.

### 2. POI Difference Analysis

반드시 포함할 비교:

- `삼성1동`: COEX/MICE/전시/업무 이벤트형 목적지
- `역삼1동`: 강남역/역삼역 중심의 업무·상업·교통 결절지

주의할 표현:

- `유흥지`라고 단정하지 않는다.
- 데이터상으로는 `야간 상업/음식/여가 흐름 가능성`으로 표현한다.

### 3. Error Explanation Layer

3월 8, 15, 22, 29일처럼 특정 날짜에 오차가 커지는 문제는 별도 residual explanation으로 다룬다.

포함 feature 후보:

- `is_saturday`, `is_sunday`
- `is_holiday`, `is_holiday_bridge`
- `coex_event_count`, `coex_major_event`, `coex_all_hall_event`
- `setec_adjacent_event`
- `gangnam_station_fair`
- `citywide_rally_or_major_traffic_control`
- `jamsil_sports_adjacent`
- `moving_lucky_day`

이 레이어는 forecast target을 바로 바꾸기보다, 오차가 큰 날짜/동을 설명하고 다음 retraining feature 후보를 제안하는 용도로 둔다.

## Deliverables

1차 구현 산출물:

- `scripts/build-poi-landuse-profile.mjs`
- `data/processed/poi/poi_landuse_profile.json`
- `public/poi-landuse-profile.json`
- `data/processed/poi/poi_landuse_profile.md`

권장 JSON shape:

```json
{
  "generated_at": "2026-05-08T00:00:00+09:00",
  "scope": {
    "unit": "administrative_dong",
    "target_dongs": [
      "역삼1동",
      "역삼2동",
      "논현1동",
      "논현2동",
      "삼성1동",
      "삼성2동",
      "신사동",
      "청담동",
      "대치4동"
    ],
    "comparison_targets": ["삼성1동", "역삼1동"]
  },
  "source_policy": {
    "raw_preserved": true,
    "processed_filter": "9 target dongs",
    "transit_mode_policy": "preserve bus/subway when source provides separate fields"
  },
  "profiles": [
    {
      "dong_name": "역삼1동",
      "dominant_profile": "office_retail_transit_hub",
      "scores": {
        "office_score": 0.91,
        "retail_food_score": 0.86,
        "nightlife_score": 0.63,
        "residential_score": 0.38,
        "mice_event_score": 0.22,
        "transit_hub_score": 0.95
      },
      "evidence": ["강남역/역삼역 citydata POI", "high transit importance", "high estimated floor area"]
    }
  ]
}
```

2차 연결 산출물:

- 지도 패널에서 `public/poi-landuse-profile.json`을 읽어 동 선택 시 profile badge/근거 표시
- `public/population-pressure-summary.json`와 profile score를 함께 보여주는 요약 패널
- 삼성1동/역삼1동 비교 문장을 발표용 markdown으로 노출

## Out Of Scope

이번 범위에서 제외한다.

- 실제 택시 호출량/GPS/기사 수락률 기반 모델
- 운영급 배차 최적화 또는 인센티브 학습
- 9개 target dong 밖 POI의 직접 귀속
- bus/subway 임의 합산을 source total처럼 취급
- supervised land-use classifier 학습
- 전체 강남구/서울시 디지털트윈 확장

## Acceptance Criteria

작업 완료 기준은 다음이다.

- 9개 행정동 모두 profile score가 생성된다.
- 삼성1동과 역삼1동 비교가 JSON과 markdown에 모두 포함된다.
- 각 score가 어떤 source field에서 왔는지 `evidence` 또는 `source_fields`에 남는다.
- bus/subway 분리 정책과 derived total 정책이 산출물 metadata에 들어간다.
- 지도에서 바로 읽을 수 있도록 `public/poi-landuse-profile.json`이 생성된다.
- 발표 문구가 `택시 호출량 예측`이 아니라 `POI 기반 유동인구/이동수요 pressure 분석`으로 정리된다.
