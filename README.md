# yeoksam-taxi: 3D Mobility Digital Twin

`yeoksam-taxi` is a modern, map-first **Mobility Digital Twin** for the Gangnam/Yeoksam area, built with Next.js and Three.js.

This project was originally born out of a capstone specification for taxi-demand modeling and digital-twin visualization. However, the backend ML, data processing, and dispatch logic have been decoupled. This repository focuses entirely on the **Frontend 3D Visualization and API Integration**: rendering the map, requesting aggregated demand data, and displaying the backend response without calculating predictions locally.

## 🚀 Key Features

- **3D Urban Environment**: Real-world OpenStreetMap (OSM) geometry of Gangnam/Yeoksam rendered in rich 3D with realistic roads, buildings, and horizontally-aligned Korean traffic signals.
- **Backend Demand Visualization**: Dong-level taxi demand curves and minimap highlights rendered only from backend API responses.
- **API-Driven Architecture**: The frontend is completely decoupled from model training, feature generation, and dispatch decisions.
- **Professional UX/UI**: Clean, modern overlays and natural Korean standard terminology for an intuitive user experience reminiscent of professional mapping services.

## 📂 Project Structure

- `src/`: The Next.js application, React components, and Three.js (`MapSimulatorSceneRuntime.tsx`) scene rendering.
- `public/`: Pre-processed OSM geometry, GeoJSON layers, and static assets for the map runtime.
- `scripts/osm/`: Utilities to regenerate local OSM-derived geometry.
- `src/components/map-simulator/config/`: Small runtime configuration files and targeted POI mappings.

*(Note: Documentation of past ML experiments, archive collectors, and backend algorithms have been removed from this repository to maintain focus on the frontend digital twin product.)*

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🔮 Backend Demand API Handoff

Model training, feature generation, batch inference, and dispatch policy live
outside this frontend repository. The map calls a backend demand endpoint through
`NEXT_PUBLIC_DEMAND_API_ENDPOINT`. When that endpoint is not configured or fails,
the UI shows an API-required state instead of generating fallback predictions.

See `docs/demand-api-contract.md` for the request and response shape.

## 🗺 Map Asset Refresh

The application reads pre-processed OSM snapshot files to ensure high-performance rendering without streaming full live city models at runtime.
To regenerate the base map layers from OSM:

```bash
npm run asset:update
```

This will refresh multiple layers in `public/` including `buildings.geojson`, `roads.geojson`, and `traffic-signals.geojson`.
