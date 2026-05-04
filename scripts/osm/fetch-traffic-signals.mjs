import fs from "fs";
import osmtogeojson from "osmtogeojson";
import {
  fetchOverpassJson,
  geometryTouchesDongs,
  keepCachedGeoJson,
  loadTargetRegion,
  roundCoord,
} from "./map-region.mjs";

const { dongs, queryBounds: BOUNDS } = loadTargetRegion();

const query = `
[out:json][timeout:60];
(
  node["highway"="traffic_signals"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
);
out body;
`;

function normalizeName(value) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function roundedPoint([lon, lat]) {
  return [roundCoord(lon), roundCoord(lat)];
}

console.log("Fetching traffic signals for the 9 selected Gangnam dongs...");

try {
  const outputPath = "public/traffic-signals.geojson";
  const osmJson = await fetchOverpassJson(query, { label: "traffic signals" });
  const geojson = osmtogeojson(osmJson);
  const seen = new Set();

  const features = geojson.features
    .filter((feature) => feature.geometry?.type === "Point")
    .filter((feature) => geometryTouchesDongs(feature.geometry, dongs.features))
    .map((feature) => {
      const point = roundedPoint(feature.geometry.coordinates);
      const properties = feature.properties ?? {};
      const signalType = normalizeName(
        properties.traffic_signals ?? properties.signal_type,
      );
      const direction = normalizeName(
        properties["traffic_signals:direction"] ?? properties.direction,
      );
      const crossing = normalizeName(
        properties.crossing ??
          (properties["crossing:signals"] === "yes" ? "traffic_signals" : null),
      );
      const turns = normalizeName(
        properties["turn:lanes"] ??
          properties.turn_lanes ??
          properties["turn:lanes:forward"] ??
          properties["turn:lanes:backward"],
      );
      const dedupeKey = [
        point.join(","),
        signalType,
        direction,
        crossing,
        turns,
      ].join("|");

      if (seen.has(dedupeKey)) {
        return null;
      }
      seen.add(dedupeKey);

      return {
        type: "Feature",
        id: feature.id,
        properties: {
          name: normalizeName(properties.name) || null,
          signalType: signalType || null,
          direction: direction || null,
          crossing: crossing || null,
          buttonOperated: properties.button_operated === "yes",
          turns: turns || null,
        },
        geometry: {
          type: "Point",
          coordinates: point,
        },
      };
    })
    .filter(Boolean);

  fs.writeFileSync(
    outputPath,
    JSON.stringify({
      type: "FeatureCollection",
      features,
    }),
  );

  console.log(`Saved ${features.length} traffic signals to ${outputPath}`);
} catch (error) {
  if (
    !keepCachedGeoJson(
      "public/traffic-signals.geojson",
      "traffic signals",
      error,
    )
  ) {
    console.error(
      "Unable to fetch traffic signals from Overpass mirrors.",
      error,
    );
    process.exitCode = 1;
  }
}
