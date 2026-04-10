# Performance Review - 2026-04-11

## Scope

Static review of the current `MapSimulator` runtime with emphasis on:

- Per-frame animation work
- Pointer-move and hover interaction work
- Scene-build paths that are expensive enough to affect perceived startup time

## Highest-Impact Findings

1. `updateVehicles` was rebuilding temporary simulation containers every frame.
Status: fixed.
Notes: vehicle frame samples, next-stop state objects, proximity buckets, and intersection-demand maps are now reused.

2. Signal and hotspot visuals were performing repeated material and DOM writes even when their logical state had not changed.
Status: mostly fixed.
Notes: signal state reuse, unchanged lamp write skipping, hotspot activity throttling, and hotspot mode/color caching are now in place.

3. Hover handling was redoing `raycaster.setFromCamera()` and allocating fresh intersection arrays across taxi, transit, and boundary checks.
Status: fixed.
Notes: hover now prepares one ray per update pass and reuses hit arrays for taxi, transit, and boundary intersections.

4. Vehicle orientation used repeated `atan2()` calls while syncing transforms and camera follow state.
Status: fixed.
Notes: yaw is now cached on the motion state and reused by transform sync and follow cameras.

5. `nearestRoadContext` and `nearbyRoadSegments` were clone-heavy in scene setup and transit/signal placement.
Status: fixed.
Notes: segment projection math now reuses scratch vectors instead of allocating throwaway vectors per segment test.

## Still Worth Watching

1. Heavy rain and snow still update every precipitation particle every visible frame.
Impact: medium in weather-heavy scenes.

2. Hover raycasts still scale with the number of taxi click targets and transit hover targets.
Impact: medium when scene density grows further.

3. CSS2D labels remain a likely source of UI-thread cost if the visible label count increases a lot.
Impact: medium, especially while panning or zooming.

4. Vehicle movement still does full per-vehicle route sampling each simulation tick.
Impact: medium, but correctness-sensitive, so any deeper rewrite should be measured carefully.

## Result

The highest-probability wins that do not meaningfully increase behavioral risk have been applied first. The remaining items are real, but they are either more data-dependent or touch behavior-sensitive code paths that should be optimized with extra care.
