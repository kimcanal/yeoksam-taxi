# Changelog

## 2026-04-11

### Changed
- Updated the derived road graph export so each directed segment now stores a precomputed `travelCost`, and each node now stores `outDegree`, `neighborCount`, `isIntersection`, and `isTerminal` metadata for routing-aware decisions.
- Reused the precomputed segment `travelCost` during shortest-path searches so road-cost weighting no longer needs to be recomputed on every graph edge expansion.
- Updated taxi pickup/dropoff hotspot generation to score candidate route nodes against graph topology, signal placement, turn shape, and local spacing instead of choosing only by route-distance proximity.
- Updated taxi pickup/dropoff positioning to use a shared curbside offset model, so hotspot markers, caller placement, and the taxi's final approach all bias toward the road edge instead of staying near the lane center.
- Reduced per-frame vehicle simulation cost by reusing the current motion sample for the first simulation pass instead of resampling every vehicle route twice before and after movement.
- Reduced per-frame hotspot update work by caching hotspot material and DOM references, initializing idle visuals once, and skipping most animation writes while a hotspot stays inactive.
- Replaced repeated square-root signal proximity checks with squared-distance comparisons inside the vehicle simulation loop.
- Rebalanced sky and weather rendering to keep the background calmer, make the sun/moon/stars/sunset read more clearly, and preserve visible cloud forms instead of washing the whole sky toward white.
- Stopped scene fog from washing out the sky's celestial objects and cloud forms, so the sun, moon, stars, and clouds remain visible as actual sky elements instead of fading into the background color.
- Moved vehicle simulation to a fixed 30Hz step with interpolated render transforms, so higher render FPS no longer forces the most expensive traffic logic to run every frame.
- Extended the performance overlay with sampled simulation time, render time, fixed-step simulation Hz, and active vehicle count so runtime cost can be validated in-app.
- Switched the launcher back to binding Next.js on `0.0.0.0` by default while still printing a detected external URL, so localhost stays usable on the VDI itself and outside access can keep using the exposed port.
- Reworked signal timing to use corridor-priority phase plans with lead protected-left windows, longer major-axis greens, explicit yellow/all-red clearance, and a shared 24-second coordinated cycle.
- Refined intersection blocking logic so vehicles now react to actual box occupancy, same-direction downstream queue spillback, and unprotected-left gap acceptance instead of relying on a single coarse per-axis stop rule.
- Reframed the viewer as an `A-Eye Module 1` spatial companion, clarifying in the UI and README that the 9-dong OSM scene is the micro-area digital-twin layer around Gangnam Station rather than a competing full-city baseline.
- Added sidebar `Local Scenario` presets that bundle time, weather, taxi density, traffic density, and a nearby subway-hub focus into quick presentation-friendly scene states.
- Added a lightweight `Local Check` panel with scene-internal proxy metrics such as waiting share, trip close share, street load, and flow-state labels for simple local validation without external feeds.
- Renamed the local scenario presets to more presentation-friendly Korean labels and added stable automation hooks for repeatable capture.
- Added a Playwright-based `screenshot:scenarios` workflow that builds the app, applies each local scenario, and saves deterministic PNG captures under `docs/screenshots/local-scenarios/`.
- Fixed hydration mismatch noise by replacing time-dependent server render initialization with a hydration-safe initial simulation clock that syncs to live KST immediately after mount.
- Replaced the default Next.js app metadata with project-specific title/description metadata and switched the document language to Korean.
- Added a scenario brief card that updates with the selected local preset so presentation narration now changes together with the scene state.

### Documented
- Added a dispatch road-network review that explains what the current OSM-derived routing graph already supports, where it is useful for prototype dispatch, and which dispatch-grade road constraints are still missing.
- Added an `A-Eye` alignment note that explains why the viewer uses 9 real dongs, how that complements the active 3x3 SUMO baseline, and why OSM is the right geometry backbone for this scope.
- Documented the new local-only scenario/preset workflow so this viewer stays easy to demonstrate before external data overlays are introduced.
- Documented the local scenario screenshot capture commands and generated output naming.
- Replaced the outdated branch-specific screenshot section in the README with the current automated local scenario gallery.
- Tightened the README introduction so the current scope, intended use, and non-goals are visible at the top.

## 2026-04-10

### Changed
- Replaced the FPS overlay checkbox with explicit `Auto`, `60 FPS`, and `Unlimited` target modes.
- Updated `Auto` target logic to snap to common refresh-rate bands, use full refresh below 100Hz, and use half-refresh on 100Hz+ displays such as 72 FPS on 144Hz.
- Updated the FPS overlay to show both the selected mode and the active target value.
- Replaced the env-mapped Next port wrapper with a bash launcher that explains the main `npm run` options, prefers a detected private IP for binding, falls back to a public IP when needed, and lets you choose default `3000` or a custom port such as `8000`.
- Added an `asset:update` wrapper and pointed launcher option `5` at it so OSM asset refresh now has clearer progress output, a stable alias, and an explicit road-graph regeneration step.
- Added sidebar simulation-density sliders for taxis and general traffic so demo load can be tuned without editing constants in code.
- Deferred density-driven scene rebuilds so dragging the new sliders does not thrash the whole scene on every intermediate value.
- Switched density application to rebuild only the vehicle layer so changing taxi or traffic counts no longer tears down the full scene.
- Stopped rebuilding the full Three.js scene when label or transit visibility changes by toggling existing objects in place.
- Reduced hover, stats, and FPS overlay churn so pointer movement and frame sampling avoid redundant DOM and React state updates.
- Reduced per-frame camera and ride-view allocations by reusing scratch vectors instead of cloning route samples and positions inside the hot render loop.
- Reduced per-frame signal and hotspot overhead by reusing cached signal states, skipping unchanged lamp material updates, throttling hotspot activity scans, and avoiding cloud animation work when those layers are hidden.
- Reduced per-frame traffic simulation churn by reusing vehicle frame caches, next-stop state objects, intersection demand maps, and proximity buckets instead of rebuilding them every animation tick.
- Reduced hotspot animation churn by caching marker modes and accent colors so unchanged badge styles and material colors are not rewritten every frame.
- Reduced hover interaction overhead by reusing raycast hit arrays and preparing one pointer ray per hover pass instead of rebuilding raycast state for each target category.
- Reduced per-vehicle transform cost by caching motion yaw during route sampling and reusing it for transform sync and follow-camera heading.
- Reduced weather and hotspot scan overhead by caching precipitation position buffers and replacing callback-based hotspot activity scans with straight loops.
- Reduced scene-build allocations in nearest-road lookups by replacing clone-heavy segment projection math with shared scratch vectors.
- Added mode-aware precipitation LOD so overview, hidden-tab, and lower-priority camera states draw fewer weather particles while keeping close-up ride and follow views denser.
- Added mode-aware label culling so district, building, transit, and road labels now respect distance and per-mode visibility budgets instead of all optional labels rendering at once.
- Reduced precipitation update cost further by advancing only the currently drawn rain and snow particles instead of updating hidden particles outside the active draw range.
- Reduced route sampling cost by precomputing per-segment lengths and headings on each route template so vehicle motion updates no longer recompute segment geometry every sample.
- Throttled hover raycast refreshes to a UI-friendly cadence so pointer-driven hover hints no longer consume full frame-rate work while the camera or mouse is moving.
- Replaced all-vehicle proximity scans with nearby-cell bucketing so follow-distance checks scale better as taxi and traffic density increases.
- Reworked signal phase offsets to follow corridor-aligned coordination bands so nearby intersections no longer feel randomly out of sync.
- Added opposing-approach turn demand checks so unprotected left turns yield to oncoming straight and right-turn traffic instead of cutting across active flow.
- Added basic intersection box blocking so vehicles hold before a green signal when the same-axis exit is still clogged just beyond the junction.
- Added a separate `public/non-road.geojson` asset and map layer so OSM non-road polygons such as parks, plazas, parking, water, and facility grounds are distinct from drivable roads.
- Split the routing graph into a separate `public/road-network.json` asset so shortest-path work no longer has to rebuild the graph from road GeoJSON at runtime.
- Added a toggleable road-network overlay that exposes the routing graph as visible nodes and edges on top of the map.
- Switched signal placement to OSM `traffic_signals` node data so visible signal objects are anchored to real map intersections instead of placeholder-only guesses.
- Updated the road graph to preserve OSM one-way flow, link-road classes, and node-based turn restrictions for more realistic routing behavior.
- Reduced per-frame simulation overhead by caching each vehicle's current route segment and next stop lookup instead of re-scanning full routes every frame.
- Clarified in project docs that district boundary rendering is currently disabled while a cleaner approach is being explored.
- Added a click-to-enter `Taxi View` camera mode and `Esc` shortcut to exit back to the previous view.
- Updated taxi roof signs to show red when the taxi is empty and green after pickup.
- Made active pickup and dropoff hotspots more readable with separate `승차` and `하차` emphasis.
- Added sidebar `Subway Hubs` shortcuts that move the drive camera to major stations and automatically reveal subway entrance structures.
- Added hover name hints for subway entrance structures so station names are visible without enabling full labels.
- Adjusted service-stop taxi positioning so pickup/dropoff pauses pull slightly toward the curb instead of blocking the lane center.
- Refreshed branch comparison docs from the old `extended-map` label to the current `added-taxi-call` branch.

### Documented
- Added roadmap notes for signal logic, deadlock handling, taxi-density controls, and future hourly CSV-based data integration.
- Added an `added-taxi-call` review document and an updated screenshot checklist for comparing the branch against `main`.
- Added a README section that explains the OSM -> Overpass -> GeoJSON -> Three.js pipeline and clarifies that the viewer uses a local snapshot, not live map streaming.

### Fixed
- Increased taxi clickability with a larger invisible hit target so `Taxi View` can be entered by clicking the taxi body area, not only the roof sign.
- Reduced exaggerated building massing for concave or courtyard-like OSM footprints by compacting low-fill simplified boxes.

## 2026-04-09

### Added
- Expanded the map scope from central Yeoksam to 9 Gangnam core dongs:
  `역삼1동`, `역삼2동`, `논현1동`, `논현2동`, `삼성1동`, `삼성2동`, `신사동`, `청담동`, `대치4동`.
- Switched the viewer to an OSM + Overpass + GeoJSON + Three.js pipeline.
- Added taxi, traffic, pedestrian, and signal-driven city simulation on top of the 3D map.
- Added time-of-day and weather presets with background-driven lighting.
- Added optional transit landmarks for bus stops and subway structures.
- Added camera modes for `Overview`, `Drive`, and `Follow Taxi`.
- Added FPS overlay toggled with `F`.

### Changed
- Simplified rendering for better laptop performance:
  lower render pixel ratio, disabled dynamic shadows, reduced traffic/taxi counts,
  and reduced weather particle density.
- Adjusted overview camera behavior to keep the city centered and easier to read.
- Kept roads, vehicles, and buildings visually stable across different time presets.
- Improved data-source visibility in the UI, including source metadata and asset timestamps.

### Fixed
- Fixed FPS cap behavior that could appear stuck below the target on high-refresh-rate displays.
- Fixed runtime issues around render budget updates and hidden-tab handling.
- Fixed duplicated or misleading administrative boundary segments by filtering down to only shared boundaries.

### Deferred / TODO
- Administrative district boundary rendering is temporarily disabled.
- Revisit dong boundary visualization later with a more reliable approach:
  likely a road/ground-aligned overlay instead of translucent wall geometry.
- Re-evaluate MacBook-specific performance after district overlays are redesigned.
- Add a taxi-count slider so demo density can be tuned without code changes.
- Rework signal visuals so intersections look less placeholder-like.
- Replace the current placeholder signal cycle with real intersection signal logic.
- Resolve intersection deadlock cases when multiple vehicles block each other.
- Revisit routing rules with more realistic road constraints such as one-way flow and turn restrictions.
- Prepare a non-real-time hourly data pipeline for the 9 selected dongs:
  weather, taxi-demand, and traffic CSV inputs first.
- Define a merged time-series schema for later model work
  (for example CNN-LSTM training on hourly dong-level inputs).
- Keep real-time public-data integration deferred until the offline/hourly pipeline is stable.
