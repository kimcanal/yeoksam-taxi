import * as THREE from "three";
import { collectRoadSegmentCandidateIndices } from "@/components/map-simulator/map-geometry-utils";
import { distanceXZ } from "@/components/map-simulator/route-motion-utils";
import type {
  NearestRoadContext,
  ProjectedRoadSegment,
  RoadGraph,
  RoadProperties,
  RoadSegmentSpatialIndex,
  RouteNode,
  TurnMovement,
} from "@/components/map-simulator/map-simulator-types";

const nearestRoadDelta = new THREE.Vector3();
const nearestRoadOffset = new THREE.Vector3();
const nearestRoadClosest = new THREE.Vector3();
const nearestRoadHeading = new THREE.Vector3();

export function averagePoint(points: THREE.Vector3[]) {
  if (!points.length) {
    return new THREE.Vector3();
  }

  const total = points.reduce(
    (sum, point) => sum.add(point),
    new THREE.Vector3(),
  );
  return total.multiplyScalar(1 / points.length);
}

export function classifyTurn(
  previous: THREE.Vector3,
  current: THREE.Vector3,
  next: THREE.Vector3,
): TurnMovement {
  const incoming = current.clone().sub(previous).normalize();
  const outgoing = next.clone().sub(current).normalize();
  const dot = incoming.dot(outgoing);
  if (dot > 0.72) {
    return "straight";
  }
  const cross = incoming.x * outgoing.z - incoming.z * outgoing.x;
  return cross > 0 ? "right" : "left";
}

export function nearestRoadContext(
  point: THREE.Vector3,
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex | null = null,
  maxDistance = Number.POSITIVE_INFINITY,
): NearestRoadContext | null {
  let best: NearestRoadContext | null = null;
  const candidateIndices =
    collectRoadSegmentCandidateIndices(
      point,
      roadSegments,
      roadSegmentSpatialIndex,
      maxDistance,
    ) ??
    roadSegments.map((_, index) => index);

  for (
    let candidateIndex = 0;
    candidateIndex < candidateIndices.length;
    candidateIndex += 1
  ) {
    const segment = roadSegments[candidateIndices[candidateIndex]!]!;
    nearestRoadDelta.copy(segment.end).sub(segment.start);
    const lengthSq = nearestRoadDelta.lengthSq();
    if (lengthSq < 0.0001) {
      continue;
    }

    const t = THREE.MathUtils.clamp(
      nearestRoadOffset.copy(point).sub(segment.start).dot(nearestRoadDelta) /
      lengthSq,
      0,
      1,
    );
    nearestRoadClosest.copy(segment.start).lerp(segment.end, t);
    const distance = distanceXZ(point, nearestRoadClosest);
    if (best && distance >= best.distance) {
      continue;
    }

    best = {
      closest: nearestRoadClosest.clone(),
      heading: nearestRoadHeading.copy(nearestRoadDelta).normalize().clone(),
      width: segment.width,
      roadClass: segment.roadClass,
      name: segment.name,
      distance,
    };
  }

  return best;
}

export function nearbyRoadSegments(
  point: THREE.Vector3,
  roadSegments: ProjectedRoadSegment[],
  maxDistance: number,
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex | null = null,
) {
  const candidateIndices =
    collectRoadSegmentCandidateIndices(
      point,
      roadSegments,
      roadSegmentSpatialIndex,
      maxDistance,
    ) ??
    roadSegments.map((_, index) => index);

  return candidateIndices
    .map((index) => roadSegments[index]!)
    .filter((segment) => {
      nearestRoadDelta.copy(segment.end).sub(segment.start);
      const lengthSq = nearestRoadDelta.lengthSq();
      if (lengthSq < 0.0001) {
        return false;
      }

      const t = THREE.MathUtils.clamp(
        nearestRoadOffset.copy(point).sub(segment.start).dot(nearestRoadDelta) /
        lengthSq,
        0,
        1,
      );
      nearestRoadClosest.copy(segment.start).lerp(segment.end, t);
      return distanceXZ(point, nearestRoadClosest) <= maxDistance;
    });
}

export function nearestGraphNode(
  point: THREE.Vector3,
  graph: RoadGraph,
  maxDistance: number,
): RouteNode | null {
  let best: RouteNode | null = null;
  let bestDistance = maxDistance;

  graph.nodes.forEach((node) => {
    const distance = distanceXZ(point, node.point);
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  });

  return best;
}

export function roadRank(roadClass: RoadProperties["roadClass"]) {
  switch (roadClass) {
    case "arterial":
      return 3;
    case "connector":
      return 2;
    default:
      return 1;
  }
}
