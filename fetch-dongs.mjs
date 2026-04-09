import fs from "fs";
import osmtogeojson from "osmtogeojson";
import {
  TARGET_DONGS,
  TARGET_DONG_SET,
  fetchOverpassJson,
  keepCachedGeoJson,
  roundCoord,
} from "./map-region.mjs";

const dongPattern = TARGET_DONGS.join("|");

const query = `
[out:json][timeout:40];
area["name"="강남구"]["boundary"="administrative"]["admin_level"="6"]->.gangnam;
(
  relation(area.gangnam)["boundary"="administrative"]["admin_level"="8"]["name"~"^(${dongPattern})$"];
);
out body;
>;
out skel qt;
`;

function roundGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) =>
        ring.map(([lon, lat]) => [roundCoord(lon), roundCoord(lat)]),
      ),
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) =>
          ring.map(([lon, lat]) => [roundCoord(lon), roundCoord(lat)]),
        ),
      ),
    };
  }

  return geometry;
}

console.log("Fetching Gangnam core dong boundaries...");

try {
  const outputPath = "public/dongs.geojson";
  const osmJson = await fetchOverpassJson(query, { label: "dong boundaries" });
  const geojson = osmtogeojson(osmJson);
  const deduped = new Map();

  geojson.features
    .filter((feature) =>
      feature.geometry?.type === "Polygon" ||
      feature.geometry?.type === "MultiPolygon",
    )
    .filter((feature) => TARGET_DONG_SET.has(feature.properties?.name))
    .forEach((feature) => {
      const name = feature.properties?.name;
      if (!name || deduped.has(name)) {
        return;
      }

      deduped.set(name, {
        type: "Feature",
        id: feature.id,
        properties: {
          name,
          nameEn: feature.properties?.["name:en"] ?? null,
        },
        geometry: roundGeometry(feature.geometry),
      });
    });

  const features = TARGET_DONGS.map((name) => deduped.get(name)).filter(Boolean);

  if (features.length !== TARGET_DONGS.length) {
    const missing = TARGET_DONGS.filter((name) => !deduped.has(name));
    throw new Error(`Missing dong boundaries: ${missing.join(", ")}`);
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify({
      type: "FeatureCollection",
      features,
    }),
  );

  console.log(`Saved ${features.length} dongs to ${outputPath}`);
} catch (error) {
  if (!keepCachedGeoJson("public/dongs.geojson", "dong boundaries", error)) {
    console.error("Unable to fetch dong boundaries from Overpass mirrors.", error);
    process.exitCode = 1;
  }
}
