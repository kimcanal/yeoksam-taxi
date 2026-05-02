# Module 1: Digital Twin Simulation

The active simulation implementation lives in the Next.js app under `src/`.
This module folder exists to match the capstone specification and explain how
the presentation viewer maps to Module 1.

## Implementation Pointers

- App entry: `src/app/page.tsx`
- Dashboard shell: `src/components/MapSimulator.tsx`
- Three.js runtime: `src/components/map-simulator/MapSimulatorSceneRuntime.tsx`
- OSM asset loader: `src/components/map-simulator/load-simulation-data.ts`
- Local simulation source: `src/components/map-simulator/local-simulation-source.ts`

## What It Covers

- 9-dong Gangnam Station micro-area spatial layer.
- OSM-derived roads, buildings, transit landmarks, traffic signals, and a road
  graph.
- Taxi and general vehicle motion on road-level geometry.
- Passenger/caller markers and pickup/dropoff events.
- Weather/time controls plus demand heatmap and dispatch decision context.

## Spec Mapping

The assignment asks for a minimum 3x3 block simulation with passengers, taxis,
general vehicles, one autonomous vehicle, and obstacles. This project uses a
larger OSM-derived 9-dong scene for presentation, while treating the simplified
3x3 baseline as the compact evaluation layer described in `README.md`.

For grading or presentation, describe this module as:

> a Module 1 spatial companion that makes the Gangnam Station dispatch scenario
> visible on real OSM road geometry.
