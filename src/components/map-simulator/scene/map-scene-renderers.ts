import * as THREE from "three";
import {
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { CameraMode } from "@/components/map-simulator/camera";
import {
  resolvedRendererPixelRatioFor,
} from "@/components/map-simulator/utils";
import { ENABLE_REALTIME_SHADOWS } from "@/components/map-simulator/scene";

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

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  labelRenderer.domElement.style.touchAction = "none";

  container.style.cursor = "grab";
  container.style.touchAction = "none";

  const preventDefaultTouch = (e: TouchEvent) => {
    const el = e.target as HTMLElement | null;
    if (el) {
      const tag = el.tagName;
      const isInteractive =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        el.isContentEditable;
      if (isInteractive) {
        return;
      }
    }
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  container.addEventListener("touchstart", preventDefaultTouch, { passive: false });
  container.addEventListener("touchmove", preventDefaultTouch, { passive: false });

  container.appendChild(renderer.domElement);
  container.appendChild(labelRenderer.domElement);

  return { renderer, labelRenderer, preventDefaultTouch };
}
