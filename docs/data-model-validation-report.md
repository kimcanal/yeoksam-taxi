# Data And Model Validation Report

이 문서는 A-Eye / 역삼동 택시 Digital Twin의 데이터 출처, 가공 방식, 검증 결과, 모델 선택 이유를 설명하기 위한 검증 보고서입니다.

## 1. 목적

프로젝트의 최종 목표는 행정동별 미래 택시 수요를 지도와 배차 로직에 반영하는 것입니다.

다만 실제 KakaoT 호출 로그, 실시간 택시 위치, 택시 GPS/iDTG 원천 데이터는 공개 API로 확보할 수 없었습니다. 따라서 현재 모델은 다음 값을 예측합니다.

```text
행정동별 1시간 뒤 이동 수요 proxy
```

정확한 target:

```text
target_inbound_boardings_per_1k_pop_t_plus_1h
```

의미:

```text
생활인구 1,000명당 1시간 뒤 대중교통 유입 이동 수요
```

즉, 이 모델은 직접 택시 호출량 모델이 아니라 공개 데이터 기반 이동 수요 proxy 모델입니다.

## 2. 대상 지역

`public/dongs.geojson` 기준 강남구 9개 행정동을 사용했습니다.

```text
논현1동, 논현2동, 대치4동, 삼성1동, 삼성2동, 신사동, 역삼1동, 역삼2동, 청담동
```

검증 결과:

```text
dong_count = 9
covered_dongs = 9/9
```

## 3. 데이터 출처와 수집 방식

| 데이터 | 공식 출처 | 기간 | 원천 단위 | 가공 방식 | 검증 결과 |
| --- | --- | --- | --- | --- | --- |
| TOPIS 교통량 | [TOPIS 교통량 정보](https://topis.seoul.go.kr/refRoom/openRefRoom_2.do) | 2023-01 ~ 2026-03 | 지점/방향/시간 | 지점별 교통량을 9개 행정동에 공간 매핑해 `traffic_volume_proxy` 생성 | 39개월, 256,176 rows, 9/9 동 커버 |
| 대중교통 OD | [서울시 행정동 단위 대중교통 출발지/도착지 승객수 정보](https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do) | 2023-01 ~ 2025-12 | 출발 행정동/도착 행정동/시간 | 9개 동 기준 유입, 유출, 순유입 집계 | 36개월 중 30개월 완전, 229,176 rows |
| 생활인구 | [행정동 단위 서울 생활인구(내국인)](https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do) | 2023-01 ~ 2025-12 | 행정동/시간/연령대 | 동별 총 생활인구와 연령대별 생활인구 생성 | 36개월 중 35개월 완전, 236,304 rows |
| 날씨 | [기상청 ASOS 시간자료 조회서비스](https://www.data.go.kr/data/15057210/openapi.do) | 2023-01-01 ~ 2026-03-31 | 서울 관측소 108/시간 | 시간별 기온, 강수량, 습도, 풍속 등을 모든 동에 결합 | feature table 내 weather missing rows 0 |
| 공휴일/특일 | [한국천문연구원 특일 정보](https://www.data.go.kr/data/15012690/openapi.do) | 2023 ~ 2026 | 날짜 | `is_holiday`, `holiday_names` 생성 | 모델 기간 전체에 날짜 기준 결합 |
| 실시간 도시데이터 | [서울시 실시간 도시데이터](https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do) | 최신 snapshot | POI/도로 링크 | 현재 도로 링크 혼잡도/속도를 지도용 실시간 레이어로 사용 | 과거 학습 feature에는 소급 적용 불가 |
| POI/건물/도로 | OSM 기반 `public/*.geojson` | 정적 | geometry | 건물 수, 건물 높이, 도로 길이, 정류장/역/신호등 수 생성 | feature table 내 POI missing rows 0 |

## 4. 최종 학습 테이블 검증

최종 feature table:

```text
data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv
```

검증 요약:

```text
row_count = 236,736
period = 2023-01-01 00:00:00 ~ 2025-12-31 23:00:00
dong_count = 9
weather_missing_rows = 0
poi_missing_rows = 0
living_population_missing_rows = 432
transit_od_missing_rows = 7,776
```

availability 검증:

```text
transit_od_available = Y: 228,960 rows
transit_od_available = N:   7,776 rows

living_population_available = Y: 236,304 rows
living_population_available = N:     432 rows
```

결측 해석:

- 날씨와 POI는 모델 기간 전체에 결합되었습니다.
- 생활인구 결측은 일부 원천 월 누락으로 발생했습니다.
- 대중교통 OD 결측은 일부 월의 원천 파일이 부분 제공되어 발생했습니다.
- 결측 여부는 `living_population_available`, `transit_od_available` feature로 모델에 함께 제공했습니다.

## 5. 재현 명령

대표 재현 명령:

```bash
npm run data:collect:topis -- 2023-01:2026-03
npm run data:collect:transit:od -- 2023-01:2025-12
npm run data:combine:transit:od -- --start 2023-01 --end 2025-12
npm run data:collect:living-pop -- 2023-01:2025-12
npm run data:combine:living-pop -- --start 2023-01 --end 2025-12
npm run data:collect:weather:asos -- 2023-01-01:2026-03-31 108
npm run data:collect:holidays -- 2023:2026
npm run data:features:poi
npm run data:features:dong-hour
npm run model:train:demand-proxy
```

Colab 재현 코드:

```text
notebooks/03_dong_demand_proxy_colab.py
```

Colab 입력:

```text
data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv
```

Colab 산출물:

```text
data/colab/metrics.csv
data/colab/feature_importance.csv
data/colab/forecast_latest_model_backtest.json
data/colab/dong_demand_proxy_predictions_2025.csv
data/colab/dong_demand_proxy_model.joblib
```

## 6. 파일 무결성 기록

현재 주요 파일의 SHA256:

```text
9f7de802846cec24ea5b6a516a6b58ba8262d4f3d9f19ce5efc3534b9c3f5f68  data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv
40261a0fdb465a7c7370fa4544f7bc449d6e24a466f5990969987cd0e66e5d31  data/colab/metrics.csv
6bf80137892245105e9c650067aeb4da6846ed506cb222d4fbe2a6158f96b5e7  data/colab/feature_importance.csv
ffbe599fc629e578ecaf800226c804d11d9e42d5ce927a50a827a5c2e421e1f6  data/colab/forecast_latest_model_backtest.json
839298ed32d0b35dec9dfd80abde1a4b7e059269d61afeeb97d128abcb6aa86e  data/colab/dong_demand_proxy_model.joblib
```

## 7. 모델 선택 이유

사용 모델:

```text
HistGradientBoostingRegressor
```

라이브러리:

```text
scikit-learn
```

주요 파라미터:

```text
max_iter=300
learning_rate=0.05
max_leaf_nodes=31
random_state=42
```

선택 이유:

1. 현재 데이터는 이미지/텍스트/시계열 원시 신호가 아니라 `행정동 x 시간` 형태의 tabular feature입니다.
2. Gradient Boosting 계열은 표 형식 데이터의 비선형 관계와 feature interaction을 잘 처리합니다.
3. scikit-learn 기반이라 Colab과 로컬에서 재현이 쉽습니다.
4. 딥러닝보다 설명 가능성과 발표 안정성이 높습니다.
5. 현재 목표는 “택시 호출량 원시 시계열 생성”이 아니라 “공개 데이터 feature로 1시간 뒤 수요 proxy 회귀 예측”이므로 적합합니다.

비교 기준:

```text
Persistence baseline
```

의미:

```text
1시간 뒤 값도 현재 값과 같다고 보는 단순 예측
```

모델은 이 baseline보다 좋아야 의미가 있습니다.

## 8. 학습/평가 검증

split 방식:

```text
Train: 2023-01-01 ~ 2024-12-31
Test : 2025-01-09 ~ 2025-12-31
```

랜덤 split을 사용하지 않은 이유:

- 이 문제는 미래 예측 문제입니다.
- 랜덤 split을 쓰면 같은 날짜/비슷한 시간대 패턴이 train/test에 섞여 성능이 과대평가될 수 있습니다.
- 따라서 과거 기간으로 학습하고 이후 기간으로 평가했습니다.

row counts:

```text
raw rows        = 236,736
supervised rows = 228,465
train rows      = 154,206
test rows       =  74,259
```

## 9. 모델 성능

Colab 기준 결과:

| metric | model | persistence baseline |
| --- | ---: | ---: |
| R2 | 0.988842 | 0.615575 |
| MAE | 2.529376 | 13.530624 |
| RMSE | 5.677475 | 33.325305 |
| MAPE_pct | 21.500314 | 63.247259 |

해석:

- 모델은 단순 현재값 유지 baseline보다 MAE와 RMSE를 크게 낮췄습니다.
- R2가 높다는 것은 테스트 기간의 시간대/동별 수요 proxy 변동을 많이 설명했다는 뜻입니다.
- MAPE는 실제 값이 작은 심야 시간대에서 크게 튈 수 있으므로, 발표에서는 MAE/RMSE와 baseline 대비 개선폭을 중심으로 설명하는 편이 안전합니다.

## 10. Feature Importance 검증

상위 feature:

| rank | feature | 해석 |
| ---: | --- | --- |
| 1 | `net_inbound_boardings_per_1k_pop` | 현재 순유입 흐름 |
| 2 | `hour` | 시간대 효과 |
| 3 | `inbound_boardings_per_1k_pop` | 현재 유입 수요 강도 |
| 4 | `dong_area_m2` | 동의 공간 규모 |
| 5 | `inbound_boardings` | 절대 유입 승객수 |
| 6 | `outbound_boardings` | 절대 유출 승객수 |
| 7 | `avg_building_height_m` | 도시 밀도/건물 구조 |
| 8 | `hotel_building_count` | 방문/상업 성격 |
| 9 | `outbound_boardings_per_1k_pop` | 인구 대비 유출 흐름 |
| 10 | `day_type` | 평일/주말 차이 |

해석:

```text
모델은 현재 대중교통 유입/유출 흐름과 시간대를 가장 중요하게 사용했고,
건물 높이, 호텔 수, 동 면적 같은 도시 구조 feature가 동별 기본 수요 차이를 보완했습니다.
```

## 10-1. 현재 baseline 활용 판정

2026-05-06 현재 운영 판단은 다음과 같습니다.

```text
활용 가능: 행정동별 공개 데이터 기반 수요 pressure ranking
아직 불가: 실제 택시 호출량 절대 예측, 기사 공급 최적화, 배차 지시
```

근거:

- live-compatible 모델은 2025 holdout에서 persistence baseline 대비 MAE를 약 49.8% 낮췄습니다.
- 같은 동·월·시간·평일/주말 패턴 평균 baseline과 비교하면 MAE 개선폭은 약 6.5%입니다.
- 반대로 MAPE는 패턴 baseline이 더 강하게 나옵니다. 즉 시간대 반복 패턴 자체가 이미 강한 문제입니다.
- 2026년 3~4월 대중교통 관측 proxy와의 사후 검증은 전체 Spearman `0.413`, 동별 평균 `0.435`입니다.

해석:

```text
모델은 baseline보다 의미 있는 신호를 잡고 있지만, 단독 정답 모델로 보기에는 이릅니다.
현재는 model score, 시간대 pattern baseline, citydata POI 인구/혼잡, TOPIS 도로 혼잡을 함께 보는 monitoring/ranking 모델로 쓰는 것이 안전합니다.
```

운영 기준:

- 모델과 패턴 baseline이 같은 동을 높게 보면 confidence를 높입니다.
- 모델은 높지만 citydata 인구/도로 혼잡이 약하면 관찰 등급으로 낮춥니다.
- citydata 인구 또는 도로 혼잡이 급상승하면 모델 점수가 낮아도 nowcast 보정 후보로 둡니다.
- 직접 택시콜 또는 승차장 픽업 라벨이 들어오기 전까지 “택시 수요량”이라는 표현은 쓰지 않습니다.

구현 산출물:

```text
public/demand-guardrail-summary.json
```

이 파일은 다음 값을 동별로 함께 제공합니다.

- `composite_pressure_score`: 수요 score, 도로 혼잡, citydata POI 인구 pressure를 합친 압박 점수
- `confidence_score`: baseline 개선폭, 2026 사후 proxy 검증, 신호 간 rank agreement, live coverage를 합친 신뢰도
- `monitoring_priority_score`: 압박 점수에 confidence를 곱해 정렬한 우선 관찰 점수
- `risk_flags`: 패턴 fallback, 신호 불일치, 검증 약함, 인구 POI 미커버, 도로 링크 표본 부족 같은 주의 표시

재현성 메모:

- 대형 feature table과 2025 prediction CSV는 public bundle에 포함하지 않습니다.
- 현재 세션에 업로드된 일부 대형 파일은 512KB에서 잘린 상태라 baseline 재평가 입력으로 사용할 수 없습니다.
- 정상 feature table과 prediction CSV가 다시 들어오면 `npm run model:evaluate:demand-pattern-baseline`로 패턴 baseline 검증을 재실행해야 합니다.

## 11. 웹/지도 적용 범위

현재 가능한 웹 기능:

```text
사용자가 날짜/시간 선택
→ 해당 시점의 9개 동 feature row 구성
→ 모델 예측
→ 동별 score JSON 생성
→ 지도 heatmap / 배차 로직에 반영
```

예측 JSON 생성 명령:

```bash
npm run model:predict:demand-proxy -- "2025-03-10 18:00" --out public/forecast/latest.json --strategy auto
```

구현 스크립트:

```text
scripts/predict_dong_demand_proxy.py
```

전략:

- `exact`: 해당 시점의 실제 feature row가 있을 때 사용
- `pattern`: 미래/미보유 시점에 대해 같은 월·같은 시간·평일/주말의 과거 평균 feature로 예측
- `auto`: exact를 먼저 시도하고, 없으면 pattern으로 fallback

현재 모델 시간 해상도:

```text
1시간 단위
```

5분 단위에 대한 정리:

- 대중교통 OD, TOPIS 교통량, 생활인구, ASOS 날씨는 기본적으로 시간 단위입니다.
- 따라서 현재 수요 예측 모델은 5분 단위가 아니라 1시간 단위입니다.
- citydata의 도로 링크 혼잡도/속도는 실시간 또는 준실시간 snapshot으로 지도 레이어에 반영할 수 있습니다.
- 향후 citydata를 지속 수집하면 5분 단위 nowcasting 또는 보정 레이어를 추가할 수 있습니다.

## 12. 한계와 발표 주의 표현

반드시 피해야 할 표현:

```text
택시 호출량을 직접 예측했다
KakaoT 호출 로그를 학습했다
실시간 택시 위치 데이터를 사용했다
행정동별 실제 차량 교통량 원천 데이터를 확보했다
5분 단위 수요 예측 모델이다
```

안전한 표현:

```text
공개 데이터 기반 이동 수요 proxy를 예측했다
대중교통 OD, 생활인구, TOPIS 교통량, 날씨, POI 데이터를 결합했다
행정동별 1시간 뒤 수요 score를 지도/배차 입력으로 생성할 수 있다
5분 단위 실시간성은 도로 혼잡도 레이어에서 보완한다
```

## 13. 결론

현재 데이터와 모델은 다음 조건에서 검증되었습니다.

1. 공식 출처 기반 데이터 사용
2. 9개 대상 행정동 커버 확인
3. 최종 feature table row count와 결측 현황 확인
4. 날짜 기준 train/test split 사용
5. persistence baseline 대비 성능 개선 확인
6. Colab 재현 산출물 보관
7. feature importance 기반 해석 가능성 확보

따라서 현재 버전은 발표와 프로토타입 구현에서 다음과 같이 설명하는 것이 가장 적절합니다.

```text
공개 데이터를 기반으로 행정동별 1시간 뒤 이동 수요 proxy를 예측하고,
그 결과를 지도 heatmap과 향후 배차 정책의 입력으로 사용하는 구조입니다.
```
