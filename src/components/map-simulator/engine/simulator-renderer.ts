import * as THREE from "three";
import type { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { CameraMode } from "@/components/map-simulator/camera-types";
import { resolvedRendererPixelRatioFor } from "@/components/map-simulator/render-budget-utils";
import { ENABLE_REALTIME_SHADOWS } from "@/components/map-simulator/scene-constants";
import { sceneStore } from "@/components/map-simulator/simulator-stores";

export function createSimulatorRendererController({
  camera,
  container,
  getCameraMode,
  getIsPageHidden,
  labelRenderer,
  onViewportChanged,
  renderer,
  scene,
}: {
  camera: THREE.PerspectiveCamera;
  container: HTMLDivElement;
  getCameraMode: () => CameraMode;
  getIsPageHidden: () => boolean;
  labelRenderer: CSS2DRenderer;
  onViewportChanged: () => void;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
}) {
  const applyRenderBudget = (mode = getCameraMode()) => {
    const graphicsQuality = sceneStore.getState().graphicsQuality;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const pixelRatio =
      graphicsQuality === "performance"
        ? resolvedRendererPixelRatioFor(
            mode,
            getIsPageHidden(),
            devicePixelRatio,
          )
        : devicePixelRatio;

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight, false);

    const shouldEnableShadows =
      graphicsQuality === "quality" && ENABLE_REALTIME_SHADOWS;
    if (renderer.shadowMap.enabled !== shouldEnableShadows) {
      renderer.shadowMap.enabled = shouldEnableShadows;
      markSceneMaterialsDirty(scene);
    }
  };

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    applyRenderBudget(getCameraMode());
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
    onViewportChanged();
  };

  window.addEventListener("resize", resize);
  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => resize());
  resizeObserver?.observe(container);

  let lastGraphicsQuality = sceneStore.getState().graphicsQuality;
  const unsubscribeStore = sceneStore.subscribe(() => {
    const currentGraphicsQuality = sceneStore.getState().graphicsQuality;
    if (currentGraphicsQuality !== lastGraphicsQuality) {
      lastGraphicsQuality = currentGraphicsQuality;
      applyRenderBudget(getCameraMode());
    }
  });

  return {
    applyRenderBudget,
    resize,
    dispose() {
      unsubscribeStore();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
    },
  };
}

function markSceneMaterialsDirty(scene: THREE.Scene) {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => {
          material.needsUpdate = true;
        });
        return;
      }
      child.material.needsUpdate = true;
    }
  });
}
