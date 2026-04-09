import fs from "fs";
import osmtogeojson from "osmtogeojson";
import {
  fetchOverpassJson,
  geometryTouchesDongs,
  keepCachedGeoJson,
  loadTargetRegion,
} from "./map-region.mjs";

const { dongs, queryBounds: BOUNDS } = loadTargetRegion();

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
[out:json][timeout:60];
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

console.log("Fetching roads for the 9 selected Gangnam dongs...");

try {
  const outputPath = "public/roads.geojson";
  const osmJson = await fetchOverpassJson(query, { label: "roads" });
  const geojson = osmtogeojson(osmJson);

  const features = geojson.features
    .filter((feature) =>
      feature.geometry?.type === "LineString" ||
      feature.geometry?.type === "MultiLineString",
    )
    .filter((feature) => geometryTouchesDongs(feature.geometry, dongs.features))
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
    outputPath,
    JSON.stringify({
      type: "FeatureCollection",
      features,
    }),
  );

  console.log(`Saved ${features.length} roads to ${outputPath}`);
} catch (error) {
  if (!keepCachedGeoJson("public/roads.geojson", "roads", error)) {
    console.error("Unable to fetch roads from Overpass mirrors.", error);
    process.exitCode = 1;
  }
}
