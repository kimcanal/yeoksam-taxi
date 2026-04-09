import fs from "fs";
import osmtogeojson from "osmtogeojson";
import {
  OVERPASS_URLS,
  TARGET_DONGS,
  TARGET_DONG_SET,
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

async function fetchOverpassJson() {
  let lastError;

  for (const url of OVERPASS_URLS) {
    try {
      console.log(`Trying ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "yeoksam-taxi/0.1",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      const raw = await response.text();

      if (!response.ok) {
        throw new Error(`${response.status} ${raw.slice(0, 200)}`);
      }

      return JSON.parse(raw);
    } catch (error) {
      lastError = error;
      console.error(`Failed on ${url}`, error);
    }
  }

  throw lastError;
}

console.log("Fetching Gangnam core dong boundaries...");

try {
  const osmJson = await fetchOverpassJson();
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
    "public/dongs.geojson",
    JSON.stringify({
      type: "FeatureCollection",
      features,
    }),
  );

  console.log(`Saved ${features.length} dongs to public/dongs.geojson`);
} catch (error) {
  console.error("Unable to fetch dong boundaries from Overpass mirrors.", error);
  process.exitCode = 1;
}
