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

  const assetBounds = new THREE.Box3().setFromObject(group);
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
