import * as THREE from "three";
import { ASSET_FETCH_TIMEOUT_MS } from "@/components/map-simulator/scene-constants";

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
