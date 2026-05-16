# yeoksam-taxi

`yeoksam-taxi` is a map-first Next.js + Three.js Gangnam taxi operations demo.

This repository is now intentionally slimmed down for the deployable map app:

- the runnable app in `src/`
- checked-in map assets in `public/`
- small runtime config in `data/config/` and `data/samples/`
- OSM refresh scripts in `scripts/osm/`

Large training tables, archive collectors, retraining scripts, and notebook
work have been removed from this repo so the remote stays focused on the map
product rather than the experimentation pipeline.

## What Stays In Repo

- `src/`: Next.js app, map UI, realtime API routes, and Three.js scene
- `public/`: OSM geometry, forecast snapshots, observability JSON, taxi stands
- `scripts/osm/`: regenerate local OSM-derived geometry
- `module4_dispatch/`: optional local dispatch-plan generator for the demo
- `data/config/`: small committed config such as Gangnam POI targets
- `data/samples/`: tiny demo inputs used by the dispatch script

## What Stays Out Of Repo

- raw archive downloads
- processed training tables
- model joblib artifacts
- live-validation logs
- notebooks, papers, and scratch experiment folders

Those should live in shared storage or local ignored directories, not in the
deployable map repository.

## Local Development

```bash
npm install
npm run launch
```

You can also run the app directly:

```bash
npm run dev
npm run build
npm run start
```

`npm run launch` binds to `0.0.0.0` by default and prints both local and LAN
URLs, which is useful on VDI or remote desktop environments.

## Map Asset Refresh

The map reads committed local snapshots instead of streaming a full live city
model at runtime.

To regenerate the OSM-based map layers:

```bash
npm run asset:update
```

That refreshes:

- `public/dongs.geojson`
- `public/buildings.geojson`
- `public/non-road.geojson`
- `public/roads.geojson`
- `public/road-network.json`
- `public/traffic-signals.geojson`
- `public/transit.geojson`

## Runtime Data Policy

The site keeps small public JSON snapshots checked in because some upstream
data sources are not reliable enough to rebuild from GitHub Actions alone.

The app can still call live endpoints at runtime where appropriate, but the
remote repository itself only keeps the small artifacts required to render the
map and its current side panels.

## Available Scripts

```bash
npm run launch
npm run dev
npm run build
npm run start
npm run lint
npm run asset:update
npm run fetch:map
npm run dispatch:plan
```

## Deploy / Verify

- `npm run lint`
- `npm run build`
- `npm run preview`
- `npm run deploy`

## Notes

- The main map lives at `/` and `/map`.
- Supporting operator/report pages still read committed JSON from `public/`.
- `public/taxi-stands.geojson` is part of the runtime scene now and should stay
  committed.
