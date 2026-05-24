import * as THREE from "three";
import {
  CURBSIDE_EDGE_INSET_MAX,
  CURBSIDE_EDGE_INSET_MIN,
  CURBSIDE_EXTRA_OFFSET_MAX,
  HOTSPOT_SLOWDOWN_DISTANCE,
  VEHICLE_PROXIMITY_CELL_SIZE,
} from "@/components/map-simulator/scene-constants";
import type {
  NextStopState,
  RouteSample,
  RouteTemplate,
  Vehicle,
  VehicleMotionState,
  VehicleProximityBuckets,
  VehicleSimulationSample,
} from "@/components/map-simulator/core";

export function distanceXZ(start: THREE.Vector3, end: THREE.Vector3) {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

export function polygonAreaXZ(points: THREE.Vector3[]) {
  let usablePoints = points;
  if (usablePoints.length > 1) {
    const first = usablePoints[0];
    const last = usablePoints[usablePoints.length - 1];
    if (first.distanceToSquared(last) < 0.0001) {
      usablePoints = usablePoints.slice(0, -1);
    }
  }

  if (usablePoints.length < 3) {
    return 0;
  }

  let areaTwice = 0;
  usablePoints.forEach((point, index) => {
    const next = usablePoints[(index + 1) % usablePoints.length];
    areaTwice += point.x * next.z - next.x * point.z;
  });

  return Math.abs(areaTwice) * 0.5;
}

export function buildCumulative(points: THREE.Vector3[]) {
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(
      cumulative[index - 1] + distanceXZ(points[index - 1], points[index]),
    );
  }
  return cumulative;
}

export function buildSegmentLengthsFromCumulative(cumulative: number[]) {
  const segmentLengths: number[] = [];
  for (let index = 0; index < cumulative.length - 1; index += 1) {
    segmentLengths.push(cumulative[index + 1]! - cumulative[index]!);
  }
  return segmentLengths;
}

export function buildSegmentHeadings(points: THREE.Vector3[]) {
  const segmentHeadings: THREE.Vector3[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const heading = points[index + 1]!.clone().sub(points[index]!);
    if (heading.lengthSq() < 0.0001) {
      heading.set(0, 0, 1);
    } else {
      heading.normalize();
    }
    segmentHeadings.push(heading);
  }
  return segmentHeadings;
}

export function normalizeDistance(value: number, totalLength: number) {
  if (totalLength <= 0) {
    return 0;
  }
  return ((value % totalLength) + totalLength) % totalLength;
}

export function clampRouteDistance(route: RouteTemplate, value: number) {
  if (route.isLoop) {
    return normalizeDistance(value, route.totalLength);
  }
  return THREE.MathUtils.clamp(value, 0, route.totalLength);
}

export function routeDistanceAhead(
  route: RouteTemplate,
  current: number,
  target: number,
) {
  if (route.isLoop) {
    const normalizedCurrent = normalizeDistance(current, route.totalLength);
    const normalizedTarget = normalizeDistance(target, route.totalLength);
    if (normalizedTarget >= normalizedCurrent) {
      return normalizedTarget - normalizedCurrent;
    }
    return route.totalLength - normalizedCurrent + normalizedTarget;
  }

  if (target < current) {
    return Number.POSITIVE_INFINITY;
  }
  return target - current;
}

export function createRouteSample(): RouteSample {
  return {
    position: new THREE.Vector3(),
    heading: new THREE.Vector3(0, 0, 1),
    segmentIndex: 0,
  };
}

export function createVehicleMotionState(): VehicleMotionState {
  return {
    ...createRouteSample(),
    lanePosition: new THREE.Vector3(),
    right: new THREE.Vector3(1, 0, 0),
    yaw: 0,
    nextStopIndex: 0,
  };
}

export function copyVehicleMotionState(
  target: VehicleMotionState,
  source: VehicleMotionState,
) {
  target.position.copy(source.position);
  target.heading.copy(source.heading);
  target.segmentIndex = source.segmentIndex;
  target.lanePosition.copy(source.lanePosition);
  target.right.copy(source.right);
  target.yaw = source.yaw;
  target.nextStopIndex = source.nextStopIndex;
  return target;
}

export function createNextStopState(): NextStopState {
  return {
    index: -1,
    stop: null,
    ahead: Number.POSITIVE_INFINITY,
  };
}

export function createVehicleSimulationSample(
  vehicle: Vehicle,
): VehicleSimulationSample {
  return {
    vehicle,
    motion: vehicle.motion,
    nextStopState: createNextStopState(),
    proximityCellX: 0,
    proximityCellZ: 0,
  };
}

export function vehicleProximityCellCoord(value: number) {
  return Math.floor(value / VEHICLE_PROXIMITY_CELL_SIZE);
}

export function addVehicleSampleToBucket(
  buckets: VehicleProximityBuckets,
  sample: VehicleSimulationSample,
  cellX = sample.proximityCellX,
  cellZ = sample.proximityCellZ,
) {
  let column = buckets.get(cellX);
  if (!column) {
    column = new Map<number, VehicleSimulationSample[]>();
    buckets.set(cellX, column);
  }

  let bucket = column.get(cellZ);
  if (!bucket) {
    bucket = [];
    column.set(cellZ, bucket);
  }
  bucket.push(sample);
}

export function clearVehicleSampleBuckets(buckets: VehicleProximityBuckets) {
  buckets.forEach((column) => {
    column.forEach((bucket) => {
      bucket.length = 0;
    });
  });
}

export function syncVehicleSampleBucket(
  buckets: VehicleProximityBuckets,
  sample: VehicleSimulationSample,
) {
  const nextCellX = vehicleProximityCellCoord(sample.motion.lanePosition.x);
  const nextCellZ = vehicleProximityCellCoord(sample.motion.lanePosition.z);
  if (
    nextCellX === sample.proximityCellX &&
    nextCellZ === sample.proximityCellZ
  ) {
    return;
  }

  const currentColumn = buckets.get(sample.proximityCellX);
  const currentBucket = currentColumn?.get(sample.proximityCellZ);
  if (currentBucket) {
    const sampleIndex = currentBucket.indexOf(sample);
    if (sampleIndex !== -1) {
      currentBucket[sampleIndex] = currentBucket[currentBucket.length - 1];
      currentBucket.pop();
    }
    if (!currentBucket.length) {
      currentColumn?.delete(sample.proximityCellZ);
      if (currentColumn && !currentColumn.size) {
        buckets.delete(sample.proximityCellX);
      }
    }
  }

  sample.proximityCellX = nextCellX;
  sample.proximityCellZ = nextCellZ;
  addVehicleSampleToBucket(buckets, sample, nextCellX, nextCellZ);
}

export function routeSegmentIndexAtDistance(
  route: RouteTemplate,
  distance: number,
  segmentIndexHint = 0,
) {
  if (route.nodes.length < 2 || route.totalLength <= 0) {
    return 0;
  }

  const clampedDistance = clampRouteDistance(route, distance);
  let segmentIndex = THREE.MathUtils.clamp(
    segmentIndexHint,
    0,
    route.cumulative.length - 2,
  );

  while (
    segmentIndex < route.cumulative.length - 2 &&
    route.cumulative[segmentIndex + 1] < clampedDistance
  ) {
    segmentIndex += 1;
  }

  while (segmentIndex > 0 && route.cumulative[segmentIndex] > clampedDistance) {
    segmentIndex -= 1;
  }

  return segmentIndex;
}

export function sampleRouteInto(
  route: RouteTemplate,
  distance: number,
  target: RouteSample,
  segmentIndexHint = 0,
) {
  if (route.nodes.length < 2 || route.totalLength <= 0) {
    target.position.copy(route.nodes[0]?.point ?? new THREE.Vector3());
    target.heading.set(0, 0, 1);
    target.segmentIndex = 0;
    return target;
  }

  const clampedDistance = clampRouteDistance(route, distance);
  const segmentIndex = routeSegmentIndexAtDistance(
    route,
    clampedDistance,
    segmentIndexHint,
  );
  const start = route.nodes[segmentIndex].point;
  const end = route.nodes[segmentIndex + 1]?.point ?? start;
  const segmentStart = route.cumulative[segmentIndex];
  const segmentLength = Math.max(route.segmentLengths[segmentIndex] ?? 0, 0.0001);
  const segmentHeading = route.segmentHeadings[segmentIndex];
  if (segmentHeading) {
    target.heading.copy(segmentHeading);
  } else {
    target.heading.copy(end).sub(start);
    if (target.heading.lengthSq() < 0.0001) {
      target.heading.set(0, 0, 1);
    } else {
      target.heading.normalize();
    }
  }

  target.position
    .copy(start)
    .lerp(end, (clampedDistance - segmentStart) / segmentLength);
  target.segmentIndex = segmentIndex;
  return target;
}

export function writeRightVector(heading: THREE.Vector3, target: THREE.Vector3) {
  target.set(heading.z, 0, -heading.x);
  if (target.lengthSq() < 0.0001) {
    target.set(1, 0, 0);
  } else {
    target.normalize();
  }
  return target;
}

export function resolveNextStopInto(
  route: RouteTemplate,
  currentDistance: number,
  target: NextStopState,
  startIndex = 0,
) {
  if (!route.stops.length) {
    target.index = -1;
    target.stop = null;
    target.ahead = Number.POSITIVE_INFINITY;
    return target;
  }

  if (!route.isLoop) {
    let index = THREE.MathUtils.clamp(startIndex, 0, route.stops.length);
    while (
      index < route.stops.length &&
      route.stops[index].distance < currentDistance - 0.001
    ) {
      index += 1;
    }

    if (index >= route.stops.length) {
      target.index = route.stops.length;
      target.stop = null;
      target.ahead = Number.POSITIVE_INFINITY;
      return target;
    }

    target.index = index;
    target.stop = route.stops[index];
    target.ahead = Math.max(0, route.stops[index].distance - currentDistance);
    return target;
  }

  let bestIndex = THREE.MathUtils.clamp(startIndex, 0, route.stops.length - 1);
  let bestAhead = routeDistanceAhead(
    route,
    currentDistance,
    route.stops[bestIndex].distance,
  );

  for (let step = 0; step < route.stops.length - 1; step += 1) {
    const candidateIndex = (bestIndex + 1) % route.stops.length;
    const candidateAhead = routeDistanceAhead(
      route,
      currentDistance,
      route.stops[candidateIndex].distance,
    );
    if (candidateAhead > bestAhead + 0.001) {
      break;
    }
    bestIndex = candidateIndex;
    bestAhead = candidateAhead;
    if (bestAhead <= 0.001) {
      break;
    }
  }

  target.index = bestIndex;
  target.stop = route.stops[bestIndex];
  target.ahead = bestAhead;
  return target;
}

export function resolveNextStop(
  route: RouteTemplate,
  currentDistance: number,
  startIndex = 0,
) {
  return resolveNextStopInto(
    route,
    currentDistance,
    createNextStopState(),
    startIndex,
  );
}

export function offsetToRight(
  position: THREE.Vector3,
  heading: THREE.Vector3,
  offset: number,
) {
  const right = writeRightVector(heading, new THREE.Vector3());
  return position.clone().addScaledVector(right, offset);
}

export function curbsideLaneOffset(
  route: Pick<RouteTemplate, "roadWidth" | "laneOffset">,
) {
  const edgeInset = THREE.MathUtils.clamp(
    route.roadWidth * 0.16,
    CURBSIDE_EDGE_INSET_MIN,
    CURBSIDE_EDGE_INSET_MAX,
  );
  return THREE.MathUtils.clamp(
    route.roadWidth * 0.5 - edgeInset,
    route.laneOffset + 0.16,
    route.laneOffset + CURBSIDE_EXTRA_OFFSET_MAX,
  );
}

export function curbsideApproachBlend(vehicle: Vehicle) {
  if (vehicle.kind !== "taxi" || vehicle.route.isLoop) {
    return 0;
  }
  if (vehicle.serviceTimer > 0) {
    return 1;
  }

  const destinationGap = Math.max(0, vehicle.route.totalLength - vehicle.distance);
  if (destinationGap >= HOTSPOT_SLOWDOWN_DISTANCE) {
    return 0;
  }

  return THREE.MathUtils.smoothstep(
    1 - destinationGap / HOTSPOT_SLOWDOWN_DISTANCE,
    0,
    1,
  );
}

export function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function dampAngle(
  current: number,
  target: number,
  lambda: number,
  delta: number,
) {
  const gap = wrapAngle(target - current);
  return wrapAngle(current + gap * (1 - Math.exp(-lambda * delta)));
}

export function sampleRoute(
  route: RouteTemplate,
  distance: number,
  segmentIndexHint = 0,
) {
  return sampleRouteInto(
    route,
    distance,
    createRouteSample(),
    segmentIndexHint,
  );
}
