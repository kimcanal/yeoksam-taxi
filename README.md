# yeoksam-taxi

`yeoksam-taxi` is a Next.js and Three.js 3D map prototype focused on taxi movement around Yeoksam, Seoul.

It uses OpenStreetMap road and building data fetched through Overpass, converts that data into GeoJSON, and renders the scene directly with Three.js.

This project does not use Google Maps Platform for map rendering. The only Google-related import in the app is `next/font/google`, which is used for fonts.

## Stack

- `Next.js` for the app shell
- `Three.js` for 3D rendering
- `OpenStreetMap + Overpass API` for roads and buildings
- `osmtogeojson` for converting OSM data into GeoJSON

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run fetch:buildings
npm run fetch:roads
npm run fetch:map
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data

The simulator uses:

- `public/buildings.geojson`
- `public/roads.geojson`

These files can be regenerated from OpenStreetMap with:

```bash
npm run fetch:map
```

## Notes

- The current map data is based on a bounded area around Yeoksam, not full administrative dong polygons yet.
- Taxi demand, signals, pedestrians, and vehicles are simulated inside the app on top of OSM-derived geometry.
