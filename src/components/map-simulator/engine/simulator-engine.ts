import {
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { sceneStore } from "@/components/map-simulator/simulator-stores";
import {
  type WeatherMode,
} from "@/components/map-simulator/simulation-environment";
import {
  createVehicleTrailLayer,
  type VehicleTrailPoint,
} from "@/components/map-simulator/vehicle-trail-renderer";
import { createLocalSimulationSource } from "@/components/map-simulator/local-simulation-source";
import {
  CAMERA_DRAG_SENSITIVITY,
  CAMERA_LOOK_HEIGHT,
  CAMERA_MAX_DISTANCE,
  CAMERA_MAX_PITCH,
  CAMERA_MIN_DISTANCE,
  CAMERA_MIN_PITCH,
  CAMERA_TOUCH_ANCHOR_RADIUS,
  CAMERA_TOUCH_PITCH_LOCK_DISTANCE,
  CAMERA_TOUCH_PITCH_SENSITIVITY,
  CAMERA_TOUCH_PITCH_VERTICAL_RATIO,
  ENABLE_REALTIME_SHADOWS,
  HIDDEN_RENDER_FPS,
  HOVER_REFRESH_INTERVAL,
  LABEL_RENDER_INTERVAL,
  LABEL_VISIBILITY_REFRESH_INTERVAL,
  MAX_VEHICLE_SIMULATION_STEPS,
  TAXI_CLICK_MOVE_THRESHOLD,
  TAXI_VIEW_CAMERA_BACK_OFFSET,
  TAXI_VIEW_CAMERA_HEIGHT,
  TAXI_VIEW_CAMERA_SIDE_OFFSET,
  TAXI_VIEW_LOOK_AHEAD,
  VEHICLE_SIMULATION_STEP,
} from "@/components/map-simulator/scene-constants";
import {
  pitchControlValueFromPitch,
  pitchFromControlValue,
  yawControlValueFromYaw,
  yawFromControlValue,
} from "@/components/map-simulator/camera-control-utils";
import {
  resolvedRendererPixelRatioFor,
  resolveRenderCap,
  stabilizeRefreshRateBand,
} from "@/components/map-simulator/render-budget-utils";
import {
  KAKAO_TAXI_ASSET_PATH,
  KAKAO_TRAFFIC_ASSET_SPECS,
  TAXI_ASSET_IDLE_TIMEOUT_MS,
  TAXI_ASSET_LOAD_DELAY_MS,
  TRAFFIC_ASSET_IDLE_TIMEOUT_MS,
  TRAFFIC_ASSET_LOAD_DELAY_MS,
  type TrafficVehicleModelKey,
  loadVehicleAssetTemplate,
  normalizeTaxiAssetTemplate,
  normalizeTrafficAssetTemplate,
} from "@/components/map-simulator/vehicle-asset-loader";
import {
  disposeHierarchy,
  disposeObject3DResources,
} from "@/components/map-simulator/object-resource-utils";
import { createPoiMarkerLayer } from "@/components/map-simulator/poi-marker-layer";
import {
  createHotspotVisualLayer,
  updateHotspotVisualLayer,
} from "@/components/map-simulator/hotspot-visual-layer";
import {
  createPedestrianVisualLayer,
  updatePedestrianVisualLayer,
} from "@/components/map-simulator/pedestrian-visual-layer";
import {
  updateDemandVisualLayer,
} from "@/components/map-simulator/demand-visual-layer";
import {
  createMapRegionLabelLayer,
  createRoadLabelLayer,
} from "@/components/map-simulator/map-label-layer";
import { createSceneLabelVisibilityController } from "@/components/map-simulator/label-visibility-controller";
import { createTransitLandmarkLayer } from "@/components/map-simulator/transit-landmark-layer";
import { createVehicleRuntimeSyncController } from "@/components/map-simulator/useVehicleRuntimeSync";
import { boundaryHintElement } from "@/components/map-simulator/scene-label-elements";
import { buildRoadNetworkOverlay } from "@/components/map-simulator/road-network-overlay";
import { statsEqual } from "@/components/map-simulator/stats-utils";
import type {
  BaseCameraMode,
  CameraFocusTarget,
  CameraMode,
  CameraPitchControlState,
  CameraYawControlState,
  FpsMode,
} from "@/components/map-simulator/camera-types";
import type {
  DongBoundarySegment,
  Hotspot,
  HotspotVisual,
  PedestrianVisual,
  RouteTemplate,
  SceneLabelEntry,
  SignalData,
  SignalFlow,
  SignalVisual,
  Stats,
  SceneStatus,
  SimulationData,
  Vehicle,
} from "@/components/map-simulator/map-simulator-types";
import {
  dampAngle,
  wrapAngle,
} from "@/components/map-simulator/route-motion-utils";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand-types";
import {
  createMapSceneBase,
  createMapSceneLights,
  syncSunShadowBounds,
} from "@/components/map-simulator/map-scene-base";
import { createDeferredAssetLoadScheduler } from "@/components/map-simulator/deferred-asset-load-scheduler";
import { createEnvironmentVisuals } from "@/components/map-simulator/map-scene-environment-visuals";
import { createEnvironmentSettingsController } from "@/components/map-simulator/useEnvironmentSettings";
import { createMapSceneRenderers } from "@/components/map-simulator/map-scene-renderers";
import {
  createTrafficSignalLayer,
  updateTrafficSignalVisuals,
} from "@/components/map-simulator/traffic-signal-layer";
import { createMapSceneGeometry } from "@/components/map-simulator/useMapSceneGeometry";
import { createHoverHintController } from "@/components/map-simulator/hover-hint-controller";
import {
  anchoredPitchTouchIndex,
  createCameraTouchGestureState,
  createMapPointerPickController,
  firstTwoTouchPoints as readFirstTwoTouchPoints,
  isInteractiveTarget,
  rememberCurrentTouchGesture,
  setCameraTouchGestureBasis,
  type CameraTouchPoint,
} from "@/components/map-simulator/useCameraInteraction";
import type {
  SceneStaticContext,
  SimulationConfig,
  SimulationSnapshot,
  VehicleSnapshot,
} from "@/components/map-simulator/simulation-source";

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
  const { containerRef, data, poiFeatureRowsRef, onPoiSelect, onDongSelect, appliedTaxiCountRef, appliedTrafficCountRef, selectedDemandDongRef, hasDemandDataRef, selectedDemandScoreRef, currentFiveMinuteDemandRef, currentDemandVisualUnitsRef, cameraModeRef, followTaxiIdRef, rideExitModeRef, showLabelsRef, optionalLabelObjectsRef, showTransitRef, transitGroupRef, hoverRefreshRequestRef, labelRefreshRequestRef, fpsModeRef, showNonRoadRef, nonRoadGroupRef, showRoadNetworkRef, roadNetworkGroupRef, cameraFocusTargetRef, simulationDateRef, simulationTimeRef, weatherModeRef, cameraPitchControlRef, cameraYawControlRef, setStatus, setStatusDetail, setLoadingProgress, setStats, setFollowTaxiId, setCameraMode, onCameraFocusChange } = props;

  if (!data || !containerRef.current) {
    return () => {};
  }


    const container = containerRef.current;
    const simulationData = data;
    const simulationSource = createLocalSimulationSource();
    let sceneDisposed = false;
    let isPageHidden = document.visibilityState === "hidden";
    const { scene, sceneFog, camera } = createMapSceneBase(container);

    const { renderer, labelRenderer } = createMapSceneRenderers({
      container,
      cameraMode: cameraModeRef.current,
    });
    const { ambientLight, hemisphereLight, sun } = createMapSceneLights(scene);

    const buildingFeatures = data.buildingMasses;
    const dongRegions = data.dongRegions;
    const roadSegments = data.projectedRoadSegments;
    const transitLandmarks = data.transitLandmarks;
    const taxiStandLandmarks = data.taxiStandLandmarks;
    const dongBoundarySegments = data.dongBoundarySegments;
    const dongBoundaryWallHeight = THREE.MathUtils.clamp(
      (buildingFeatures.reduce((sum, building) => sum + building.height, 0) /
        Math.max(buildingFeatures.length, 1)) *
      1.85,
      7.2,
      10.4,
    );

    const bounds = new THREE.Box3();
    roadSegments.forEach((segment) => {
      bounds.expandByPoint(segment.start);
      bounds.expandByPoint(segment.end);
    });
    const size = bounds.getSize(new THREE.Vector3());
    const centerPoint = bounds.getCenter(new THREE.Vector3());
    const movementBounds = bounds
      .clone()
      .expandByVector(new THREE.Vector3(48, 0, 48));
    const maxMapDistance = Math.max(
      CAMERA_MAX_DISTANCE,
      Math.max(size.x, size.z) * 1.28,
    );
    const initialOffset = new THREE.Vector3(-120, 135, 150);
    const overviewYaw = Math.atan2(initialOffset.x, initialOffset.z);
    const cameraRig = {
      focus: centerPoint.clone(),
      yaw: overviewYaw,
      pitch: Math.atan2(
        initialOffset.y,
        Math.hypot(initialOffset.x, initialOffset.z),
      ),
      distance: THREE.MathUtils.clamp(
        initialOffset.length(),
        CAMERA_MIN_DISTANCE,
        maxMapDistance,
      ),
      dragging: false,
      pointerId: -1,
      pointerX: 0,
      pointerY: 0,
      dragMode: "pan" as "pan" | "orbit",
    };
    let lastMiniMapFocusReportTimestamp = 0;
    let lastMiniMapFocusReportX = Number.POSITIVE_INFINITY;
    let lastMiniMapFocusReportZ = Number.POSITIVE_INFINITY;
    let lastMiniMapFocusReportHeadingX = Number.POSITIVE_INFINITY;
    let lastMiniMapFocusReportHeadingZ = Number.POSITIVE_INFINITY;
    let lastMiniMapFocusReportPitchValue = Number.POSITIVE_INFINITY;
    let lastMiniMapFocusReportYawValue = Number.POSITIVE_INFINITY;
    let lastMiniMapFocusReportLabel = "";
    const followOrbit = { yawOffset: 0.22 };
    let activeCameraMode = cameraModeRef.current;
    let activeFollowTaxiId = followTaxiIdRef.current;
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(2, 2);
    const boundaryPointerHits: THREE.Intersection[] = [];
    const cameraOffset = new THREE.Vector3();
    const touchPanForwardDirection = new THREE.Vector3();
    const touchPanRightDirection = new THREE.Vector3();
    const followFocusTarget = new THREE.Vector3();
    let pointerInside = false;
    let pointerClientX = 0;
    let pointerClientY = 0;
    let pointerDownClientX = 0;
    let pointerDownClientY = 0;
    let pointerDragged = false;
    const activeTouchPointers = new globalThis.Map<
      number,
      CameraTouchPoint
    >();
    const touchGestureState = createCameraTouchGestureState();
    let hoverNeedsUpdate = true;
    let hoverRefreshAccumulator = HOVER_REFRESH_INTERVAL;
    let labelVisibilityNeedsUpdate = true;
    let labelVisibilityAccumulator = LABEL_VISIBILITY_REFRESH_INTERVAL;
    let labelRenderAccumulator = LABEL_RENDER_INTERVAL;
    let labelRenderPending = true;
    let visibleSceneLabelCount = 0;
    let cameraLookLift = CAMERA_LOOK_HEIGHT;
    let appliedHoverRefreshRequest = hoverRefreshRequestRef.current;
    let appliedLabelRefreshRequest = labelRefreshRequestRef.current;
    const hoverCameraPosition = new THREE.Vector3();
    const hoverCameraQuaternion = new THREE.Quaternion();
    const labelCameraPosition = new THREE.Vector3();
    const labelCameraQuaternion = new THREE.Quaternion();
    const rideCameraPosition = new THREE.Vector3();
    const rideHeading = new THREE.Vector3();
    const rideLookTarget = new THREE.Vector3();
    const rideDesiredLookTarget = new THREE.Vector3();
    const miniMapCameraDirection = new THREE.Vector3();
    let rideLookInitialized = false;
    let nonRoadGroup: THREE.Group | null = null;
    const districtLabelEntries: SceneLabelEntry[] = [];
    const optionalLabelEntries: SceneLabelEntry[] = [];
    let appliedPitchControlVersion = cameraPitchControlRef.current.version;
    let appliedYawControlVersion = cameraYawControlRef.current.version;

    const syncCamera = () => {
      cameraRig.pitch = THREE.MathUtils.clamp(
        cameraRig.pitch,
        CAMERA_MIN_PITCH,
        CAMERA_MAX_PITCH,
      );
      cameraRig.distance = THREE.MathUtils.clamp(
        cameraRig.distance,
        CAMERA_MIN_DISTANCE,
        maxMapDistance,
      );
      cameraRig.focus.x = THREE.MathUtils.clamp(
        cameraRig.focus.x,
        movementBounds.min.x,
        movementBounds.max.x,
      );
      cameraRig.focus.z = THREE.MathUtils.clamp(
        cameraRig.focus.z,
        movementBounds.min.z,
        movementBounds.max.z,
      );

      cameraOffset.set(
        Math.sin(cameraRig.yaw) * Math.cos(cameraRig.pitch),
        Math.sin(cameraRig.pitch),
        Math.cos(cameraRig.yaw) * Math.cos(cameraRig.pitch),
      ).multiplyScalar(cameraRig.distance);

      camera.position.copy(cameraRig.focus).add(cameraOffset);
      camera.lookAt(
        cameraRig.focus.x,
        cameraRig.focus.y + cameraLookLift,
        cameraRig.focus.z,
      );
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

    syncCamera();

    syncSunShadowBounds(sun, size);

    const mapSceneGeometry = createMapSceneGeometry({
      centerPoint,
      data,
      dongBoundaryWallHeight,
      mapSize: size,
      poiFeatureRows: [...(poiFeatureRowsRef.current ?? [])],
    });
    const { ground, groundMaterial, gridHelper, maskMesh, demandVisualLayer } = mapSceneGeometry;
    scene.add(ground);
    scene.add(gridHelper);
    scene.add(maskMesh);

    const dongFloorGroup = demandVisualLayer.dongFloorGroup;
    scene.add(demandVisualLayer.group);

    nonRoadGroup = mapSceneGeometry.nonRoadGroup;
    nonRoadGroup.visible = showNonRoadRef.current;
    scene.add(nonRoadGroup);
    nonRoadGroupRef.current = nonRoadGroup;

    const environmentVisuals = createEnvironmentVisuals({
      scene,
      mapSize: size,
      centerPoint,
    });
    const {
      sunDiscMaterial,
      sunHaloMaterial,
      sunHalo,
      sunsetGlowMaterial,
      moonMaterial,
      moon,
      starsGeometry,
      starsMaterial,
      cloudPuffGeometry,
      cloudMaterial,
      cloudClusters,
      stormCloudMaterial,
      stormCloudClusters,
      rainLayer,
      snowLayer,
    } = environmentVisuals;

    const signalById = new Map<string, SignalData>();
    const signalByKey = new Map<string, SignalData>();
    const signalVisuals: SignalVisual[] = [];
    const hotspotVisuals: HotspotVisual[] = [];
    const pedestrianVisuals: PedestrianVisual[] = [];
    const vehicles: Vehicle[] = [];
    const taxiVehicles: Vehicle[] = [];
    const trafficVehicles: Vehicle[] = [];
    const simulationTrailPoints: VehicleTrailPoint[] = [];
    const taxiTrailColorFor = (vehicle: Vehicle) =>
      vehicle.isOccupied ? 0xfb7185 : 0x22d3ee;
    let refreshRateBand: number | null = null;
    const taxiClickTargets: THREE.Object3D[] = [];
    const taxiById = new Map<string, Vehicle>();
    const vehicleById = new Map<string, Vehicle>();
    const hotspotPool: Hotspot[] = data.hotspotPool;
    let activePedestrians = 0;
    let crosswalkMaterial: THREE.MeshStandardMaterial | null = null;
    let stopLineMaterial: THREE.MeshStandardMaterial | null = null;
    let roadNetworkOverlay: THREE.Group | null = null;
    const taxiRoutePool: RouteTemplate[] = data.taxiRoutePool;
    const trafficRoutePool: RouteTemplate[] = data.trafficRoutePool;
    const loopRoutes: RouteTemplate[] = data.loopRoutes;
    const hotspotById = new globalThis.Map(
      hotspotPool.map((hotspot) => [hotspot.id, hotspot] as const),
    );
    const routeById = new globalThis.Map(
      [...loopRoutes, ...taxiRoutePool, ...trafficRoutePool].map((route) => [
        route.id,
        route,
      ] as const),
    );
    const staticContext: SceneStaticContext = {
      center: simulationData.center,
      graph: data.graph,
      signals: data.signals,
      hotspotPool,
      taxiRoutePool,
      trafficRoutePool,
    };
    let taxiAssetTemplate: THREE.Group | null = null;
    let trafficAssetTemplates = new Map<TrafficVehicleModelKey, THREE.Group>();
    let vehicleSimulationAccumulator = 0;
    let latestSimulationSnapshot: SimulationSnapshot | null = null;
    let vehicleRuntimeSync: ReturnType<
      typeof createVehicleRuntimeSyncController
    > | null = null;
    let appliedDateIso: string | null = null;
    let appliedWeatherMode: WeatherMode | null = null;
    let appliedTimeMinutes = -1;
    const frameSignalStates = new globalThis.Map<string, SignalFlow>();
    const activeVehicleDensity = {
      taxis: appliedTaxiCountRef.current,
      traffic: appliedTrafficCountRef.current,
    };

    const commitStatsSnapshot = (nextStats: Stats) => {
      setStats((current) => (statsEqual(current, nextStats) ? current : nextStats));
    };

    const syncSelectedTaxi = () => {
      if (followTaxiIdRef.current && taxiById.has(followTaxiIdRef.current)) {
        return;
      }

      const fallbackTaxiId = taxiVehicles[0]?.id ?? "";
      if (followTaxiIdRef.current !== fallbackTaxiId) {
        followTaxiIdRef.current = fallbackTaxiId;
        setFollowTaxiId(fallbackTaxiId);
      }
    };

    const upgradeTaxiVehicleMeshes = () => {
      vehicleRuntimeSync?.upgradeTaxiVehicleMeshes();
    };

    const clearVehicleLayer = () => {
      vehicleRuntimeSync?.clearVehicleLayer();
    };

    const syncVehicleLayerFromSnapshot = (
      vehicleSnapshots: VehicleSnapshot[],
      interpolationAlpha = 1,
    ) => {
      vehicleRuntimeSync?.syncVehicleLayerFromSnapshot(
        vehicleSnapshots,
        interpolationAlpha,
      );
    };

    const rebuildVehicleLayerFromLatestSnapshot = () => {
      vehicleRuntimeSync?.rebuildVehicleLayerFromLatestSnapshot();
    };

    const syncSimulationTrails = (nowMs: number) => {
      vehicleRuntimeSync?.syncSimulationTrails(nowMs);
    };

    const commitSourceStats = (snapshotStats: Stats) => {
      commitStatsSnapshot({
        ...snapshotStats,
        signals: signalVisuals.length,
        pedestrians: activePedestrians,
      });
    };

    const syncVehicleDensity = () => {
      if (!vehicleRuntimeSync?.isReady()) {
        return;
      }

      const nextTaxiCount = appliedTaxiCountRef.current;
      const nextTrafficCount = appliedTrafficCountRef.current;
      if (
        nextTaxiCount === activeVehicleDensity.taxis &&
        nextTrafficCount === activeVehicleDensity.traffic
      ) {
        return;
      }

      resetSimulationSource(true);
    };

    const updateDemandMapLayer = (elapsedTime: number) => {
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

    const dongBoundaryLayer = mapSceneGeometry.dongBoundaryLayer;
    const dongBoundaryGlowMaterial = dongBoundaryLayer.glowMaterial;
    const dongBoundaryLineMaterial = dongBoundaryLayer.lineMaterial;
    const dongWallMaterial = dongBoundaryLayer.wallMaterial;
    const dongWallMesh = dongBoundaryLayer.wallMesh;
    scene.add(dongBoundaryLayer.group);

    const staticRoadLayer = mapSceneGeometry.staticRoadLayer;
    const staticRoadGroup = staticRoadLayer.group;
    const roadMaterials = staticRoadLayer.roadMaterials;
    const roadSheenMaterial = staticRoadLayer.roadSheenMaterial;
    const laneMarkerMaterial = staticRoadLayer.laneMarkerMaterial;
    scene.add(staticRoadGroup);

    const buildingMassLayer = mapSceneGeometry.buildingMassLayer;
    const buildingMaterial = buildingMassLayer.buildingMaterial;
    const buildingRoofMaterial = buildingMassLayer.buildingRoofMaterial;
    scene.add(buildingMassLayer.group);
    const simulationTrailLayer = createVehicleTrailLayer({
      yOffset: 0.24,
      maxPoints: 34,
      minSampleDistance: 1.2,
      minSampleIntervalMs: 90,
      tailDurationMs: 4_400,
      staleAfterMs: 1_500,
      opacity: 0.72,
      headScale: 0.5,
    });
    scene.add(simulationTrailLayer.group);
    vehicleRuntimeSync = createVehicleRuntimeSyncController({
      scene,
      routeById,
      taxiRoutePool,
      trafficRoutePool,
      loopRoutes,
      hotspotById,
      vehicles,
      taxiVehicles,
      trafficVehicles,
      taxiClickTargets,
      taxiById,
      vehicleById,
      simulationTrailLayer,
      simulationTrailPoints,
      getTaxiAssetTemplate: () => taxiAssetTemplate,
      getTrafficAssetTemplates: () => trafficAssetTemplates,
      getLatestSimulationSnapshot: () => latestSimulationSnapshot,
      isSceneDisposed: () => sceneDisposed,
      resetVehicleSimulationAccumulator: () => {
        vehicleSimulationAccumulator = 0;
      },
      syncSelectedTaxi,
      taxiTrailColorFor,
      markVisualsDirty: () => {
        hoverNeedsUpdate = true;
        labelRenderPending = true;
        labelRenderAccumulator = 0;
      },
      renderNow: () => {
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
      },
    });
    const labelObjects: CSS2DObject[] = [];
    const optionalLabelObjects: CSS2DObject[] = [];
    const transitHoverTargets: THREE.Object3D[] = [];
    const poiClickTargets: THREE.Object3D[] = [];
    const poiByCode = new Map<string, MapPoiFeatureRow>();
    const boundaryHintText = boundaryHintElement();
    container.appendChild(boundaryHintText);
    const transitHoverMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    transitHoverMaterial.colorWrite = false;
    const regionLabelLayer = createMapRegionLabelLayer({
      buildings: buildingFeatures,
      dongs: dongRegions,
      showLabels: showLabelsRef.current,
    });
    labelObjects.push(...regionLabelLayer.labelObjects);
    optionalLabelObjects.push(...regionLabelLayer.optionalLabelObjects);
    districtLabelEntries.push(...regionLabelLayer.districtLabelEntries);
    optionalLabelEntries.push(...regionLabelLayer.optionalLabelEntries);
    regionLabelLayer.labelObjects.forEach((label) => scene.add(label));

    const transitLandmarkLayer = createTransitLandmarkLayer({
      showLabels: showLabelsRef.current,
      taxiStandLandmarks,
      transitHoverMaterial,
      transitLandmarks,
    });
    const transitGroup = transitLandmarkLayer.group;
    transitGroup.visible = showTransitRef.current;
    transitHoverTargets.push(...transitLandmarkLayer.hoverTargets);
    labelObjects.push(...transitLandmarkLayer.labelObjects);
    optionalLabelObjects.push(...transitLandmarkLayer.optionalLabelObjects);
    optionalLabelEntries.push(...transitLandmarkLayer.optionalLabelEntries);
    scene.add(transitGroup);
    transitGroupRef.current = transitGroup;

    const applyDistrictPresentation = (mode: CameraMode) => {
      const isOverview = mode === "overview";
      dongBoundaryGlowMaterial.opacity = isOverview ? 0.28 : 0.18;
      dongBoundaryLineMaterial.color.setHex(isOverview ? 0x93d7b7 : 0x7fc8a9);
      dongBoundaryLineMaterial.opacity = isOverview ? 0.88 : 0.74;
      dongWallMaterial.opacity = 0.001;
    };

    const applyRenderBudget = (mode: CameraMode) => {
      const graphicsQuality = sceneStore.getState().graphicsQuality;
      
      let pixelRatio = window.devicePixelRatio || 1;
      if (graphicsQuality === "performance") {
        pixelRatio = resolvedRendererPixelRatioFor(
          mode,
          isPageHidden,
          pixelRatio,
        );
      }
      
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(container.clientWidth, container.clientHeight, false);
      
      if (renderer.shadowMap.enabled !== (graphicsQuality === "quality" && ENABLE_REALTIME_SHADOWS)) {
        renderer.shadowMap.enabled = graphicsQuality === "quality" && ENABLE_REALTIME_SHADOWS;
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            child.material.needsUpdate = true;
          }
        });
      }
    };

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

    const labelVisibilityController = createSceneLabelVisibilityController({
      districtLabelEntries,
      optionalLabelEntries,
      getHighlightedDongNames: () => activeHighlightedDongNames,
      getShowLabels: () => showLabelsRef.current,
      getShowTransit: () => showTransitRef.current,
    });
    const syncLabelVisibility = (mode: CameraMode) => {
      visibleSceneLabelCount = labelVisibilityController.sync(
        mode,
        camera.position,
      );
      labelRenderPending = true;
    };

    const resolveFollowTaxi = () =>
      taxiById.get(followTaxiIdRef.current) ?? taxiVehicles[0] ?? null;

    const {
      findDongFromPointer,
      findPoiCodeFromPointer,
      findTaxiFromPointer,
      resolvePoiCodeFromPointerRay,
      resolveTaxiFromPointerRay,
      resolveTransitNameFromPointerRay,
    } = createMapPointerPickController({
      camera,
      dongFloorGroup,
      getShowTransit: () => showTransitRef.current,
      pointerNdc,
      poiClickTargets,
      raycaster,
      taxiById,
      taxiClickTargets,
      transitHoverTargets,
    });

    const enterRideMode = (vehicle: Vehicle) => {
      if (cameraModeRef.current !== "ride") {
        rideExitModeRef.current =
          cameraModeRef.current === "overview" ||
            cameraModeRef.current === "follow"
            ? cameraModeRef.current
            : "drive";
      }
      followTaxiIdRef.current = vehicle.id;
      setFollowTaxiId(vehicle.id);
      setCameraMode("ride");
    };

    const taxiHeading = (vehicle: Vehicle) => vehicle.renderMotion.yaw;

    const applyModePreset = (mode: CameraMode) => {
      if (mode === "overview") {
        cameraFocusTargetRef.current = null;
        cameraRig.focus.copy(centerPoint);
        cameraRig.focus.y = 0;
        cameraRig.yaw = overviewYaw;
        cameraRig.pitch = 0.7;
        cameraRig.distance = Math.sqrt(120 * 120 + 135 * 135 + 150 * 150);
        return;
      }

      if (mode === "follow") {
        const followedTaxi = resolveFollowTaxi();
        cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch, 0.46, 0.9);
        cameraRig.distance = THREE.MathUtils.clamp(cameraRig.distance, 20, 58);
        if (followedTaxi) {
          const baseYaw = taxiHeading(followedTaxi) + Math.PI;
          const nextOffset = wrapAngle(cameraRig.yaw - baseYaw);
          followOrbit.yawOffset =
            Math.abs(nextOffset) < 1.25 ? nextOffset : 0.22;
        }
        return;
      }

      if (mode === "ride") {
        rideLookInitialized = false;
        return;
      }

      cameraRig.focus.y = 0;
    };

    applyModePreset(activeCameraMode);
    applyDistrictPresentation(activeCameraMode);
    applyRenderBudget(activeCameraMode);
    syncCamera();

    const poiMarkerLayer = createPoiMarkerLayer({
      center: simulationData.center,
      poiRows: poiFeatureRowsRef.current ?? [],
    });
    const poiMarkerGroup = poiMarkerLayer.group;
    poiMarkerLayer.poiByCode.forEach((poi, poiCode) => {
      poiByCode.set(poiCode, poi);
    });
    poiClickTargets.push(...poiMarkerLayer.clickTargets);

    if (poiMarkerGroup.children.length > 0) {
      scene.add(poiMarkerGroup);
    }

    optionalLabelObjectsRef.current = optionalLabelObjects;

    const currentGraph = data.graph;
    roadNetworkOverlay = buildRoadNetworkOverlay(currentGraph);
    roadNetworkOverlay.visible = showRoadNetworkRef.current;
    scene.add(roadNetworkOverlay);
    roadNetworkGroupRef.current = roadNetworkOverlay;
    const signals = data.signals;
    signals.forEach((signal) => {
      signalById.set(signal.id, signal);
      signalByKey.set(signal.key, signal);
    });

    if (!taxiRoutePool.length || !trafficRoutePool.length) {
      return undefined;
    }

    const taxiRouteById = new globalThis.Map(
      taxiRoutePool.map((route) => [route.id, route]),
    );
    if (!hotspotPool.length) {
      return undefined;
    }

    const trafficSignalLayer = createTrafficSignalLayer({
      signals,
      loopRoutes,
    });
    signalVisuals.push(...trafficSignalLayer.signalVisuals);
    crosswalkMaterial = trafficSignalLayer.crosswalkMaterial;
    stopLineMaterial = trafficSignalLayer.stopLineMaterial;
    scene.add(trafficSignalLayer.group);
    const environmentSettings = createEnvironmentSettingsController({
      ambientLight,
      buildingMaterial,
      buildingRoofMaterial,
      centerPoint,
      crosswalkMaterial,
      environmentVisuals,
      getIsPageHidden: () => isPageHidden,
      groundMaterial,
      hemisphereLight,
      laneMarkerMaterial,
      renderer,
      roadMaterials,
      roadSheenMaterial,
      scene,
      sceneFog,
      simulationCenter: simulationData.center,
      stopLineMaterial,
      sun,
    });
    const applyEnvironment = environmentSettings.applyEnvironment;
    const syncPrecipitationDensity =
      environmentSettings.syncPrecipitationDensity;
    const updatePrecipitation = environmentSettings.updatePrecipitation;

    const hotspotVisualLayer = createHotspotVisualLayer({
      hotspots: hotspotPool,
      taxiRouteById,
    });
    hotspotVisuals.push(...hotspotVisualLayer.hotspotVisuals);
    scene.add(hotspotVisualLayer.group);

    const pedestrianVisualLayer = createPedestrianVisualLayer(signalVisuals);
    pedestrianVisuals.push(...pedestrianVisualLayer.pedestrianVisuals);
    scene.add(pedestrianVisualLayer.group);

    const roadLabelLayer = createRoadLabelLayer({
      routes: taxiRoutePool,
      showLabels: showLabelsRef.current,
    });
    labelObjects.push(...roadLabelLayer.labelObjects);
    optionalLabelObjects.push(...roadLabelLayer.optionalLabelObjects);
    optionalLabelEntries.push(...roadLabelLayer.optionalLabelEntries);
    roadLabelLayer.labelObjects.forEach((label) => scene.add(label));

    syncLabelVisibility(activeCameraMode);

    const buildSimulationConfig = (
      preserveState: boolean,
    ): SimulationConfig => ({
      taxiCount: appliedTaxiCountRef.current,
      trafficCount: appliedTrafficCountRef.current,
      clock: {
        dateIso: simulationDateRef.current,
        minutes: simulationTimeRef.current,
        weatherMode: weatherModeRef.current,
      },
      preserveState,
    });

    const syncSimulationSnapshot = (
      snapshot: SimulationSnapshot,
      interpolationAlpha = 1,
      signalElapsedTime = snapshot.clock.elapsedTimeSeconds,
    ) => {
      latestSimulationSnapshot = snapshot;
      syncVehicleLayerFromSnapshot(snapshot.vehicles, interpolationAlpha);
      updateSignalVisuals(snapshot.signals, signalElapsedTime);
      updateDemandMapLayer(signalElapsedTime);
      updateHotspotVisuals(snapshot.hotspots, signalElapsedTime);
      updatePedestrians(signalElapsedTime);
      commitSourceStats(snapshot.stats);
    };

    const resetSimulationSource = (preserveState: boolean) => {
      const nextConfig = buildSimulationConfig(preserveState);
      simulationSource.reset(nextConfig, staticContext);
      activeVehicleDensity.taxis = nextConfig.taxiCount;
      activeVehicleDensity.traffic = nextConfig.trafficCount;
      appliedDateIso = nextConfig.clock.dateIso;
      appliedTimeMinutes = nextConfig.clock.minutes;
      appliedWeatherMode = nextConfig.clock.weatherMode;
      vehicleSimulationAccumulator = 0;
      const snapshot = simulationSource.getSnapshot();
      syncSimulationSnapshot(snapshot, 1, snapshot.clock.elapsedTimeSeconds);
      if (!sceneDisposed) {
        setLoadingProgress(100);
        setStatus("ready");
        setStatusDetail("주행 준비 완료");
      }
      return snapshot;
    };

    const finalizeVehicleLayerSetup = () => {
      resetSimulationSource(false);

      applyEnvironment(
        simulationDateRef.current,
        simulationTimeRef.current,
        weatherModeRef.current,
      );
      applyModePreset(cameraModeRef.current);
      syncCamera();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      labelRenderPending = false;
      labelRenderAccumulator = 0;
    };

    let taxiAssetLoadStarted = false;
    const deferredAssetLoadScheduler = createDeferredAssetLoadScheduler({
      isDisposed: () => sceneDisposed,
    });
    const markUserInteraction = deferredAssetLoadScheduler.markUserInteraction;
    const scheduleDeferredAssetLoad = deferredAssetLoadScheduler.schedule;
    const loadTaxiAssetInBackground = () => {
      if (sceneDisposed || taxiAssetTemplate || taxiAssetLoadStarted) {
        return;
      }

      taxiAssetLoadStarted = true;
      void (async () => {
        let loadedTemplate: THREE.Group | null = null;
        try {
          loadedTemplate = await loadVehicleAssetTemplate(KAKAO_TAXI_ASSET_PATH);
          if (sceneDisposed) {
            disposeObject3DResources(loadedTemplate);
            return;
          }

          taxiAssetTemplate = normalizeTaxiAssetTemplate(loadedTemplate);
          loadedTemplate = null;
          if (sceneDisposed) {
            disposeObject3DResources(taxiAssetTemplate);
            taxiAssetTemplate = null;
            return;
          }

          upgradeTaxiVehicleMeshes();
        } catch (error) {
          if (loadedTemplate) {
            disposeObject3DResources(loadedTemplate);
          }
          console.warn(
            "Failed to load Kakao taxi asset; keeping refined fallback taxi.",
            error,
          );
        }
      })();
    };
    let trafficAssetLoadStarted = false;
    const disposeTrafficAssetTemplates = (
      templates: ReadonlyMap<TrafficVehicleModelKey, THREE.Group>,
    ) => {
      templates.forEach((template) => {
        disposeObject3DResources(template);
      });
    };
    const loadTrafficAssetsInBackground = () => {
      if (
        sceneDisposed ||
        trafficAssetTemplates.size > 0 ||
        trafficAssetLoadStarted
      ) {
        return;
      }

      trafficAssetLoadStarted = true;
      void (async () => {
        const nextTemplates = new Map<TrafficVehicleModelKey, THREE.Group>();
        for (const spec of KAKAO_TRAFFIC_ASSET_SPECS) {
          let loadedTemplate: THREE.Group | null = null;
          try {
            loadedTemplate = await loadVehicleAssetTemplate(spec.path);
            if (sceneDisposed) {
              disposeObject3DResources(loadedTemplate);
              loadedTemplate = null;
              break;
            }

            const normalizedTemplate = normalizeTrafficAssetTemplate(
              loadedTemplate,
              spec.targetLength,
            );
            loadedTemplate = null;
            nextTemplates.set(spec.key, normalizedTemplate);
          } catch (error) {
            if (loadedTemplate) {
              disposeObject3DResources(loadedTemplate);
            }
            console.warn(
              `Failed to load Kakao traffic asset: ${spec.path}`,
              error,
            );
          }
        }

        if (sceneDisposed) {
          disposeTrafficAssetTemplates(nextTemplates);
          return;
        }

        if (nextTemplates.size > 0) {
          disposeTrafficAssetTemplates(trafficAssetTemplates);
          trafficAssetTemplates = nextTemplates;
          rebuildVehicleLayerFromLatestSnapshot();
        }
      })();
    };

    const timer = new THREE.Timer();
    timer.connect(document);
    let animationFrame = 0;
    let lastRafTimestamp = 0;
    let lastVisibleRenderTimestamp = 0;
    let lastCappedRenderTimestamp = 0;
    let lastCapSignature = "";
    let refreshRateEstimate = 0;

    const updateSignalVisuals = (
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

    const updateHotspotVisuals = (
      hotspotSnapshots: SimulationSnapshot["hotspots"],
      elapsedTime: number,
    ) => {
      updateHotspotVisualLayer({
        elapsedTime,
        hotspotSnapshots,
        hotspotVisuals,
      });
    };

    const updatePedestrians = (elapsedTime: number) => {
      activePedestrians = updatePedestrianVisualLayer({
        elapsedTime,
        frameSignalStates,
        pedestrianVisuals,
        signalById,
      });
    };

    const hoverHintController = createHoverHintController({
      element: boundaryHintText,
      cursorElement: renderer.domElement,
      getPointer: () => ({ x: pointerClientX, y: pointerClientY }),
      isDragging: () => cameraRig.dragging,
      setHighlightedDongNames: setBoundaryDongHighlight,
    });
    const updateHoverHint = hoverHintController.update;
    const clearHoverHint = hoverHintController.clear;

    const setBoundaryHover = (segment: DongBoundarySegment | null) => {
      if (!segment) {
        clearHoverHint();
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
      updateHoverHint(hintText, "pointer", boundaryDongs);
    };

    const setTaxiHover = (vehicle: Vehicle | null) => {
      if (!vehicle) {
        clearHoverHint();
        return;
      }

      const taxiNumber = Number(vehicle.id.replace("taxi-", "")) + 1;
      updateHoverHint(`차량 ${taxiNumber} · 클릭해서 차량 시점`, "pointer", []);
    };

    const setTransitHover = (stationName: string | null) => {
      if (!stationName) {
        clearHoverHint();
        return;
      }

      updateHoverHint(stationName, "help", []);
    };

    const setPoiHover = (poiCode: string | null) => {
      if (!poiCode) {
        clearHoverHint();
        return;
      }

      const poi = poiByCode.get(poiCode);
      updateHoverHint(
        poi ? `${poi.poi_name} · 관심 지점` : "관심 지점",
        "pointer",
        [],
      );
    };

    const updateBoundaryHover = () => {
      if (cameraRig.dragging || !pointerInside) {
        setBoundaryHover(null);
        return;
      }

      raycaster.setFromCamera(pointerNdc, camera);

      const hoveredTaxi = resolveTaxiFromPointerRay();
      if (hoveredTaxi) {
        setTaxiHover(hoveredTaxi);
        return;
      }

      const hoveredPoiCode = resolvePoiCodeFromPointerRay();
      if (hoveredPoiCode) {
        setPoiHover(hoveredPoiCode);
        return;
      }

      const hoveredTransitName = resolveTransitNameFromPointerRay();
      if (hoveredTransitName) {
        setTransitHover(hoveredTransitName);
        return;
      }

      if (!dongBoundarySegments.length) {
        setBoundaryHover(null);
        return;
      }

      boundaryPointerHits.length = 0;
      raycaster.intersectObject(dongWallMesh, false, boundaryPointerHits);
      const hit = boundaryPointerHits[0];
      const nextIndex = hit?.instanceId ?? -1;
      if (nextIndex < 0) {
        setBoundaryHover(null);
        return;
      }

      setBoundaryHover(dongBoundarySegments[nextIndex] ?? null);
    };

    const onResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) {
        return;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      applyRenderBudget(cameraModeRef.current);
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
      markHoverDirty();
      markLabelVisibilityDirty();
    };

    const stopDragging = () => {
      cameraRig.dragging = false;
      cameraRig.pointerId = -1;
      cameraRig.dragMode = "pan";
      renderer.domElement.style.cursor = "grab";
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const enterTouchMapMode = () => {
      if (cameraModeRef.current === "ride") {
        return false;
      }
      cameraFocusTargetRef.current = null;
      if (followTaxiIdRef.current) {
        followTaxiIdRef.current = "";
        setFollowTaxiId("");
      }
      if (cameraModeRef.current !== "drive") {
        cameraModeRef.current = "drive";
        activeCameraMode = "drive";
        setCameraMode("drive");
        applyDistrictPresentation("drive");
        applyRenderBudget("drive");
        markLabelVisibilityDirty();
      }
      return true;
    };

    const currentTouchPoints = () =>
      readFirstTwoTouchPoints(activeTouchPointers);

    const setTouchGestureBasis = () => {
      setCameraTouchGestureBasis(touchGestureState, currentTouchPoints());
    };

    const panCameraByScreenDelta = (deltaX: number, deltaY: number) => {
      if (!enterTouchMapMode()) {
        return;
      }
      touchPanForwardDirection.copy(cameraRig.focus).sub(camera.position).setY(0);
      if (touchPanForwardDirection.lengthSq() < 0.0001) {
        touchPanForwardDirection.set(
          -Math.sin(cameraRig.yaw),
          0,
          -Math.cos(cameraRig.yaw),
        );
      }
      touchPanForwardDirection.normalize();
      touchPanRightDirection
        .set(-touchPanForwardDirection.z, 0, touchPanForwardDirection.x)
        .normalize();

      const panScale = Math.max(18, cameraRig.distance) * 0.0024;
      cameraRig.focus.addScaledVector(touchPanRightDirection, -deltaX * panScale);
      cameraRig.focus.addScaledVector(touchPanForwardDirection, deltaY * panScale);
    };

    const tiltCameraByScreenDelta = (deltaY: number) => {
      if (!enterTouchMapMode()) {
        return;
      }
      cameraRig.pitch = THREE.MathUtils.clamp(
        cameraRig.pitch - deltaY * CAMERA_TOUCH_PITCH_SENSITIVITY,
        CAMERA_MIN_PITCH,
        CAMERA_MAX_PITCH,
      );
    };

    const applyTouchGestureMove = () => {
      const [firstTouch, secondTouch] = currentTouchPoints();
      if (!firstTouch) {
        return;
      }

      if (!secondTouch) {
        const deltaX = firstTouch.x - touchGestureState.lastCenterX;
        const deltaY = firstTouch.y - touchGestureState.lastCenterY;
        panCameraByScreenDelta(deltaX, deltaY);
        touchGestureState.lastCenterX = firstTouch.x;
        touchGestureState.lastCenterY = firstTouch.y;
        touchGestureState.lastFirstX = firstTouch.x;
        touchGestureState.lastFirstY = firstTouch.y;
        syncCamera();
        return;
      }

      touchGestureState.usedMultiTouch = true;
      const centerX = (firstTouch.x + secondTouch.x) / 2;
      const centerY = (firstTouch.y + secondTouch.y) / 2;
      const distance = Math.max(
        1,
        Math.hypot(secondTouch.x - firstTouch.x, secondTouch.y - firstTouch.y),
      );
      const angle = Math.atan2(
        secondTouch.y - firstTouch.y,
        secondTouch.x - firstTouch.x,
      );
      const deltaX = centerX - touchGestureState.lastCenterX;
      const deltaY = centerY - touchGestureState.lastCenterY;

      if (touchGestureState.multiTouchMode !== "pitch") {
        const nextPitchTouchIndex = anchoredPitchTouchIndex(
          firstTouch,
          secondTouch,
          {
            anchorRadius: CAMERA_TOUCH_ANCHOR_RADIUS,
            pitchLockDistance: CAMERA_TOUCH_PITCH_LOCK_DISTANCE,
            verticalRatio: CAMERA_TOUCH_PITCH_VERTICAL_RATIO,
          },
        );
        if (nextPitchTouchIndex !== -1) {
          touchGestureState.multiTouchMode = "pitch";
          touchGestureState.pitchTouchIndex = nextPitchTouchIndex;
        }
      }

      if (touchGestureState.multiTouchMode === "pitch") {
        const pitchDeltaY =
          touchGestureState.pitchTouchIndex === 0
            ? firstTouch.y - touchGestureState.lastFirstY
            : secondTouch.y - touchGestureState.lastSecondY;
        tiltCameraByScreenDelta(pitchDeltaY);
        rememberCurrentTouchGesture(
          touchGestureState,
          firstTouch,
          secondTouch,
          distance,
          angle,
        );
        syncCamera();
        return;
      }

      panCameraByScreenDelta(deltaX, deltaY);
      if (touchGestureState.lastDistance > 0) {
        cameraRig.distance = THREE.MathUtils.clamp(
          cameraRig.distance * (touchGestureState.lastDistance / distance),
          CAMERA_MIN_DISTANCE,
          maxMapDistance,
        );
      }
      if (touchGestureState.lastDistance > 0) {
        cameraRig.yaw -= wrapAngle(angle - touchGestureState.lastAngle);
      }

      rememberCurrentTouchGesture(
        touchGestureState,
        firstTouch,
        secondTouch,
        distance,
        angle,
      );
      syncCamera();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.pointerType !== "touch" &&
        event.button !== 0 &&
        event.button !== 2
      ) {
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      pointerInside = true;
      pointerClientX = event.clientX - rect.left;
      pointerClientY = event.clientY - rect.top;
      pointerNdc.set(
        (pointerClientX / rect.width) * 2 - 1,
        -(pointerClientY / rect.height) * 2 + 1,
      );
      if (event.pointerType === "touch") {
        event.preventDefault();
        activeTouchPointers.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
          startX: event.clientX,
          startY: event.clientY,
        });
        renderer.domElement.setPointerCapture(event.pointerId);
        pointerDownClientX = event.clientX;
        pointerDownClientY = event.clientY;
        pointerDragged = false;
        if (activeTouchPointers.size >= 2) {
          touchGestureState.usedMultiTouch = true;
          pointerDragged = true;
        }
        setTouchGestureBasis();
        stopDragging();
        markHoverDirty();
        return;
      }
      event.preventDefault();
      cameraRig.dragging = true;
      cameraRig.pointerId = event.pointerId;
      cameraRig.pointerX = event.clientX;
      cameraRig.pointerY = event.clientY;
      cameraRig.dragMode = event.button === 2 ? "orbit" : "pan";
      pointerDownClientX = event.clientX;
      pointerDownClientY = event.clientY;
      pointerDragged = event.button === 2;
      renderer.domElement.style.cursor = "grabbing";
      markHoverDirty();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const withinBounds =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      pointerInside = withinBounds;
      if (withinBounds) {
        pointerClientX = event.clientX - rect.left;
        pointerClientY = event.clientY - rect.top;
        pointerNdc.set(
          (pointerClientX / rect.width) * 2 - 1,
          -(pointerClientY / rect.height) * 2 + 1,
        );
      } else {
        pointerNdc.set(2, 2);
      }
      markHoverDirty();

      if (event.pointerType === "touch") {
        const touchPoint = activeTouchPointers.get(event.pointerId);
        if (!touchPoint) {
          return;
        }
        event.preventDefault();
        touchPoint.x = event.clientX;
        touchPoint.y = event.clientY;
        if (
          Math.hypot(
            event.clientX - pointerDownClientX,
            event.clientY - pointerDownClientY,
          ) > TAXI_CLICK_MOVE_THRESHOLD
        ) {
          pointerDragged = true;
        }
        applyTouchGestureMove();
        return;
      }

      if (!cameraRig.dragging || event.pointerId !== cameraRig.pointerId) {
        return;
      }

      const deltaX = event.clientX - cameraRig.pointerX;
      const deltaY = event.clientY - cameraRig.pointerY;
      cameraRig.pointerX = event.clientX;
      cameraRig.pointerY = event.clientY;
      if (
        Math.hypot(
          event.clientX - pointerDownClientX,
          event.clientY - pointerDownClientY,
        ) > TAXI_CLICK_MOVE_THRESHOLD
      ) {
        pointerDragged = true;
      }
      if (cameraRig.dragMode === "pan") {
        panCameraByScreenDelta(deltaX, deltaY);
        syncCamera();
        return;
      }

      if (cameraModeRef.current === "follow") {
        followOrbit.yawOffset = wrapAngle(
          followOrbit.yawOffset - deltaX * CAMERA_DRAG_SENSITIVITY,
        );
      } else if (cameraModeRef.current === "ride") {
        return;
      } else {
        enterTouchMapMode();
        cameraRig.yaw -= deltaX * CAMERA_DRAG_SENSITIVITY;
      }
      cameraRig.pitch = THREE.MathUtils.clamp(
        cameraRig.pitch - deltaY * CAMERA_DRAG_SENSITIVITY,
        CAMERA_MIN_PITCH,
        CAMERA_MAX_PITCH,
      );
      syncCamera();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        const hadTouchPointer = activeTouchPointers.has(event.pointerId);
        if (!hadTouchPointer) {
          return;
        }
        event.preventDefault();
        const shouldTreatAsClick =
          activeTouchPointers.size === 1 &&
          !pointerDragged &&
          !touchGestureState.usedMultiTouch;
        if (renderer.domElement.hasPointerCapture(event.pointerId)) {
          renderer.domElement.releasePointerCapture(event.pointerId);
        }
        activeTouchPointers.delete(event.pointerId);
        markHoverDirty();

        if (activeTouchPointers.size > 0) {
          pointerDragged = true;
          setTouchGestureBasis();
          return;
        }

        touchGestureState.usedMultiTouch = false;
        setTouchGestureBasis();
        if (shouldTreatAsClick) {
          const clickedPoiCode = findPoiCodeFromPointer();
          if (clickedPoiCode) {
            onPoiSelect?.(clickedPoiCode);
            return;
          }

          const clickedTaxi = findTaxiFromPointer();
          if (clickedTaxi) {
            enterRideMode(clickedTaxi);
            return;
          }

          const clickedDong = findDongFromPointer();
          if (clickedDong) {
            onDongSelect?.(clickedDong);
          }
        }
        return;
      }

      if (event.pointerId !== cameraRig.pointerId) {
        return;
      }
      const shouldTreatAsClick = cameraRig.dragMode === "pan" && !pointerDragged;
      stopDragging();
      markHoverDirty();
      if (shouldTreatAsClick) {
        const clickedPoiCode = findPoiCodeFromPointer();
        if (clickedPoiCode) {
          onPoiSelect?.(clickedPoiCode);
          return;
        }

        const clickedTaxi = findTaxiFromPointer();
        if (clickedTaxi) {
          enterRideMode(clickedTaxi);
          return;
        }

        const clickedDong = findDongFromPointer();
        if (clickedDong) {
          onDongSelect?.(clickedDong);
        }
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (cameraModeRef.current === "ride") {
        return;
      }
      event.preventDefault();
      cameraRig.distance = THREE.MathUtils.clamp(
        cameraRig.distance + event.deltaY * 0.08,
        CAMERA_MIN_DISTANCE,
        maxMapDistance,
      );
      syncCamera();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && cameraModeRef.current === "ride") {
        if (!isInteractiveTarget(event.target)) {
          event.preventDefault();
        }
        setCameraMode(rideExitModeRef.current);
      }
    };

    const onWindowBlur = () => {
      pointerInside = false;
      pointerDragged = false;
      activeTouchPointers.clear();
      touchGestureState.usedMultiTouch = false;
      setTouchGestureBasis();
      pointerNdc.set(2, 2);
      clearHoverHint();
      hoverNeedsUpdate = false;
      stopDragging();
    };

    const onVisibilityChange = () => {
      isPageHidden = document.visibilityState === "hidden";
      applyRenderBudget(cameraModeRef.current);
      markLabelVisibilityDirty();
    };

    const onPointerLeave = () => {
      pointerInside = false;
      pointerNdc.set(2, 2);
      setBoundaryHover(null);
      hoverNeedsUpdate = false;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => onResize());
    resizeObserver?.observe(container);

    let lastGraphicsQuality = sceneStore.getState().graphicsQuality;
    const unsubscribeStore = sceneStore.subscribe(() => {
      const currentGraphicsQuality = sceneStore.getState().graphicsQuality;
      if (currentGraphicsQuality !== lastGraphicsQuality) {
        lastGraphicsQuality = currentGraphicsQuality;
        applyRenderBudget(cameraModeRef.current);
      }
    });

    applyEnvironment(
      simulationDateRef.current,
      simulationTimeRef.current,
      weatherModeRef.current,
    );
    syncPrecipitationDensity(activeCameraMode);

    const animate = (timestamp?: number) => {
      animationFrame = window.requestAnimationFrame(animate);
      const frameTimestamp = timestamp ?? performance.now();
      timer.update(frameTimestamp);
      const rawDeltaMs =
        lastRafTimestamp === 0
          ? 1000 / 60
          : Math.min(frameTimestamp - lastRafTimestamp, 250);
      lastRafTimestamp = frameTimestamp;
      if (!isPageHidden && rawDeltaMs > 2 && rawDeltaMs < 40) {
        const instantRefreshRate = 1000 / rawDeltaMs;
        refreshRateEstimate =
          refreshRateEstimate === 0
            ? instantRefreshRate
            : THREE.MathUtils.lerp(
              refreshRateEstimate,
              instantRefreshRate,
              0.1,
            );
        refreshRateBand = stabilizeRefreshRateBand(
          refreshRateEstimate,
          refreshRateBand,
        );
      }
      const activeRenderCap = isPageHidden
        ? HIDDEN_RENDER_FPS
        : resolveRenderCap(
          cameraModeRef.current,
          fpsModeRef.current,
          refreshRateBand ?? (refreshRateEstimate || null),
        );
      const capSignature = `${activeRenderCap ?? "unlimited"}:${isPageHidden ? "hidden" : "visible"}`;
      if (capSignature !== lastCapSignature) {
        lastCapSignature = capSignature;
        lastCappedRenderTimestamp = 0;
      }

      let delta = 0;
      if (activeRenderCap !== null) {
        const targetFrameMs = 1000 / activeRenderCap;
        if (lastCappedRenderTimestamp === 0) {
          lastCappedRenderTimestamp = frameTimestamp;
        } else {
          const elapsedSinceCap = frameTimestamp - lastCappedRenderTimestamp;
          if (elapsedSinceCap < targetFrameMs) {
            return;
          }
          lastCappedRenderTimestamp =
            frameTimestamp - (elapsedSinceCap % targetFrameMs);
        }

        delta = Math.min(
          Math.max(
            lastVisibleRenderTimestamp === 0
              ? targetFrameMs
              : frameTimestamp - lastVisibleRenderTimestamp,
            targetFrameMs,
          ) / 1000,
          0.05,
        );
      } else {
        delta = Math.min(
          Math.max(
            lastVisibleRenderTimestamp === 0
              ? rawDeltaMs
              : frameTimestamp - lastVisibleRenderTimestamp,
            1,
          ) / 1000,
          0.05,
        );
      }

      if (delta <= 0) {
        return;
      }
      lastVisibleRenderTimestamp = frameTimestamp;
      const elapsedTime = timer.getElapsed();
      const nextSimulationDate = simulationDateRef.current;
      const nextSimulationTime = simulationTimeRef.current;
      const nextWeatherMode = weatherModeRef.current;
      const nextTaxiCount = appliedTaxiCountRef.current;
      const nextTrafficCount = appliedTrafficCountRef.current;
      const simulationConfigChanged =
        nextSimulationDate !== appliedDateIso ||
        nextSimulationTime !== appliedTimeMinutes ||
        nextWeatherMode !== appliedWeatherMode ||
        nextTaxiCount !== activeVehicleDensity.taxis ||
        nextTrafficCount !== activeVehicleDensity.traffic;
      if (simulationConfigChanged) {
        applyEnvironment(
          nextSimulationDate,
          nextSimulationTime,
          nextWeatherMode,
        );
        resetSimulationSource(true);
      }
      let currentMode = cameraModeRef.current;
      if (currentMode !== activeCameraMode) {
        activeCameraMode = currentMode;
        applyModePreset(currentMode);
        applyDistrictPresentation(currentMode);
        applyRenderBudget(currentMode);
        markLabelVisibilityDirty();
      }
      if (currentMode === "overview") {
        applyModePreset(currentMode);
      }
      syncPrecipitationDensity(currentMode);
      syncVehicleDensity();
      const nextPitchControlVersion = cameraPitchControlRef.current.version;
      const nextYawControlVersion = cameraYawControlRef.current.version;
      const pitchControlChanged =
        nextPitchControlVersion !== appliedPitchControlVersion;
      const yawControlChanged = nextYawControlVersion !== appliedYawControlVersion;
      if ((pitchControlChanged || yawControlChanged) && currentMode !== "ride") {
        appliedPitchControlVersion = nextPitchControlVersion;
        appliedYawControlVersion = nextYawControlVersion;
        enterTouchMapMode();
        currentMode = cameraModeRef.current;
        cameraFocusTargetRef.current = null;
        if (pitchControlChanged) {
          cameraRig.pitch = pitchFromControlValue(
            cameraPitchControlRef.current.value,
          );
        }
        if (yawControlChanged) {
          cameraRig.yaw = yawFromControlValue(cameraYawControlRef.current.value);
        }
        syncCamera();
      }

      vehicleSimulationAccumulator = Math.min(
        vehicleSimulationAccumulator + delta,
        VEHICLE_SIMULATION_STEP * MAX_VEHICLE_SIMULATION_STEPS,
      );
      let vehicleSimulationSteps = 0;
      while (
        vehicleSimulationAccumulator >= VEHICLE_SIMULATION_STEP &&
        vehicleSimulationSteps < MAX_VEHICLE_SIMULATION_STEPS
      ) {
        simulationSource.step(VEHICLE_SIMULATION_STEP);
        vehicleSimulationAccumulator -= VEHICLE_SIMULATION_STEP;
        vehicleSimulationSteps += 1;
      }
      if (
        vehicleSimulationSteps === MAX_VEHICLE_SIMULATION_STEPS &&
        vehicleSimulationAccumulator >= VEHICLE_SIMULATION_STEP
      ) {
        vehicleSimulationAccumulator %= VEHICLE_SIMULATION_STEP;
      }
      const vehicleInterpolationAlpha = THREE.MathUtils.clamp(
        vehicleSimulationAccumulator / VEHICLE_SIMULATION_STEP,
        0,
        1,
      );
      const simulationSnapshot =
        vehicleSimulationSteps > 0 || !latestSimulationSnapshot
          ? simulationSource.getSnapshot()
          : latestSimulationSnapshot;
      latestSimulationSnapshot = simulationSnapshot;
      syncVehicleLayerFromSnapshot(
        simulationSnapshot.vehicles,
        vehicleInterpolationAlpha,
      );
      syncSimulationTrails(frameTimestamp);
      updateSignalVisuals(
        simulationSnapshot.signals,
        simulationSnapshot.clock.elapsedTimeSeconds,
      );

      if (currentMode === "drive") {
        cameraLookLift = CAMERA_LOOK_HEIGHT;
        cameraRig.focus.y = THREE.MathUtils.damp(
          cameraRig.focus.y,
          0,
          4.6,
          delta,
        );
        if (cameraRig.dragging) {
          cameraFocusTargetRef.current = null;
        } else if (cameraFocusTargetRef.current) {
          const focusTarget = cameraFocusTargetRef.current;
          const targetDistance = THREE.MathUtils.clamp(
            focusTarget.distance,
            CAMERA_MIN_DISTANCE,
            maxMapDistance,
          );
          cameraRig.focus.x = THREE.MathUtils.damp(
            cameraRig.focus.x,
            focusTarget.x,
            5.6,
            delta,
          );
          cameraRig.focus.z = THREE.MathUtils.damp(
            cameraRig.focus.z,
            focusTarget.z,
            5.6,
            delta,
          );
          cameraRig.pitch = THREE.MathUtils.damp(
            cameraRig.pitch,
            focusTarget.pitch,
            5.2,
            delta,
          );
          cameraRig.distance = THREE.MathUtils.damp(
            cameraRig.distance,
            targetDistance,
            5.2,
            delta,
          );
          if (focusTarget.yaw !== undefined) {
            cameraRig.yaw = dampAngle(cameraRig.yaw, focusTarget.yaw, 5.2, delta);
          }

          if (
            Math.abs(cameraRig.focus.x - focusTarget.x) < 0.45 &&
            Math.abs(cameraRig.focus.z - focusTarget.z) < 0.45 &&
            Math.abs(cameraRig.pitch - focusTarget.pitch) < 0.02 &&
            Math.abs(cameraRig.distance - targetDistance) < 0.7 &&
            (focusTarget.yaw === undefined ||
              Math.abs(wrapAngle(cameraRig.yaw - focusTarget.yaw)) < 0.03)
          ) {
            cameraFocusTargetRef.current = null;
          }
        }
      } else if (currentMode === "overview") {
        cameraLookLift = CAMERA_LOOK_HEIGHT;
        const overviewDistance = Math.sqrt(120 * 120 + 135 * 135 + 150 * 150);
        const lerpAlpha = 1 - Math.exp(-delta * 3.8);
        cameraRig.focus.lerp(new THREE.Vector3(centerPoint.x, 0, centerPoint.z), lerpAlpha);
        cameraRig.yaw = dampAngle(cameraRig.yaw, overviewYaw, 3.8, delta);
        cameraRig.pitch = THREE.MathUtils.damp(cameraRig.pitch, 0.7, 3.8, delta);
        cameraRig.distance = THREE.MathUtils.damp(cameraRig.distance, overviewDistance, 3.8, delta);
      } else if (currentMode === "follow") {
        if (followTaxiIdRef.current !== activeFollowTaxiId) {
          activeFollowTaxiId = followTaxiIdRef.current;
          followOrbit.yawOffset = 0.22;
        }
        const followedTaxi = resolveFollowTaxi();
        cameraLookLift = 0.8;
        if (followedTaxi) {
          const followBlend = 1 - Math.exp(-delta * 4.8);
          followFocusTarget.copy(followedTaxi.group.position);
          followFocusTarget.y = 1.8;
          cameraRig.focus.lerp(followFocusTarget, followBlend);
          const desiredYaw =
            taxiHeading(followedTaxi) + Math.PI + followOrbit.yawOffset;
          cameraRig.yaw = dampAngle(cameraRig.yaw, desiredYaw, 5.4, delta);
          cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch, 0.46, 0.9);
          cameraRig.distance = THREE.MathUtils.clamp(
            cameraRig.distance,
            20,
            58,
          );
        } else {
          cameraRig.focus.lerp(centerPoint, 1 - Math.exp(-delta * 2.8));
          cameraRig.focus.y = THREE.MathUtils.damp(
            cameraRig.focus.y,
            0,
            4.2,
            delta,
          );
        }
        syncCamera();
      } else {
        if (followTaxiIdRef.current !== activeFollowTaxiId) {
          activeFollowTaxiId = followTaxiIdRef.current;
          rideLookInitialized = false;
        }
        const viewedTaxi = resolveFollowTaxi();
        if (viewedTaxi) {
          rideHeading.copy(viewedTaxi.renderMotion.heading);
          if (rideHeading.lengthSq() < 0.0001) {
            rideHeading.set(0, 0, 1);
          } else {
            rideHeading.normalize();
          }
          const rideBlend = 1 - Math.exp(-delta * 7.2);
          rideCameraPosition
            .copy(viewedTaxi.renderMotion.lanePosition)
            .addScaledVector(rideHeading, TAXI_VIEW_CAMERA_BACK_OFFSET)
            .addScaledVector(
              viewedTaxi.renderMotion.right,
              TAXI_VIEW_CAMERA_SIDE_OFFSET,
            );
          rideCameraPosition.y += TAXI_VIEW_CAMERA_HEIGHT;

          rideDesiredLookTarget
            .copy(viewedTaxi.renderMotion.lanePosition)
            .addScaledVector(rideHeading, TAXI_VIEW_LOOK_AHEAD);
          rideDesiredLookTarget.y = viewedTaxi.group.position.y + 1.6;

          if (!rideLookInitialized) {
            camera.position.copy(rideCameraPosition);
            rideLookTarget.copy(rideDesiredLookTarget);
            rideLookInitialized = true;
          } else {
            camera.position.lerp(rideCameraPosition, rideBlend);
            rideLookTarget.lerp(rideDesiredLookTarget, rideBlend);
          }
          camera.lookAt(rideLookTarget);
        } else {
          setCameraMode(rideExitModeRef.current);
          cameraModeRef.current = rideExitModeRef.current;
          syncCamera();
        }
      }
      if (currentMode !== "follow" && currentMode !== "ride") {
        syncCamera();
      }
      if (onCameraFocusChange) {
        const nextMiniMapFocus =
          currentMode === "ride"
            ? rideLookTarget
            : currentMode === "follow"
              ? cameraRig.focus
              : cameraRig.focus;
        camera.getWorldDirection(miniMapCameraDirection);
        miniMapCameraDirection.y = 0;
        if (miniMapCameraDirection.lengthSq() < 0.0001) {
          miniMapCameraDirection.set(
            -Math.sin(cameraRig.yaw),
            0,
            -Math.cos(cameraRig.yaw),
          );
        }
        miniMapCameraDirection.normalize();
        const nextMiniMapFocusLabel =
          currentMode === "ride"
            ? "차량 시점"
            : currentMode === "follow"
              ? "차량 추적 위치"
              : "현재 보고 있는 위치";
        const focusDeltaSq =
          (nextMiniMapFocus.x - lastMiniMapFocusReportX) ** 2 +
          (nextMiniMapFocus.z - lastMiniMapFocusReportZ) ** 2;
        const headingDeltaSq =
          (miniMapCameraDirection.x - lastMiniMapFocusReportHeadingX) ** 2 +
          (miniMapCameraDirection.z - lastMiniMapFocusReportHeadingZ) ** 2;
        const nextPitchControlValue = pitchControlValueFromPitch(cameraRig.pitch);
        const nextYawControlValue = yawControlValueFromYaw(cameraRig.yaw);
        const pitchValueDelta = Math.abs(
          nextPitchControlValue - lastMiniMapFocusReportPitchValue,
        );
        const yawValueDelta = Math.abs(
          nextYawControlValue - lastMiniMapFocusReportYawValue,
        );
        if (
          frameTimestamp - lastMiniMapFocusReportTimestamp > 240 &&
          (focusDeltaSq > 1.6 ||
            headingDeltaSq > 0.006 ||
            pitchValueDelta > 0.5 ||
            yawValueDelta > 0.5 ||
            nextMiniMapFocusLabel !== lastMiniMapFocusReportLabel)
        ) {
          lastMiniMapFocusReportTimestamp = frameTimestamp;
          lastMiniMapFocusReportX = nextMiniMapFocus.x;
          lastMiniMapFocusReportZ = nextMiniMapFocus.z;
          lastMiniMapFocusReportHeadingX = miniMapCameraDirection.x;
          lastMiniMapFocusReportHeadingZ = miniMapCameraDirection.z;
          lastMiniMapFocusReportPitchValue = nextPitchControlValue;
          lastMiniMapFocusReportYawValue = nextYawControlValue;
          lastMiniMapFocusReportLabel = nextMiniMapFocusLabel;
          onCameraFocusChange({
            x: nextMiniMapFocus.x,
            z: nextMiniMapFocus.z,
            label: nextMiniMapFocusLabel,
            headingX: miniMapCameraDirection.x,
            headingZ: miniMapCameraDirection.z,
            pitchControlValue: nextPitchControlValue,
            yawControlValue: nextYawControlValue,
          });
        }
      }

      updateDemandMapLayer(simulationSnapshot.clock.elapsedTimeSeconds);
      updateHotspotVisuals(
        simulationSnapshot.hotspots,
        simulationSnapshot.clock.elapsedTimeSeconds,
      );
      updatePedestrians(simulationSnapshot.clock.elapsedTimeSeconds);
      commitSourceStats(simulationSnapshot.stats);
      updatePrecipitation(delta, elapsedTime);
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
      if (labelRefreshRequestRef.current !== appliedLabelRefreshRequest) {
        appliedLabelRefreshRequest = labelRefreshRequestRef.current;
        markLabelVisibilityDirty();
      }
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
        syncLabelVisibility(currentMode);
        labelVisibilityNeedsUpdate = false;
        labelVisibilityAccumulator = 0;
      }
      if (hoverRefreshRequestRef.current !== appliedHoverRefreshRequest) {
        appliedHoverRefreshRequest = hoverRefreshRequestRef.current;
        hoverNeedsUpdate = true;
      }
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
      renderer.render(scene, camera);
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

    finalizeVehicleLayerSetup();
    window.addEventListener("pointerdown", markUserInteraction, true);
    window.addEventListener("wheel", markUserInteraction, true);
    const cancelTaxiAssetLoadSchedule = scheduleDeferredAssetLoad(
      loadTaxiAssetInBackground,
      TAXI_ASSET_LOAD_DELAY_MS,
      TAXI_ASSET_IDLE_TIMEOUT_MS,
    );
    const cancelTrafficAssetLoadSchedule = scheduleDeferredAssetLoad(
      loadTrafficAssetsInBackground,
      TRAFFIC_ASSET_LOAD_DELAY_MS,
      TRAFFIC_ASSET_IDLE_TIMEOUT_MS,
    );
    animate();

    return () => {
      sceneDisposed = true;
      unsubscribeStore();
      cancelTaxiAssetLoadSchedule();
      cancelTrafficAssetLoadSchedule();
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", markUserInteraction, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("wheel", markUserInteraction, true);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keydown", onKeyDown);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("wheel", onWheel);
      rainLayer.geometry.dispose();
      rainLayer.material.dispose();
      snowLayer.geometry.dispose();
      snowLayer.material.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      cloudPuffGeometry.dispose();
      cloudMaterial.dispose();
      stormCloudMaterial.dispose();
      transitHoverMaterial.dispose();
      sunDiscMaterial.dispose();
      sunHaloMaterial.dispose();
      sunsetGlowMaterial.dispose();
      moonMaterial.dispose();
      timer.dispose();
      renderer.dispose();
      if (taxiAssetTemplate) {
        disposeObject3DResources(taxiAssetTemplate);
      }
      disposeTrafficAssetTemplates(trafficAssetTemplates);
      const currentNonRoadGroup = nonRoadGroup;
      if (currentNonRoadGroup) {
        currentNonRoadGroup.removeFromParent();
        disposeObject3DResources(currentNonRoadGroup);
      }
      if (nonRoadGroupRef.current === currentNonRoadGroup) {
        nonRoadGroupRef.current = null;
      }
      if (roadNetworkOverlay) {
        roadNetworkOverlay.removeFromParent();
        disposeObject3DResources(roadNetworkOverlay);
      }
      if (roadNetworkGroupRef.current === roadNetworkOverlay) {
        roadNetworkGroupRef.current = null;
      }
      trafficSignalLayer.group.removeFromParent();
      disposeObject3DResources(trafficSignalLayer.group);
      hotspotVisualLayer.group.removeFromParent();
      disposeObject3DResources(hotspotVisualLayer.group);
      pedestrianVisualLayer.group.removeFromParent();
      disposeObject3DResources(pedestrianVisualLayer.group);
      vehicleRuntimeSync?.resetLayerReadiness();
      clearVehicleLayer();
      if (transitGroupRef.current === transitGroup) {
        transitGroupRef.current = null;
      }
      transitGroup.removeFromParent();
      disposeObject3DResources(transitGroup);
      simulationTrailLayer.clear();
      simulationTrailLayer.group.removeFromParent();
      demandVisualLayer.group.removeFromParent();
      disposeObject3DResources(demandVisualLayer.group);
      dongBoundaryLayer.group.removeFromParent();
      disposeObject3DResources(dongBoundaryLayer.group);
      staticRoadGroup.removeFromParent();
      disposeObject3DResources(staticRoadGroup);
      buildingMassLayer.group.removeFromParent();
      disposeObject3DResources(buildingMassLayer.group);
      poiMarkerGroup.removeFromParent();
      disposeObject3DResources(poiMarkerGroup);
      if (optionalLabelObjectsRef.current === optionalLabelObjects) {
        optionalLabelObjectsRef.current = [];
      }
      labelObjects.forEach((label) => label.removeFromParent());
      disposeHierarchy(scene);
      container.removeChild(boundaryHintText);
      container.removeChild(renderer.domElement);
      container.removeChild(labelRenderer.domElement);
    };
}
