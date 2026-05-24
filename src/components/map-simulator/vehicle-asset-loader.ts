import * as THREE from "three";
import {
  ASSET_FETCH_TIMEOUT_MS,
  TAXI_ASSET_TARGET_LENGTH,
} from "@/components/map-simulator/scene-constants";
import {
  disposeMaterialResources,
  sharedVehicleTemplatePlaceholderMaterial,
  vehicleAssetMaterialHint,
} from "@/components/map-simulator/core";

export const KAKAO_TAXI_ASSET_PATH = "/assets/kakao-taxi/Sonata_Taxi_01.fbx";
export const TAXI_ASSET_LOAD_DELAY_MS = 1_800;
export const TAXI_ASSET_IDLE_TIMEOUT_MS = 7_000;

let fbxLoaderWarnSuppressionDepth = 0;
let originalConsoleWarnForFbxLoader: typeof console.warn | null = null;

function beginSuppressingFbxLoaderWarnings() {
  if (fbxLoaderWarnSuppressionDepth === 0) {
    originalConsoleWarnForFbxLoader = console.warn;
    console.warn = (...args: unknown[]) => {
      const first = args[0];
      if (
        typeof first === "string" &&
        first.startsWith("THREE.FBXLoader:")
      ) {
        return;
      }
      originalConsoleWarnForFbxLoader?.(...args);
    };
  }

  fbxLoaderWarnSuppressionDepth += 1;
}

function endSuppressingFbxLoaderWarnings() {
  if (fbxLoaderWarnSuppressionDepth === 0) {
    return;
  }

  fbxLoaderWarnSuppressionDepth -= 1;
  if (fbxLoaderWarnSuppressionDepth === 0 && originalConsoleWarnForFbxLoader) {
    console.warn = originalConsoleWarnForFbxLoader;
    originalConsoleWarnForFbxLoader = null;
  }
}

export async function loadVehicleAssetTemplate(
  path: string,
  timeoutMs = ASSET_FETCH_TIMEOUT_MS,
) {
  const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
  const loader = new FBXLoader();

  return new Promise<THREE.Group>((resolve, reject) => {
    beginSuppressingFbxLoaderWarnings();
    let settled = false;
    let timeoutId = 0;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      endSuppressingFbxLoaderWarnings();
      callback();
    };

    timeoutId = window.setTimeout(() => {
      finish(() => {
        reject(new Error(`Timed out loading vehicle asset: ${path}`));
      });
    }, timeoutMs);

    loader.load(
      path,
      (object) => {
        finish(() => {
          resolve(object);
        });
      },
      undefined,
      (error) => {
        finish(() => {
          reject(error);
        });
      },
    );
  });
}

export function normalizeVehicleAssetTemplate(
  source: THREE.Group,
  targetLength: number,
) {
  const container = new THREE.Group();
  const model = source;
  container.add(model);

  let bounds = new THREE.Box3().setFromObject(container);
  const initialSize = bounds.getSize(new THREE.Vector3());
  if (initialSize.x > initialSize.z * 1.12) {
    model.rotation.y = Math.PI / 2;
    bounds = new THREE.Box3().setFromObject(container);
  }

  const normalizedSize = bounds.getSize(new THREE.Vector3());
  const length = Math.max(normalizedSize.z, normalizedSize.x, 0.001);
  model.scale.setScalar(targetLength / length);

  bounds = new THREE.Box3().setFromObject(container);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= bounds.min.y;

  const sourceMaterials = new Set<THREE.Material>();
  container.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    child.castShadow = true;
    child.receiveShadow = true;
    child.userData.vehicleMaterialHint = vehicleAssetMaterialHint(child);
    child.userData.skipMaterialDispose = true;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.Material) || sourceMaterials.has(material)) {
        return;
      }
      sourceMaterials.add(material);
      disposeMaterialResources(material);
    });
    child.material = sharedVehicleTemplatePlaceholderMaterial();
  });

  return container;
}

export function normalizeTaxiAssetTemplate(source: THREE.Group) {
  return normalizeVehicleAssetTemplate(source, TAXI_ASSET_TARGET_LENGTH);
}
