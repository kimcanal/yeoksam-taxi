import * as THREE from "three";
import { markMeshResourceSharing } from "@/components/map-simulator/utils";
import {
  type VehicleKind,
  type VehiclePalette,
} from "@/components/map-simulator/types";
import type { TrafficVehicleModelKey } from "@/components/map-simulator/vehicle";
import {
  sharedImportedTaxiClickTargetGeometry,
  sharedImportedTaxiShadowGeometry,
  sharedImportedTaxiSignGeometry,
  sharedImportedTrafficShadowGeometry,
  vehicleAssetMaterialHint,
} from "@/components/map-simulator/vehicle";
import { createFallbackVehicleGroup } from "@/components/map-simulator/vehicle";

const IMPORTED_VEHICLE_SETTLE_Y = 0.035;
const IMPORTED_WHEEL_RADIUS = 0.26;
const IMPORTED_WHEEL_DEPTH = 0.18;

let importedVehicleWheelGeometry: THREE.CylinderGeometry | null = null;

function sharedImportedVehicleWheelGeometry() {
  importedVehicleWheelGeometry ??= new THREE.CylinderGeometry(
    IMPORTED_WHEEL_RADIUS,
    IMPORTED_WHEEL_RADIUS,
    IMPORTED_WHEEL_DEPTH,
    16,
  );
  return importedVehicleWheelGeometry;
}

function settleImportedVehicleBody(group: THREE.Group) {
  group.children.forEach((child) => {
    child.position.y -= IMPORTED_VEHICLE_SETTLE_Y;
  });
}

function addImportedVehicleWheels({
  group,
  material,
  bounds,
}: {
  group: THREE.Group;
  material: THREE.Material;
  bounds: THREE.Box3;
}) {
  const size = bounds.getSize(new THREE.Vector3());
  const wheelX = THREE.MathUtils.clamp(size.x * 0.56, 0.78, 1.08);
  const wheelZ = THREE.MathUtils.clamp(size.z * 0.34, 1.18, 1.58);
  const wheelY = IMPORTED_WHEEL_RADIUS - 0.01;
  const geometry = sharedImportedVehicleWheelGeometry();

  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      const wheel = markMeshResourceSharing(
        new THREE.Mesh(geometry, material),
      );
      wheel.userData.skipGeometryDispose = true;
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * wheelX, wheelY, end * wheelZ);
      wheel.castShadow = true;
      group.add(wheel);
    });
  });
}

function createTaxiAssetGroup(
  palette: VehiclePalette,
  taxiAssetTemplate: THREE.Group,
) {
  const group = taxiAssetTemplate.clone(true);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    emissive: 0x321500,
    emissiveIntensity: 0.1,
    roughness: 0.82,
    metalness: 0.16,
  });
  const signMaterial = new THREE.MeshStandardMaterial({
    color: palette.sign ?? 0xffe1aa,
    emissive: 0x7d4800,
    emissiveIntensity: 0.28,
    roughness: 0.66,
    metalness: 0.02,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x91a1ae,
    emissive: 0x101923,
    emissiveIntensity: 0.05,
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.9,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d2024,
    roughness: 0.94,
    metalness: 0.04,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x959aa0,
    roughness: 0.66,
    metalness: 0.24,
  });

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.userData.skipGeometryDispose = true;
    child.userData.skipMaterialDispose = false;

    const hint = vehicleAssetMaterialHint(child);
    if (hint === "body") {
      child.material = bodyMaterial;
      return;
    }
    if (hint === "glass") {
      child.material = glassMaterial;
      return;
    }
    if (hint === "trim") {
      child.material = trimMaterial;
      return;
    }
    if (hint === "metal") {
      child.material = metalMaterial;
      return;
    }
    child.material = metalMaterial;
  });

  settleImportedVehicleBody(group);
  const assetBounds = new THREE.Box3().setFromObject(group);
  addImportedVehicleWheels({
    group,
    material: trimMaterial,
    bounds: assetBounds,
  });
  const sign = markMeshResourceSharing(
    new THREE.Mesh(sharedImportedTaxiSignGeometry(), signMaterial),
  );
  sign.position.set(0, assetBounds.max.y + 0.1, -0.08);
  sign.castShadow = true;
  group.add(sign);

  const shadow = new THREE.Mesh(
    sharedImportedTaxiShadowGeometry(),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.userData.skipGeometryDispose = true;
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const clickTarget = new THREE.Mesh(
    sharedImportedTaxiClickTargetGeometry(),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
  );
  clickTarget.userData.skipGeometryDispose = true;
  clickTarget.position.y = 1.4;
  group.add(clickTarget);

  return { group, bodyMaterial, signMaterial, clickTarget };
}

function createTrafficAssetGroup(
  palette: VehiclePalette,
  trafficAssetTemplate: THREE.Group,
) {
  const group = trafficAssetTemplate.clone(true);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    emissive: 0x111417,
    emissiveIntensity: 0.05,
    roughness: 0.88,
    metalness: 0.12,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x96a6b3,
    emissive: 0x101923,
    emissiveIntensity: 0.04,
    roughness: 0.2,
    metalness: 0.08,
    transparent: true,
    opacity: 0.92,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x20242a,
    roughness: 0.95,
    metalness: 0.03,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x959ba2,
    roughness: 0.7,
    metalness: 0.22,
  });

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.userData.skipGeometryDispose = true;
    child.userData.skipMaterialDispose = false;

    const hint = vehicleAssetMaterialHint(child);
    if (hint === "body") {
      child.material = bodyMaterial;
      return;
    }
    if (hint === "glass") {
      child.material = glassMaterial;
      return;
    }
    if (hint === "trim") {
      child.material = trimMaterial;
      return;
    }
    if (hint === "metal") {
      child.material = metalMaterial;
      return;
    }
    child.material = metalMaterial;
  });

  settleImportedVehicleBody(group);
  const assetBounds = new THREE.Box3().setFromObject(group);
  addImportedVehicleWheels({
    group,
    material: trimMaterial,
    bounds: assetBounds,
  });
  const shadow = new THREE.Mesh(
    sharedImportedTrafficShadowGeometry(),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.userData.skipGeometryDispose = true;
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, bodyMaterial, signMaterial: null, clickTarget: null };
}

export function createVehicleGroup(
  kind: VehicleKind,
  palette: VehiclePalette,
  {
    taxiAssetTemplate = null,
    importedAssetTemplate = null,
    trafficModelKey = null,
  }: {
    taxiAssetTemplate?: THREE.Group | null;
    importedAssetTemplate?: THREE.Group | null;
    trafficModelKey?: TrafficVehicleModelKey | null;
  } = {},
) {
  if (kind === "taxi" && taxiAssetTemplate) {
    return createTaxiAssetGroup(palette, taxiAssetTemplate);
  }
  if (kind === "traffic" && importedAssetTemplate) {
    return createTrafficAssetGroup(palette, importedAssetTemplate);
  }

  return createFallbackVehicleGroup(kind, palette, { trafficModelKey });
}
