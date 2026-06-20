import {
  copyVehicleMotionState,
  createVehicleMotionState,
  routeSegmentIndexAtDistance,
  resolveNextStop,
} from "@/components/map-simulator/road";
import type { RouteTemplate } from "@/components/map-simulator/types";
import { TRAFFIC_PALETTES } from "@/components/map-simulator/vehicle";
import { updateVehicleMotionState } from "@/components/map-simulator/vehicle";
import {
  castLocalVehicleForMotion,
  type LocalVehicle,
} from "@/components/map-simulator/simulation";

type CreateLocalVehicleParams = {
  index: number;
  totalCount: number;
  route: RouteTemplate;
  routeSlotIndex?: number;
  routeSlotCount?: number;
};

function stableUnitInterval(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x100000000;
}

function routeSpawnDistance({
  index,
  route,
  routeSlotIndex = index,
  routeSlotCount = 1,
}: CreateLocalVehicleParams) {
  if (route.totalLength <= 0) {
    return 0;
  }

  const slotCount = Math.max(routeSlotCount, 1);
  const slotIndex = routeSlotIndex % slotCount;
  const phase =
    0.18 +
    stableUnitInterval(`${route.id}:${index}:${slotIndex}`) * 0.64;

  if (route.isLoop) {
    return (route.totalLength / slotCount) * (slotIndex + phase);
  }

  const edgeMargin = Math.min(
    24,
    Math.max(6, route.totalLength * 0.06),
  );
  if (route.totalLength <= edgeMargin * 2) {
    return route.totalLength * phase;
  }

  const usableLength = route.totalLength - edgeMargin * 2;
  return edgeMargin + (usableLength / slotCount) * (slotIndex + phase);
}

// Presentation-layer lane variance: enough to prevent visual clumping without modeling real lanes.
function routeLaneOffsetBias({
  index,
  route,
  routeSlotIndex = index,
}: CreateLocalVehicleParams) {
  const usableRoadHalfWidth = route.roadWidth * 0.5 - route.laneOffset - 0.38;
  const maxBias = Math.max(0, Math.min(0.52, usableRoadHalfWidth));
  if (maxBias < 0.05) {
    return 0;
  }

  const lanePattern = [0, -0.72, 0.66, -0.34, 0.38] as const;
  const patternValue = lanePattern[(index + routeSlotIndex) % lanePattern.length]!;
  const noise =
    (stableUnitInterval(`lane:${route.id}:${index}:${routeSlotIndex}`) - 0.5) *
    0.24;
  return (patternValue + noise) * maxBias;
}

export function createLocalTaxiVehicle({
  index,
  totalCount,
  route,
  routeSlotIndex,
  routeSlotCount,
}: CreateLocalVehicleParams): LocalVehicle {
  const laneOffsetBias = routeLaneOffsetBias({
    index,
    totalCount,
    route,
    routeSlotIndex,
    routeSlotCount,
  });
  const vehicle: LocalVehicle = {
    id: `taxi-${index}`,
    kind: "taxi",
    route,
    baseSpeed: 7.1 + (index % 4) * 0.55,
    speed: 0,
    distance: routeSpawnDistance({
      index,
      totalCount,
      route,
      routeSlotIndex,
      routeSlotCount,
    }),
    safeGap: 7.8,
    laneOffsetBias,
    length: 4.6,
    currentSignalId: null,
    roadName: route.name,
    palette: {
      body: 0xffcc4d,
      cabin: 0x1e252e,
      sign: 0xffd970,
    },
    isOccupied: false,
    pickupHotspot: null,
    dropoffHotspot: null,
    jobAssignedAt: 0,
    pickupStartedAt: null,
    serviceTimer: 0,
    blockedSeconds: 0,
    planMode: "traffic",
    previousMotion: createVehicleMotionState(),
    motion: createVehicleMotionState(),
    renderMotion: createVehicleMotionState(),
    renderSeed: index,
  };
  initializeLocalVehicleMotion(vehicle);
  return vehicle;
}

export function createLocalTrafficVehicle({
  index,
  totalCount,
  route,
  routeSlotIndex,
  routeSlotCount,
}: CreateLocalVehicleParams): LocalVehicle {
  const laneOffsetBias = routeLaneOffsetBias({
    index,
    totalCount,
    route,
    routeSlotIndex,
    routeSlotCount,
  });
  const vehicle: LocalVehicle = {
    id: `traffic-${index}`,
    kind: "traffic",
    route,
    baseSpeed: 5.6 + (index % 5) * 0.4,
    speed: 0,
    distance: routeSpawnDistance({
      index,
      totalCount,
      route,
      routeSlotIndex,
      routeSlotCount,
    }),
    safeGap: 6.4,
    laneOffsetBias,
    length: 4.2,
    currentSignalId: null,
    roadName: route.name,
    palette: TRAFFIC_PALETTES[index % TRAFFIC_PALETTES.length]!,
    isOccupied: false,
    pickupHotspot: null,
    dropoffHotspot: null,
    jobAssignedAt: 0,
    pickupStartedAt: null,
    serviceTimer: 0,
    blockedSeconds: 0,
    planMode: "traffic",
    previousMotion: createVehicleMotionState(),
    motion: createVehicleMotionState(),
    renderMotion: createVehicleMotionState(),
    renderSeed: index,
  };
  initializeLocalVehicleMotion(vehicle);
  return vehicle;
}

function initializeLocalVehicleMotion(vehicle: LocalVehicle) {
  vehicle.motion.segmentIndex = routeSegmentIndexAtDistance(
    vehicle.route,
    vehicle.distance,
    0,
  );
  vehicle.motion.nextStopIndex = resolveNextStop(
    vehicle.route,
    vehicle.distance,
    0,
  ).index;
  updateVehicleMotionState(castLocalVehicleForMotion(vehicle));
  copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
  copyVehicleMotionState(vehicle.renderMotion, vehicle.motion);
}
