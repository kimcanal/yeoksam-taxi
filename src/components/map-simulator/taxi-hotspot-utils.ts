import * as THREE from "three";
import {
  curbsideLaneOffset,
  offsetToRight,
} from "@/components/map-simulator/route-motion-utils";
import {
  classifyTurn,
  type BuildingMass,
  type Hotspot,
  type RoadGraph,
  type RouteTemplate,
  type SignalData,
  type TaxiStandLandmark,
} from "@/components/map-simulator/core";

function hotspotLabelForRoute(
  route: RouteTemplate,
  position: THREE.Vector3,
  buildings: BuildingMass[],
  index: number,
) {
  let nearestLabel: string | null = null;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;

  for (let buildingIndex = 0; buildingIndex < buildings.length; buildingIndex += 1) {
    const building = buildings[buildingIndex]!;
    if (!building.label) {
      continue;
    }

    const distanceSq = building.position.distanceToSquared(position);
    if (distanceSq < nearestDistanceSq) {
      nearestDistanceSq = distanceSq;
      nearestLabel = building.label;
    }
  }

  if (nearestLabel && nearestDistanceSq < 34 * 34) {
    return nearestLabel;
  }
  if (route.name) {
    return `${route.name} 승차지`;
  }
  return `택시 포인트 ${index + 1}`;
}

function selectTaxiHotspotNodeIndex(
  route: RouteTemplate,
  graph: RoadGraph,
  signalByKey: Map<string, SignalData>,
  targetDistance: number,
  usedNodeKeys: Set<string>,
) {
  let bestIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 1; index < route.nodes.length - 1; index += 1) {
    const candidateNode = route.nodes[index]!;
    if (usedNodeKeys.has(candidateNode.key)) {
      continue;
    }

    const candidateGraphNode = graph.nodes.get(candidateNode.key) ?? candidateNode;
    const gap = Math.abs(route.cumulative[index]! - targetDistance);
    const previousGap = route.cumulative[index]! - route.cumulative[index - 1]!;
    const nextGap = route.cumulative[index + 1]! - route.cumulative[index]!;
    const clearance = Math.min(previousGap, nextGap);
    const turn = classifyTurn(
      route.nodes[index - 1]!.point,
      candidateNode.point,
      route.nodes[index + 1]!.point,
    );

    let score = gap;
    if (
      (candidateGraphNode.isTerminal ?? false) ||
      (candidateGraphNode.neighborCount ?? 0) <= 1
    ) {
      score += 80;
    }
    if (
      (candidateGraphNode.isIntersection ?? false) ||
      (candidateGraphNode.neighborCount ?? 0) >= 3
    ) {
      score += 24;
    }
    if (signalByKey.has(candidateNode.key)) {
      score += 18;
    }
    if (turn !== "straight") {
      score += 9;
    }
    if (clearance < 7) {
      score += (7 - clearance) * 4;
    }

    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore === Number.POSITIVE_INFINITY ? 1 : bestIndex;
}

export function buildTaxiHotspots(
  routes: RouteTemplate[],
  buildings: BuildingMass[],
  graph: RoadGraph,
  signalByKey: Map<string, SignalData>,
) {
  return routes.flatMap((route, routeIndex) => {
    if (route.nodes.length < 4) {
      return [] as Hotspot[];
    }

    const fractions =
      route.totalLength > 180 ? [0.14, 0.38, 0.63, 0.86] : [0.22, 0.58, 0.84];
    const usedNodeKeys = new Set<string>();
    return fractions.map((fraction, hotspotIndex) => {
      const targetDistance = route.totalLength * fraction + routeIndex * 4.5;
      const nodeIndex = selectTaxiHotspotNodeIndex(
        route,
        graph,
        signalByKey,
        targetDistance,
        usedNodeKeys,
      );
      usedNodeKeys.add(route.nodes[nodeIndex]!.key);

      const currentPoint = route.nodes[nodeIndex].point;
      const previousPoint = route.nodes[Math.max(0, nodeIndex - 1)].point;
      const nextPoint =
        route.nodes[Math.min(route.nodes.length - 1, nodeIndex + 1)].point;
      const heading = nextPoint.clone().sub(previousPoint);
      if (heading.lengthSq() < 0.0001) {
        heading.set(0, 0, 1);
      } else {
        heading.normalize();
      }

      const lanePosition = offsetToRight(
        currentPoint,
        heading,
        curbsideLaneOffset(route),
      );
      return {
        id: `${route.id}-hotspot-${hotspotIndex}`,
        nodeKey: route.nodes[nodeIndex].key,
        routeId: route.id,
        distance: route.cumulative[nodeIndex],
        position: lanePosition.clone().setY(0.14),
        point: lanePosition.clone(),
        label: hotspotLabelForRoute(
          route,
          lanePosition,
          buildings,
          hotspotIndex,
        ),
        roadName: route.name,
      } satisfies Hotspot;
    });
  });
}

export function buildTaxiStandHotspots(
  taxiStandLandmarks: TaxiStandLandmark[],
  routes: RouteTemplate[],
) {
  const usedNodeKeys = new Set<string>();

  return taxiStandLandmarks
    .map((stand, standIndex) => {
      let best:
        | {
          route: RouteTemplate;
          nodeIndex: number;
          distanceSq: number;
          reusesNode: boolean;
        }
        | null = null;

      for (const route of routes) {
        for (const [nodeIndex, node] of route.nodes.entries()) {
          const reusesNode = usedNodeKeys.has(node.key);
          const distanceSq = node.point.distanceToSquared(stand.position);
          const score = distanceSq + (reusesNode ? 1600 : 0);
          const bestScore = best
            ? best.distanceSq + (best.reusesNode ? 1600 : 0)
            : Number.POSITIVE_INFINITY;

          if (score < bestScore) {
            best = {
              route,
              nodeIndex,
              distanceSq,
              reusesNode,
            };
          }
        }
      }

      if (!best) {
        return null;
      }

      const node = best.route.nodes[best.nodeIndex]!;
      usedNodeKeys.add(node.key);

      return {
        id: `taxi-stand-hotspot-${stand.standId || standIndex}`,
        nodeKey: node.key,
        routeId: best.route.id,
        distance: best.route.cumulative[best.nodeIndex] ?? 0,
        position: stand.position.clone(),
        point: stand.position.clone(),
        label: stand.name || "택시승차대",
        roadName: stand.roadAddress || best.route.name,
      } satisfies Hotspot;
    })
    .filter(Boolean) as Hotspot[];
}
