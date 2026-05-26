import * as THREE from "three";

export type VehicleMaterialHint = "body" | "glass" | "trim" | "metal" | "default";

let VEHICLE_TEMPLATE_PLACEHOLDER_MATERIAL: THREE.MeshBasicMaterial | null = null;
let IMPORTED_TAXI_SIGN_GEOMETRY: THREE.BoxGeometry | null = null;
let IMPORTED_TAXI_SHADOW_GEOMETRY: THREE.PlaneGeometry | null = null;
let IMPORTED_TRAFFIC_SHADOW_GEOMETRY: THREE.PlaneGeometry | null = null;
let IMPORTED_TAXI_CLICK_TARGET_GEOMETRY: THREE.BoxGeometry | null = null;

export function sharedVehicleTemplatePlaceholderMaterial() {
  VEHICLE_TEMPLATE_PLACEHOLDER_MATERIAL ??= new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  return VEHICLE_TEMPLATE_PLACEHOLDER_MATERIAL;
}

export function sharedImportedTaxiSignGeometry() {
  IMPORTED_TAXI_SIGN_GEOMETRY ??= new THREE.BoxGeometry(0.56, 0.12, 0.34);
  return IMPORTED_TAXI_SIGN_GEOMETRY;
}

export function sharedImportedTaxiShadowGeometry() {
  IMPORTED_TAXI_SHADOW_GEOMETRY ??= new THREE.PlaneGeometry(2.5, 5);
  return IMPORTED_TAXI_SHADOW_GEOMETRY;
}

export function sharedImportedTrafficShadowGeometry() {
  IMPORTED_TRAFFIC_SHADOW_GEOMETRY ??= new THREE.PlaneGeometry(2.5, 5.1);
  return IMPORTED_TRAFFIC_SHADOW_GEOMETRY;
}

export function sharedImportedTaxiClickTargetGeometry() {
  IMPORTED_TAXI_CLICK_TARGET_GEOMETRY ??= new THREE.BoxGeometry(3.2, 3.2, 6.8);
  return IMPORTED_TAXI_CLICK_TARGET_GEOMETRY;
}

export function vehicleAssetMaterialHint(object: THREE.Object3D): VehicleMaterialHint {
  const cachedHint = object.userData.vehicleMaterialHint;
  if (
    cachedHint === "body" ||
    cachedHint === "glass" ||
    cachedHint === "trim" ||
    cachedHint === "metal" ||
    cachedHint === "default"
  ) {
    return cachedHint;
  }

  const mesh = object as THREE.Mesh;
  const sourceLabel = [
    object.name,
    Array.isArray(mesh.material)
      ? mesh.material.map((material) => material?.name ?? "").join(" ")
      : mesh.material instanceof THREE.Material
        ? mesh.material.name
        : "",
  ]
    .join(" ")
    .toLowerCase();

  if (/paint|orange/.test(sourceLabel)) {
    return "body";
  }
  if (/glass|screen|window|blue_grass/.test(sourceLabel)) {
    return "glass";
  }
  if (/rubber|tire|wheel|plastic|black|air_duct/.test(sourceLabel)) {
    return "trim";
  }
  if (/silver|metallic|chrome/.test(sourceLabel)) {
    return "metal";
  }
  return "default";
}
