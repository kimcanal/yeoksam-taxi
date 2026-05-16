# Team Brief: Data Sources And Demand Proxy Model

이 문서는 팀원에게 현재 데이터 수집/가공/모델링 구조를 설명하기 위한 요약입니다.

## 1. 한 줄 요약

실제 KakaoT 호출 로그나 택시 GPS 원천 데이터는 사용할 수 없기 때문에, 이 프로젝트는 공개 데이터를 조합해 `행정동별 1시간 뒤 이동 수요 proxy`를 예측합니다.

여기서 proxy는 직접적인 택시 호출량이 아니라, 택시 수요와 상관이 높을 것으로 보는 대중교통 이동, 생활인구, 도로 교통량, 날씨, POI 기반의 간접 수요 지표입니다.

## 2. 대상 지역

`public/dongs.geojson` 기준 강남구 9개 행정동입니다.

- 역삼1동
- 역삼2동
- 논현1동
- 논현2동
- 삼성1동
- 삼성2동
- 신사동
- 청담동
- 대치4동

## 3. 데이터 출처와 역할

| 데이터 | 공식 출처 | 수집 기간/범위 | 우리 프로젝트에서 쓰는 방식 | 주의점 |
| --- | --- | --- | --- | --- |
| TOPIS 교통량 | [TOPIS 교통량 정보](https://topis.seoul.go.kr/refRoom/openRefRoom_2.do) | 2023-01 ~ 2026-03 | 지점별 1시간 차량 통과량을 행정동 경계에 공간 매핑해 `traffic_volume_proxy` 생성 | 원천은 행정동별 데이터가 아니라 지점/방향/시간대별 교통량입니다. |
| 대중교통 OD | [서울시 행정동 단위 대중교통 출발지/도착지 승객수 정보](https://data.seoul.go.kr/dataList/OA-21226/F/1/datasetView.do) | 2023-01 ~ 2025-12 | 행정동별/시간별 유입, 유출, 순유입 승객수 생성 | 시간 단위 합계 OD입니다. 실제 택시가 아니며, 버스/지하철을 임의로 분리하지 않습니다. |
| 수단별 대중교통 OD | [서울시 행정동 단위 대중교통 수단 출발지/도착지 승객수 정보](https://data.seoul.go.kr/dataList/OA-21227/F/1/datasetView.do) | 별도 수집 경로 | 일 단위 `전체/지하철/버스` 유입·유출을 별도 테이블로 보존 | 현재 1시간 모델 타깃은 아니고, 수단별 유동인구 분석/QA용입니다. |
| 생활인구 | [행정동 단위 서울 생활인구(내국인)](https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do) | 2023-01 ~ 2025-12 | 동별 시간대 인구와 연령대 인구를 추가하고, 교통량/OD를 인구 1,000명당 값으로 정규화 | 일부 월은 원천 파일 누락으로 결측이 있습니다. |
| 날씨 | [기상청 ASOS 시간자료 조회서비스](https://www.data.go.kr/data/15057210/openapi.do) | 2023-01-01 ~ 2026-03-31 | 서울 관측소 108의 시간별 기온, 강수량, 습도, 풍속 등을 모든 동에 결합 | 관측소 단위라 동별 미세 날씨는 아닙니다. |
| 공휴일/특일 | [한국천문연구원 특일 정보](https://www.data.go.kr/data/15012690/openapi.do) | 2023 ~ 2026 | `is_holiday`, `holiday_names` 생성 | 공휴일 효과를 시간대/요일 feature와 함께 사용합니다. |
| 실시간 도시데이터 | [서울시 실시간 도시데이터](https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do) | 최신 snapshot | 실시간 도로 링크 혼잡도/속도를 동별로 요약해 현재 지도/향후 실시간 feature에 사용 | 과거 2023~2025 데이터를 소급 수집할 수는 없습니다. |
| POI/건물/도로 | OSM 기반 로컬 GeoJSON (`public/*.geojson`) | 정적 데이터 | 건물 수, 상업 건물 수, 버스정류장 수, 지하철역 수, 도로 길이, 신호등 수 등을 동별 feature로 생성 | 시간에 따라 변하지 않는 설명 변수입니다. |

## 4. 최종 feature table

최종 학습 입력 파일은 다음입니다.

```text
data/processed/features/dong_hour_features_v2_2023-01_2025-12.csv
```

요약:

- 행 수: `236,736`
- 단위: `행정동 x 날짜 x 시간`
- 기간: `2023-01-01 00시` ~ `2025-12-31 23시`
- 동 수: `9개`
- 주요 feature:
  - 시간/요일/공휴일
  - TOPIS 기반 차량 교통량 proxy
  - 생활인구 및 연령대 인구
  - 대중교통 유입/유출/순유입
  - 인구 1,000명당 교통량/유입량 정규화 값
  - 날씨
  - POI/건물/도로/신호등 정적 feature

생성 코드:

```bash
npm run data:features:dong-hour
```

실제 코드:

```text
scripts/build_dong_hour_feature_table.py
```

## 5. 모델이 예측하는 값

현재 모델의 target은 다음입니다.

```text
target_inbound_boardings_per_1k_pop_t_plus_1h
```

뜻:

> 현재 시점의 동별 feature를 보고, 1시간 뒤 해당 동으로 유입되는 대중교통 승객 수를 생활인구 1,000명 기준으로 예측합니다.

즉, 직접 택시 호출량이 아니라 `1시간 뒤 이동 수요 proxy`입니다.
현재 hourly target은 OA-21226의 시간 단위 public-transit OD 합계입니다. 버스/지하철 수단별 분석은
OA-21227 daily mode table에서 별도로 확인하고, source가 분리된 값은 합치지 않고 보존합니다.

## 6. 사용 모델

모델:

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

이 모델을 쓴 이유:

- 표 형태의 행정동/시간대 feature에 잘 맞습니다.
- 결측값과 비선형 패턴에 비교적 강합니다.
- 딥러닝보다 데이터 전처리/검증/설명이 쉽습니다.
- 지금 목표가 시계열 생성 모델이 아니라 `동별 수요 proxy 회귀 예측`이기 때문에 적합합니다.

전처리:

- 숫자 feature: median imputation + standard scaling
- 범주형 feature: most frequent imputation + one-hot encoding
- 모델 학습: scikit-learn Pipeline으로 전처리와 모델을 묶어서 재현 가능하게 구성

학습 코드:

```bash
npm run model:train:demand-proxy
```

실제 코드:

```text
scripts/train_dong_demand_proxy.py
```

Colab용 코드:

```text
notebooks/03_dong_demand_proxy_colab.py
```

## 7. 학습/평가 방식

랜덤 split이 아니라 날짜 기준으로 나눴습니다.

- Train: `2023-01-01` ~ `2024-12-31`
- Test: `2025-01-01` 이후

이렇게 나눈 이유:

- 미래를 예측하는 문제이므로 과거로 학습하고 이후 기간으로 평가해야 합니다.
- 랜덤으로 섞으면 같은 날짜/인접 시간대 패턴이 train/test에 섞여 성능이 과대평가될 수 있습니다.

비교 기준:

- Persistence baseline
- 의미: “1시간 뒤도 현재 값과 비슷할 것”이라고 가정하는 단순 기준
- 모델은 이 기준보다 좋아야 의미가 있습니다.

## 8. 현재 결과

결과 파일:

```text
data/processed/model/dong_demand_proxy_metrics.json
```

현재 테스트 성능:

| 지표 | 모델 | 단순 baseline |
| --- | ---: | ---: |
| R² | `0.9888` | `0.6156` |
| MAE | `2.5294` | `13.5306` |
| RMSE | `5.6775` | `33.3253` |
| MAPE | `21.50%` | `63.25%` |

해석:

- R²가 높다는 것은 2025년 테스트 구간에서 시간대/동별 수요 proxy의 변동을 많이 설명했다는 뜻입니다.
- MAE 2.53은 `생활인구 1,000명당 1시간 뒤 유입 승객 proxy` 기준 평균 절대 오차입니다.
- baseline보다 MAE/RMSE가 크게 낮아, 현재 feature 조합이 단순 “현재값 유지”보다 더 좋은 예측을 만들고 있습니다.

## 9. 모델 산출물

```text
data/processed/model/dong_demand_proxy_model.joblib
data/processed/model/dong_demand_proxy_predictions_2025.csv
data/processed/model/dong_demand_proxy_feature_importance.json
data/processed/model/forecast_latest_model_backtest.json
```

각 파일 의미:

- `dong_demand_proxy_model.joblib`: 학습된 scikit-learn Pipeline
- `dong_demand_proxy_predictions_2025.csv`: 2025년 테스트 예측 결과
- `dong_demand_proxy_feature_importance.json`: 어떤 feature가 예측에 중요했는지 확인하는 permutation importance
- `forecast_latest_model_backtest.json`: 최신 feature row를 기준으로 지도에 넘길 수 있는 형태의 예측 JSON 샘플

## 10. Feature Importance 해석

Colab 결과 기준 상위 feature는 다음과 같습니다.

| rank | feature | 해석 |
| ---: | --- | --- |
| 1 | `net_inbound_boardings_per_1k_pop` | 인구 1,000명당 순유입 흐름 |
| 2 | `hour` | 시간대 효과 |
| 3 | `inbound_boardings_per_1k_pop` | 인구 1,000명당 유입 승객수 |
| 4 | `dong_area_m2` | 동의 공간 규모 |
| 5 | `inbound_boardings` | 절대 유입 승객수 |
| 6 | `outbound_boardings` | 절대 유출 승객수 |
| 7 | `avg_building_height_m` | 도시 밀도/건물 구조 |
| 8 | `hotel_building_count` | 방문/상업 성격 |
| 9 | `outbound_boardings_per_1k_pop` | 인구 대비 유출 흐름 |
| 10 | `day_type` | 평일/주말 차이 |

해석:

> 모델은 현재 대중교통 유입/유출 흐름과 시간대를 가장 중요하게 사용했고, 건물 높이·호텔 수·동 면적 같은 도시 구조 feature가 동별 기본 수요 차이를 보완했습니다.

자세한 해석은 다음 문서에 정리했습니다.

```text
docs/feature-importance-interpretation.md
```

## 11. 지도/배차로 연결하는 방식

모델은 각 동에 대해 다음과 같은 값을 만들 수 있습니다.

- `dong_name`: 행정동 이름
- `score`: 0~1로 정규화한 수요 proxy 점수
- `raw_prediction`: 모델이 예측한 원래 값
- `confidence`: 데이터 결측 여부를 반영한 신뢰도

이 값은 지도에서 동별 색상/수요 heatmap으로 표시하거나, 배차 로직에서 “수요가 높은 동으로 차량을 재배치”하는 입력으로 쓸 수 있습니다.

## 12. 발표/팀 설명용 문장

안전한 표현:

> 실제 택시 호출 로그는 확보할 수 없어서, 대중교통 OD, 생활인구, TOPIS 교통량, 날씨, POI 데이터를 결합해 행정동별 1시간 뒤 이동 수요 proxy를 예측했습니다.

> 모델은 scikit-learn의 HistGradientBoostingRegressor를 사용했고, 2023~2024년 데이터로 학습한 뒤 2025년 데이터를 시간 기준으로 분리해 평가했습니다.

> 최종 결과는 동별 수요 점수 JSON으로 변환해 지도 시각화와 향후 배차 정책의 입력으로 사용할 수 있습니다.

피해야 할 표현:

- 택시 호출량을 직접 예측했다
- KakaoT 실시간 호출 데이터를 사용했다
- 행정동별 실제 차량 교통량 원천 데이터를 확보했다
- 실시간 택시 위치/GPS 데이터를 학습했다

## 13. 핵심 한계

- 택시 원천 데이터가 없으므로 target은 택시 호출량이 아니라 이동 수요 proxy입니다.
- TOPIS 교통량은 지점별 데이터라 동별 값은 공간 매핑한 proxy입니다.
- 실시간 citydata는 현재 snapshot에는 좋지만, 과거 학습 데이터로 소급 확보할 수는 없습니다.
- 장기 미래 예측은 미래의 교통량, 생활인구, 대중교통 OD를 별도로 추정해야 합니다. 지금 구조는 특히 `1시간 뒤 near-term 예측`에 강합니다.
