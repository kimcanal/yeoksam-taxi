import fs from "fs";
import osmtogeojson from "osmtogeojson";

const BOUNDS = {
  south: 37.491,
  west: 127.023,
  north: 37.509,
  east: 127.041,
};

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const HIGHWAY_TYPES = [
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "residential",
  "living_street",
  "service",
  "unclassified",
];

const query = `
[out:json][timeout:25];
(
  way["highway"~"^(${HIGHWAY_TYPES.join("|")})$"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
);
out body;
>;
out skel qt;
`;

function roundCoord(value) {
  return Number(value.toFixed(6));
}

function roadClassFor(highway) {
  if (["trunk", "primary", "secondary"].includes(highway)) {
    return "arterial";
  }

  if (highway === "tertiary") {
    return "connector";
  }

  return "local";
}

function widthFor(roadClass) {
  switch (roadClass) {
    case "arterial":
      return 11;
    case "connector":
      return 7;
    default:
      return 4;
  }
}

function roundGeometry(geometry) {
  if (geometry.type === "LineString") {
    return {
      type: "LineString",
      coordinates: geometry.coordinates.map(([lon, lat]) => [
        roundCoord(lon),
        roundCoord(lat),
      ]),
    };
  }

  if (geometry.type === "MultiLineString") {
    return {
      type: "MultiLineString",
      coordinates: geometry.coordinates.map((line) =>
        line.map(([lon, lat]) => [roundCoord(lon), roundCoord(lat)]),
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

console.log("Fetching Yeoksam roads...");

try {
  const osmJson = await fetchOverpassJson();
  const geojson = osmtogeojson(osmJson);

  const features = geojson.features
    .filter((feature) =>
      feature.geometry?.type === "LineString" ||
      feature.geometry?.type === "MultiLineString",
    )
    .map((feature) => {
      const roadClass = roadClassFor(feature.properties?.highway);

      return {
        type: "Feature",
        id: feature.id,
        properties: {
          roadClass,
          width: widthFor(roadClass),
          name: feature.properties?.name ?? null,
          highway: feature.properties?.highway ?? null,
        },
        geometry: roundGeometry(feature.geometry),
      };
    });

  fs.writeFileSync(
    "public/roads.geojson",
    JSON.stringify({
      type: "FeatureCollection",
      features,
    }),
  );

  console.log(`Saved ${features.length} roads to public/roads.geojson`);
} catch (error) {
  console.error("Unable to fetch roads from Overpass mirrors.", error);
  process.exitCode = 1;
}
