# Changelog

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
