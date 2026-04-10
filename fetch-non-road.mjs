import fs from "fs";
import osmtogeojson from "osmtogeojson";
import {
  fetchOverpassJson,
  geometryTouchesDongs,
  keepCachedGeoJson,
  loadTargetRegion,
  representativePointForGeometry,
  roundCoord,
} from "./map-region.mjs";

const { dongs, queryBounds: BOUNDS, center: CENTER } = loadTargetRegion();

const GREEN_LEISURE = new Set([
  "park",
  "garden",
  "playground",
  "pitch",
  "sports_centre",
]);
const GREEN_LANDUSE = new Set([
  "grass",
  "forest",
  "recreation_ground",
  "meadow",
  "village_green",
  "allotments",
]);
const GREEN_NATURAL = new Set([
  "wood",
  "grassland",
  "scrub",
  "wetland",
]);
const FACILITY_AMENITY = new Set(["school", "college", "university", "hospital"]);

const MIN_AREA_BY_CATEGORY = {
  green: 140,
  pedestrian: 80,
  parking: 80,
  water: 120,
  facility: 160,
};

const query = `
[out:json][timeout:60];
(
  way["leisure"~"^(park|garden|playground|pitch|sports_centre)$"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["leisure"~"^(park|garden|playground|pitch|sports_centre)$"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  way["landuse"~"^(grass|forest|recreation_ground|meadow|village_green|allotments|education)$"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["landuse"~"^(grass|forest|recreation_ground|meadow|village_green|allotments|education)$"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  way["natural"~"^(water|wood|grassland|scrub|wetland)$"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["natural"~"^(water|wood|grassland|scrub|wetland)$"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  way["waterway"="riverbank"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["waterway"="riverbank"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  way["amenity"="parking"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["amenity"="parking"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  way["parking"="surface"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["parking"="surface"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  way["area:highway"="pedestrian"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["area:highway"="pedestrian"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  way["highway"="pedestrian"]["area"="yes"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["highway"="pedestrian"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  way["amenity"~"^(school|college|university|hospital|marketplace)$"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["amenity"~"^(school|college|university|hospital|marketplace)$"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
);
out body;
>;
out skel qt;
`;

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

function normalizeName(value) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function categoryFor(properties = {}) {
  if (
    properties.natural === "water" ||
    properties.waterway === "riverbank"
  ) {
    return "water";
  }

  if (
    GREEN_LEISURE.has(properties.leisure) ||
    GREEN_LANDUSE.has(properties.landuse) ||
    GREEN_NATURAL.has(properties.natural)
  ) {
    return "green";
  }

  if (properties.amenity === "parking" || properties.parking === "surface") {
    return "parking";
  }

  if (
    properties["area:highway"] === "pedestrian" ||
    (properties.highway === "pedestrian" && properties.area === "yes") ||
    properties.amenity === "marketplace"
  ) {
    return "pedestrian";
  }

  if (
    FACILITY_AMENITY.has(properties.amenity) ||
    properties.landuse === "education"
  ) {
    return "facility";
  }

  return null;
}

function kindFor(properties = {}) {
  return (
    properties.leisure ??
    properties.landuse ??
    properties.natural ??
    properties.amenity ??
    properties.parking ??
    properties["area:highway"] ??
    properties.highway ??
    properties.waterway ??
    null
  );
}

function sourceTagFor(properties = {}) {
  if (properties.leisure) {
    return `leisure=${properties.leisure}`;
  }
  if (properties.landuse) {
    return `landuse=${properties.landuse}`;
  }
  if (properties.natural) {
    return `natural=${properties.natural}`;
  }
  if (properties.amenity) {
    return `amenity=${properties.amenity}`;
  }
  if (properties.parking) {
    return `parking=${properties.parking}`;
  }
  if (properties["area:highway"]) {
    return `area:highway=${properties["area:highway"]}`;
  }
  if (properties.highway) {
    return `highway=${properties.highway}`;
  }
  if (properties.waterway) {
    return `waterway=${properties.waterway}`;
  }
  return null;
}

console.log("Fetching non-road surfaces for the 9 selected Gangnam dongs...");

try {
  const outputPath = "public/non-road.geojson";
  const osmJson = await fetchOverpassJson(query, { label: "non-road surfaces" });
  const geojson = osmtogeojson(osmJson);
  const seen = new Set();

  const features = geojson.features
    .filter((feature) =>
      feature.geometry?.type === "Polygon" ||
      feature.geometry?.type === "MultiPolygon",
    )
    .filter((feature) => geometryTouchesDongs(feature.geometry, dongs.features))
    .map((feature) => {
      const category = categoryFor(feature.properties);
      if (!category) {
        return null;
      }

      const area = Math.round(polygonAreaSqMeters(feature.geometry));
      const minimumArea = MIN_AREA_BY_CATEGORY[category];
      const name = normalizeName(feature.properties?.name);
      if (area < minimumArea && !name) {
        return null;
      }

      const representativePoint = representativePointForGeometry(feature.geometry);
      const dedupeKey = [
        category,
        kindFor(feature.properties) ?? "",
        name,
        representativePoint
          ? representativePoint.map((value) => roundCoord(value)).join(",")
          : "",
        area,
      ].join("|");
      if (seen.has(dedupeKey)) {
        return null;
      }
      seen.add(dedupeKey);

      return {
        type: "Feature",
        id: feature.id,
        properties: {
          category,
          kind: kindFor(feature.properties),
          name: name || null,
          sourceTag: sourceTagFor(feature.properties),
          area,
        },
        geometry: roundGeometry(feature.geometry),
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

  console.log(`Saved ${features.length} non-road surfaces to ${outputPath}`);
} catch (error) {
  if (!keepCachedGeoJson("public/non-road.geojson", "non-road surfaces", error)) {
    console.error("Unable to fetch non-road surfaces from Overpass mirrors.", error);
    process.exitCode = 1;
  }
}
