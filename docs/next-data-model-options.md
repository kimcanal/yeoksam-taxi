# Next Data And Model Options

이 문서는 현재 `dong-hour feature table v2` 이후에 더 가져올 만한 데이터와, 바꿔볼 만한 모델을 정리한 검토 메모입니다.

## 결론

현재 데이터/모델은 발표와 프로토타입 기준으로 충분히 말이 됩니다. 다음에 더 한다면 우선순위는 `더 복잡한 모델`보다 `택시 수요와 더 가까운 feature`를 추가하는 쪽입니다.

추천 우선순위:

1. 수도권 생활이동의 `차량/도보/목적` 데이터 추가
2. 택시승차대/정류장/역 단위 세부 feature 추가
3. AWS 400/401 국지 날씨와 대기질 추가
4. 모델은 현재 HGBR을 유지하되, LightGBM/CatBoost 또는 high-demand classification을 비교 실험
5. 장기적으로는 Big Data Campus 택시 iDTG/GPS 접근 가능성 확인

## 1. 추가 데이터 후보

### A. 수도권 생활이동: 수단별/목적별 이동량

가장 추천합니다.

공식 출처:

- [수도권 생활이동: 도착 행정동 기준 시간대별 성연령별 수단 데이터](https://data.seoul.go.kr/dataList/OA-22655/F/1/datasetView.do)
- [수도권 생활이동: 출도착 행정동별 수단 데이터](https://data.seoul.go.kr/dataList/OA-22657/F/1/datasetView.do)
- [수도권 생활이동: 목적별 도착지 기준 데이터](https://data.seoul.go.kr/dataList/OA-22298/F/1/datasetView.do?tab=F)

쓸 수 있는 feature:

- `vehicle_movement_inbound`
- `walk_movement_inbound`
- `bus/subway/mobility_by_mode`
- `shopping_movement`
- `tourism_movement`
- `commute_movement`
- `return_home_movement`

왜 좋은가:

- 지금의 대중교통 OD는 버스/지하철 중심입니다.
- 생활이동은 차량/도보/목적까지 들어가므로 택시 수요 proxy에 더 가깝습니다.
- 특히 `차량`, `쇼핑`, `관광`, `병원`, `귀가`는 택시 수요 설명에 쓸 수 있습니다.

주의점:

- 월별 ZIP이 크고, 3개년 전체를 받으면 용량이 커집니다.
- VDI 용량을 아끼려면 원본 ZIP은 처리 후 삭제하고, 9개 동으로 필터링한 CSV만 남기는 방식이 좋습니다.

우선순위:

```text
매우 높음
```

### B. 택시승차대 위치

공식 출처:

- [서울시 택시승차대 현황](https://data.seoul.go.kr/dataList/OA-22228/F/1/datasetView.do)

쓸 수 있는 feature:

- `taxi_stand_count`
- `taxi_stand_density`
- `nearest_taxi_stand_distance_m`

왜 좋은가:

- 수요 예측보다는 배차/공급 anchor에 좋습니다.
- 지도에서 “차량이 대기할 수 있는 후보 지점”으로도 쓸 수 있습니다.

주의점:

- 정적 데이터라 시간대별 수요 변동을 직접 설명하지는 않습니다.

우선순위:

```text
높음
```

### C. 버스 정류장/지하철역 단위 시간대별 승하차

공식 출처:

- [서울시 버스노선별 정류장별 시간대별 승하차 인원 정보](https://data.seoul.go.kr/dataList/datasetView.do?currentPageNo=1&infId=OA-12913&searchKey=null&searchValue=&serviceKind=1&srvType=S)
- [서울시 지하철호선별 역별 승하차 인원 정보](https://data.seoul.go.kr/dataList/datasetView.do?currentPageNo=1&infId=OA-12914&searchKey=&searchValue=&serviceKind=1&srvType=S)

쓸 수 있는 feature:

- `nearby_bus_stop_boardings`
- `nearby_bus_stop_alightings`
- `nearby_subway_station_boardings`
- `nearby_subway_station_alightings`
- `station_exit_pressure_proxy`

왜 좋은가:

- 지금은 행정동 단위 OD 중심입니다.
- 정류장/역 단위는 지도 hotspot을 더 정확하게 만들 수 있습니다.

주의점:

- 이미 동 단위 대중교통 OD가 있어서, 모델 성능이 크게 오르기보다는 지도 설명력이 좋아지는 쪽입니다.

우선순위:

```text
중간~높음
```

### D. 국지 AWS 날씨

공식 출처:

- [기상청 AWS 기상관측자료 조회서비스](https://www.data.go.kr/data/15057084/openapi.do)

쓸 수 있는 feature:

- `aws_400_temperature`
- `aws_401_temperature`
- `aws_400_rain`
- `aws_401_rain`
- `nearest_aws_station_id`

왜 좋은가:

- 현재는 서울 ASOS 108 하나를 전체 동에 붙이고 있습니다.
- 이전에 확인한 400/401 지점을 이용하면 강남/서초 주변 국지 날씨를 더 잘 반영할 수 있습니다.

주의점:

- AWS API는 심의승인 성격이 있고, 지점 위치 변경 이력 확인이 필요합니다.
- 과거 장기 데이터 제공 범위와 승인 상태를 확인해야 합니다.

우선순위:

```text
중간
```

### E. 대기질/미세먼지

공식 출처:

- [한국환경공단 에어코리아 대기오염정보](https://www.data.go.kr/data/15073861/openapi.do?recommendDataYn=Y)

쓸 수 있는 feature:

- `pm10`
- `pm25`
- `ozone`
- `air_quality_grade`

왜 좋은가:

- 미세먼지/오존이 나쁜 날은 도보 이동 회피, 택시/대중교통 선택에 영향을 줄 수 있습니다.

주의점:

- 효과가 날씨/요일보다 작을 가능성이 큽니다.
- 운영계정이나 트래픽 제한 확인이 필요합니다.

우선순위:

```text
중간
```

### F. S-DoT 유동인구 센서

공식 출처:

- [스마트서울 도시데이터 센서(S-DoT) 유동인구 측정 정보](https://data.seoul.go.kr/dataList/OA-15964/A/1/datasetView.do)

쓸 수 있는 feature:

- `nearby_sdot_footfall`
- `sdot_footfall_change`

왜 좋은가:

- 실제 보행 유동인구를 보완 feature로 쓸 수 있습니다.

주의점:

- 센서 위치가 9개 동을 균등하게 덮지 않을 수 있습니다.
- 공식 행정동 전체 수요라기보다 일부 지점 proxy입니다.

우선순위:

```text
중간
```

### G. 상권/카드/상업 활동 지표

공식 출처 후보:

- [서울시 상권분석서비스 행정동 계열 데이터](https://data.seoul.go.kr/dataList/OA-22161/S/1/datasetView.do)
- [서울시 실시간 도시데이터](https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do)

쓸 수 있는 feature:

- `commercial_activity_index`
- `night_commerce_proxy`
- `card_consumption_proxy`
- `event_count`

왜 좋은가:

- 택시는 “어디에 사람이 있나”뿐 아니라 “왜 이동하나”에 민감합니다.
- 강남/역삼/청담은 상권/야간 활동이 수요에 중요합니다.

주의점:

- 상권 데이터는 주기와 단위가 시간별이 아닐 수 있어 정적/월별 feature로 쓰는 편이 안전합니다.
- 실시간 도시데이터의 상권/이벤트는 과거 학습 데이터로 소급하기 어렵습니다.

우선순위:

```text
중간
```

### H. Big Data Campus 택시 iDTG/GPS

공식 참고:

- [서울시 빅데이터캠퍼스 택시 iDTG/GPS 활용 사례](https://bigdata.seoul.go.kr/noti/selectNoti.do?ac_type=A4&bbs_seq=367&currentPage=3&r_id=P260&tr_code=sweb)

쓸 수 있는 feature/target:

- 실제 택시 승차 위치/시간
- 택시 이동/공차/실차 흐름
- 도로 링크 단위 택시 통행량

왜 좋은가:

- 이게 있으면 proxy가 아니라 진짜 택시 수요 예측에 가까워집니다.

주의점:

- 일반 OpenAPI가 아니라 제한/캠퍼스 접근 데이터에 가깝습니다.
- 단기간 발표용으로는 현실성이 낮습니다.

우선순위:

```text
장기 목표
```

## 2. 이미 본 교통량 데이터에 대한 판단

사용자가 확인한 공공데이터포털 `15145477`은 [서울특별시_교통량 정보](https://www.data.go.kr/data/15145477/fileData.do?recommendDataYn=Y)입니다.

공식 설명상 `년도별, 월별, 요일별, 시간대별 교통량 조사결과`이고, 서울 열린데이터광장 `OA-15064`로 연결됩니다.

판단:

- 쓸 수 있습니다.
- 다만 원천 단위는 행정동이 아니라 주요 간선도로/도시고속도로의 지점별 교통량입니다.
- 그래서 지금 우리가 한 것처럼 좌표/지점/도로명 기반으로 9개 동에 매핑해야 합니다.
- 즉, 추가로 받는다고 해도 `진짜 행정동별 차량 교통량 원천 데이터`라고 말하면 안 됩니다.

## 3. 모델 후보

### A. 현재 모델 유지: HistGradientBoostingRegressor

현재 기준 모델입니다.

장점:

- scikit-learn만 있으면 됩니다.
- 표 형태 feature에 잘 맞습니다.
- 설명과 재현이 쉽습니다.
- 발표용으로 가장 안정적입니다.

유지 추천:

```text
예
```

### B. LightGBM / XGBoost / CatBoost

해볼 만한 대안입니다.

장점:

- tabular data에서 강한 경우가 많습니다.
- feature interaction을 잘 잡습니다.
- CatBoost는 범주형 feature 처리 설명이 쉽습니다.

주의점:

- 추가 설치가 필요합니다.
- 현재 성능이 이미 높아서 성능 개선보다 “비교 실험” 의미가 큽니다.
- 발표 직전에는 새로운 의존성 때문에 리스크가 생길 수 있습니다.

추천 방식:

```text
Colab에서만 비교 실험, repo 기본 모델은 scikit-learn 유지
```

### C. RandomForest / ExtraTrees

장점:

- baseline model로 설명하기 쉽습니다.
- 비선형 패턴을 잘 잡습니다.

주의점:

- 모델 크기가 커지고 예측/저장이 무거워질 수 있습니다.
- 시간 외삽에는 강하지 않습니다.

추천:

```text
모델 비교표용 baseline
```

### D. Poisson / Tweedie Regression

장점:

- 승객 수처럼 count 성격이 있는 target에 해석이 좋습니다.
- “설명 가능한 모델”로 쓰기 좋습니다.

주의점:

- 현재처럼 복잡한 비선형 패턴에서는 성능이 낮을 수 있습니다.

추천:

```text
해석용 보조 모델
```

### E. High-Demand Classification

회귀 대신 “다음 1시간에 수요 상위 20~30% 동인가?”를 맞히는 모델입니다.

장점:

- 배차 의사결정에는 정확한 숫자보다 hotspot 여부가 더 중요할 수 있습니다.
- precision/recall로 설명하기 쉽습니다.
- 지도에서 빨강/노랑/초록처럼 쓰기 좋습니다.

추천:

```text
매우 추천
```

### F. Quantile Regression

예측값 하나가 아니라 낮음/중간/높음 범위를 예측합니다.

장점:

- `수요가 높을 가능성`과 `불확실성`을 같이 줄 수 있습니다.
- 배차 로직에서 보수적/공격적 정책을 나눌 수 있습니다.

추천:

```text
2차 추천
```

### G. LSTM / Temporal Fusion Transformer

지금은 추천하지 않습니다.

이유:

- 데이터가 9개 동 x 시간대라 딥러닝이 꼭 필요한 규모는 아닙니다.
- 설명이 어려워집니다.
- 발표 리스크가 큽니다.
- 현재 목표는 “택시 수요 proxy를 지도/배차로 넘기는 것”이지, 딥러닝 자체가 목표가 아닙니다.

추천:

```text
나중에, 시간이 남을 때만
```

## 4. 지금 가장 좋은 다음 작업

### 1순위: 생활이동 데이터 추가

가장 가치가 큽니다.

특히 수단별 데이터에서 `차량`, `도보`, `일반버스`, `지하철`을 분리하면 현재 대중교통 OD보다 더 풍부해집니다.

### 2순위: 택시승차대 + 정류장/역 세부 승하차

수요 예측과 지도 hotspot 설명에 좋습니다.

### 3순위: high-demand classification 모델 추가

현재 회귀 모델 결과와 별도로:

```text
다음 1시간 수요 상위권 동 예측
```

을 만들면 배차 로직에 훨씬 직접적입니다.

### 4순위: 미래 예측용 feature 생성

현재 모델은 1시간 뒤 near-term 예측에는 강하지만, 장기 미래 예측은 미래 feature가 필요합니다.

그래서 다음 feature를 만들어두면 좋습니다.

- `same_hour_last_week`
- `same_hour_last_4week_avg`
- `dong_hour_rolling_mean_7d`
- `dong_hour_rolling_mean_28d`
- `is_before_holiday`
- `is_after_holiday`

이렇게 하면 현재 실측 OD가 없어도 미래 날짜의 예측 row를 만들 수 있습니다.

## 5. 추천 결론

지금 바로 할 일은 모델을 갈아엎는 게 아닙니다.

가장 좋은 방향은:

1. 현재 HGBR 회귀 모델을 기준 모델로 유지
2. 수도권 생활이동 수단/목적 데이터를 추가
3. high-demand classification 모델 하나를 추가
4. 미래 예측용 lag/rolling feature를 추가
5. 여유가 있으면 Colab에서 LightGBM/CatBoost 비교

이렇게 하면 발표에서는 “데이터를 더 잘 붙여서 택시 수요 proxy를 강화했다”라고 말할 수 있고, 구현에서는 지도/배차에 바로 쓰기 좋은 JSON을 만들 수 있습니다.

