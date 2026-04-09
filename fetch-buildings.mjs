import fs from "fs";
import osmtogeojson from "osmtogeojson";

const BOUNDS = {
  south: 37.491,
  west: 127.023,
  north: 37.509,
  east: 127.041,
};

const CENTER = {
  lat: (BOUNDS.south + BOUNDS.north) / 2,
  lon: (BOUNDS.west + BOUNDS.east) / 2,
};

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const MIN_BUILDING_AREA_M2 = 30;

const query = `
[out:json][timeout:25];
(
  way["building"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["building"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
);
out body;
>;
out skel qt;
`;

function roundCoord(value) {
  return Number(value.toFixed(6));
}

function projectToMeters([lon, lat]) {
  const latFactor = 110540;
  const lonFactor = 111320 * Math.cos((CENTER.lat * Math.PI) / 180);
  return [
    (lon - CENTER.lon) * lonFactor,
    (lat - CENTER.lat) * latFactor,
  ];
}

function ringAreaSqMeters(ring) {
  let area = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = projectToMeters(ring[index]);
    const [x2, y2] = projectToMeters(ring[index + 1]);
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

function polygonAreaSqMeters(geometry) {
  if (geometry.type === "Polygon") {
    return ringAreaSqMeters(geometry.coordinates[0] ?? []);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce(
      (sum, polygon) => sum + ringAreaSqMeters(polygon[0] ?? []),
      0,
    );
  }

  return 0;
}

function normalizeHeight(properties = {}) {
  const numericHeight = Number.parseFloat(properties.height);
  if (Number.isFinite(numericHeight) && numericHeight > 3) {
    return Math.round(numericHeight);
  }

  const numericLevels = Number.parseFloat(properties["building:levels"]);
  if (Number.isFinite(numericLevels) && numericLevels > 0) {
    return Math.round(numericLevels * 3.4);
  }

  switch (properties.building) {
    case "apartments":
    case "office":
    case "commercial":
      return 32;
    case "school":
    case "hospital":
      return 22;
    case "house":
    case "residential":
      return 11;
    default:
      return 15;
  }
}

function formatAddress(properties = {}) {
  const street = properties["addr:street"];
  const houseNumber = properties["addr:housenumber"];

  if (street && houseNumber) {
    return `${street} ${houseNumber}`;
  }

  return street ?? null;
}

function pickBuildingLabel(properties = {}) {
  return (
    properties.name ??
    properties.brand ??
    properties.operator ??
    properties.amenity ??
    properties.office ??
    properties.shop ??
    properties.tourism ??
    null
  );
}

function pickBuildingKind(properties = {}) {
  return (
    properties.building ??
    properties.amenity ??
    properties.office ??
    properties.shop ??
    properties.tourism ??
    null
  );
}

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

console.log("Fetching Yeoksam buildings...");

try {
  const osmJson = await fetchOverpassJson();
  const geojson = osmtogeojson(osmJson);

  const features = geojson.features
    .filter((feature) =>
      feature.geometry?.type === "Polygon" ||
      feature.geometry?.type === "MultiPolygon",
    )
    .filter((feature) => feature.properties?.["building:part"] !== "yes")
    .map((feature) => ({
      type: "Feature",
      id: feature.id,
      properties: {
        height: normalizeHeight(feature.properties),
        area: Math.round(polygonAreaSqMeters(feature.geometry)),
        label: pickBuildingLabel(feature.properties),
        kind: pickBuildingKind(feature.properties),
        address: formatAddress(feature.properties),
      },
      geometry: roundGeometry(feature.geometry),
    }))
    .filter((feature) => feature.properties.area >= MIN_BUILDING_AREA_M2);

  fs.writeFileSync(
    "public/buildings.geojson",
    JSON.stringify({
      type: "FeatureCollection",
      features,
    }),
  );

  console.log(`Saved ${features.length} buildings to public/buildings.geojson`);
} catch (error) {
  console.error("Unable to fetch buildings from Overpass mirrors.", error);
  process.exitCode = 1;
}
