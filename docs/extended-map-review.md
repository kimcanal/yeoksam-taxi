# Extended-Map Review

This document tracks how `extended-map` differs from `main`, what still needs work,
and which screenshots should be captured before considering a merge.

## Branch Status

- Base branch: `main`
- Working branch: `extended-map`
- Merge status: keep separate for now
- Reason: the branch is demo-ready for iteration, but still contains experimental visual
  and simulation behavior that should be validated before becoming the default version.

## What Changed Compared to `main`

### Map Scope and Data

- Expanded from central Yeoksam to 9 Gangnam core dongs:
  `역삼1동`, `역삼2동`, `논현1동`, `논현2동`, `삼성1동`, `삼성2동`, `신사동`, `청담동`, `대치4동`
- Added OSM administrative-dong ingestion through Overpass
- Added transit data ingestion for bus stops and subway landmarks
- Improved GeoJSON fetch stability with retries and cached fallbacks

### Simulator and UX

- Added `Overview`, `Drive`, and `Follow Taxi` camera modes
- Added weather and time-of-day presets
- Added FPS overlay toggled with `F`
- Added target-FPS modes:
  - `Auto`
  - `60 FPS`
  - `Unlimited`
- Added source and asset metadata visibility in the UI

### Performance and Readability

- Reduced render burden for laptops:
  lower pixel ratio, no dynamic shadows, lower vehicle counts, lighter precipitation
- Simplified district presentation because the previous boundary rendering was visually unreliable
- District boundary rendering is currently disabled

## Known Gaps Before `main`

- Signal visuals are still placeholder-like in some intersections
- Signal logic is still simplified and does not yet reflect realistic per-intersection timing
- Deadlock can still happen at congested intersections
- District visualization needs a cleaner ground-aligned treatment
- Taxi-demand inputs are still simulated rather than driven by hourly external data

## Screenshot Checklist

Store screenshots under `docs/screenshots/` with matching names from both branches.

### Main Branch

- `docs/screenshots/main-overview-clear-1200.png`
- `docs/screenshots/main-drive-clear-1200.png`
- `docs/screenshots/main-follow-clear-1200.png`

### Extended-Map Branch

- `docs/screenshots/extended-overview-clear-1200.png`
- `docs/screenshots/extended-drive-clear-1200.png`
- `docs/screenshots/extended-follow-clear-1200.png`
- `docs/screenshots/extended-overview-heavy-rain-2300.png`
- `docs/screenshots/extended-drive-heavy-snow-0600.png`

### Capture Rules

- Use the same browser window size when comparing `main` and `extended-map`
- Keep the same camera angle as much as possible for overview comparisons
- Prefer `12:00 / clear` for the direct branch-to-branch comparison baseline
- Use weather/time screenshots only to show new features, not to compare readability against `main`
- Turn on the FPS overlay for at least one screenshot from `extended-map`

## Recommended Next Steps

1. Capture the screenshot set from both branches
2. Verify readability on Windows and MacBook using the same baseline view
3. Revisit signal logic and deadlock handling
4. Add hourly CSV-based weather, taxi-demand, and traffic inputs
5. Decide on a cleaner district-overlay design before merging into `main`
