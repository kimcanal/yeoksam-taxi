import * as THREE from "three";
import type { EngineSceneContext } from "@/components/map-simulator/engine/engine-scene-setup";
import type { CameraMode } from "@/components/map-simulator/camera";
import type {
  DongBoundarySegment,
  Vehicle,
} from "@/components/map-simulator/types";
import {
  updateTrafficSignalVisuals,
} from "@/components/map-simulator/signal";
import {
  updateHotspotVisualLayer,
} from "@/components/map-simulator/scene";
import {
  updatePedestrianVisualLayer,
} from "@/components/map-simulator/scene";
import {
  updateDemandVisualLayer,
} from "@/components/map-simulator/demand";
import {
  HOVER_REFRESH_INTERVAL,
  LABEL_RENDER_INTERVAL,
  LABEL_VISIBILITY_REFRESH_INTERVAL,
} from "@/components/map-simulator/scene";
import type { SimulationSnapshot } from "@/components/map-simulator/simulation";

export function createEngineVisualUpdater(
  ctx: EngineSceneContext,
  getPointerClient: () => { x: number; y: number },
  getIsPointerInside: () => boolean,
) {
  const {
    signalVisuals,
    hotspotVisuals,
    pedestrianVisuals,
    demandVisualLayer,
    environmentVisuals,
    environmentSettings,
    signalById,
    dongBoundarySegments,
    frameSignalStates,
    camera,
    labelRenderer,
    scene,
    raycaster,
    pointerNdc,
    boundaryPointerHits,
    cameraRig,
    hoverHintController,
    labelVisibilityController,
    poiByCode,
    props,
  } = ctx;

  const {
    selectedDemandDongRef,
    hasDemandDataRef,
    selectedDemandScoreRef,
    currentFiveMinuteDemandRef,
    currentDemandVisualUnitsRef,
    hoverRefreshRequestRef,
    labelRefreshRequestRef,
  } = props;

  let hoverNeedsUpdate = true;
  let hoverRefreshAccumulator = HOVER_REFRESH_INTERVAL;
  let labelVisibilityNeedsUpdate = true;
  let labelVisibilityAccumulator = LABEL_VISIBILITY_REFRESH_INTERVAL;
  let labelRenderAccumulator = LABEL_RENDER_INTERVAL;
  let labelRenderPending = true;
  let visibleSceneLabelCount = 0;
  let appliedHoverRefreshRequest = hoverRefreshRequestRef.current;
  let appliedLabelRefreshRequest = labelRefreshRequestRef.current;
  const hoverCameraPosition = new THREE.Vector3();
  const hoverCameraQuaternion = new THREE.Quaternion();
  const labelCameraPosition = new THREE.Vector3();
  const labelCameraQuaternion = new THREE.Quaternion();

  let activeHighlightedDongNames: string[] = [];

  const setBoundaryDongHighlight = (dongNames: string[]) => {
    const activeDongs = new Set(dongNames.filter(Boolean));
    if (hasDemandDataRef.current && selectedDemandDongRef.current) {
      activeDongs.add(selectedDemandDongRef.current);
    }
    const previousDongs = activeHighlightedDongNames;
    if (
      previousDongs.length === activeDongs.size &&
      previousDongs.every((dongName) => activeDongs.has(dongName))
    ) {
      return;
    }

    activeHighlightedDongNames = [...activeDongs];
    markLabelVisibilityDirty();
  };

  const markHoverDirty = () => {
    hoverNeedsUpdate = true;
    hoverRefreshAccumulator = HOVER_REFRESH_INTERVAL;
  };

  const markLabelVisibilityDirty = () => {
    labelVisibilityNeedsUpdate = true;
    labelVisibilityAccumulator = LABEL_VISIBILITY_REFRESH_INTERVAL;
    labelRenderPending = true;
    labelRenderAccumulator = LABEL_RENDER_INTERVAL;
  };

  const syncLabelVisibility = (mode: CameraMode) => {
    visibleSceneLabelCount = labelVisibilityController.sync(
      mode,
      camera.position,
    );
    labelRenderPending = true;
  };

  // --- Signal / Hotspot / Pedestrian / Demand ---

  const updateSignals = (
    signalSnapshots: SimulationSnapshot["signals"],
    elapsedTime: number,
  ) => {
    updateTrafficSignalVisuals({
      elapsedTime,
      frameSignalStates,
      signalSnapshots,
      signalVisuals,
    });
  };

  const updateHotspots = (
    hotspotSnapshots: SimulationSnapshot["hotspots"],
    elapsedTime: number,
  ) => {
    updateHotspotVisualLayer({
      elapsedTime,
      hotspotSnapshots,
      hotspotVisuals,
      demandScore: THREE.MathUtils.clamp(selectedDemandScoreRef.current ?? 0, 0, 1),
      hasDemandData: hasDemandDataRef.current,
    });
  };

  const updatePedestrians = (_elapsedTime: number): number => {
    // 보행자 비활성화
    pedestrianVisuals.forEach((v) => { v.group.visible = false; });
    return 0;
  };

  const updateDemandLayer = (elapsedTime: number) => {
    updateDemandVisualLayer(demandVisualLayer, {
      selectedDongName: selectedDemandDongRef.current,
      hasDemandData: hasDemandDataRef.current,
      demandScore: THREE.MathUtils.clamp(
        selectedDemandScoreRef.current ?? 0,
        0,
        1,
      ),
      fiveMinuteDemand: Math.max(0, currentFiveMinuteDemandRef.current),
      visualUnits: Math.max(0, currentDemandVisualUnitsRef.current),
      elapsedTime,
    });
  };

  // --- Atmosphere ---

  const { sunHalo, moon, starsMaterial, cloudMaterial, cloudClusters, stormCloudMaterial, stormCloudClusters } = environmentVisuals;

  const updateAtmosphere = (elapsedTime: number) => {
    if (cloudMaterial.opacity > 0.001) {
      cloudClusters.forEach(({ cluster, anchor, phase }) => {
        cluster.position.x =
          anchor.x + Math.sin(elapsedTime * 0.035 + phase) * 5.5;
        cluster.position.z =
          anchor.z + Math.cos(elapsedTime * 0.028 + phase) * 4.2;
        cluster.position.y =
          anchor.y + Math.sin(elapsedTime * 0.06 + phase) * 0.9;
      });
    }
    if (stormCloudMaterial.opacity > 0.001) {
      stormCloudClusters.forEach(({ cluster, anchor, phase }) => {
        cluster.position.x =
          anchor.x + Math.sin(elapsedTime * 0.022 + phase) * 8.8;
        cluster.position.z =
          anchor.z + Math.cos(elapsedTime * 0.018 + phase) * 7.1;
        cluster.position.y =
          anchor.y + Math.sin(elapsedTime * 0.033 + phase) * 0.6;
      });
    }
    starsMaterial.opacity =
      environmentSettings.getActiveStarOpacity() *
      (0.92 + Math.sin(elapsedTime * 0.7) * 0.08);
    sunHalo.scale.setScalar(1 + Math.sin(elapsedTime * 0.9) * 0.03);
    moon.scale.setScalar(1 + Math.sin(elapsedTime * 0.55 + 1.4) * 0.02);
  };

  // --- Hover ---

  const setBoundaryHover = (segment: DongBoundarySegment | null) => {
    if (!segment) {
      hoverHintController.clear();
      return;
    }
    const boundaryDongs = [
      ...new Set(
        [segment.leftDong, segment.rightDong].filter(
          (dongName): dongName is string => Boolean(dongName),
        ),
      ),
    ];
    const hintText =
      boundaryDongs.length >= 2
        ? `${boundaryDongs[0]} · ${boundaryDongs[1]} 경계`
        : boundaryDongs[0]
          ? `${boundaryDongs[0]} 경계`
          : "행정동 경계";
    hoverHintController.update(hintText, "pointer", boundaryDongs);
  };

  const setTaxiHover = (vehicle: Vehicle | null) => {
    if (!vehicle) {
      hoverHintController.clear();
      return;
    }
    const taxiNumber = Number(vehicle.id.replace("taxi-", "")) + 1;
    hoverHintController.update(`차량 ${taxiNumber} · 클릭해서 차량 시점`, "pointer", []);
  };

  const setTransitHover = (stationName: string | null) => {
    if (!stationName) {
      hoverHintController.clear();
      return;
    }
    hoverHintController.update(stationName, "help", []);
  };

  const setPoiHover = (poiCode: string | null) => {
    if (!poiCode) {
      hoverHintController.clear();
      return;
    }
    const poi = poiByCode.get(poiCode);
    hoverHintController.update(
      poi ? `${poi.poi_name} · 관심 지점` : "관심 지점",
      "pointer",
      [],
    );
  };

  const updateBoundaryHover = () => {
    if (cameraRig.dragging || !getIsPointerInside()) {
      setBoundaryHover(null);
      return;
    }

    raycaster.setFromCamera(pointerNdc, camera);

    const hoveredTaxi = ctx.pointerPickController.resolveTaxiFromPointerRay();
    if (hoveredTaxi) {
      setTaxiHover(hoveredTaxi);
      return;
    }

    const hoveredPoiCode = ctx.pointerPickController.resolvePoiCodeFromPointerRay();
    if (hoveredPoiCode) {
      setPoiHover(hoveredPoiCode);
      return;
    }

    const hoveredTransitName = ctx.pointerPickController.resolveTransitNameFromPointerRay();
    if (hoveredTransitName) {
      setTransitHover(hoveredTransitName);
      return;
    }

    if (!dongBoundarySegments.length) {
      setBoundaryHover(null);
      return;
    }

    boundaryPointerHits.length = 0;
    raycaster.intersectObject(ctx.dongWallMesh, false, boundaryPointerHits);
    const hit = boundaryPointerHits[0];
    const nextIndex = hit?.instanceId ?? -1;
    if (nextIndex < 0) {
      setBoundaryHover(null);
      return;
    }

    setBoundaryHover(dongBoundarySegments[nextIndex] ?? null);
  };

  // --- Frame-level label/hover update ---

  const updateLabelsAndHover = (
    delta: number,
    mode: CameraMode,
  ) => {
    // Label refresh request check
    if (labelRefreshRequestRef.current !== appliedLabelRefreshRequest) {
      appliedLabelRefreshRequest = labelRefreshRequestRef.current;
      markLabelVisibilityDirty();
    }

    // Label camera movement detection
    if (
      labelCameraPosition.distanceToSquared(camera.position) > 4 ||
      1 - Math.abs(labelCameraQuaternion.dot(camera.quaternion)) > 0.0002
    ) {
      labelCameraPosition.copy(camera.position);
      labelCameraQuaternion.copy(camera.quaternion);
      labelVisibilityNeedsUpdate = true;
    }
    labelVisibilityAccumulator += delta;
    if (
      labelVisibilityNeedsUpdate &&
      labelVisibilityAccumulator >= LABEL_VISIBILITY_REFRESH_INTERVAL
    ) {
      syncLabelVisibility(mode);
      labelVisibilityNeedsUpdate = false;
      labelVisibilityAccumulator = 0;
    }

    // Hover refresh request check
    if (hoverRefreshRequestRef.current !== appliedHoverRefreshRequest) {
      appliedHoverRefreshRequest = hoverRefreshRequestRef.current;
      hoverNeedsUpdate = true;
    }

    // Hover camera movement detection
    if (
      hoverCameraPosition.distanceToSquared(camera.position) > 0.0001 ||
      1 - Math.abs(hoverCameraQuaternion.dot(camera.quaternion)) > 0.000001
    ) {
      hoverCameraPosition.copy(camera.position);
      hoverCameraQuaternion.copy(camera.quaternion);
      hoverNeedsUpdate = true;
    }
    hoverRefreshAccumulator += delta;
    if (
      hoverNeedsUpdate &&
      hoverRefreshAccumulator >= HOVER_REFRESH_INTERVAL
    ) {
      updateBoundaryHover();
      hoverNeedsUpdate = false;
      hoverRefreshAccumulator = 0;
    }
  };

  /** Render labels if pending. */
  const renderLabelsIfNeeded = (delta: number) => {
    labelRenderAccumulator += delta;
    if (
      labelRenderPending ||
      (visibleSceneLabelCount > 0 &&
        labelRenderAccumulator >= LABEL_RENDER_INTERVAL)
    ) {
      labelRenderer.render(scene, camera);
      labelRenderPending = false;
      labelRenderAccumulator = 0;
    }
  };

  return {
    markHoverDirty,
    markLabelVisibilityDirty,
    markVisualsDirty: () => {
      hoverNeedsUpdate = true;
      labelRenderPending = true;
      labelRenderAccumulator = 0;
    },
    syncLabelVisibility,
    updateSignals,
    updateHotspots,
    updatePedestrians,
    updateDemandLayer,
    updateAtmosphere,
    updateLabelsAndHover,
    renderLabelsIfNeeded,
    setBoundaryDongHighlight,
    getHighlightedDongNames: () => activeHighlightedDongNames,
  };
}
