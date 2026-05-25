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
  disposeHierarchy(object);
}

export function disposeHierarchy(object: THREE.Object3D) {
  const disposedGeometries = new WeakSet<object>();
  const disposedMaterials = new WeakSet<THREE.Material>();
  const disposedTextures = new WeakSet<THREE.Texture>();

  object.traverse((child) => {
    const resourceHolder = child as THREE.Object3D & {
      geometry?: { dispose?: () => void };
      material?: THREE.Material | THREE.Material[];
    };
    const geometry = resourceHolder.geometry;
    if (
      geometry &&
      !resourceHolder.userData.skipGeometryDispose &&
      !disposedGeometries.has(geometry)
    ) {
      geometry.dispose?.();
      disposedGeometries.add(geometry);
    }
    if (resourceHolder.userData.skipMaterialDispose) {
      return;
    }
    const disposeMaterial = (material: THREE.Material) => {
      if (disposedMaterials.has(material)) {
        return;
      }

      const materialWithTextures = material as THREE.Material &
        Partial<
          Record<(typeof MATERIAL_TEXTURE_KEYS)[number], THREE.Texture | null>
        >;
      MATERIAL_TEXTURE_KEYS.forEach((key) => {
        const texture = materialWithTextures[key];
        if (texture && !disposedTextures.has(texture)) {
          texture.dispose();
          disposedTextures.add(texture);
        }
      });
      material.dispose();
      disposedMaterials.add(material);
    };

    if (Array.isArray(resourceHolder.material)) {
      resourceHolder.material.forEach((material) => {
        if (material instanceof THREE.Material) {
          disposeMaterial(material);
        }
      });
    } else if (resourceHolder.material instanceof THREE.Material) {
      disposeMaterial(resourceHolder.material);
    }
  });
}
