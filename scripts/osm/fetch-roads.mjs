import fs from "fs";
import osmtogeojson from "osmtogeojson";
import {
  fetchOverpassJson,
  geometryTouchesDongs,
  keepCachedGeoJson,
  loadTargetRegion,
} from "./map-region.mjs";
import { writeRoadNetworkAsset } from "./road-network.mjs";

const { dongs, center, queryBounds: BOUNDS } = loadTargetRegion();

const HIGHWAY_TYPES = [
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
  "residential",
  "living_street",
  "service",
  "unclassified",
];

const query = `
[out:json][timeout:60];
(
  way["highway"~"^(${HIGHWAY_TYPES.join("|")})$"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  relation["type"="restriction"]["restriction"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
);
out body;
>;
out skel qt;
`;

function roundCoord(value) {
  return Number(value.toFixed(6));
}

function roadClassFor(highway) {
  if (
    [
      "trunk",
      "motorway_link",
      "trunk_link",
      "primary",
      "primary_link",
      "secondary",
      "secondary_link",
    ].includes(highway)
  ) {
    return "arterial";
  }

  if (["tertiary", "tertiary_link"].includes(highway)) {
    return "connector";
  }

  return "local";
}

function geoKey(position) {
  return `${position[0].toFixed(5)}:${position[1].toFixed(5)}`;
}

function normalizeWayId(value) {
  if (value == null) {
    return null;
  }

  const stringValue = String(value);
  if (!stringValue) {
    return null;
  }

  return stringValue.startsWith("way/") ? stringValue : `way/${stringValue}`;
}

function normalizeOneway(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["yes", "true", "1"].includes(normalized)) {
    return "forward";
  }
  if (["-1", "reverse"].includes(normalized)) {
    return "backward";
  }
  return "no";
}

function restrictionModeFor(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.startsWith("only_")) {
    return "only";
  }
  if (normalized.startsWith("no_")) {
    return "no";
  }
  return null;
}

function extractTurnRestrictions(osmJson, includedWayIds) {
  const nodeKeyById = new Map(
    osmJson.elements
      .filter(
        (element) =>
          element.type === "node" &&
          typeof element.lon === "number" &&
          typeof element.lat === "number",
      )
      .map((node) => [
        node.id,
        geoKey([roundCoord(node.lon), roundCoord(node.lat)]),
      ]),
  );

  return osmJson.elements
    .filter(
      (element) =>
        element.type === "relation" &&
        element.tags?.type === "restriction" &&
        typeof element.tags?.restriction === "string",
    )
    .flatMap((relation) => {
      const members = Array.isArray(relation.members) ? relation.members : [];
      const fromMember = members.find(
        (member) => member.type === "way" && member.role === "from",
      );
      const toMember = members.find(
        (member) => member.type === "way" && member.role === "to",
      );
      const viaMember = members.find(
        (member) => member.type === "node" && member.role === "via",
      );
      const mode = restrictionModeFor(relation.tags?.restriction);
      const fromWayId = normalizeWayId(fromMember?.ref);
      const toWayId = normalizeWayId(toMember?.ref);
      const viaKey = viaMember ? nodeKeyById.get(viaMember.ref) ?? null : null;

      if (
        !mode ||
        !fromWayId ||
        !toWayId ||
        !viaKey ||
        !includedWayIds.has(fromWayId) ||
        !includedWayIds.has(toWayId)
      ) {
        return [];
      }

      return [
        {
          id: `relation/${relation.id}`,
          viaKey,
          fromWayId,
          toWayId,
          kind: relation.tags.restriction.toLowerCase(),
          mode,
        },
      ];
    });
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
  const graphOutputPath = "public/road-network.json";
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
          sourceWayId: normalizeWayId(feature.id),
          oneway: normalizeOneway(feature.properties?.oneway),
        },
        geometry: roundGeometry(feature.geometry),
      };
    });

  const includedWayIds = new Set(
    features
      .map((feature) => feature.properties.sourceWayId)
      .filter(Boolean),
  );
  const turnRestrictions = extractTurnRestrictions(osmJson, includedWayIds);

  const roadsCollection = {
    type: "FeatureCollection",
    features,
    routing: {
      turnRestrictions,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(roadsCollection));
  const roadNetwork = writeRoadNetworkAsset(graphOutputPath, roadsCollection, center);

  console.log(`Saved ${features.length} roads to ${outputPath}`);
  console.log(
    `Saved road graph with ${roadNetwork.stats.nodeCount} nodes, ${roadNetwork.stats.segmentCount} directed segments, ${roadNetwork.stats.turnRestrictionCount} turn restrictions to ${graphOutputPath}`,
  );
} catch (error) {
  if (!keepCachedGeoJson("public/roads.geojson", "roads", error)) {
    console.error("Unable to fetch roads from Overpass mirrors.", error);
    process.exitCode = 1;
  }
}
