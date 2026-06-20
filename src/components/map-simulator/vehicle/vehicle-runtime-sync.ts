import * as THREE from "three";
import { disposeObject3DResources } from "@/components/map-simulator/utils";
import type {
  Hotspot,
  RouteTemplate,
  Vehicle,
} from "@/components/map-simulator/types";
import type {
  SimulationSnapshot,
  VehicleSnapshot,
} from "@/components/map-simulator/simulation";
import {
  applyVehicleSnapshot,
  createVehicleFromSnapshot,
} from "@/components/map-simulator/vehicle";
import { createVehicleGroup } from "@/components/map-simulator/vehicle";
import {
  setTaxiAppearance,
  syncVehicleTransform,
} from "@/components/map-simulator/vehicle";
import type { createVehicleTrailLayer } from "@/components/map-simulator/vehicle";
import type {
  TrafficVehicleModelKey,
} from "@/components/map-simulator/vehicle";

type VehicleRuntimeSyncControllerOptions = {
  scene: THREE.Scene;
  routeById: Map<string, RouteTemplate>;
  taxiRoutePool: RouteTemplate[];
  trafficRoutePool: RouteTemplate[];
  loopRoutes: RouteTemplate[];
  hotspotById: Map<string, Hotspot>;
  vehicles: Vehicle[];
  taxiVehicles: Vehicle[];
  trafficVehicles: Vehicle[];
  taxiClickTargets: THREE.Object3D[];
  taxiById: Map<string, Vehicle>;
  vehicleById: Map<string, Vehicle>;
  simulationTrailLayer: ReturnType<typeof createVehicleTrailLayer>;
  simulationTrailPoints: {
    id: string;
    position: THREE.Vector3;
    color: number;
  }[];
  getTaxiAssetTemplate: () => THREE.Group | null;
  getTrafficAssetTemplates: () => ReadonlyMap<TrafficVehicleModelKey, THREE.Group>;
  getLatestSimulationSnapshot: () => SimulationSnapshot | null;
  isSceneDisposed: () => boolean;
  resetVehicleSimulationAccumulator: () => void;
  syncSelectedTaxi: () => void;
  renderNow: () => void;
  markVisualsDirty: () => void;
};

const VISUAL_SEPARATION_RADIUS = 2.85;
const VISUAL_SEPARATION_RADIUS_SQ =
  VISUAL_SEPARATION_RADIUS * VISUAL_SEPARATION_RADIUS;
const VISUAL_SEPARATION_MIN_DISTANCE_SQ = 0.09;
const VISUAL_SEPARATION_MAX_PAIR_NUDGE = 0.66;
const VISUAL_SEPARATION_MAX_TOTAL_NUDGE = 0.9;

function visuallySeparateCloseVehicles(vehicles: Vehicle[]) {
  if (vehicles.length < 2) {
    return;
  }

  const offsetX = new Array<number>(vehicles.length).fill(0);
  const offsetZ = new Array<number>(vehicles.length).fill(0);

  for (let leftIndex = 0; leftIndex < vehicles.length - 1; leftIndex += 1) {
    const left = vehicles[leftIndex]!;
    const leftPosition = left.renderMotion.lanePosition;

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < vehicles.length;
      rightIndex += 1
    ) {
      const right = vehicles[rightIndex]!;
      const rightPosition = right.renderMotion.lanePosition;
      const deltaX = rightPosition.x - leftPosition.x;
      const deltaZ = rightPosition.z - leftPosition.z;
      const distanceSq = deltaX * deltaX + deltaZ * deltaZ;

      if (distanceSq >= VISUAL_SEPARATION_RADIUS_SQ) {
        continue;
      }

      let separationX: number;
      let separationZ: number;
      const distance = Math.sqrt(
        Math.max(distanceSq, VISUAL_SEPARATION_MIN_DISTANCE_SQ),
      );

      if (distanceSq < VISUAL_SEPARATION_MIN_DISTANCE_SQ) {
        const stableDirection = left.id < right.id ? 1 : -1;
        separationX = left.renderMotion.right.x * stableDirection;
        separationZ = left.renderMotion.right.z * stableDirection;
      } else {
        separationX = deltaX / distance;
        separationZ = deltaZ / distance;
      }

      const nudge = Math.min(
        VISUAL_SEPARATION_MAX_PAIR_NUDGE,
        (VISUAL_SEPARATION_RADIUS - distance) * 0.44,
      );

      offsetX[leftIndex] -= separationX * nudge;
      offsetZ[leftIndex] -= separationZ * nudge;
      offsetX[rightIndex] += separationX * nudge;
      offsetZ[rightIndex] += separationZ * nudge;
    }
  }

  vehicles.forEach((vehicle, vehicleIndex) => {
    const x = offsetX[vehicleIndex]!;
    const z = offsetZ[vehicleIndex]!;
    if (Math.abs(x) < 0.001 && Math.abs(z) < 0.001) {
      return;
    }

    const offsetLength = Math.hypot(x, z);
    const offsetScale =
      offsetLength > VISUAL_SEPARATION_MAX_TOTAL_NUDGE
        ? VISUAL_SEPARATION_MAX_TOTAL_NUDGE / offsetLength
        : 1;

    vehicle.renderMotion.lanePosition.x += x * offsetScale;
    vehicle.renderMotion.lanePosition.z += z * offsetScale;
    vehicle.group.position.copy(vehicle.renderMotion.lanePosition);
  });
}

export function createVehicleRuntimeSyncController({
  scene,
  routeById,
  taxiRoutePool,
  trafficRoutePool,
  loopRoutes,
  hotspotById,
  vehicles,
  taxiVehicles,
  trafficVehicles,
  taxiClickTargets,
  taxiById,
  vehicleById,
  simulationTrailLayer,
  simulationTrailPoints,
  getTaxiAssetTemplate,
  getTrafficAssetTemplates,
  getLatestSimulationSnapshot,
  isSceneDisposed,
  resetVehicleSimulationAccumulator,
  syncSelectedTaxi,
  renderNow,
  markVisualsDirty,
}: VehicleRuntimeSyncControllerOptions) {
  let vehicleLayerReady = false;
  let activeVehicleIdentitySignature = "";

  const upgradeTaxiVehicleMeshes = () => {
    const taxiAssetTemplate = getTaxiAssetTemplate();
    if (!taxiAssetTemplate || !taxiVehicles.length) {
      return;
    }

    taxiClickTargets.length = 0;
    taxiVehicles.forEach((vehicle) => {
      const previousGroup = vehicle.group;
      const { group, bodyMaterial, signMaterial, clickTarget } =
        createVehicleGroup("taxi", vehicle.palette, { taxiAssetTemplate });

      group.userData.vehicleId = vehicle.id;
      group.traverse((child) => {
        child.userData.vehicleId = vehicle.id;
      });
      scene.add(group);

      vehicle.group = group;
      vehicle.bodyMaterial = bodyMaterial;
      vehicle.signMaterial = signMaterial;
      setTaxiAppearance(vehicle);
      syncVehicleTransform(vehicle, 1);
      if (clickTarget) {
        taxiClickTargets.push(clickTarget);
      }

      previousGroup.removeFromParent();
      disposeObject3DResources(previousGroup);
    });

    markVisualsDirty();
    renderNow();
  };

  const clearVehicleLayer = () => {
    vehicles.forEach((vehicle) => {
      vehicle.group.removeFromParent();
      disposeObject3DResources(vehicle.group);
    });
    vehicles.length = 0;
    taxiVehicles.length = 0;
    trafficVehicles.length = 0;
    taxiClickTargets.length = 0;
    taxiById.clear();
    vehicleById.clear();
    resetVehicleSimulationAccumulator();
    simulationTrailLayer.clear();
  };

  const syncVehicleLayerFromSnapshot = (
    vehicleSnapshots: VehicleSnapshot[],
    interpolationAlpha = 1,
  ) => {
    const nextIdentitySignature = vehicleSnapshots
      .map((vehicleSnapshot) => vehicleSnapshot.id)
      .join("|");
    const shouldRebuildVehicleGroups =
      !vehicleLayerReady ||
      nextIdentitySignature !== activeVehicleIdentitySignature;

    if (shouldRebuildVehicleGroups) {
      clearVehicleLayer();
      activeVehicleIdentitySignature = nextIdentitySignature;

      vehicleSnapshots.forEach((vehicleSnapshot) => {
        const vehicle = createVehicleFromSnapshot({
          vehicleSnapshot,
          scene,
          routeById,
          taxiRoutePool,
          trafficRoutePool,
          loopRoutes,
          hotspotById,
          taxiAssetTemplate: getTaxiAssetTemplate(),
          trafficAssetTemplates: getTrafficAssetTemplates(),
          onTaxiClickTarget: (clickTarget) => {
            taxiClickTargets.push(clickTarget);
          },
        });
        if (!vehicle) {
          return;
        }
        vehicleById.set(vehicle.id, vehicle);
        vehicles.push(vehicle);
        if (vehicle.kind === "taxi") {
          taxiVehicles.push(vehicle);
          taxiById.set(vehicle.id, vehicle);
        } else {
          trafficVehicles.push(vehicle);
        }
      });
      vehicleLayerReady = true;
    } else {
      vehicles.length = 0;
      taxiVehicles.length = 0;
      trafficVehicles.length = 0;

      vehicleSnapshots.forEach((vehicleSnapshot) => {
        const vehicle = vehicleById.get(vehicleSnapshot.id);
        if (!vehicle) {
          return;
        }

        vehicles.push(vehicle);
        if (vehicle.kind === "taxi") {
          taxiVehicles.push(vehicle);
          taxiById.set(vehicle.id, vehicle);
        } else {
          trafficVehicles.push(vehicle);
        }
      });
    }

    vehicleSnapshots.forEach((vehicleSnapshot) => {
      const vehicle = vehicleById.get(vehicleSnapshot.id);
      if (!vehicle) {
        return;
      }

      applyVehicleSnapshot({
        vehicle,
        vehicleSnapshot,
        routeById,
        taxiRoutePool,
        trafficRoutePool,
        loopRoutes,
        hotspotById,
        interpolationAlpha,
      });
    });

    visuallySeparateCloseVehicles(vehicles);
    syncSelectedTaxi();
  };

  const rebuildVehicleLayerFromLatestSnapshot = () => {
    const latestSimulationSnapshot = getLatestSimulationSnapshot();
    if (!latestSimulationSnapshot || isSceneDisposed()) {
      return;
    }

    vehicleLayerReady = false;
    activeVehicleIdentitySignature = "";
    syncVehicleLayerFromSnapshot(latestSimulationSnapshot.vehicles, 1);
    markVisualsDirty();
    renderNow();
  };

  const syncSimulationTrails = () => {
    // Completely disable trails to keep the map pristine, clean and realistic
    simulationTrailPoints.length = 0;
    simulationTrailLayer.clear();
  };

  return {
    clearVehicleLayer,
    isReady: () => vehicleLayerReady,
    rebuildVehicleLayerFromLatestSnapshot,
    resetLayerReadiness: () => {
      vehicleLayerReady = false;
      activeVehicleIdentitySignature = "";
    },
    syncSimulationTrails,
    syncVehicleLayerFromSnapshot,
    upgradeTaxiVehicleMeshes,
  };
}
