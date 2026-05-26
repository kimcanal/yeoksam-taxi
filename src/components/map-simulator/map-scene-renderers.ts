import * as THREE from "three";
import {
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { CameraMode } from "@/components/map-simulator/camera-types";
import {
  resolvedRendererPixelRatioFor,
} from "@/components/map-simulator/render-budget-utils";
import { ENABLE_REALTIME_SHADOWS } from "@/components/map-simulator/scene-constants";

export function createMapSceneRenderers({
  container,
  cameraMode,
}: {
  container: HTMLDivElement;
  cameraMode: CameraMode;
}) {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    resolvedRendererPixelRatioFor(
      cameraMode,
      document.visibilityState === "hidden",
      devicePixelRatio,
    ),
  );
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = ENABLE_REALTIME_SHADOWS;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.domElement.style.cursor = "grab";
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
  renderer.domElement.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";

  container.appendChild(renderer.domElement);
  container.appendChild(labelRenderer.domElement);

  return { renderer, labelRenderer };
}
