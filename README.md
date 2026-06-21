# 강남·역삼 택시 수요-공급 디지털 트윈

강남·역삼권의 시간대별 택시 수요, 공급 proxy, 수요-공급 gap, 인센티브 정책 실험을 3D 도시 지도 위에서 함께 탐색하는 웹 기반 디지털 트윈 프로젝트입니다.

본 프로젝트는 실제 택시 GPS 관제나 배차 최적화 시스템이 아니라, 공개·가공 데이터 기반 수요 예측과 공급 proxy 시뮬레이션을 결합해 도시 모빌리티 불균형을 설명하는 분석 및 발표용 decision-support 시스템입니다.

## 문제 정의

강남·역삼권은 업무·상업 시설이 밀집되어 있어 퇴근 시간, 심야, 기상 악화 시 택시 수요가 특정 시간과 지역에 집중됩니다. 반면 택시 공급은 동일한 속도로 재배치되지 않기 때문에 승객 대기, 기사 공차 운행, 플랫폼 인센티브 비용이 함께 증가합니다.

이 프로젝트는 다음 질문에 답하기 위해 설계되었습니다.

- 어느 행정동에서 어느 시간대에 수요가 증가하는가?
- 예측 수요 대비 공급 proxy는 충분한가?
- 부족 구간을 지도와 차트에서 어떻게 설명할 수 있는가?
- 인센티브를 적용하면 공급 부족이 얼마나 완화되는 것으로 해석할 수 있는가?

## 핵심 결과

| 영역 | 구현 내용 |
| --- | --- |
| 3D 디지털 트윈 | OpenStreetMap 기반 도로, 건물, 행정동 경계, 교통 랜드마크를 Three.js/R3F로 렌더링 |
| 수요 예측 | CNN-LSTM 기반 행정동·시간대별 택시 수요 proxy 예측 |
| 공급 proxy | 도로링크 통계, 요일·시간·날씨 prior, 수요 변화량을 결합한 공급 지표 산출 |
| Gap 분석 | 수요와 공급 proxy를 비교해 부족 구간과 시간대별 imbalance 계산 |
| 정책 실험 | gap 기반 인센티브 추천 금액 및 공급 증가량 proxy 시각화 |
| 성능 검증 | R3F 성능 랩, chunk culling, draw call/triangle/vehicle instance 확인 |

## 시스템 구조

```text
[Frontend: Next.js + Three.js/R3F]
  3D OSM 지도, 차량 마커, 수요/공급 차트, 행정동 히트맵, 인센티브 패널
        |
        | Next.js API proxy
        v
[Supply API: FastAPI]
  demand, weather, supply, gap, pricing endpoints
        |
        +-- [Demand Model: PyTorch CNN-LSTM]
        +-- [Supply Proxy: road-link prior + calibration]
```

프론트엔드는 모델을 직접 실행하지 않고 API 응답을 시각화합니다. 수요 모델은 행정동별 baseline에 CNN-LSTM이 산출한 rate를 곱해 시간당 수요 proxy를 계산하고, 공급 모델은 도로링크 기반 prior와 수요 변화량을 섞어 행정동 단위 공급 proxy를 계산합니다.

## 화면 예시

### 3D 도시 디지털 트윈

![강남·역삼권 3D 도시 지도](docs/screenshots/final-batch/01-main-or-default-view.png)

### 수요·공급 분석

| 수요 분석 | 공급 분석 |
| --- | --- |
| ![시간대별 수요 분석 패널](docs/screenshots/final-batch/02-demand-analysis-panel.png) | ![시간대별 공급 분석 패널](docs/screenshots/final-batch/03-supply-analysis-panel.png) |

### 인센티브 실험과 부족 구간

| 인센티브 추천 | 부족 구간 히트맵 |
| --- | --- |
| ![인센티브 추천 패널](docs/screenshots/final-batch/04-incentive-panel.png) | ![수요 공급 부족 히트맵](docs/screenshots/final-batch/07-shortage-heatmap-tall.png) |

### API 검증 화면

| Swagger UI | Supply 대시보드 |
| --- | --- |
| ![Supply API Swagger UI](docs/screenshots/final-batch/09-supply-api-docs.png) | ![Supply API 대시보드](docs/screenshots/final-batch/10-supply-dashboard.png) |

## 모델 및 데이터 해석

### 수요 모델

수요 모델은 24시간 시계열 피처를 입력으로 받는 CNN-LSTM 구조입니다.

```text
날씨, 교통량, 지하철 승하차, 시간/요일/공휴일, POI, 행정동 ID
  -> Conv1D + BatchNorm
  -> LSTM
  -> POI gating + 행정동 embedding + 예측 시점 context
  -> MLP + Softplus
  -> baseline 대비 demand rate
  -> predicted calls/hour proxy
```

예측 대상은 강남구 주요 10개 행정동입니다.

```text
논현1동, 논현2동, 대치4동, 삼성1동, 삼성2동,
신사동, 역삼1동, 역삼2동, 압구정동, 청담동
```

### 공급 proxy

공급값은 실시간 택시 availability를 직접 관측한 값이 아니라, 도로링크 통계와 시간·요일·기상 prior, 수요 변화량 보정을 결합한 비교용 proxy입니다. 따라서 절대적인 실제 택시 대수보다 행정동별 상대 순위, 시간대별 패턴, 수요-공급 gap 해석에 초점을 둡니다.

### 3D 시뮬레이션 범위

3D 지도는 교통공학 수준의 microscopic simulation을 목표로 하지 않습니다. 차량은 실제 차선별 큐잉이나 배차 의사결정을 재현하기보다, 수요·공급 분석 결과를 발표 화면에서 납득 가능하게 보여주기 위한 presentation-layer 마커로 동작합니다.

| 포함 | 제외 |
| --- | --- |
| OSM 기반 도로·건물·행정동 3D 렌더링 | 실제 택시 GPS 실시간 관제 |
| 수요/공급 proxy 기반 차량 마커 밀도 조절 | 실제 배차·매칭 최적화 |
| 시간대·날씨·행정동 선택에 따른 차트/히트맵 | lane-level traffic simulation |
| gap 기반 인센티브 추천 지표 | 실제 요금 정책 자동 결정 |

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

## 프론트엔드 실행

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 8000
```

브라우저에서 `http://localhost:8000`을 엽니다.

```bash
npm run build
```

## 백엔드 산출물 관리

현재 공개 저장소는 프론트엔드와 문서 중심으로 정리되어 있습니다. 로컬의 `deploy/` 폴더는 API 코드, 모델 파일, CSV, 로그, PID, 가상환경 캐시가 섞인 실행 산출물이라 그대로 커밋하지 않습니다.

제출 또는 재현을 위해 백엔드까지 포함해야 한다면 다음 원칙으로 별도 정리하는 것이 안전합니다.

- 포함: FastAPI 소스 코드, requirements, 최소 실행 스크립트, 모델/데이터 파일 목록
- 제외: `.venv`, `__pycache__`, `*.log`, `*.pid`, 개인 경로가 찍힌 로그, 인증서, 서버 계정 정보
- 대용량 모델/데이터: Git LFS 또는 별도 다운로드 링크 사용 권장

## 검증 기록

마지막 통합 검증 기준: `2026-06-12 21:20 KST`

| 항목 | 결과 |
| --- | --- |
| Python syntax compile | 통과 |
| `GET /docs` | 200 |
| `GET /openapi.json` | 200, 12 paths |
| `GET /api/supply/daily` | 200, 약 0.11s after warmup |
| `GET /api/pricing/dong-hourly` | 200, 약 0.11s after warmup |
| `GET /api/demand/dong-daily` | 200, 약 0.004s after warmup |
| Frontend proxy `/api/weather` | 200 |
| Frontend proxy `/api/supply` | 200 |
| Frontend proxy `/api/pricing` | 200 |
| Frontend proxy `/api/demand` | 200 |

## 한계와 주의점

- 수요값은 실제 플랫폼 원천 호출 로그가 아니라 프로젝트 데이터와 공개 피처 기반의 demand proxy입니다.
- 공급값은 실시간 택시 availability 예측이 아니라 도로링크/시간/수요 변화 기반 supply proxy입니다.
- gap과 인센티브는 운영 의사결정 보조용 시뮬레이션 지표이며 실제 배차 정책을 자동 결정하지 않습니다.
- 외부 발표에서는 “실시간 운영 최적화 시스템”보다 “수요·공급 imbalance를 설명하고 시뮬레이션하는 디지털 트윈 companion”으로 표현하는 것이 정확합니다.
