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
