import * as THREE from "three";
import {
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { CameraMode } from "@/components/map-simulator/camera-types";
import { renderPixelRatioFor } from "@/components/map-simulator/render-budget-utils";

export function createMapSceneRenderers({
  container,
  cameraMode,
}: {
  container: HTMLDivElement;
  cameraMode: CameraMode;
}) {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      renderPixelRatioFor(
        cameraMode,
        document.visibilityState === "hidden",
      ),
    ),
  );
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.domElement.style.cursor = "grab";
  renderer.domElement.style.touchAction = "none";

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";

  container.appendChild(renderer.domElement);
  container.appendChild(labelRenderer.domElement);

  return { renderer, labelRenderer };
}
