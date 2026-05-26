import * as THREE from "three";
import {
  ENABLE_REALTIME_SHADOWS,
  SHADOW_MAP_SIZE,
} from "@/components/map-simulator/scene";

export type MapSceneBase = {
  scene: THREE.Scene;
  sceneFog: THREE.Fog;
  camera: THREE.PerspectiveCamera;
};

export type MapSceneLights = {
  ambientLight: THREE.AmbientLight;
  hemisphereLight: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
};

export function createMapSceneBase(container: HTMLDivElement): MapSceneBase {
  const scene = new THREE.Scene();
  const sceneFog = new THREE.Fog(0x07111b, 120, 360);
  scene.background = new THREE.Color(0x07111b);
  scene.fog = sceneFog;

  const camera = new THREE.PerspectiveCamera(
    48,
    container.clientWidth / container.clientHeight,
    0.1,
    1500,
  );
  camera.position.set(-120, 135, 150);

  return { scene, sceneFog, camera };
}

export function createMapSceneLights(scene: THREE.Scene): MapSceneLights {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0xb6d5ff, 0x172333, 0.82);
  scene.add(hemisphereLight);

  const sun = new THREE.DirectionalLight(0xfff1d0, 1.15);
  sun.position.set(110, 180, 80);
  sun.castShadow = ENABLE_REALTIME_SHADOWS;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 2.2;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -180;
  sun.shadow.camera.right = 180;
  sun.shadow.camera.top = 180;
  sun.shadow.camera.bottom = -180;
  scene.add(sun);
  scene.add(sun.target);

  return { ambientLight, hemisphereLight, sun };
}

export function syncSunShadowBounds(
  sun: THREE.DirectionalLight,
  mapSize: THREE.Vector3,
) {
  const shadowSpan = Math.max(mapSize.x, mapSize.z) * 0.72;
  sun.shadow.camera.far = Math.max(420, shadowSpan * 3.2);
  sun.shadow.camera.left = -shadowSpan;
  sun.shadow.camera.right = shadowSpan;
  sun.shadow.camera.top = shadowSpan;
  sun.shadow.camera.bottom = -shadowSpan;
  sun.shadow.camera.updateProjectionMatrix();
}
