import * as THREE from "three";
import {
  assignCoordinatedSignalOffsets,
  createSignalData,
  signalAxisForDirection,
  signalDirectionForVector,
} from "@/components/map-simulator/signal-controller";
import {
  SIGNAL_CLUSTER_DISTANCE,
  SIGNAL_NODE_SNAP_DISTANCE,
  SIGNAL_ROAD_SNAP_DISTANCE,
} from "@/components/map-simulator/scene-constants";
import { lineStringsOfRoad, projectPoint } from "@/components/map-simulator/map-geometry-utils";
import { distanceXZ } from "@/components/map-simulator/route-motion-utils";
import {
  averagePoint,
  nearestGraphNode,
  nearestRoadContext,
  nearbyRoadSegments,
  roadRank,
  type ProjectedRoadSegment,
  type RoadFeatureCollection,
  type RoadGraph,
  type RoadSegmentSpatialIndex,
  type SignalData,
  type SignalDirection,
  type TrafficSignalFeatureCollection,
} from "@/components/map-simulator/core";

function buildFallbackSignals(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
) {
  const nodeMap = new Map<
    string,
    {
      point: THREE.Vector3;
      roadIds: Set<string>;
      namedRoads: Set<string>;
      rank: number;
      approaches: THREE.Vector3[];
    }
  >();

  roads.features.forEach((feature, featureIndex) => {
    lineStringsOfRoad(feature, center).forEach((line) => {
      line.forEach((node, nodeIndex) => {
        const entry = nodeMap.get(node.key) ?? {
          point: node.point,
          roadIds: new Set<string>(),
          namedRoads: new Set<string>(),
          rank: 0,
          approaches: [],
        };
        entry.roadIds.add(String(feature.id ?? `road-${featureIndex}`));
        if (feature.properties.name) {
          entry.namedRoads.add(feature.properties.name);
        }
        entry.rank = Math.max(
          entry.rank,
          roadRank(feature.properties.roadClass),
        );
        if (nodeIndex > 0) {
          const incoming = line[nodeIndex - 1].point.clone().sub(node.point);
          if (incoming.lengthSq() > 0.5) {
            entry.approaches.push(incoming.normalize());
          }
        }
        if (nodeIndex < line.length - 1) {
          const outgoing = line[nodeIndex + 1].point.clone().sub(node.point);
          if (outgoing.lengthSq() > 0.5) {
            entry.approaches.push(outgoing.normalize());
          }
        }
        nodeMap.set(node.key, entry);
      });
    });
  });

  const candidates = [...nodeMap.entries()]
    .map(([key, entry]) => {
      const approaches = Array.from(
        new Set(
          entry.approaches
            .filter((approach) => approach.lengthSq() > 0.25)
            .map((approach) => signalDirectionForVector(approach)),
        ),
      );
      const axisCount = new Set(
        approaches.map((approach) => signalAxisForDirection(approach)),
      ).size;
      const score =
        entry.rank * 14 +
        entry.roadIds.size * 5 +
        approaches.length * 6 +
        entry.namedRoads.size * 3;

      return {
        key,
        point: entry.point.clone(),
        rank: entry.rank,
        roadCount: entry.roadIds.size,
        axisCount,
        approachCount: approaches.length,
        approaches,
        score,
      };
    })
    .filter(
      (candidate) =>
        candidate.roadCount >= 2 &&
        candidate.axisCount >= 2 &&
        candidate.approachCount >= 3 &&
        candidate.rank >= 2,
    )
    .sort((left, right) => {
      const scoreGap = right.score - left.score;
      if (scoreGap !== 0) {
        return scoreGap;
      }
      return right.roadCount - left.roadCount;
    });

  const kept = candidates.filter((candidate, index, list) =>
    list
      .slice(0, index)
      .every((existing) => distanceXZ(existing.point, candidate.point) >= 24),
  );

  return assignCoordinatedSignalOffsets(
    kept
      .slice(0, 18)
      .map((candidate, index) =>
        createSignalData(
          `signal-${index}`,
          candidate.key,
          candidate.point.clone(),
          candidate.approaches,
          candidate.approaches.length >= 4,
          candidate.point.clone(),
        ),
      ),
  );
}

function buildSignalsFromOsm(
  center: { lat: number; lon: number },
  graph: RoadGraph,
  trafficSignals: TrafficSignalFeatureCollection,
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex,
) {
  if (!roadSegments.length || !trafficSignals.features.length) {
    return [] as SignalData[];
  }

  const clustered: Array<{
    points: THREE.Vector3[];
    names: Set<string>;
    types: Set<string>;
    turnHints: Set<string>;
    buttonOperatedCount: number;
  }> = [];

  trafficSignals.features.forEach((feature) => {
    if (feature.geometry.type !== "Point") {
      return;
    }

    const point = projectPoint(feature.geometry.coordinates, center);
    const nearestRoad = nearestRoadContext(
      point,
      roadSegments,
      roadSegmentSpatialIndex,
      SIGNAL_ROAD_SNAP_DISTANCE,
    );
    if (!nearestRoad || nearestRoad.distance > SIGNAL_ROAD_SNAP_DISTANCE) {
      return;
    }

    let bestCluster: (typeof clustered)[number] | null = null;
    let bestDistance = SIGNAL_CLUSTER_DISTANCE;
    clustered.forEach((cluster) => {
      const centroid = averagePoint(cluster.points);
      const distance = distanceXZ(point, centroid);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCluster = cluster;
      }
    });

    const target: (typeof clustered)[number] = bestCluster ?? {
      points: [] as THREE.Vector3[],
      names: new Set<string>(),
      types: new Set<string>(),
      turnHints: new Set<string>(),
      buttonOperatedCount: 0,
    };
    if (!bestCluster) {
      clustered.push(target);
    }

    target.points.push(point);
    if (feature.properties.name) {
      target.names.add(feature.properties.name);
    }
    if (feature.properties.signalType) {
      target.types.add(feature.properties.signalType);
    }
    if (feature.properties.turns) {
      target.turnHints.add(feature.properties.turns);
    }
    if (feature.properties.buttonOperated) {
      target.buttonOperatedCount += 1;
    }
  });

  const byAnchorKey = new Map<
    string,
    Omit<SignalData, "offset"> & { score: number }
  >();

  clustered.forEach((cluster) => {
    const clusterPoint = averagePoint(cluster.points);
    const anchorNode = nearestGraphNode(
      clusterPoint,
      graph,
      SIGNAL_NODE_SNAP_DISTANCE,
    );
    if (!anchorNode || !anchorNode.isIntersection) {
      return;
    }

    const nearbySegmentsForSignal = nearbyRoadSegments(
      anchorNode.point,
      roadSegments,
      SIGNAL_ROAD_SNAP_DISTANCE,
      roadSegmentSpatialIndex,
    );
    if (!nearbySegmentsForSignal.length) {
      return;
    }

    const approachYaws: Record<SignalDirection, number> = {
      north: 0,
      south: Math.PI,
      east: Math.PI / 2,
      west: -Math.PI / 2,
    };
    nearbySegmentsForSignal.forEach((segment) => {
      const startVector = segment.start.clone().sub(anchorNode.point);
      const endVector = segment.end.clone().sub(anchorNode.point);

      if (startVector.lengthSq() > 9) {
        const dir = signalDirectionForVector(startVector);
        approachYaws[dir] = Math.atan2(startVector.x, startVector.z);
      }
      if (endVector.lengthSq() > 9) {
        const dir = signalDirectionForVector(endVector);
        approachYaws[dir] = Math.atan2(endVector.x, endVector.z);
      }
    });

    const approaches = (Object.keys(approachYaws) as SignalDirection[]).filter(
      (dir) => {
        return nearbySegmentsForSignal.some((s) => {
          const v1 = s.start.clone().sub(anchorNode.point);
          const v2 = s.end.clone().sub(anchorNode.point);
          return (
            (v1.lengthSq() > 9 && signalDirectionForVector(v1) === dir) ||
            (v2.lengthSq() > 9 && signalDirectionForVector(v2) === dir)
          );
        });
      },
    );

    const axisCount = new Set(
      approaches.map((approach) => signalAxisForDirection(approach)),
    ).size;
    if (approaches.length < 3 || axisCount < 2) {
      return;
    }

    const rank = nearbySegmentsForSignal.reduce(
      (best, segment) => Math.max(best, roadRank(segment.roadClass)),
      1,
    );
    const score =
      cluster.points.length * 12 +
      approaches.length * 8 +
      rank * 10 +
      nearbySegmentsForSignal.length;
    const hasProtectedLeft =
      approaches.length >= 4 &&
      (rank >= 3 || cluster.turnHints.size > 0 || cluster.points.length >= 2);
    const candidate = {
      ...createSignalData(
        `signal-${byAnchorKey.size}`,
        anchorNode.key,
        anchorNode.point.clone(),
        approaches,
        hasProtectedLeft,
        clusterPoint.clone(), /* Use actual OSM centroid for visuals */
        approachYaws,
      ),
      score,
    };
    const existing = byAnchorKey.get(anchorNode.key);
    if (!existing || candidate.score > existing.score) {
      byAnchorKey.set(anchorNode.key, candidate);
    }
  });

  return assignCoordinatedSignalOffsets(
    [...byAnchorKey.values()]
      .sort((left, right) => right.score - left.score)
      .map((signal, index) =>
        createSignalData(
          `signal-${index}`,
          signal.key,
          signal.point,
          signal.approaches,
          signal.hasProtectedLeft,
          signal.visualPoint,
        ),
      ),
  );
}

export function buildSignals(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
  graph: RoadGraph,
  trafficSignals: TrafficSignalFeatureCollection,
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex,
) {
  const actualSignals = buildSignalsFromOsm(
    center,
    graph,
    trafficSignals,
    roadSegments,
    roadSegmentSpatialIndex,
  );
  if (actualSignals.length) {
    return actualSignals;
  }
  return buildFallbackSignals(roads, center);
}
