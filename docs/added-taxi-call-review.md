# Added-Taxi-Call Review

This document tracks how `added-taxi-call` differs from `main`, what is already
working well enough for demos, and what still needs another pass before a merge.

## Branch Status

- Base branch: `main`
- Working branch: `added-taxi-call`
- Merge status: hold for one more visual QA pass
- Reason: the branch is feature-richer and demo-ready, but signal behavior,
  intersection flow, and screenshot/document polish should be checked before it
  replaces the simpler baseline.

## What Changed Compared to `main`

### Map and Data Scope

- Expanded the scene to 9 Gangnam core dongs:
  `역삼1동`, `역삼2동`, `논현1동`, `논현2동`, `삼성1동`, `삼성2동`, `신사동`, `청담동`, `대치4동`
- Uses OpenStreetMap + Overpass derived GeoJSON for roads, buildings,
  administrative areas, and transit landmarks
- Keeps district-boundary data loaded, but leaves boundary rendering disabled
  until a cleaner visual treatment is ready

### Simulation and UX

- Added time-of-day and weather presets with background-driven atmosphere
- Added bus-stop and subway landmark structures for orientation
- Added pickup and dropoff emphasis so taxi call points are easier to notice
- Added taxi roof signs:
  - red when empty
  - green after pickup
- Added click-to-enter `Taxi View`
- Added `Esc` exit from `Taxi View`
- Added target-FPS controls:
  - `Auto`
  - `60 FPS`
  - `Unlimited`

### Readability and Performance

- Reduced render cost for laptop demos by simplifying shadows and render load
- Kept roads and vehicles more readable by pushing most weather/time styling into
  the background rather than recoloring the map geometry itself
- Left dong-boundary visualization out for now because the translucent wall
  approach broke visual continuity and trust

## Latest Fixes On This Branch

- Taxi selection now uses a larger invisible click target so entering `Taxi View`
  works when clicking the taxi body area, not only the roof sign
- Taxi camera follow distance was adjusted to feel more like a chase camera than
  a bumper view
- Pickup and dropoff markers remain visible from both free-camera and taxi-view
  modes

## Known Gaps Before Merge

- Traffic lights are still visually placeholder-like
- Signal logic is still simplified and does not yet model per-approach
  intersection timing
- Vehicle deadlock can still happen at busy intersections
- Taxi density is still fixed in code rather than controlled by a slider
- Dong boundaries need a clearer ground or road-aligned overlay approach if they
  return later
- Real-world hourly weather, taxi-demand, and traffic inputs are still deferred
  to a later CSV-first pipeline

## Screenshot Set To Keep

Use these filenames when storing the comparison shots under `docs/screenshots/`.

- `main-baseline-overview.png`
  - `main` branch baseline overview
- `added-taxi-call-weather-overview.png`
  - current branch overview with weather/time UI visible
- `added-taxi-call-taxi-view.png`
  - current branch taxi-follow view showing pickup/dropoff readability

## Recommended Next Steps

1. Add the final screenshot files under `docs/screenshots/`
2. Re-check visual readability on both macOS and Windows
3. Improve signal logic before merging to `main`
4. Add CSV-based hourly weather, taxi-demand, and traffic inputs for the 9 dongs
