import fs from "fs";

import { loadTargetRegion } from "./map-region.mjs";
import { writeRoadNetworkAsset } from "./road-network.mjs";

const roadsPath = "public/roads.geojson";
const outputPath = "public/road-network.json";

if (!fs.existsSync(roadsPath)) {
  throw new Error(`Missing ${roadsPath}. Run "npm run fetch:roads" before generating the road graph.`);
}

const roads = JSON.parse(fs.readFileSync(roadsPath, "utf8"));
const { center } = loadTargetRegion();
const asset = writeRoadNetworkAsset(outputPath, roads, center);

console.log(
  `Saved road graph with ${asset.stats.nodeCount} nodes and ${asset.stats.segmentCount} segments to ${outputPath}`,
);
