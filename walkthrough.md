# Refactoring Walkthrough

## Scope

This pass focused on Cloudflare-safe runtime behavior, local demand API
self-sufficiency, type safety, continued 3D runtime decomposition, and map
rendering stability.

## 1. Build Version Runtime Safety

- Removed runtime `node:child_process` usage from `src/app/(site)/page.tsx`.
- Added build-time metadata injection in `next.config.ts`:
  - `NEXT_PUBLIC_BUILD_BRANCH`
  - `NEXT_PUBLIC_BUILD_COMMIT`
  - `NEXT_PUBLIC_BUILD_TIME_ISO`
- Build metadata now prefers Cloudflare/GitHub/build env values and falls back
  safely without crashing.
- `resolveBuildVersion()` is now Edge-safe because it only reads environment
  values and formats dates.

## 2. Backend Demand API Handoff

- The frontend no longer creates local demand predictions or mock API responses.
- `use-demand-forecast.ts` only calls `NEXT_PUBLIC_DEMAND_API_ENDPOINT`.
- When the endpoint is missing, failing, or malformed, the UI stays in an
  API-required state instead of synthesizing fallback demand.
- The frontend still preserves the backend hourly total when splitting it into
  5-minute display slots for the chart and map vehicle layer.

## 3. Runtime Modularity

- Added `useEnvironmentSettings.ts` for weather, fog, road/building material
  updates, sun/moon/star opacity, and precipitation density/motion.
- Added `useVehicleRuntimeSync.ts` for vehicle snapshot sync, taxi mesh upgrade,
  vehicle layer rebuilding, and taxi trail synchronization.
- Added `useCameraInteraction.ts` for pointer picking exports, interactive target
  checks, and reusable multi-touch gesture state/math.
- `MapSimulatorSceneRuntime.tsx` is reduced to orchestration and now delegates
  scene-specific responsibilities to focused controllers and layers.
- **Ride Mode (Taxi View) Camera Transitions**:
  - Saved the user's prior camera mode (drive/overview/follow) upon entering ride mode, so that exiting returns the camera to the correct mode.
  - Resolved camera snap bugs on exiting ride mode (either manually or when a taxi reaches its destination) by caching the taxi's last known position and heading. This data is used to focus the camera rig onto the taxi's final location, ensuring a seamless and natural transition instead of jarringly snapping the viewport to a far-away stale coordinate.

## 4. External Store Type Safety

- `src/lib/external-store.ts` now exposes `setField<Key extends keyof State>()`.
- `createFieldSetter()` maps field names to exact field value types through the
  store API.
- The previous `as unknown as Partial<State>` cast was removed.

## 5. Map Rendering Stabilization

- Switched the default renderer profile to performance-first because runtime
  stability is more important than visual realism for this digital twin.
- Disabled hardware antialiasing by default and capped renderer pixel ratio in
  `render-budget-utils.ts` so high-DPI displays cannot accidentally multiply
  the WebGL render target cost.
- Disabled real-time shadow maps by default while keeping the shadow parameters
  centralized for a future quality toggle.
- Added explicit surface-layer constants in `scene-constants.ts` so roads,
  road highlights, lane markings, crosswalks, and stop lines no longer compete
  for the same depth range.
- Reduced road slab thickness in `map-scene-road-layer.ts` and moved road
  sheen/lane marker rendering onto separated layers with polygon offset.
- Moved crosswalk and stop-line meshes in `traffic-signal-layer.ts` onto the
  road-marking layer with disabled depth writes, which reduces broad
  Z-fighting flicker on intersections.

## 6. Final Polishing

- Split `DemandSidebar.tsx` into focused UI components:
  - `DemandControls.tsx` for dong and weekday selectors
  - `DemandSummaryStats.tsx` for peak, current, and simulation demand stats
- Added `disposeHierarchy()` in `object-resource-utils.ts`; it recursively
  disposes geometries, materials, and material textures while de-duplicating
  shared resources during a traversal.
- Added a final `disposeHierarchy(scene)` cleanup call in
  `MapSimulatorSceneRuntime.tsx` so leftover scene-level GPU resources are
  released when navigating away.
- Extracted static map geometry creation into `useMapSceneGeometry.ts` as an
  imperative scene factory. This keeps the existing Three.js lifecycle stable
  while reducing orchestration code in `MapSimulatorSceneRuntime.tsx`.
- Removed the now-unused dong-demand score runtime ref after broad demand
  heatmap floor overlays were removed.

## 7. UI/UX 및 실감형 환경 고도화 (UI/UX & Realism Enhancements)

- **Typography & Aesthetics**: 전역 폰트를 시스템 기본 폰트에서 `Pretendard` 로 변경하여 한층 모던하고 깔끔한 프리미엄 UI 디자인 확보 (`layout.tsx`, `globals.css`).
- **Micro-animations**: `DemandChart.tsx` 의 차트 라인(SVG Path)과 사이드바 정보 표기 영역에 `transition-all duration-500` 을 적용하여 데이터 변경 시 부드럽게 형태가 변하도록 동적 효과(Dynamic Animation) 추가.
- **Graphics Quality Runtime**: `simulator-stores.ts` 의 `graphicsQuality` 상태와 렌더러 구독을 통해 안티앨리어싱 및 그림자 맵 적용 여부를 중앙에서 관리하도록 개선.
- **Mock API Realism**: `route.ts` 에서 제공하는 결정론적(Deterministic) 가상 수요 데이터에 네트워크 레이턴시 시뮬레이션(300ms~800ms) 및 ±5% 내외의 랜덤 노이즈(Random Noise)를 추가하여 센서/라이브 데이터를 가져오는 듯한 현실감을 부여함.
- **SEO Optimization**: `layout.tsx` 메타데이터에 Open Graph 및 Twitter 카드 상세 정보를 보강하여 웹 표준에 부합하는 공유 최적화.

## 8. 성능 벤치마크 바로가기 추가

- **UI Shortcut Addition**: 우측 상단 시스템 제어 및 진단 영역(나침반 위)에 성능 벤치마크 페이지(`/r3f-perf-test`)로 이동할 수 있는 바로가기 버튼을 추가하였습니다.
- **Mobile/Responsive Optimization**: 모바일 화면에서는 제한된 화면 크기를 감안해 아이콘을 숨기고, 데스크톱(`lg` 브레이크포인트 이상) 화면에서만 보이도록 레이아웃을 최적화했습니다 (`hidden lg:inline-flex`).
- **Aesthetic Consistency**: 기존의 유리모피즘 스타일에 부합하는 디자인 및 `Gauge` 아이콘을 사용하여 비주얼적 통일성을 유지했습니다.

## Verification

- `npx tsc --noEmit`: passed
- `npm run lint`: passed with no warnings
- `npm run build`: passed
- Demand API handoff smoke:
  - missing `NEXT_PUBLIC_DEMAND_API_ENDPOINT` shows an API-required state
  - configured endpoint is requested with `dong`, `date`, `hour`, `timezone`,
    and `weekday`
  - valid backend `points` are rendered without local prediction fallback
- `/map` Playwright smoke:
  - desktop canvas rendered, no console errors
  - mobile canvas rendered, no console errors
  - canvas screenshots were nonblank and visually varied by pixel analysis
- `/map` rendering smoke after flicker pass:
  - HTTP 200 from the local dev server
  - headless browser canvas rendered at `1280 x 663`
  - no Three.js deprecated shadow-map warning after reverting to `PCFShadowMap`
- `/map` performance smoke after performance-first pass:
  - headless browser canvas rendered at `1216 x 629`
  - CSS viewport was `1280 x 663`
  - effective render pixel ratio was `0.95`
- `/map` polishing smoke:
  - HTTP 200 from the local dev server
  - headless browser canvas rendered at `1216 x 629`
  - no browser console errors were reported by the smoke script
- UX/UI & Realism validation:
  - `Pretendard` 폰트가 전역으로 올바르게 로드되어 적용됨
  - API 통신 시 지연 발생 및 차트 애니메이션 부드러운 전환 동작 확인
  - 툴바 그래픽 품질 변경 버튼 클릭 시 Three.js 그림자 맵 실시간 갱신 확인
- Benchmark Shortcut validation:
  - `Link` 컴포넌트 및 `Gauge` 아이콘이 정상 임포트되어 무오류 컴파일 통과
  - 버튼의 디자인 및 배치 레이아웃 무결성 확인

## 9. 날씨별 반사광 및 광량 최적화 (흐림/폭우/폭설)

- **Direct Sun Light Reduction**: 흐림(Cloudy), 폭우(Heavy Rain), 폭설(Heavy Snow) 날씨 모드에서 태양광(DirectionalLight) 강도를 대폭 낮추었습니다 (각각 `1.0 -> 0.15`, `0.8 -> 0.05`, `1.1 -> 0.1`). 이로 인해 구름 낀 날씨에 불필요하고 부자연스러운 하이라이트/반사광(specular glare)이 지면에 맺히는 문제를 해결했습니다.
- **Ambient Compensation**: 직사광이 줄어든 대신 환경광(Ambient/Hemisphere intensity)을 보강하여 흐린 날에도 3D 객체의 가독성과 밝기가 은은하고 부드럽게 유지되도록 균형을 맞추었습니다.
- **Road & Ground Roughness Adjustment**: 일반/흐림 날씨에서 지면 거칠기를 `0.94 -> 0.98`, 도로 거칠기를 `0.82 -> 0.92`로 조정하여 기본 매트(Matte) 감성을 높였습니다.
- **Lightning Simulation in Heavy Rain**: 폭우(Heavy Rain) 모드에 실감 나는 **이중 섬광 번개 효과(Double-Flash Lightning Effect)**를 도입했습니다. 18초 주기로 노출 세기(Exposure)와 환경광 밝기를 극대화하고 안개를 순간적으로 걷히게 만들어 천둥번개가 치는 듯한 실감형 3D 환경을 연출했습니다.
- **UI Label Clarification**: 우측 하단 기상 배지의 제목을 기존의 모호한 `"지도 정보"`에서 **`"실시간 날씨"`**로 변경하여, 현재 조회 중인 기상 상태가 API로부터 동기화된 실시간 기상 데이터임을 사용자가 명확히 알 수 있도록 인지성을 높였습니다.

## Verification

- `npx tsc --noEmit`: passed
- `npm run lint`: passed with no warnings
- `npm run build`: passed
- Demand API handoff smoke:
  - missing `NEXT_PUBLIC_DEMAND_API_ENDPOINT` shows an API-required state
  - configured endpoint is requested with `dong`, `date`, `hour`, `timezone`,
    and `weekday`
  - valid backend `points` are rendered without local prediction fallback
- `/map` Playwright smoke:
  - desktop canvas rendered, no console errors
  - mobile canvas rendered, no console errors
  - canvas screenshots were nonblank and visually varied by pixel analysis
- `/map` rendering smoke after flicker pass:
  - HTTP 200 from the local dev server
  - headless browser canvas rendered at `1280 x 663`
  - no Three.js deprecated shadow-map warning after reverting to `PCFShadowMap`
- `/map` performance smoke after performance-first pass:
  - headless browser canvas rendered at `1216 x 629`
  - CSS viewport was `1280 x 663`
  - effective render pixel ratio was `0.95`
- `/map` polishing smoke:
  - HTTP 200 from the local dev server
  - headless browser canvas rendered at `1216 x 629`
  - no browser console errors were reported by the smoke script
- UX/UI & Realism validation:
  - `Pretendard` 폰트가 전역으로 올바르게 로드되어 적용됨
  - API 통신 시 지연 발생 및 차트 애니메이션 부드러운 전환 동작 확인
  - 툴바 그래픽 품질 변경 버튼 클릭 시 Three.js 그림자 맵 실시간 갱신 확인
- Benchmark Shortcut validation:
  - `Link` 컴포넌트 및 `Gauge` 아이콘이 정상 임포트되어 무오류 컴파일 통과
  - 버튼의 디자인 및 배치 레이아웃 무결성 확인
- Weather Reflection validation:
  - 흐림, 폭우, 폭설 날씨에서 지면에 하얗게 맺히던 불자연스러운 specular 반사광이 사라진 것 확인
  - 전체 광량이 어두워지지 않고 부드러운 환경광으로 균형 있게 표현됨 확인

## Notes

- The demand endpoint intentionally uses Web-standard APIs only, so it remains
  safe for serverless deployment targets without relying on Node-only runtime
  features.
- Existing user changes in `CODEX.md` were left untouched.

---

## 10. Ride Mode (택시 시점) 카메라 전환 버그 수정

### 문제

택시 시점(Ride Mode)에서 빠져나올 때 카메라가 관계없는 먼 좌표로 순간이동(snap)하거나, 이전 카메라 모드(`drive` / `overview` / `follow`)가 올바르게 복원되지 않는 현상이 있었습니다.

### 수정 내역

**`engine/simulator-engine.ts`**

- Ride Mode 진입 직전에 현재 카메라 모드를 `rideExitModeRef`에 저장하도록 수정.
- 모드 복원 시 저장된 값을 참조하여 퇴장 전 상태로 정확하게 돌아가게 함.

**`engine/engine-camera-controller.ts`**

- `lastRidePosition` / `lastRideHeading` 캐시 변수 도입.
- 택시가 목적지에 도착하거나 사용자가 수동으로 Ride Mode를 나갈 때, 마지막 위치·헤딩 기준으로 카메라 포커스를 정렬.
- 결과: 퇴장 시 카메라가 부드럽게 전환되며 스냅(순간이동) 현상이 제거됨.

### Verification

- Ride Mode 진입 → 주행 중 이탈: 이전 `drive` 시점으로 자연스럽게 복귀 확인
- Ride Mode 진입 → 택시 도착 자동 이탈: 카메라가 택시 최종 위치에 정렬된 채 전환 확인
- `overview` / `follow` 모드에서 진입 후 이탈: 각각 올바른 모드로 복귀 확인

---

## 11. MapSimulator 나침반 UI 중복 코드 리팩토링

### 문제

`MapSimulator.tsx`에서 나침반 다이얼 JSX가 Ride Mode용 `<div>`와 일반 모드용 `<button>` 두 곳에 **100% 동일한 내용**으로 반복되고 있었습니다. 방향 라벨 계산 로직(북/북동/동…)도 인라인 IIFE로 두 번 중복 작성돼 있어, 한쪽만 수정하면 불일치가 생기는 유지보수 위험이 있었습니다.

### 수정 내역

**`src/components/MapSimulator.tsx`**

- `compassDirectionLabel(angle: number): string` — 각도(도)를 한국어 방위명(북/북동/동/남동/남/남서/서/북서)으로 변환하는 순수 함수로 추출.
- `CompassDial({ angle }: { angle: number })` — 다이얼 원형 마크업 + 바늘 + 각도 라벨을 담은 Fragment 컴포넌트로 분리.
- Ride Mode `<div>` 내부와 일반 모드 `<button>` 내부 모두 `<CompassDial angle={compassAngle} />` 한 줄로 교체.

### 결과

- 중복 JSX 약 70줄 제거 (21.9 KB → 19.4 KB)
- 비주얼 동작·스타일은 변경 없음
