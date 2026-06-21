# yeoksam-taxi 작동 기능 명세 (Current Working Features)

*최종 갱신일: 2026-06-12*

본 문서는 `yeoksam-taxi` 웹 애플리케이션 프론트엔드의 주요 구현 기능과 백엔드 연동 현황을 한눈에 조망할 수 있는 작동 기준 명세서(Specification)입니다. 시스템 아키텍처 설명, 팀 내 인수인계, 시연 시 실제 동작하는 핵심 기능 목록을 신속히 검증하고 확인하는 용도로 활용됩니다.

---

## 1. OpenStreetMap (OSM) 기반 3D 지도 구성

지도의 기하학적 형태(Geometry)와 시뮬레이션 경로 인프라는 OpenStreetMap(OSM) 데이터를 사전에 추출 및 정제한 정적 자산(Static Assets)을 기반으로 구축되었습니다. 런타임 시 대용량 OSM 전체 데이터를 실시간 스트리밍하는 브라우저 성능 오버헤드를 방지하기 위해, 전처리되어 `public/` 경로에 배포된 파일들을 직접 읽어 3D 공간을 구성합니다.

### 활용 중인 핵심 공간 데이터 자산
- `public/roads.geojson`: OSM 기반 도로 선형 정보
- `public/road-network.json`: 차량 주행 에이전트의 경로 탐색을 위한 토폴로지 도로 그래프
- `public/buildings.geojson`: 3D 빌딩 높이 및 평면 공간 정보
- `public/dongs.geojson`: 행정구역(행정동)의 경계선 데이터
- `public/non-road.geojson`: 녹지, 수변, 광장, 주차장 등 도로 이외의 도시 표면 레이아웃
- `public/transit.geojson`: 주요 지하철역 및 버스 정류장 등 대중교통 랜드마크 위치 정보
- `public/traffic-signals.geojson`: 주요 교차로 교통신호기 좌표 및 제어 속성
- `public/taxi-stands.geojson`: 9개 동 내부 공식 택시 승강장 좌표 정보

### 데이터 렌더링 파이프라인
```text
[정적 공간 데이터 로드 (GeoJSON / JSON)]
          ▼
[Web Worker 비동기 파싱 및 투영(Projection) 연산]
          ▼
[도로, 빌딩, 행정동 경계, 교통 랜드마크 레이어 생성]
          ▼
[Three.js 3D 공간(Scene) 렌더링 최적화 배치]
```

### 소스코드 구현 위치
- `src/components/map-simulator/simulation/load-simulation-data.worker.ts`
- `src/components/map-simulator/hooks/use-simulation-data-loader.ts`
- `src/components/map-simulator/hooks/use-map-scene-geometry.ts`
- `src/components/map-simulator/scene/static-scene-culling.ts`

---

## 2. 3D 디지털 트윈 도시 구현 스펙

시뮬레이터가 렌더링하는 디지털 트윈 환경 요소는 다음과 같습니다.

- **OSM 기반 도로망**: 차선 구분선과 도로 레이어 고도 정보를 시각화 목적에 맞게 단순화해 표현
- **입체적 건물 구조**: 높이 정보에 맞춘 3D 빌딩 매스(Mass)와 상단의 반투명 지붕 레이아웃
- **행정동 영역 강조**: 동 단위의 바닥면 구분 및 실시간 동 경계 구획선 시각화
- **교통 인프라 연출**: 신호 지점의 상태 변화, 노면 정지선 및 입체 횡단보도 렌더링
- **다이내믹 에이전트**: 도로 네트워크 그래프를 타는 택시와 일반 차량의 주행 애니메이션
- **선택 행정동 인터랙션**: 마우스 오버 및 클릭 시 선택 동의 전체 경계면을 발광 강조(Highlight)하는 연출 효과

본 디지털 트윈은 실제 교통공학 수준의 microscopic simulation을 목표로 하지 않습니다. 보고서와 시연에서 수요·공급 분석 결과를 납득 가능하게 전달하는 것이 목적이므로, 차량은 실제 차선별 큐잉이나 배차 의사결정보다 route pool 분산, 신호 대기, 차간 거리, 차량별 lateral offset 같은 가벼운 규칙으로 “그럴듯한 흐름”을 표현합니다.

### 성능 최적화 (Frustum Culling)
수만 개의 폴리곤을 처리하기 위해 정적 도로와 건물은 일정 영역 단위의 공간 그리드 청크(Chunk)로 결합하여 관리됩니다. 매 프레임 카메라의 실시간 뷰 영역(Frustum)을 확인하여 화면 바깥의 비보이는 청크를 즉시 물리 렌더링 트리에서 비활성화(`visible = false`)하는 프러스텀 컬링 기법이 적용되어 있어, GPU 드로우 콜(Draw Call)을 획기적으로 억제합니다.

---

## 3. 시뮬레이션 날짜 및 시간 제어 시스템

시뮬레이터의 시간 제어 축은 두 가지 모드를 독립적으로 지원합니다.

### A. 실시간(Live) 모드
- KST(한국 표준시) 기준의 실제 현재 날짜와 시간 정보를 기반으로 동작합니다.
- 초기 로드 시 실시간 모드가 활성화되면 기기 내장 클록을 연계하여 시간 데이터를 자동 반영합니다.
- 매 정각이 바뀌는 임계 지점을 감지하여 전체 날짜/시간 상태 및 날씨 동기화를 유지합니다.
- 수요 히트맵 시간대, 날씨 조회 시점 및 3D 그래픽스의 태양/달 조명 씬이 같은 시간축을 공유합니다.

### B. 과거 조회(Specific) 모드
- 사용자가 사이드바 패널을 통해 원하는 연도, 월, 일, 시간을 지정하여 과거 특정 시점의 도시 수요 상태를 타임트래블 조회할 수 있습니다.
- 연도/월별 최종일 자동 보정(Clamping) 처리가 포함되어 오작동을 차단합니다.
- **미래 시간 조회 차단 장치**: 시뮬레이션 시점은 현재 실제 시간보다 미래로 지정할 수 없으며, 미래 시점 지정을 시도할 경우 자동으로 현재 시간으로 보정됨과 동시에 경고 토스트 알림을 우측 상단에 노출해 무결성을 유지합니다.
- 과거 시점 조회 시, 프론트엔드 성능 확보를 위해 분 단위는 `00분` 고정으로 설계되어 연산 집중을 방지합니다.

### 소스코드 구현 위치
- `src/components/map-simulator/hooks/use-live-clock-sync.ts`
- `src/components/map-simulator/ui/DemandSidebar.tsx`
- `src/components/MapSimulator.tsx`

---

## 4. 천체(태양/달/별) 및 동적 날씨 연동 엔진

시뮬레이션 시간대와 연계된 천체 궤도 연산 및 실시간 날씨 데이터 기반 조명/이펙트 파이프라인이 구현되어 있습니다.

### 연출 및 그래픽스 피처
- **태양 궤도 연산**: 입력된 날짜와 지도 중심 지리 좌표(Latitude/Longitude)를 계산하여 태양의 고도와 방위각을 천체 역학 기반으로 동적 구현하고, 태양광 직사 방향 및 색온도를 반영합니다.
- **천체 렌더링**: 밤 시간대 활성화 시 하늘에 3D 별무리(Starfield)를 투영하며, 태양과 정반대 궤도선상에 입체감 있는 달(Moon) 메시가 가시화됩니다.
- **날씨 파티클 시스템**: 비(Rain), 눈(Snow) 강수 상태 시 화면에 가벼운 파티클 효과를 표현하며, 날씨 위젯에 날씨 심볼 배지가 동적으로 연동됩니다.
- **노면 반사(Sheen) 연동**: 비나 눈이 올 경우 도로 머티리얼 계수를 제어해 젖은 노면처럼 보이는 시각 효과를 적용합니다.
- **날씨별 속도 보정**: 폭우나 폭설 등 기상 악화 시 도로 위 에이전트(차량)들의 기본 주행 속도 계수를 낮춰 화면상 흐름 변화를 표현합니다.

### 기상 데이터의 흐름
```text
[GET /api/weather?date=YYYY-MM-DD&hour=H 요청]
                      ▼
[서버 프록시를 거쳐 실제 백엔드 기상 정보 수집]
                      ▼
[수집 데이터를 clear/cloudy/heavy-rain/heavy-snow 4단계 규격으로 정규화]
                      ▼
[3D 머티리얼 환경 제어 및 프론트 UI 날씨 배지에 상태 반영]
```

### 소스코드 구현 위치
- `src/components/map-simulator/environment/environment-state.ts`
- `src/components/map-simulator/environment/environment-visuals.ts`
- `src/components/map-simulator/environment/use-weather-forecast.ts`
- `src/app/api/weather/route.ts`

---

## 5. 백엔드 수요(Demand) API 연동 규격

프론트엔드는 임의로 차량 수요를 예측 연산하지 않으며, 백엔드 엔진이 연산해 내려주는 동별 과거/실시간 수요예측 데이터를 호출하여 실시간 미니맵 히트맵 및 3D 인터랙티브 그래프에 그대로 바인딩합니다.

### 주요 API 인터페이스 및 포맷 매핑
- **기본 일일 수요 데이터 요청**:
  ```text
  GET /api/demand?scope=daily&date=YYYY-MM-DD
  ```
- **날짜 포맷 중계 변환**: 프론트엔드 프록시 레이어(`backend-proxy.ts`)에서 대시가 포함된 웹 표준 규격(`YYYY-MM-DD`)을 백엔드 DB 표준 규격인 `YYYYMMDD`로 매핑하여 호출 형식을 일관되게 유지합니다.
- **동별 24시간 상세 수요 요청**:
  ```text
  GET /api/demand?dong=역삼1동&date=YYYY-MM-DD
  ```
- **동작 원리**: 사이드바 패널 로드 시 Daily 데이터 1회 조회를 통해 강남구 핵심 9개 행정동의 0시~23시 시간대별 택시 수요 시계열 데이터를 캐시 보관하며, 이를 통해 미니맵 전환 및 시간 변경 시 추가 지연 시간 없이 고속으로 차트와 히트맵을 갱신합니다.

### 소스코드 구현 위치
- `src/components/map-simulator/demand/use-demand-forecast.ts`
- `src/app/api/demand/route.ts`
- `src/lib/backend-proxy.ts`
- `docs/demand-api-contract.md`

---

## 6. 호출 수요 및 생활인구 지표 연산

백엔드 수요 응답 행(Row) 데이터를 가공하여 화면에 구성하는 연산 속성들입니다.

### 정규화 처리되는 파싱 피처
- `hour`: 기준 시간대 (0 ~ 23)
- `demand_pred` / `demandCount`: 예측 및 호출된 누적 택시 수요 건수
- `population_pred` / `population`: 행정동 내 예측 상주 및 유동인구 지표

### 인터랙티브 차트 구현 요소 (`DemandChart.tsx`)
- **시간별 수요 추세 곡선**: 0~23시의 택시 호출 변화량을 부드러운 스플라인 곡선으로 렌더링
- **시간 타임라인 가이드 바**: 사용자가 제어 중인 현재 시점을 선명한 수직 점선으로 차트 내 실시간 추적 가시화
- **통계값 가독성 향상**: 일평균 수요 지표 및 피크 타임의 수요 수치를 우측 정보 레이아웃에 즉각 요약

*참고: 유동인구 지표(`populationPred`)는 파서 파이프라인에서 정규화 가공 처리되나, 현재 차트 레이아웃의 직관성을 보장하기 위해 택시 호출 수요 곡선 위주의 단일 세로축 그래프 구조를 취하고 있습니다.*

### 소스코드 구현 위치
- `src/components/map-simulator/demand/demand-math.ts`
- `src/components/map-simulator/ui/DemandChart.tsx`
- `src/components/map-simulator/ui/DemandSummaryStats.tsx`

---

## 7. 시간 슬라이더를 통한 연동 제어

수요 패널 상단의 시간 조작 모듈은 3D 가상 도시와 수치 대시보드가 같은 조회 시점을 바라보도록 맞춥니다.

### 시점 제어 메커니즘
1. 사용자가 타임 슬라이더 드래그 또는 시간 셀렉트 변경을 트리거합니다.
2. 미니맵 히트맵 기준 시점(`heatmapHour`)이 즉시 갱신됩니다.
3. 시뮬레이션 시스템 시점(`simulationTimeMinutes`)이 `hour * 60` 값으로 동기화됩니다.
4. 해당 시각에 해당하는 9개 행정동의 호출 수요량이 재계산됩니다.
5. 미니맵 SVG 개별 행정동 색상 및 선택 동의 예측 수치가 갱신됩니다.
6. 3D 도시의 섀도 맵 각도, 조명 밝기 및 날씨 상태가 같은 조회 시점에 맞춰 갱신됩니다.

### 소스코드 구현 위치
- `src/components/map-simulator/ui/DemandMiniMapPanel.tsx`
- `src/components/map-simulator/ui/DemandSidebar.tsx`
- `src/components/map-simulator/demand/use-demand-forecast.ts`
- `src/components/MapSimulator.tsx`

---

## 8. 행정동별 수요 히트맵(Heatmap) 시각화

히트맵은 강남구/역삼권 관할 핵심 9개 행정동을 타깃으로 실시간 구획 렌더링을 연동합니다.

### 대상 시각화 행정동 리스트
- 역삼1동 / 역삼2동
- 논현1동 / 논현2동
- 삼성1동 / 삼성2동
- 신사동 / 청담동 / 대치4동

### 렌더링 구현 방식
- 일일 수요 패널 데이터에서 선택된 현재 시각의 각 동별 수요값을 추출합니다.
- 하루 전체의 피크 수요값 대비 현재 각 동별 수요의 백분율 비율을 기준으로 가중치 점수를 계산합니다.
- 미니맵 패널의 SVG 아웃라인 경계 구역에 색상 밀도(투명도 가중치가 반영된 주황/황금색 히트맵 그라디언트)를 부여합니다.
- 사용자는 사이드바 옵션을 통해 '전체 행정동의 상대 히트맵' 모드와 '선택한 특정 행정동의 단독 히트맵' 모드를 동적으로 즉시 토글할 수 있습니다.

### 소스코드 구현 위치
- `src/components/map-simulator/demand/use-map-demand-state.ts`
- `src/components/map-simulator/demand/demand-minimap-renderer.ts`
- `src/components/map-simulator/ui/DemandMiniMapPanel.tsx`
- `src/components/map-simulator/ui/DemandMiniMapSvg.tsx`

---

## 9. 실시간 공급 기반 택시 마커 스케일링

백엔드 공급 API의 시간대별 택시 공급량 추이는 3D 지도에 표시되는 택시 마커 수로 축약 매핑됩니다.

### 동작 원리
- 시간대별 예측 공급량 proxy를 1시간 디스플레이 슬롯으로 유지합니다.
- 모바일 및 웹 브라우저 렌더링 임계 한계를 방어하기 위해, 택시 마커 수의 최소/최대 가이드라인(`appliedTaxiCount`)과 스케일 백분율 상한 필터링 장치가 적용되어 있습니다.
- **독립적 마커 설계**: 지도에 표시되는 전체 택시 마커 수는 특정 단일 동의 필터링에 영향받지 않으며, 전체 9개 동의 예측 공급량 proxy 합계를 기반으로 안전하게 렌더링됩니다.
- **시각적 분산 보정**: 택시는 택시 route pool을 우선 사용하고, 같은 route 안에서도 초기 위치와 lateral offset을 분산해 한 지점에 뭉쳐 보이는 현상을 완화합니다.

### 소스코드 구현 위치
- `src/components/map-simulator/demand/use-demand-forecast.ts`
- `src/components/map-simulator/constants/demand-constants.ts`
- `src/components/map-simulator/simulation/local-simulation-source.ts`

---

## 10. 백엔드 프록시 중계 및 보안 SSL 인증서 연동

프론트엔드 API 라우트는 서버 사이드(Node.js runtime) 프록시 레이어를 통해 실행되어 오리진(Origin) 간 CORS 제한 및 암호화 인증 문제를 극복합니다.

### 공급 proxy, gap, 인센티브 추가 중계

현재 프론트엔드는 demand만 표시하는 구조에서 확장되어 supply API의 공급 proxy, 수요-공급 gap, 인센티브 추천 응답도 함께 조회합니다.

```text
browser
  -> /api/demand?scope=daily
  -> /api/supply?scope=daily
  -> /api/pricing?scope=dong-hourly
  -> /api/weather
  -> deploy/supply_api FastAPI server (:2223)
```

핵심 동작:

- 날짜 선택 시 일일 수요와 공급 proxy를 함께 불러와 수요·공급 곡선을 구성합니다.
- 날씨는 `date`만 전달하면 24시간 전체, `date+hour`를 전달하면 단일 시간 피처를 받습니다.
- supply/pricing 요청이 실패해도 demand 그래프는 유지되며, 실패한 보조 지표만 빈 상태로 처리됩니다.
- Next.js proxy는 response cache와 in-flight request dedupe를 적용해 반복 조회 지연을 줄입니다.

소스코드 구현 위치:

- `src/app/api/demand/route.ts`
- `src/app/api/weather/route.ts`
- `src/app/api/supply/route.ts`
- `src/app/api/pricing/route.ts`
- `src/components/map-simulator/demand/use-demand-forecast.ts`

### API 중계 매핑 정의
- **수요 지표 API**:
  ```text
  /api/demand ➡️ BACKEND_DEMAND_API_URL / BACKEND_DEMAND_DAILY_API_URL
  ```
- **날씨 API**:
  ```text
  /api/weather ➡️ BACKEND_WEATHER_API_URL
  ```

### SSL 사설 인증서 검증 회피 및 자동 우회 파이프라인
- 개발 및 사내 데모 서버 실행 시 자주 수반되는 사설 SSL 인증서 에러를 사전 차단하기 위해, Next.js 구동 스크립트(`run-next.mjs`) 및 systemd 서비스 엔진에 `NODE_EXTRA_CA_CERTS` 환경 변수를 주입하여 저장소 내부의 `cert.pem`을 강제 인식하도록 인프라가 사전 구성되었습니다.
- **예외 우회 파이프라인**: 프록시 단에서 백엔드 서버의 사설 SSL 만료 등으로 HTTPS 요청 실패가 감지되면, 세션을 중단하지 않고 HTTP 프로토콜로 백업 우회 통신을 시도하여 데모 및 발표 현장의 연결 실패 가능성을 줄입니다.

---

## 11. 현재 작동 기준 요약

### 현재 프론트엔드에 구현된 기능
- **공간 3D 환경**: OSM 강남/역삼권 9개 행정동의 3D 입체 지도 가시화
- **그래픽스 피처**: 노면, 건물 3D 매스 및 반투명 지붕, 신호 체계, 대중교통 랜드마크 렌더링
- **다이내믹 에이전트**: 가상 택시와 일반 차량의 도로 토폴로지 기반 주행 애니메이션
- **인터랙티브 모드**: 현재 실제 시간 동기화(Live) 또는 사용자 지정 과거 일시 타임트래블 조회
- **안전 제어**: 미래 시점 데이터 요청을 원천 방어하는 타임 슬라이더 가드 장치 탑재
- **동적 환경 보정**: 천체 위치 계산에 따른 동적 태양/달 렌더링 및 젖은 아스팔트 반사 연출
- **서버 프록시 연계**: 날씨 데이터와 백엔드 동별 수요·공급 proxy 수치를 화면 상태에 연결
- **사이드바 시각화**: 선택 동별 시간대 수요 곡선 및 9개 행정동 히트맵 연동 제어
- **스케일링**: 전체 수요 proxy에 연동되어 3D 씬 내 가상 택시 개수가 증감하는 동적 차량 생성 시스템

### 구현 범위에서 제외된 항목 (미구현 또는 백엔드 영역)
- **AI 수요 모델**: 딥러닝/머신러닝 기반의 수요량 자체를 학습하고 추정하는 연산 (백엔드 코어 영역)
- **실시간 차량 관제**: 실제 운행 중인 서울시 법인/개인 택시의 GPS 트래킹 연동
- **배차 알고리즘**: 매칭 최적화 및 배차 정책 자동 의사결정
- **유동인구 통계 세부 가시화**: 생활인구 데이터(`populationPred`)는 런타임 수집 가공되나 차트 인터페이스 상 시계열 라인으로는 미표시
