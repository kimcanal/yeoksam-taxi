# Data Sources Summary

This repository keeps only lightweight runtime-facing data.

## Runtime Inputs Still Committed

- `data/config/gangnam-pois.json`
  - POI codes used by the realtime citydata route
- `data/samples/supply-proxy.json`
  - small demo supply input for the optional dispatch-plan script
- `public/*.geojson`, `public/*.json`
  - checked-in map geometry and presentation-safe snapshot artifacts

## Source Families Behind Those Artifacts

- OpenStreetMap / Overpass
  - dong boundaries, roads, buildings, transit, signals, non-road polygons
- Seoul citydata
  - POI-level public snapshots used for live context
- Seoul taxi stand open data
  - converted and committed as `public/taxi-stands.geojson`
- small forecast / dispatch / observability snapshots
  - committed as runtime-facing JSON under `public/`

## Off-Repo By Policy

- historical transit OD archives
- living-population archives
- TOPIS training tables
- weather training tables
- model joblib bundles
- notebook outputs and research scratch files

If those need to be preserved, keep them in shared storage or a separate
data repository rather than in this deployable map repo.
