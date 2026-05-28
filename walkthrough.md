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

## Notes

- The demand endpoint intentionally uses Web-standard APIs only, so it remains
  safe for serverless deployment targets without relying on Node-only runtime
  features.
- Existing user changes in `CODEX.md` were left untouched.
