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

1. Heavy rain and snow still update every visible precipitation particle every visible frame, even though draw counts now scale down by camera mode and hidden-tab state.
Impact: low-to-medium in weather-heavy scenes.

2. Hover raycasts still scale with the number of taxi click targets and transit hover targets.
Impact: medium when scene density grows further.

3. CSS2D labels are now distance- and budget-limited, but they remain a likely source of UI-thread cost if the visible label count grows beyond the current curated set.
Impact: low-to-medium, especially while panning or zooming.

4. Vehicle movement still does full per-vehicle route sampling each simulation tick.
Impact: reduced from medium to low-to-medium.
Notes: the first vehicle simulation pass now reuses the previously computed motion state instead of resampling route geometry again before movement. Vehicles still resample after movement, which is the correctness-sensitive part.

5. Inactive hotspot visuals were still rewriting scale, opacity, emissive, and badge animation values every frame.
Impact: fixed.
Notes: hotspot visuals now cache material and badge-element references, initialize idle state once, and skip most animation writes while remaining idle.

## Result

The highest-probability wins that do not meaningfully increase behavioral risk have been applied first. The remaining items are real, but they are either more data-dependent or touch behavior-sensitive code paths that should be optimized with extra care.
