# 수요/공급 산출 방식 설명

이 문서는 현재 역삼택시 데모에서 표시하는 `수요`와 `공급` 값이 어떻게
만들어지는지 설명하기 위한 발표/명세 보조 문서입니다.

핵심 구분은 다음과 같습니다.

- 수요: 백엔드 CNN-LSTM 모델이 산출한 동·시간대별 수요 예측값입니다.
- 공급: 실제 택시 공급 라벨로 학습한 예측 모델이 아니라, 도로링크 통계와
  수요 변화량을 이용해 만든 공급 proxy 시뮬레이터입니다.
- 수요/공급 차이: 두 값을 같은 `model proxy units per hour` 단위로 맞춘 뒤
  부족/잉여 정도를 정량화한 imbalance index입니다.

## 전체 흐름

```text
date, dong 선택
  -> 수요 백엔드 API 호출
  -> CNN-LSTM 수요 모델이 0-23시 수요 곡선 산출
  -> 공급 API가 도로링크 기반 공급 prior 산출
  -> 수요 모델의 같은 요일 baseline 대비 변화량으로 공급 proxy 후보정
  -> 프론트가 수요선, 공급선, gap 지표를 표시
```

프론트엔드는 모델을 학습하거나 예측값을 직접 만들지 않습니다. 프론트엔드는
API 응답을 검증하고, 차트·지도·패널에 표시하는 시각화 레이어입니다.

## 수요 모델

### 구현 위치

- API 서버: `deploy/backend/main.py`
- 추론 로직: `deploy/backend/inference.py`
- 모델 구조: `deploy/backend/model.py`
- 모델 가중치: `deploy/backend/models/seoul_model.pt`
- 실제 수요 기준 데이터: `deploy/backend/data/actual_demand.csv`

### 모델 구조

수요 모델은 `SeoulModel`이며, 내부에 다음 요소가 있습니다.

- `CNNLSTMBackbone`
  - 시간 순서 feature를 `Conv1d + BatchNorm + ReLU`로 처리합니다.
  - 이후 `LSTM`으로 최근 시간 흐름을 요약합니다.
- `PoiTimeGating`
  - 행정동별 POI feature를 목표 시간대 context에 따라 gating합니다.
  - 같은 POI라도 시간대에 따라 영향이 달라질 수 있다는 가정을 반영합니다.
- `dong_embed`
  - 행정동별 고정 차이를 embedding으로 반영합니다.
- `target_ctx_proj`
  - 예측 대상 시간의 시간/요일/공휴일 등 target context를 반영합니다.
- `head`
  - 위 feature들을 결합해 non-negative 수요 rate를 산출합니다.

최종 호출량은 모델이 예측한 `rate`에 동·시간대 baseline demand를 곱해
`predicted_calls`로 변환합니다.

```text
predicted_calls_per_hour
  = model_rate(dong, target_time, time_sequence, POI, weather, traffic, holiday)
    * baseline_calls_per_hour[dong][hour]
```

### 입력 feature

코드 기준으로 수요 추론에는 다음 계열의 feature가 사용됩니다.

- 시간 feature: 월, 일, 요일, 시간, 공휴일/대체공휴일 등
- 행정동 feature: 동 index, 동별 baseline
- POI feature: `gangnam_poi_kr.csv`
- 교통 feature: 교통량, segment count 등
- 날씨 feature: 온도, 강수량
- 지하철 feature: 역별 시간대별 이용 인원

운영 시 API는 날짜와 행정동을 받아 해당 날짜의 24시간 수요를 반환합니다.

### API 산출물

- `/api/demand/hourly`
  - 특정 동의 0-23시 수요 점들을 반환합니다.
- `/api/demand/daily`
  - 전체 대상 동의 0-23시 수요 matrix를 반환합니다.

프론트는 `demand_count` 또는 `predicted_calls` 계열 값을 시간당 수요로 읽고,
그래프와 지도 표현에 사용합니다.

## 공급 proxy 시뮬레이터

### 구현 위치

- API 서버: `deploy/supply_api/supply_api.py`
- 공급 통계 파일: `deploy/supply_api/supply_model.pkl.gz`
- 링크-행정동 매핑: `deploy/supply_api/link_dong_mapping.csv`
- 동별 fallback weight: `deploy/supply_api/dong_supply_weights.json`

### 중요한 전제

공급 쪽은 실제 택시 GPS, 공차/실차 상태, 기사 수락률, 호출 실패율 같은
정답 라벨이 없습니다. 따라서 현재 공급 값은 학습된 공급 예측값이 아니라
다음 목적의 proxy입니다.

- 시간대별 공급 경향을 수요 곡선과 비교하기
- 동·시간대별 부족/잉여 지점을 찾기
- 이후 동적 배차 또는 인센티브 정책 시뮬레이션의 입력값 만들기

발표에서는 `공급 예측 모델`보다 `공급 proxy 시뮬레이터` 또는
`도로링크 기반 공급 시뮬레이션`이라고 표현하는 것이 안전합니다.

### 1단계: 도로링크 기반 공급 prior

공급 API는 `supply_model.pkl.gz`에 저장된 집계 통계를 읽습니다.

주요 구성은 다음과 같습니다.

- `mean_maps`
  - 링크/시간/요일/월/날씨 조합별 평균 proxy 값
- `count_maps`
  - 해당 조합이 얼마나 자주 관측됐는지 나타내는 count
- `global_mean`
  - feature lookup이 부족할 때 쓰는 전체 평균

각 도로링크의 초기 공급 proxy는 여러 평균 map을 count 기반 가중 평균으로
섞어 계산합니다.

```text
raw_link_supply
  = weighted_average(
      link_hour,
      link_daycode,
      link,
      month_hour,
      hour_daycode_weather,
      hour_daycode,
      hour,
      global_mean
    )
```

그 다음 `link_dong_mapping.csv`를 이용해 링크 단위 값을 행정동 단위로
합산합니다.

```text
raw_dong_supply[dong] = sum(raw_link_supply for links mapped to dong)
```

### 2단계: 시간대별 한국/강남 운영 prior

도로링크 raw 값만 쓰면 발표용 수요-공급 비교에서 시간대별 경향이 불안정할
수 있습니다. 그래서 API는 다음 prior를 추가로 사용합니다.

- 월, 요일, 시간대 패턴
- 22:00-04:00 야간 운행 window
- 23:00-02:00 심야 매칭 마찰
- 날씨 코드 또는 `weather=auto`
- 공휴일/특수일 `day_type`, `supply_factor`

다만 이 prior는 실제 기사 공급량 라벨에서 학습된 값이 아닙니다. API
metadata에서도 `heuristic_not_observed_supply` 성격으로 설명해야 합니다.

### 3단계: 수요 변화량 기반 후보정

공급 proxy는 수요를 그대로 복사하지 않습니다. 먼저 도로링크 기반 공급
prior를 만들고, 이후 수요 모델의 변화량만 제한적으로 반영합니다.

후보정 방식은 다음과 같습니다.

- 대상 날짜의 수요 API 결과를 가져옵니다.
- 같은 요일 baseline demand를 찾습니다.
- 대상 날짜 수요가 baseline보다 얼마나 높은지/낮은지 계산합니다.
- 이 변화량을 `beta`와 confidence로 줄여 반영합니다.
- 시간 방향 smoothing을 적용해 한 시간 spike가 공급 spike로 바로 복사되지
  않도록 합니다.
- 일부 시간만 관측된 경우 baseline으로 24시간 총량을 외삽합니다.

```text
hour_demand_change_factor
  = bounded_ratio(target_hour_demand, same_weekday_baseline_demand)

adjusted_supply_pattern[hour]
  = monthly_supply_pattern[hour] * smoothed(hour_demand_change_factor)
```

동별 분배도 raw 도로링크 share, baseline demand share, 현재 demand share를
섞어 계산합니다. 필요하면 `spatial_cap=1`로 특정 동의 공급 share가 과도하게
커지는 것을 제한할 수 있습니다.

### 4단계: 수요-공급 gap 계산

수요와 공급은 같은 proxy 단위로 비교됩니다. API는 동별/시간별로 다음 지표를
만듭니다.

```text
signed_gap = demand_proxy - supply_proxy
shortage = max(demand_proxy - supply_proxy, 0)
surplus = max(supply_proxy - demand_proxy, 0)
supply_coverage_ratio = supply_proxy / demand_proxy
pressure_ratio = demand_proxy / supply_proxy
bounded_gap_index = (demand_proxy - supply_proxy) / (demand_proxy + supply_proxy)
```

`bounded_gap_index`는 값이 -1에서 1 사이로 제한되기 때문에 발표용으로 가장
안전한 지표입니다.

## 해석 기준

### 말해도 되는 표현

- `수요 모델은 CNN-LSTM 기반 백엔드 모델 산출값을 사용했다.`
- `공급은 실제 공급 정답지가 없어 도로링크 통계와 수요 변화량을 이용한 proxy 시뮬레이터로 구성했다.`
- `수요와 공급은 실제 차량 대수라기보다 같은 비교 단위의 model proxy units이다.`
- `핵심 산출물은 실제 공급량 자체가 아니라 동·시간대별 수요-공급 imbalance index이다.`
- `동적 배차는 이 gap index를 입력으로 받는 후속 정책 시뮬레이션으로 분리한다.`

### 피해야 하는 표현

- `공급 모델을 학습했다.`
- `실제 택시 공급량을 예측했다.`
- `기사 수락률 또는 공차 상태를 반영했다.`
- `train/validation/test 성능으로 검증된 공급 예측 모델이다.`
- `운영급 동적 배차 최적화가 가능하다.`

## 한계와 다음 단계

현재 구조의 한계는 명확합니다.

- 수요 모델의 학습/검증 상세 결과는 프론트 저장소가 아니라 백엔드 산출물에
  의존합니다.
- 공급은 실제 공급 라벨이 없어서 proxy 이상으로 주장하면 안 됩니다.
- 공급 scale은 수요와 비교하기 위한 calibration 값이며, 실제 가용 차량 수가
  아닙니다.
- 야간/주말/날씨 prior는 한국/강남 맥락을 반영하려는 heuristic이며,
  실측 공급량 검증값이 아닙니다.

공급을 진짜 예측 모델로 바꾸려면 최소 하나 이상의 실제 공급 라벨이 필요합니다.

- 택시 GPS 기반 위치/운행 상태
- 공차/실차 상태
- 호출 수락률, 취소율, 실패율
- 승객 대기시간
- 법인/개인택시 시간대별 운행률

이 데이터가 확보되면 공급 쪽도 별도의 train/validation/test split, MAE/RMSE,
시계열 holdout 평가를 주장할 수 있습니다.

## 발표용 한 문단

> 본 시스템의 수요는 백엔드 CNN-LSTM 모델이 행정동, 시간, 날씨, 교통, POI,
> 공휴일 정보를 이용해 산출한 시간당 수요 예측값입니다. 반면 공급은 실제
> 택시 GPS나 공차 상태 라벨이 없는 상황이므로 학습된 공급 예측 모델로
> 주장하지 않고, 도로링크 기반 집계 통계와 한국/강남 시간대 prior, 그리고
> 수요 모델의 같은 요일 대비 변화량을 제한적으로 반영한 공급 proxy
> 시뮬레이터로 구성했습니다. 따라서 최종 목적은 실제 공급 대수를 단정하는
> 것이 아니라, 동·시간대별 수요-공급 불균형을 같은 proxy 단위에서 정량화해
> 후속 배차 정책 시뮬레이션의 입력으로 사용하는 것입니다.
