import * as THREE from "three";
import { roadRank } from "@/components/map-simulator/road-query-utils";
import type {
  RouteTemplate,
  TaxiStandLandmark,
} from "@/components/map-simulator/map-simulator-types";

const TAXI_STAND_ROUTE_SNAP_DISTANCE = 18;
const TAXI_STAND_REUSED_STOP_PENALTY = 12 * 12;
const TAXI_STAND_ROUTE_SELECTION_LIMIT = 12;

export type TaxiStandRouteProjection = {
  route: RouteTemplate;
  segmentIndex: number;
  routeDistance: number;
  distanceSq: number;
  closest: THREE.Vector3;
  heading: THREE.Vector3;
  stopKey: string;
};

function projectionStopKey(routeId: string, routeDistance: number) {
  return `${routeId}:${Math.round(routeDistance / 6)}`;
}

export function projectPointToRoute(
  point: THREE.Vector3,
  route: RouteTemplate,
): TaxiStandRouteProjection | null {
  let best: TaxiStandRouteProjection | null = null;

  for (
    let segmentIndex = 0;
    segmentIndex < route.nodes.length - 1;
    segmentIndex += 1
  ) {
    const start = route.nodes[segmentIndex]!.point;
    const end = route.nodes[segmentIndex + 1]!.point;
    const delta = end.clone().sub(start);
    const lengthSq = delta.lengthSq();
    if (lengthSq < 0.0001) {
      continue;
    }

    const t = THREE.MathUtils.clamp(
      point.clone().sub(start).dot(delta) / lengthSq,
      0,
      1,
    );
    const closest = start.clone().lerp(end, t);
    const distanceSq = closest.distanceToSquared(point);
    if (best && distanceSq >= best.distanceSq) {
      continue;
    }

    const heading = delta.normalize();
    const segmentLength =
      route.segmentLengths[segmentIndex] ?? Math.sqrt(lengthSq);
    const routeDistance =
      (route.cumulative[segmentIndex] ?? 0) + segmentLength * t;

    best = {
      route,
      segmentIndex,
      routeDistance,
      distanceSq,
      closest,
      heading,
      stopKey: projectionStopKey(route.id, routeDistance),
    };
  }

  return best;
}

function routeProjectionScore(
  projection: TaxiStandRouteProjection,
  usedStopKeys?: Set<string>,
) {
  return (
    projection.distanceSq +
    (usedStopKeys?.has(projection.stopKey) ? TAXI_STAND_REUSED_STOP_PENALTY : 0) -
    roadRank(projection.route.roadClass) * 0.45
  );
}

export function nearestTaxiStandRouteProjection(
  point: THREE.Vector3,
  routes: RouteTemplate[],
  usedStopKeys?: Set<string>,
) {
  let best: TaxiStandRouteProjection | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const route of routes) {
    const projection = projectPointToRoute(point, route);
    if (!projection) {
      continue;
    }

    const score = routeProjectionScore(projection, usedStopKeys);
    if (score < bestScore) {
      best = projection;
      bestScore = score;
    }
  }

  if (
    !best ||
    Math.sqrt(best.distanceSq) > TAXI_STAND_ROUTE_SNAP_DISTANCE
  ) {
    return null;
  }

  return best;
}

export function sideSignForProjection(
  point: THREE.Vector3,
  projection: TaxiStandRouteProjection,
) {
  const right = new THREE.Vector3(
    projection.heading.z,
    0,
    -projection.heading.x,
  ).normalize();
  return right.dot(point.clone().sub(projection.closest)) >= 0 ? 1 : -1;
}

export function selectTaxiStandRoutes(
  taxiStandLandmarks: TaxiStandLandmark[],
  routes: RouteTemplate[],
  maximumCount = TAXI_STAND_ROUTE_SELECTION_LIMIT,
) {
  const selectedRoutes: RouteTemplate[] = [];
  const selectedRouteIds = new Set<string>();

  for (const stand of taxiStandLandmarks) {
    if (selectedRoutes.length >= maximumCount) {
      break;
    }

    const projection = nearestTaxiStandRouteProjection(stand.position, routes);
    if (!projection || selectedRouteIds.has(projection.route.id)) {
      continue;
    }

    selectedRouteIds.add(projection.route.id);
    selectedRoutes.push(projection.route);
  }

  return selectedRoutes;
}
