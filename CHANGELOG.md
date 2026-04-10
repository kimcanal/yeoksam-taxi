# Changelog

## 2026-04-10

### Changed
- Replaced the FPS overlay checkbox with explicit `Auto`, `60 FPS`, and `Unlimited` target modes.
- Updated `Auto` target logic so 60Hz-like displays stay at 60 FPS, while 100Hz+ displays can use a half-refresh target.
- Simplified the FPS overlay text to show `Target FPS` directly.
- Clarified in project docs that district boundary rendering is currently disabled while a cleaner approach is being explored.
- Added a click-to-enter `Taxi View` camera mode and `Esc` shortcut to exit back to the previous view.
- Updated taxi roof signs to show red when the taxi is empty and green after pickup.
- Made active pickup and dropoff hotspots more readable with separate `승차` and `하차` emphasis.
- Refreshed branch comparison docs from the old `extended-map` label to the current `added-taxi-call` branch.

### Documented
- Added roadmap notes for signal logic, deadlock handling, taxi-density controls, and future hourly CSV-based data integration.
- Added an `added-taxi-call` review document and an updated screenshot checklist for comparing the branch against `main`.
- Added a README section that explains the OSM -> Overpass -> GeoJSON -> Three.js pipeline and clarifies that the viewer uses a local snapshot, not live map streaming.

### Fixed
- Increased taxi clickability with a larger invisible hit target so `Taxi View` can be entered by clicking the taxi body area, not only the roof sign.

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
