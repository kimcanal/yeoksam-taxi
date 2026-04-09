# yeoksam-taxi

`yeoksam-taxi` is a Next.js and Three.js taxi simulation built on top of OpenStreetMap data around Yeoksam, Seoul.

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
