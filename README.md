# 강남·역삼 택시 디지털 트윈

강남·역삼권 3D 도시 장면 위에 택시 수요 예측, 공급 proxy 시뮬레이션, 수요-공급 gap, 인센티브 정책 실험을 연결한 웹 기반 모빌리티 디지털 트윈입니다. 프론트엔드는 Next.js/Three.js로 OSM 기반 공간 레이어를 렌더링하고, 배포 폴더의 Python API는 CNN-LSTM 수요 모델과 도로링크 기반 공급 proxy를 제공합니다.

## 한눈에 보기

| 영역 | 내용 |
| --- | --- |
| 프론트엔드 | Next.js 16, React 19, Three.js/R3F, OSM 기반 3D 지도 |
| 수요 모델 | CNN-LSTM backbone + 행정동 embedding + POI time gating |
| 공급 API | FastAPI/uvicorn, in-process demand model, startup cache warmup |
| 지원 지역 | 3D OSM 지도는 강남·역삼권 9개 동, 수요 API는 강남구 주요 10개 동 |
| 주요 화면 | 3D 디지털 트윈, R3F Perf Lab, 수요/공급 그래프, 행정동 미니맵, API 대시보드 |
| 운영 포트 | 프론트엔드 `8000`, supply API `2223` |

## 구현 범위

이 저장소의 디지털 트윈은 실제 교통공학 시뮬레이터가 아니라 수요·공급 분석 결과를 지도 위에서 이해하기 쉽게 보여주는 presentation/analysis layer입니다.

| 항목 | 목표 |
| --- | --- |
| 지도 | OSM 도로·건물·행정동을 3D 맥락으로 제공 |
| 차량 | 수요 변화에 맞춰 밀도와 흐름을 그럴듯하게 표현 |
| 신호/날씨 | 시연과 해석을 돕는 가벼운 환경 연출 |
| 수요/공급 | backend/supply API의 proxy 값을 차트와 미니맵에 연결 |
| 제외 | 실제 택시 GPS, 실제 배차 최적화, lane-level traffic simulation |

## 주요 기능

- OSM 기반 강남·역삼권 3D 도시 렌더링
- 도로, 건물, 행정동 경계, 지하철/버스 landmark, 교통신호 레이어
- 택시/일반 차량 주행 애니메이션과 날씨/시간대 환경 연출
- 날짜·시간·행정동 기준 수요 예측 그래프
- 전체 동 기준 수요 heatmap과 선택 동 강조
- 공급 proxy 시뮬레이션: 도로링크 통계 + 요일/시간/날씨/수요 보정
- 수요-공급 gap 지표와 인센티브 추천 API
- React Three Fiber 기반 성능 벤치마크 화면: chunk culling, draw call, triangle, vehicle instance 확인
- Swagger UI와 대시보드로 API 직접 검증 가능

## 실행 방법

### 1. 프론트엔드

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 8000
```

또는 기존 launcher를 사용할 수 있습니다.

```bash
./run-web.sh dev
```

브라우저에서 `http://localhost:8000`을 엽니다.

시나리오 컷은 production build 기반으로 생성할 수 있습니다.

```bash
npm run screenshot:scenarios
```

### 2. Supply API

```bash
../deploy/start.sh
```

내부적으로 다음 명령을 실행합니다.

```bash
python3 supply_api.py \
  --output-dir ./supply_api \
  --demand-dir ./backend \
  --host 0.0.0.0 \
  --port 2223
```

확인 URL:

- Swagger UI: `http://localhost:2223/docs`
- API 대시보드: `http://localhost:2223/dashboard`
- 로그: `tail -f ../deploy/supply_api/api.log`

종료:

```bash
../deploy/stop.sh
```

## API 요약

| Endpoint | 설명 |
| --- | --- |
| `GET /api/demand/dong-daily?date=YYYYMMDD` | 10개 동 시간대별 수요 예측 |
| `GET /api/demand/hourly?date=YYYYMMDD&dong=역삼1동` | 특정 동 24시간 수요 곡선 |
| `GET /api/weather?date=YYYYMMDD` | 24시간 날씨 피처 |
| `GET /api/weather?date=YYYYMMDD&hour=18` | 특정 시간 날씨 피처 |
| `GET /api/supply/daily?date=YYYYMMDD` | 전체 동 24시간 공급 proxy |
| `GET /api/supply/dong-hourly?date=YYYYMMDD` | 동별·시간별 공급 행 |
| `GET /api/gap/hourly?date=YYYYMMDD&dong=역삼1동` | 특정 동 수요-공급 gap |
| `GET /api/gap/dong-hourly?date=YYYYMMDD` | 동별·시간별 gap 행 |
| `GET /api/pricing/dong-hourly?date=YYYYMMDD` | 동별·시간별 인센티브 추천 |

프론트엔드 내부 화면:

| Route | 설명 |
| --- | --- |
| `/` | 3D 디지털 트윈 메인 화면 |
| `/r3f-perf-test` | React Three Fiber 성능 벤치마크 및 culling 실험 화면 |

프론트엔드는 Next.js Route Handler를 통해 위 API를 proxy합니다. `.env`를 생략해도 local 기본값은 `localhost:2223`으로 잡히지만, 배포/시연 환경에서는 명시해두는 것이 안전합니다.

```env
BACKEND_DEMAND_API_URL=http://localhost:2223/api/demand/hourly
BACKEND_DEMAND_DAILY_API_URL=http://localhost:2223/api/demand/dong-daily
BACKEND_WEATHER_API_URL=http://localhost:2223/api/weather
BACKEND_SUPPLY_BASE_URL=http://localhost:2223/api/supply
BACKEND_PRICING_BASE_URL=http://localhost:2223/api/pricing
```

## 모델 구조 요약

수요 모델은 `deploy/backend`에 있습니다.

```text
24시간 시계열 피처
  └─ CNN1D + BatchNorm + CNN1D + BatchNorm
      └─ LSTM(2 layers)
          └─ 시간 문맥 벡터

행정동 ID ── Embedding(8)
POI 분포 ── Target-context gating ── Projection(16)
예측 시점 ── Target context projection(8)

[LSTM 64 + POI 16 + Dong 8 + Target 8]
  └─ MLP head + Softplus
      └─ baseline 대비 demand rate
          └─ predicted_calls/hour
```

입력 피처는 날씨, 교통량, 지하철 승하차 패턴, 시간/요일/공휴일 문맥, POI 분포, 행정동 embedding으로 구성됩니다. 모델은 행정동별 baseline 수요에 rate를 곱해 시간대별 호출량 proxy를 산출합니다.

공급 모델은 직접 관측된 실시간 택시 대수 예측 모델이 아니라, 도로링크 기반 공급 proxy 시뮬레이션입니다. `supply_model.pkl.gz`, `link_dong_mapping.csv`, `dong_supply_weights.json`을 사용해 도로링크 단위 공급 패턴을 행정동으로 집계하고, 수요 모델의 4주 baseline 변화량과 달력/시간대 prior를 섞어 보정합니다.

보고서에 넣기 좋은 한 문장 요약:

> 본 시스템은 CNN-LSTM 기반 행정동별 수요 proxy와 도로링크 기반 공급 proxy를 결합해, 강남·역삼권의 시간대별 수요-공급 불균형을 3D 디지털 트윈에서 설명하고 정책 실험 지표로 확장하는 시뮬레이션 companion입니다.

## Supply API 구조

`deploy/supply_api/supply_api.py`는 기존 실행 명령을 유지하기 위한 shim이고, 실제 구현은 패키지로 분리되어 있습니다.

```text
deploy/supply_api/
  supply_api.py              # backward-compatible entry shim
  supply_api/
    __main__.py              # argparse, startup warmup, uvicorn run
    server.py                # FastAPI app, compatibility routing
    model.py                 # SupplyModel
    demand_client.py         # DemandClient, LocalDemandClient
    calibration.py           # priors, gap, incentive policy
    spatial.py               # share normalization, mapping loaders
    calendar.py              # day-type adjustments
    request_utils.py         # query parsing, weather resolution
    docs.py                  # OpenAPI, docs/dashboard HTML
    config.py                # tuned constants
```

성능 개선 사항:

- 서버 시작 시 오늘 날짜 수요/공급 캐시 warmup
- 4주 baseline daily cache로 같은 날짜 baseline 재계산 제거
- 날짜별 in-flight lock으로 동일 날짜 ML 중복 실행 방지
- FastAPI/uvicorn 전환과 동시 실행 제한
- queue timeout 초과 시 `503 Server busy`

## 검증 기록

마지막 로컬 검증: `2026-06-12 21:20 KST`

| 항목 | 결과 |
| --- | --- |
| `python3 -Wall -m py_compile` | 통과 |
| `GET /docs` | 200 |
| `GET /openapi.json` | 200, 12 paths |
| `GET /api/supply/daily` | 200, 약 0.11s after warmup |
| `GET /api/pricing/dong-hourly` | 200, 약 0.11s after warmup |
| `GET /api/demand/dong-daily` | 200, 약 0.004s after warmup |
| Frontend proxy `/api/weather?date=YYYYMMDD` | 200 |
| Frontend proxy `/api/supply` | 200 |
| Frontend proxy `/api/pricing` | 200 |
| Frontend proxy `/api/demand` | 200 |
| README screenshots | regenerated from running `8000` and `2223` |

## 해석 시 주의점

- 수요값은 실제 KakaoT 호출 원천 로그가 아니라 프로젝트 데이터와 공개 피처 기반의 demand proxy입니다.
- 공급값은 실시간 택시 availability 예측이 아니라 도로링크/시간/수요 변화 기반 supply proxy입니다.
- gap과 인센티브는 운영 의사결정 보조용 시뮬레이션 지표이며 실제 배차 정책을 자동 결정하지 않습니다.
- 외부 발표에서는 “실시간 운영 최적화 시스템”보다 “수요·공급 imbalance를 설명하고 시뮬레이션하는 디지털 트윈 companion”으로 표현하는 것이 정확합니다.
