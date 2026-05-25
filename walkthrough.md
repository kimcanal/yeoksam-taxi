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

## 2. Local Mock Demand API

- Added `src/app/api/demand/route.ts`.
- The route returns the contract shape from `docs/demand-api-contract.md`:
  - top-level `dong`, `date`, `hour`, `timezone`, `generated`
  - `selected` weather and traffic context
  - exactly 24 hourly `points`
- Demand curves are deterministic by `dong + date + weekday`, with smooth
  commute, lunch, evening, and late-night peaks.
- `use-demand-forecast.ts` now falls back to `/api/demand` when
  `NEXT_PUBLIC_DEMAND_API_ENDPOINT` is missing, so local first-run mode behaves
  like an AI-linked demand feed.

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
- Removed the now-unused `dongDemandScoresRef` runtime prop after broad demand
  heatmap floor overlays were removed.

## Verification

- `npx tsc --noEmit`: passed
- `npm run lint`: passed with no warnings
- `npm run build`: passed
- `/api/demand` smoke:
  - `dong`: `Yeoksam 1-dong`
  - `hour`: `14`
  - `selected.demand_count`: deterministic value returned
  - `points.length`: `24`
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

## Notes

- The demand endpoint intentionally uses Web-standard APIs only, so it remains
  safe for serverless deployment targets without relying on Node-only runtime
  features.
- Existing user changes in `CODEX.md` were left untouched.
