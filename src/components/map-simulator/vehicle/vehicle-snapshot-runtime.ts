import type * as THREE from "three";
import { createVehicleGroup } from "@/components/map-simulator/vehicle";
import {
  setTaxiAppearance,
  syncVehicleTransform,
} from "@/components/map-simulator/vehicle";
import {
  copyVehicleMotionState,
  createVehicleMotionState,
} from "@/components/map-simulator/road";
import type {
  Hotspot,
  RouteTemplate,
  Vehicle,
  VehicleMotionState,
} from "@/components/map-simulator/types";
import type {
  VehiclePoseSnapshot,
  VehicleSnapshot,
} from "@/components/map-simulator/simulation";
import {
  trafficVehicleModelKeyForSeed,
  type TrafficVehicleModelKey,
} from "@/components/map-simulator/vehicle";

type VehicleSnapshotRouteContext = {
  routeById: Map<string, RouteTemplate>;
  taxiRoutePool: RouteTemplate[];
  trafficRoutePool: RouteTemplate[];
  loopRoutes: RouteTemplate[];
};

type CreateVehicleFromSnapshotParams = VehicleSnapshotRouteContext & {
  vehicleSnapshot: VehicleSnapshot;
  scene: THREE.Scene;
  hotspotById: Map<string, Hotspot>;
  taxiAssetTemplate: THREE.Group | null;
  trafficAssetTemplates: ReadonlyMap<TrafficVehicleModelKey, THREE.Group>;
  onTaxiClickTarget?: (clickTarget: THREE.Object3D) => void;
};

type ApplyVehicleSnapshotParams = VehicleSnapshotRouteContext & {
  vehicle: Vehicle;
  vehicleSnapshot: VehicleSnapshot;
  hotspotById: Map<string, Hotspot>;
  interpolationAlpha: number;
};

export function writeMotionFromPose(
  target: VehicleMotionState,
  pose: VehiclePoseSnapshot,
) {
  target.position.copy(pose.position);
  target.lanePosition.copy(pose.lanePosition);
  target.heading.copy(pose.heading);
  target.right.copy(pose.right);
  target.yaw = pose.yaw;
  target.segmentIndex = pose.segmentIndex;
  target.nextStopIndex = pose.nextStopIndex;
}

function fallbackRouteForKind(
  kind: VehicleSnapshot["kind"],
  {
    taxiRoutePool,
    trafficRoutePool,
    loopRoutes,
  }: Omit<VehicleSnapshotRouteContext, "routeById">,
) {
  return kind === "taxi"
    ? taxiRoutePool[0] ?? trafficRoutePool[0] ?? loopRoutes[0]
    : trafficRoutePool[0] ?? taxiRoutePool[0] ?? loopRoutes[0];
}

export function resolveRouteForVehicleSnapshot(
  vehicleSnapshot: VehicleSnapshot,
  routeContext: VehicleSnapshotRouteContext,
) {
  return (
    routeContext.routeById.get(vehicleSnapshot.routeId) ??
    fallbackRouteForKind(vehicleSnapshot.kind, routeContext)
  );
}

export function createVehicleFromSnapshot({
  vehicleSnapshot,
  scene,
  routeById,
  taxiRoutePool,
  trafficRoutePool,
  loopRoutes,
  hotspotById,
  taxiAssetTemplate,
  trafficAssetTemplates,
  onTaxiClickTarget,
}: CreateVehicleFromSnapshotParams) {
  const route = resolveRouteForVehicleSnapshot(vehicleSnapshot, {
    routeById,
    taxiRoutePool,
    trafficRoutePool,
    loopRoutes,
  });
  if (!route) {
    return null;
  }

  const trafficModelKey =
    vehicleSnapshot.kind === "traffic"
      ? trafficVehicleModelKeyForSeed(vehicleSnapshot.renderSeed)
      : null;
  const trafficAssetTemplate = trafficModelKey
    ? trafficAssetTemplates.get(trafficModelKey) ?? null
    : null;
  const { group, bodyMaterial, signMaterial, clickTarget } = createVehicleGroup(
    vehicleSnapshot.kind,
    vehicleSnapshot.palette,
    vehicleSnapshot.kind === "taxi"
      ? { taxiAssetTemplate }
      : { importedAssetTemplate: trafficAssetTemplate, trafficModelKey },
  );
  scene.add(group);

  const vehicle: Vehicle = {
    id: vehicleSnapshot.id,
    kind: vehicleSnapshot.kind,
    route,
    group,
    bodyMaterial,
    signMaterial,
    baseSpeed: vehicleSnapshot.baseSpeed,
    speed: vehicleSnapshot.speed,
    distance: 0,
    safeGap: vehicleSnapshot.safeGap,
    length: vehicleSnapshot.length,
    currentSignalId: null,
    roadName: vehicleSnapshot.roadName,
    palette: vehicleSnapshot.palette,
    isOccupied: vehicleSnapshot.isOccupied,
    pickupHotspot:
      (vehicleSnapshot.pickupHotspotId
        ? hotspotById.get(vehicleSnapshot.pickupHotspotId)
        : null) ?? null,
    dropoffHotspot:
      (vehicleSnapshot.dropoffHotspotId
        ? hotspotById.get(vehicleSnapshot.dropoffHotspotId)
        : null) ?? null,
    jobAssignedAt: 0,
    pickupStartedAt: null,
    serviceTimer: 0,
    planMode: vehicleSnapshot.planMode,
    previousMotion: createVehicleMotionState(),
    motion: createVehicleMotionState(),
    renderMotion: createVehicleMotionState(),
  };

  group.userData.vehicleId = vehicle.id;
  group.traverse((child) => {
    child.userData.vehicleId = vehicle.id;
  });
  if (clickTarget && vehicle.kind === "taxi") {
    onTaxiClickTarget?.(clickTarget);
  }

  writeMotionFromPose(vehicle.previousMotion, vehicleSnapshot.previousPose);
  writeMotionFromPose(vehicle.motion, vehicleSnapshot.pose);
  copyVehicleMotionState(vehicle.renderMotion, vehicle.motion);
  setTaxiAppearance(vehicle);
  syncVehicleTransform(vehicle, 1);
  return vehicle;
}

export function applyVehicleSnapshot({
  vehicle,
  vehicleSnapshot,
  routeById,
  taxiRoutePool,
  trafficRoutePool,
  loopRoutes,
  hotspotById,
  interpolationAlpha,
}: ApplyVehicleSnapshotParams) {
  vehicle.route =
    resolveRouteForVehicleSnapshot(vehicleSnapshot, {
      routeById,
      taxiRoutePool,
      trafficRoutePool,
      loopRoutes,
    }) ?? vehicle.route;
  vehicle.baseSpeed = vehicleSnapshot.baseSpeed;
  vehicle.speed = vehicleSnapshot.speed;
  vehicle.safeGap = vehicleSnapshot.safeGap;
  vehicle.length = vehicleSnapshot.length;
  vehicle.roadName = vehicleSnapshot.roadName;
  vehicle.palette = vehicleSnapshot.palette;
  vehicle.planMode = vehicleSnapshot.planMode;
  vehicle.isOccupied = vehicleSnapshot.isOccupied;
  vehicle.pickupHotspot =
    (vehicleSnapshot.pickupHotspotId
      ? hotspotById.get(vehicleSnapshot.pickupHotspotId)
      : null) ?? null;
  vehicle.dropoffHotspot =
    (vehicleSnapshot.dropoffHotspotId
      ? hotspotById.get(vehicleSnapshot.dropoffHotspotId)
      : null) ?? null;
  writeMotionFromPose(vehicle.previousMotion, vehicleSnapshot.previousPose);
  writeMotionFromPose(vehicle.motion, vehicleSnapshot.pose);
  setTaxiAppearance(vehicle);
  syncVehicleTransform(vehicle, interpolationAlpha);
}
