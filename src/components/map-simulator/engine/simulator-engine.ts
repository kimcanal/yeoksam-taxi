import {
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { WeatherMode } from "@/components/map-simulator/environment";
import type {
  BaseCameraMode,
  CameraFocusTarget,
  CameraMode,
  CameraPitchControlState,
  CameraYawControlState,
  FpsMode,
} from "@/components/map-simulator/camera";
import type {
  Stats,
  SceneStatus,
  SimulationData,
  Vehicle,
} from "@/components/map-simulator/types";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";
import { disposeHierarchy } from "@/components/map-simulator/utils";
import {
  pitchFromControlValue,
  yawFromControlValue,
} from "@/components/map-simulator/camera";
import {
  disposeEnvironmentVisualResources,
  disposeSimulatorSceneLayers,
  removeSceneLabels,
} from "@/components/map-simulator/engine/simulator-layers";
import { createSimulatorLoopClock } from "@/components/map-simulator/engine/simulator-loop";
import { setupEngineScene } from "@/components/map-simulator/engine/engine-scene-setup";
import { createEngineAssetLoader } from "@/components/map-simulator/engine/engine-asset-loader";
import { createEngineInputHandler } from "@/components/map-simulator/engine/engine-input-handler";
import { createEngineCameraController } from "@/components/map-simulator/engine/engine-camera-controller";
import { createEngineSimulationDriver } from "@/components/map-simulator/engine/engine-simulation-driver";
import { createEngineVisualUpdater } from "@/components/map-simulator/engine/engine-visual-updater";

export type MapSimulatorSceneRuntimeProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  data: SimulationData | null;
  poiFeatureRowsRef: RefObject<MapPoiFeatureRow[]>;
  onPoiSelect?: (poiCode: string) => void;
  onDongSelect?: (dongName: string) => void;
  appliedTaxiCountRef: MutableRefObject<number>;
  appliedTrafficCountRef: MutableRefObject<number>;
  selectedDemandDongRef: MutableRefObject<string>;
  hasDemandDataRef: MutableRefObject<boolean>;
  selectedDemandScoreRef: MutableRefObject<number | null>;
  currentFiveMinuteDemandRef: MutableRefObject<number>;
  currentDemandVisualUnitsRef: MutableRefObject<number>;
  cameraModeRef: MutableRefObject<CameraMode>;
  followTaxiIdRef: MutableRefObject<string>;
  rideExitModeRef: MutableRefObject<BaseCameraMode>;
  showLabelsRef: MutableRefObject<boolean>;
  optionalLabelObjectsRef: MutableRefObject<CSS2DObject[]>;
  showTransitRef: MutableRefObject<boolean>;
  transitGroupRef: MutableRefObject<THREE.Group | null>;
  hoverRefreshRequestRef: MutableRefObject<number>;
  labelRefreshRequestRef: MutableRefObject<number>;
  fpsModeRef: MutableRefObject<FpsMode>;
  showNonRoadRef: MutableRefObject<boolean>;
  nonRoadGroupRef: MutableRefObject<THREE.Group | null>;
  showRoadNetworkRef: MutableRefObject<boolean>;
  roadNetworkGroupRef: MutableRefObject<THREE.Group | null>;
  cameraFocusTargetRef: MutableRefObject<CameraFocusTarget | null>;
  simulationDateRef: MutableRefObject<string>;
  simulationTimeRef: MutableRefObject<number>;
  weatherModeRef: MutableRefObject<WeatherMode>;
  cameraPitchControlRef: MutableRefObject<CameraPitchControlState>;
  cameraYawControlRef: MutableRefObject<CameraYawControlState>;
  setStatus: Dispatch<SetStateAction<SceneStatus>>;
  setStatusDetail: Dispatch<SetStateAction<string>>;
  setLoadingProgress: Dispatch<SetStateAction<number>>;
  setStats: Dispatch<SetStateAction<Stats>>;
  setFollowTaxiId: Dispatch<SetStateAction<string>>;
  setCameraMode: Dispatch<SetStateAction<CameraMode>>;
  onCameraFocusChange?: (focus: {
    x: number;
    z: number;
    label: string;
    headingX: number;
    headingZ: number;
    pitchControlValue: number;
    yawControlValue: number;
  }) => void;
};

export function createMapSimulatorEngine(props: MapSimulatorSceneRuntimeProps) {
  // --- 1. Scene Setup ---
  const ctx = setupEngineScene(props);
  if (!ctx) {
    return () => {};
  }

  const {
    scene,
    camera,
    renderer,
    labelRenderer,
    container,
    preventDefaultTouch,
    cameraRig,
    timer,
    _lateBound,
  } = ctx;

  const {
    cameraModeRef,
    fpsModeRef,
    cameraPitchControlRef,
    cameraYawControlRef,
    simulationDateRef,
    simulationTimeRef,
    weatherModeRef,
    setCameraMode,
    nonRoadGroupRef,
    roadNetworkGroupRef,
    transitGroupRef,
    optionalLabelObjectsRef,
  } = props;

  // --- 2. Create Sub-Systems ---
  const simDriver = createEngineSimulationDriver(ctx);
  const assetLoader = createEngineAssetLoader(ctx);

  const visualUpdater = createEngineVisualUpdater(
    ctx,
    () => ({ x: 0, y: 0 }), // temporary, replaced below
    () => false,
  );

  const cameraCtrlTemp = createEngineCameraController(
    ctx,
    () => ({ yawOffset: 0.22 }),
  );

  const enterRideMode = (vehicle: Vehicle) => {
    if (cameraModeRef.current === "ride") {
      return;
    }
    props.followTaxiIdRef.current = vehicle.id;
    props.setFollowTaxiId(vehicle.id);
    setCameraMode("ride");
  };

  const inputHandler = createEngineInputHandler(ctx, {
    syncCamera: cameraCtrlTemp.syncCamera,
    markHoverDirty: visualUpdater.markHoverDirty,
    markLabelVisibilityDirty: visualUpdater.markLabelVisibilityDirty,
    enterRideMode,
    applyDistrictPresentation: cameraCtrlTemp.applyDistrictPresentation,
    applyRenderBudget: (mode) => ctx.rendererController.applyRenderBudget(mode),
  });

  // Now create final versions with correct pointers
  const finalVisualUpdater = createEngineVisualUpdater(
    ctx,
    inputHandler.getPointerClient,
    inputHandler.getIsPointerInside,
  );

  const cameraController = createEngineCameraController(
    ctx,
    inputHandler.getFollowOrbit,
  );

  // Re-wire input handler callbacks with final controllers
  const finalInputHandler = createEngineInputHandler(ctx, {
    syncCamera: cameraController.syncCamera,
    markHoverDirty: finalVisualUpdater.markHoverDirty,
    markLabelVisibilityDirty: finalVisualUpdater.markLabelVisibilityDirty,
    enterRideMode,
    applyDistrictPresentation: cameraController.applyDistrictPresentation,
    applyRenderBudget: (mode) => ctx.rendererController.applyRenderBudget(mode),
  });

  // --- 3. Wire late-bound callbacks ---
  _lateBound.getTaxiAssetTemplate.current = assetLoader.getTaxiAssetTemplate;
  _lateBound.getTrafficAssetTemplates.current = assetLoader.getTrafficAssetTemplates;
  _lateBound.getLatestSimulationSnapshot.current = simDriver.getLatestSnapshot;
  _lateBound.isSceneDisposed.current = () => ctx.sceneDisposed;
  _lateBound.resetVehicleSimulationAccumulator.current = simDriver.resetVehicleSimulationAccumulator;
  _lateBound.markVisualsDirty.current = finalVisualUpdater.markVisualsDirty;
  _lateBound.renderNow.current = () => {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };
  _lateBound.getHighlightedDongNames.current = finalVisualUpdater.getHighlightedDongNames;
  _lateBound.getPointer.current = finalInputHandler.getPointerClient;
  _lateBound.setHighlightedDongNames.current = finalVisualUpdater.setBoundaryDongHighlight;

  // --- 4. Frame Clock ---
  const frameClock = createSimulatorLoopClock({ timer });

  // --- 5. Pitch/Yaw control tracking ---
  let appliedPitchControlVersion = cameraPitchControlRef.current.version;
  let appliedYawControlVersion = cameraYawControlRef.current.version;

  // --- 6. Initialize ---
  finalInputHandler.attach();
  const { environmentSettings, rendererController } = ctx;

  environmentSettings.applyEnvironment(
    simulationDateRef.current,
    simulationTimeRef.current,
    weatherModeRef.current,
    true, // forceInstant = true on initial load
  );
  environmentSettings.syncPrecipitationDensity(cameraModeRef.current);
  cameraController.syncCamera();

  ctx.vehicleRuntimeSync.syncVehicleLayerFromSnapshot([], 1);
  simDriver.resetSimulationSource(false);

  window.addEventListener("pointerdown", assetLoader.markUserInteraction, true);
  window.addEventListener("wheel", assetLoader.markUserInteraction, true);
  const assetLoadSchedule = assetLoader.scheduleLoads();

  let animationFrame = 0;

  // --- 7. Animation Loop ---
  const animate = (timestamp?: number) => {
    animationFrame = window.requestAnimationFrame(animate);
    const frameTiming = frameClock.nextFrame({
      cameraMode: cameraModeRef.current,
      fpsMode: fpsModeRef.current,
      isPageHidden: ctx.isPageHidden,
      timestamp,
    });
    if (!frameTiming) {
      return;
    }
    const { delta, elapsedTime, frameTimestamp } = frameTiming;

    // Config change detection
    if (simDriver.hasConfigChanged()) {
      environmentSettings.applyEnvironment(
        simulationDateRef.current,
        simulationTimeRef.current,
        weatherModeRef.current,
      );
      simDriver.resetSimulationSource(true);
    }

    // Camera mode change
    const currentMode = cameraController.handleModeChange();
    finalVisualUpdater.markLabelVisibilityDirty();

    // Precipitation & vehicle density
    environmentSettings.syncPrecipitationDensity(currentMode);
    simDriver.syncVehicleDensity();

    // Pitch/yaw control sync
    const nextPitchControlVersion = cameraPitchControlRef.current.version;
    const nextYawControlVersion = cameraYawControlRef.current.version;
    const pitchControlChanged =
      nextPitchControlVersion !== appliedPitchControlVersion;
    const yawControlChanged = nextYawControlVersion !== appliedYawControlVersion;
    if ((pitchControlChanged || yawControlChanged) && currentMode !== "ride") {
      appliedPitchControlVersion = nextPitchControlVersion;
      appliedYawControlVersion = nextYawControlVersion;
      finalInputHandler.enterTouchMapMode();
      props.cameraFocusTargetRef.current = null;
      if (pitchControlChanged) {
        cameraRig.pitch = pitchFromControlValue(
          cameraPitchControlRef.current.value,
        );
      }
      if (yawControlChanged) {
        cameraRig.yaw = yawFromControlValue(cameraYawControlRef.current.value);
      }
      cameraController.syncCamera();
    }

    // Simulation stepping
    const { snapshot, interpolationAlpha } = simDriver.stepSimulation(delta);

    // Vehicle sync
    ctx.vehicleRuntimeSync.syncVehicleLayerFromSnapshot(
      snapshot.vehicles,
      interpolationAlpha,
    );
    ctx.vehicleRuntimeSync.syncSimulationTrails();
    finalVisualUpdater.updateSignals(snapshot.signals, snapshot.clock.elapsedTimeSeconds);

    // Camera update
    cameraController.updateCameraForMode(currentMode, delta);
    cameraController.reportMiniMapFocus(currentMode, frameTimestamp);

    // Visual updates
    finalVisualUpdater.updateDemandLayer(snapshot.clock.elapsedTimeSeconds);
    finalVisualUpdater.updateHotspots(snapshot.hotspots, snapshot.clock.elapsedTimeSeconds);
    const activePedestrianCount = finalVisualUpdater.updatePedestrians(snapshot.clock.elapsedTimeSeconds);
    simDriver.setActivePedestrians(activePedestrianCount);
    simDriver.commitSourceStats(snapshot.stats);
    environmentSettings.updatePrecipitation(delta, elapsedTime);
    environmentSettings.updateEnvironmentTransition(delta);
    finalVisualUpdater.updateAtmosphere(elapsedTime);

    // Labels & hover
    finalVisualUpdater.updateLabelsAndHover(delta, currentMode);

    // Render
    renderer.render(scene, camera);
    finalVisualUpdater.renderLabelsIfNeeded(delta);
  };

  animate();

  // --- 8. Cleanup ---
  return () => {
    ctx.sceneDisposed = true;
    rendererController.dispose();
    assetLoadSchedule.cancelTaxi();
    assetLoadSchedule.cancelTraffic();
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener("pointerdown", assetLoader.markUserInteraction, true);
    window.removeEventListener("wheel", assetLoader.markUserInteraction, true);
    finalInputHandler.detach();
    container.removeEventListener("touchstart", preventDefaultTouch);
    container.removeEventListener("touchmove", preventDefaultTouch);
    disposeEnvironmentVisualResources(ctx.environmentVisuals);
    ctx.transitHoverMaterial.dispose();
    timer.dispose();
    renderer.dispose();
    assetLoader.dispose();
    if (nonRoadGroupRef.current === ctx.nonRoadGroup) {
      nonRoadGroupRef.current = null;
    }
    if (roadNetworkGroupRef.current === ctx.roadNetworkOverlay) {
      roadNetworkGroupRef.current = null;
    }
    ctx.vehicleRuntimeSync.resetLayerReadiness();
    ctx.vehicleRuntimeSync.clearVehicleLayer();
    if (transitGroupRef.current === ctx.transitGroup) {
      transitGroupRef.current = null;
    }
    disposeSimulatorSceneLayers({
      buildingMassGroup: ctx.buildingMassLayer.group,
      demandVisualGroup: ctx.demandVisualLayer.group,
      dongBoundaryGroup: ctx.dongBoundaryLayer.group,
      hotspotVisualGroup: ctx.hotspotVisualGroup,
      nonRoadGroup: ctx.nonRoadGroup,
      pedestrianVisualGroup: ctx.pedestrianVisualGroup,
      poiMarkerGroup: ctx.poiMarkerGroup,
      roadNetworkOverlay: ctx.roadNetworkOverlay,
      simulationTrailLayer: ctx.simulationTrailLayer,
      staticRoadGroup: ctx.staticRoadLayer.group,
      trafficSignalGroup: ctx.trafficSignalGroup,
      transitGroup: ctx.transitGroup,
    });
    if (optionalLabelObjectsRef.current === ctx.optionalLabelObjects) {
      optionalLabelObjectsRef.current = [];
    }
    removeSceneLabels(ctx.labelObjects);
    disposeHierarchy(scene);
    container.removeChild(ctx.boundaryHintText);
    container.removeChild(renderer.domElement);
    container.removeChild(labelRenderer.domElement);
  };
}
