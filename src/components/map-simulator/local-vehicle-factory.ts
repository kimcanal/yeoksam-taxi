import {
  copyVehicleMotionState,
  createVehicleMotionState,
  routeSegmentIndexAtDistance,
  resolveNextStop,
} from "@/components/map-simulator/route-motion-utils";
import type { RouteTemplate } from "@/components/map-simulator/map-simulator-types";
import { TRAFFIC_PALETTES } from "@/components/map-simulator/vehicle-palettes";
import { updateVehicleMotionState } from "@/components/map-simulator/vehicle-runtime-utils";
import {
  castLocalVehicleForMotion,
  type LocalVehicle,
} from "@/components/map-simulator/local-simulation-types";

type CreateLocalVehicleParams = {
  index: number;
  totalCount: number;
  route: RouteTemplate;
};

export function createLocalTaxiVehicle({
  index,
  totalCount,
  route,
}: CreateLocalVehicleParams): LocalVehicle {
  const vehicle: LocalVehicle = {
    id: `taxi-${index}`,
    kind: "taxi",
    route,
    baseSpeed: 7.1 + (index % 4) * 0.55,
    speed: 0,
    distance: (route.totalLength / Math.max(totalCount, 1)) * index,
    safeGap: 7.8,
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
}: CreateLocalVehicleParams): LocalVehicle {
  const vehicle: LocalVehicle = {
    id: `traffic-${index}`,
    kind: "traffic",
    route,
    baseSpeed: 5.6 + (index % 5) * 0.4,
    speed: 0,
    distance: (route.totalLength / Math.max(totalCount, 1)) * index,
    safeGap: 6.4,
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
