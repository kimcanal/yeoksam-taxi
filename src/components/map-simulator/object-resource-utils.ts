import * as THREE from "three";

const MATERIAL_TEXTURE_KEYS = [
  "map",
  "alphaMap",
  "aoMap",
  "bumpMap",
  "displacementMap",
  "emissiveMap",
  "envMap",
  "lightMap",
  "metalnessMap",
  "normalMap",
  "roughnessMap",
  "specularMap",
  "clearcoatMap",
  "clearcoatNormalMap",
  "clearcoatRoughnessMap",
  "sheenColorMap",
  "sheenRoughnessMap",
  "thicknessMap",
  "transmissionMap",
] as const;

export function markMeshResourceSharing(
  mesh: THREE.Mesh,
  {
    geometry = true,
    material = false,
  }: { geometry?: boolean; material?: boolean } = {},
) {
  if (geometry) {
    mesh.userData.skipGeometryDispose = true;
  }
  if (material) {
    mesh.userData.skipMaterialDispose = true;
  }
  return mesh;
}

export function disposeMaterialResources(material: THREE.Material) {
  const materialWithTextures = material as THREE.Material &
    Partial<Record<(typeof MATERIAL_TEXTURE_KEYS)[number], THREE.Texture | null>>;

  MATERIAL_TEXTURE_KEYS.forEach((key) => {
    materialWithTextures[key]?.dispose?.();
  });
  material.dispose();
}

export function disposeObject3DResources(object: THREE.Object3D) {
  object.traverse((child) => {
    const resourceHolder = child as THREE.Object3D & {
      geometry?: { dispose?: () => void };
      material?: THREE.Material | THREE.Material[];
    };
    if (!resourceHolder.userData.skipGeometryDispose) {
      resourceHolder.geometry?.dispose?.();
    }
    if (resourceHolder.userData.skipMaterialDispose) {
      return;
    }
    if (Array.isArray(resourceHolder.material)) {
      resourceHolder.material.forEach((material) => {
        if (material instanceof THREE.Material) {
          disposeMaterialResources(material);
        }
      });
    } else if (resourceHolder.material instanceof THREE.Material) {
      disposeMaterialResources(resourceHolder.material);
    }
  });
}
