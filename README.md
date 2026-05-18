# yeoksam-taxi: 3D Mobility Digital Twin

`yeoksam-taxi` is a modern, map-first **Mobility Digital Twin** for the Gangnam/Yeoksam area, built with Next.js and Three.js.

This project was originally born out of a capstone specification for taxi-demand modeling and digital-twin visualization. However, to maximize its value as a presentation-ready product, the heavy backend ML and data processing pipelines have been decoupled. This repository focuses entirely on the **Frontend 3D Visualization and API Integration**—transforming aggregated demand data into a clear, interactive 3D digital twin.

## 🚀 Key Features

- **3D Urban Environment**: Real-world OpenStreetMap (OSM) geometry of Gangnam/Yeoksam rendered in rich 3D with realistic roads, buildings, and horizontally-aligned Korean traffic signals.
- **Dynamic Demand Visualization**: Real-time visualization of POI (Points of Interest) pressure, taxi hotspots, and demand heatmaps overlaying the 3D map.
- **API-Driven Architecture**: The frontend is completely decoupled from model training, acting as a lightweight client that pulls aggregated data via API for fluid rendering.
- **Professional UX/UI**: Clean, modern overlays and natural Korean standard terminology for an intuitive user experience reminiscent of professional mapping services.

## 📂 Project Structure

- `src/`: The Next.js application, React components, and Three.js (`MapSimulatorSceneRuntime.tsx`) scene rendering.
- `public/`: Pre-processed OSM geometry, GeoJSON layers, and static assets for the map runtime.
- `scripts/osm/`: Utilities to regenerate local OSM-derived geometry.
- `data/config/`: Configuration files and targeted POI mappings.

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

Model training and batch inference live outside this frontend repository. The map
can call a backend demand endpoint through `NEXT_PUBLIC_DEMAND_API_ENDPOINT`.
When that endpoint is not configured or fails, the UI falls back to small bundled
mock demand curves so the frontend remains demoable on its own.

See `docs/demand-api-contract.md` for the request and response shape.

## 🗺 Map Asset Refresh

The application reads pre-processed OSM snapshot files to ensure high-performance rendering without streaming full live city models at runtime.
To regenerate the base map layers from OSM:

```bash
npm run asset:update
```

This will refresh multiple layers in `public/` including `buildings.geojson`, `roads.geojson`, and `traffic-signals.geojson`.
