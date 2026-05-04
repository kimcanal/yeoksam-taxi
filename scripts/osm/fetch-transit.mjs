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

const { dongs, queryBounds: BOUNDS } = loadTargetRegion();

const query = `
[out:json][timeout:60];
(
  node["highway"="bus_stop"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  node["public_transport"="platform"]["bus"="yes"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  node["amenity"="bus_station"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  node["railway"="station"]["station"="subway"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  node["station"="subway"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  node["public_transport"="station"]["subway"="yes"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
  node["railway"="subway_entrance"](${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east});
);
out body;
>;
out skel qt;
`;

function normalizeName(value) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function transitCategoryFor(properties) {
  if (
    properties?.station === "subway" ||
    (properties?.railway === "station" && properties?.station === "subway") ||
    (properties?.public_transport === "station" && properties?.subway === "yes") ||
    properties?.railway === "subway_entrance"
  ) {
    return "subway_station";
  }

  if (
    properties?.highway === "bus_stop" ||
    properties?.amenity === "bus_station" ||
    (properties?.public_transport === "platform" && properties?.bus === "yes")
  ) {
    return "bus_stop";
  }

  return null;
}

function importanceFor(category, properties) {
  if (category === "subway_station") {
    return properties?.name ? 6 : 4;
  }

  if (properties?.amenity === "bus_station") {
    return 4;
  }

  if (properties?.name) {
    return 3;
  }

  return 1;
}

function pointForFeature(feature) {
  if (feature.geometry?.type === "Point") {
    return feature.geometry.coordinates;
  }

  return representativePointForGeometry(feature.geometry);
}

function roundedPoint([lon, lat]) {
  return [roundCoord(lon), roundCoord(lat)];
}

console.log("Fetching transit landmarks for the 9 selected Gangnam dongs...");

try {
  const outputPath = "public/transit.geojson";
  const osmJson = await fetchOverpassJson(query, { label: "transit landmarks" });
  const geojson = osmtogeojson(osmJson);
  const seen = new Set();

  const features = geojson.features
    .map((feature) => {
      const category = transitCategoryFor(feature.properties);
      if (!category || !geometryTouchesDongs(feature.geometry, dongs.features)) {
        return null;
      }

      const point = pointForFeature(feature);
      if (!point) {
        return null;
      }

      const name = normalizeName(
        feature.properties?.name ??
          feature.properties?.official_name ??
          feature.properties?.short_name ??
          feature.properties?.local_ref ??
          feature.properties?.ref,
      );

      if (category === "bus_stop" && !name) {
        return null;
      }

      const key = `${category}:${name}:${roundedPoint(point).join(",")}`;
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);

      return {
        type: "Feature",
        id: feature.id,
        properties: {
          category,
          name: name || null,
          operator: normalizeName(feature.properties?.operator) || null,
          network: normalizeName(feature.properties?.network) || null,
          ref: normalizeName(feature.properties?.ref) || null,
          sourceType:
            feature.properties?.highway ??
            feature.properties?.public_transport ??
            feature.properties?.amenity ??
            feature.properties?.railway ??
            feature.properties?.station ??
            null,
          importance: importanceFor(category, feature.properties),
        },
        geometry: {
          type: "Point",
          coordinates: roundedPoint(point),
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

  const busCount = features.filter((feature) => feature.properties.category === "bus_stop").length;
  const subwayCount = features.filter(
    (feature) => feature.properties.category === "subway_station",
  ).length;

  console.log(
    `Saved ${features.length} transit features to ${outputPath} (${busCount} bus stops, ${subwayCount} subway stations)`,
  );
} catch (error) {
  if (!keepCachedGeoJson("public/transit.geojson", "transit landmarks", error)) {
    console.error("Unable to fetch transit landmarks from Overpass mirrors.", error);
    process.exitCode = 1;
  }
}
