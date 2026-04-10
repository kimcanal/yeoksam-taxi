import fs from "fs";

import { roundCoord } from "./map-region.mjs";

const POSITION_SCALE = 0.2;
const ROAD_WIDTH_SCALE = 0.6;

function roundProjected(value) {
  return Number(value.toFixed(3));
}

function geoKey(position) {
  return `${position[0].toFixed(5)}:${position[1].toFixed(5)}`;
}

function projectPoint([lon, lat], center) {
  const latFactor = 110540 * POSITION_SCALE;
  const lonFactor = 111320 * Math.cos((center.lat * Math.PI) / 180) * POSITION_SCALE;

  return {
    x: roundProjected((lon - center.lon) * lonFactor),
    z: roundProjected(-(lat - center.lat) * latFactor),
  };
}

function lineStringsOfRoadGeometry(geometry) {
  if (geometry?.type === "LineString") {
    return [geometry.coordinates];
  }

  if (geometry?.type === "MultiLineString") {
    return geometry.coordinates;
  }

  return [];
}

function distanceXZ(left, right) {
  return Math.hypot(right.x - left.x, right.z - left.z);
}

export function buildRoadNetworkAsset(roads, center) {
  const nodeMap = new Map();
  const rawSegments = [];
  const directedSegments = [];
  const segmentWayIds = new Set();

  roads.features.forEach((feature, featureIndex) => {
    lineStringsOfRoadGeometry(feature.geometry).forEach((line, lineIndex) => {
      line.forEach((position) => {
        const key = geoKey(position);
        if (!nodeMap.has(key)) {
          const projected = projectPoint(position, center);
          nodeMap.set(key, {
            key,
            x: projected.x,
            z: projected.z,
          });
        }
      });

      for (let index = 0; index < line.length - 1; index += 1) {
        const fromKey = geoKey(line[index]);
        const toKey = geoKey(line[index + 1]);
        if (fromKey === toKey) {
          continue;
        }

        const fromNode = nodeMap.get(fromKey);
        const toNode = nodeMap.get(toKey);
        if (!fromNode || !toNode) {
          continue;
        }

        const length = distanceXZ(fromNode, toNode);
        if (length < 1) {
          continue;
        }

        rawSegments.push({
          id: `${feature.id ?? featureIndex}-${lineIndex}-${index}`,
          from: fromKey,
          to: toKey,
          roadClass: feature.properties?.roadClass ?? "local",
          roadWidth: roundProjected(
            (feature.properties?.width ?? 4) * ROAD_WIDTH_SCALE,
          ),
          length: roundProjected(length),
          name: feature.properties?.name ?? null,
          wayId: feature.properties?.sourceWayId ?? null,
          oneway: feature.properties?.oneway ?? "no",
        });
      }
    });
  });

  rawSegments.forEach((segment) => {
    const pushDirectedSegment = (id, from, to) => {
      directedSegments.push({
        id,
        from,
        to,
        roadClass: segment.roadClass,
        roadWidth: segment.roadWidth,
        length: segment.length,
        name: segment.name,
        wayId: segment.wayId,
      });
      if (segment.wayId) {
        segmentWayIds.add(segment.wayId);
      }
    };

    if (segment.oneway === "forward") {
      pushDirectedSegment(
        `${segment.id}-f`,
        segment.from,
        segment.to,
      );
      return;
    }

    if (segment.oneway === "backward") {
      pushDirectedSegment(
        `${segment.id}-r`,
        segment.to,
        segment.from,
      );
      return;
    }

    pushDirectedSegment(
      `${segment.id}-f`,
      segment.from,
      segment.to,
    );
    pushDirectedSegment(
      `${segment.id}-r`,
      segment.to,
      segment.from,
    );
  });

  const nodes = [...nodeMap.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );

  directedSegments.sort((left, right) => left.id.localeCompare(right.id));

  const turnRestrictions = (roads.routing?.turnRestrictions ?? []).filter(
    (restriction) =>
      nodeMap.has(restriction.viaKey) &&
      segmentWayIds.has(restriction.fromWayId) &&
      segmentWayIds.has(restriction.toWayId),
  );

  return {
    version: 2,
    center: {
      lat: roundCoord(center.lat),
      lon: roundCoord(center.lon),
    },
    nodes,
    segments: directedSegments,
    turnRestrictions,
    stats: {
      nodeCount: nodes.length,
      segmentCount: directedSegments.length,
      directedEdgeCount: directedSegments.length,
      turnRestrictionCount: turnRestrictions.length,
    },
  };
}

export function writeRoadNetworkAsset(outputPath, roads, center) {
  const asset = buildRoadNetworkAsset(roads, center);
  fs.writeFileSync(outputPath, JSON.stringify(asset));
  return asset;
}
