import {
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { WeatherMode } from "@/components/map-simulator/environment";
import {
  type VehicleTrailPoint,
} from "@/components/map-simulator/vehicle";
import { createLocalSimulationSource } from "@/components/map-simulator/simulation";
import type {
  BaseCameraMode,
  CameraFocusTarget,
  CameraMode,
  CameraPitchControlState,
  CameraYawControlState,
  FpsMode,
} from "@/components/map-simulator/camera";
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
} from "@/components/map-simulator/types";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";
import {
  createMapSceneBase,
  createMapSceneLights,
  syncSunShadowBounds,
} from "@/components/map-simulator/scene";
import { createEnvironmentVisuals, type EnvironmentVisuals } from "@/components/map-simulator/environment";
import { createEnvironmentSettingsController } from "@/components/map-simulator/hooks";
import { createMapSceneRenderers } from "@/components/map-simulator/scene";
import {
  createTrafficSignalLayer,
} from "@/components/map-simulator/signal";
import { createMapSceneGeometry } from "@/components/map-simulator/hooks";
import { createHoverHintController } from "@/components/map-simulator/scene";
import {
  createMapPointerPickController,
} from "@/components/map-simulator/camera";
import {
  createOverviewCameraOffset,
  createSimulatorCameraRig,
  overviewCameraDistance,
  type SimulatorCameraRig,
} from "@/components/map-simulator/engine/simulator-camera-rig";
import {
  attachMapSceneGeometryLayers,
  createDefaultSimulationTrailLayer,
} from "@/components/map-simulator/engine/simulator-layers";
import { createSimulatorRendererController } from "@/components/map-simulator/engine/simulator-renderer";
import {
  createHotspotVisualLayer,
} from "@/components/map-simulator/scene";
import {
  createPedestrianVisualLayer,
} from "@/components/map-simulator/scene";
import {
  createMapRegionLabelLayer,
  createRoadLabelLayer,
} from "@/components/map-simulator/scene";
import { createSceneLabelVisibilityController } from "@/components/map-simulator/scene";
import { createTransitLandmarkLayer } from "@/components/map-simulator/scene";
import { createVehicleRuntimeSyncController } from "@/components/map-simulator/vehicle";
import { boundaryHintElement } from "@/components/map-simulator/scene";
import { buildRoadNetworkOverlay } from "@/components/map-simulator/road";
import { createPoiMarkerLayer } from "@/components/map-simulator/scene";
import { createDeferredAssetLoadScheduler } from "@/components/map-simulator/utils";
import { CAMERA_MAX_DISTANCE } from "@/components/map-simulator/scene";
import type { SimulationSource, SimulationSnapshot } from "@/components/map-simulator/simulation";
import type { SceneStaticContext } from "@/components/map-simulator/simulation";
import type { TrafficVehicleModelKey } from "@/components/map-simulator/vehicle";
import type { MapSimulatorSceneRuntimeProps } from "@/components/map-simulator/engine/simulator-engine";

/**
 * Mutable callback refs for late-binding.
 * Controllers capture these at creation time; the orchestrator replaces
 * the inner function after all modules are created.
 */
type LateBound<T extends (...args: never[]) => unknown> = {
  current: T;
};

function createLateBound<T extends (...args: never[]) => unknown>(
  initial: T,
): LateBound<T> {
  return { current: initial };
}

/** All state and objects created during engine scene setup. */
export type EngineSceneContext = {
  // Props pass-through
  props: MapSimulatorSceneRuntimeProps;

  // Core Three.js
  scene: THREE.Scene;
  sceneFog: THREE.Fog;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  container: HTMLDivElement;
  preventDefaultTouch: (e: TouchEvent) => void;

  // Lights
  ambientLight: THREE.AmbientLight;
  hemisphereLight: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;

  // Camera rig
  cameraRig: SimulatorCameraRig;
  centerPoint: THREE.Vector3;
  movementBounds: THREE.Box3;
  mapSize: THREE.Vector3;
  maxMapDistance: number;
  overviewYaw: number;
  overviewDistance: number;

  // Simulation data
  simulationData: SimulationData;
  simulationSource: SimulationSource;
  staticContext: SceneStaticContext;
  hotspotPool: Hotspot[];
  taxiRoutePool: RouteTemplate[];
  trafficRoutePool: RouteTemplate[];
  loopRoutes: RouteTemplate[];
  routeById: Map<string, RouteTemplate>;
  signalById: Map<string, SignalData>;
  signalByKey: Map<string, SignalData>;
  dongBoundarySegments: DongBoundarySegment[];

  // Layers
  demandVisualLayer: ReturnType<typeof attachMapSceneGeometryLayers>["demandVisualLayer"];
  dongBoundaryLayer: ReturnType<typeof attachMapSceneGeometryLayers>["dongBoundaryLayer"];
  staticRoadLayer: ReturnType<typeof attachMapSceneGeometryLayers>["staticRoadLayer"];
  buildingMassLayer: ReturnType<typeof attachMapSceneGeometryLayers>["buildingMassLayer"];
  dongFloorGroup: THREE.Group;
  groundMaterial: THREE.MeshStandardMaterial;
  nonRoadGroup: THREE.Group;
  simulationTrailLayer: ReturnType<typeof createDefaultSimulationTrailLayer>;
  roadNetworkOverlay: THREE.Group;
  poiMarkerGroup: THREE.Group;

  // Visuals
  environmentVisuals: EnvironmentVisuals;
  signalVisuals: SignalVisual[];
  hotspotVisuals: HotspotVisual[];
  pedestrianVisuals: PedestrianVisual[];

  // Vehicle state
  vehicles: Vehicle[];
  taxiVehicles: Vehicle[];
  trafficVehicles: Vehicle[];
  taxiById: Map<string, Vehicle>;
  vehicleById: Map<string, Vehicle>;
  taxiClickTargets: THREE.Object3D[];
  simulationTrailPoints: VehicleTrailPoint[];
  vehicleRuntimeSync: ReturnType<typeof createVehicleRuntimeSyncController>;

  // Labels
  labelObjects: CSS2DObject[];
  optionalLabelObjects: CSS2DObject[];
  districtLabelEntries: SceneLabelEntry[];
  optionalLabelEntries: SceneLabelEntry[];
  transitHoverTargets: THREE.Object3D[];
  poiClickTargets: THREE.Object3D[];
  poiByCode: Map<string, MapPoiFeatureRow>;
  boundaryHintText: HTMLDivElement;
  transitHoverMaterial: THREE.MeshBasicMaterial;
  transitGroup: THREE.Group;

  // Controllers
  rendererController: ReturnType<typeof createSimulatorRendererController>;
  environmentSettings: ReturnType<typeof createEnvironmentSettingsController>;
  labelVisibilityController: ReturnType<typeof createSceneLabelVisibilityController>;
  hoverHintController: ReturnType<typeof createHoverHintController>;
  pointerPickController: ReturnType<typeof createMapPointerPickController>;
  deferredAssetLoadScheduler: ReturnType<typeof createDeferredAssetLoadScheduler>;

  // Signal state
  frameSignalStates: Map<string, SignalFlow>;
  activeVehicleDensity: { taxis: number; traffic: number };

  // Raycaster
  raycaster: THREE.Raycaster;
  pointerNdc: THREE.Vector2;
  boundaryPointerHits: THREE.Intersection[];
  cameraOffset: THREE.Vector3;

  // Timer
  timer: THREE.Timer;

  // Mutable state
  sceneDisposed: boolean;
  isPageHidden: boolean;

  // Crosswalk / stop line materials (for environment settings)
  crosswalkMaterial: THREE.MeshStandardMaterial | null;
  stopLineMaterial: THREE.MeshStandardMaterial | null;

  // Dong wall mesh (for hover raycasting)
  dongWallMesh: THREE.InstancedMesh | THREE.Mesh;

  // Layer groups for cleanup
  hotspotVisualGroup: THREE.Group;
  pedestrianVisualGroup: THREE.Group;
  trafficSignalGroup: THREE.Group;

  // Late-bound callback refs (set by orchestrator after all modules are wired)
  _lateBound: {
    getTaxiAssetTemplate: LateBound<() => THREE.Group | null>;
    getTrafficAssetTemplates: LateBound<() => ReadonlyMap<TrafficVehicleModelKey, THREE.Group>>;
    getLatestSimulationSnapshot: LateBound<() => SimulationSnapshot | null>;
    isSceneDisposed: LateBound<() => boolean>;
    resetVehicleSimulationAccumulator: LateBound<() => void>;
    markVisualsDirty: LateBound<() => void>;
    renderNow: LateBound<() => void>;
    getHighlightedDongNames: LateBound<() => string[]>;
    getPointer: LateBound<() => { x: number; y: number }>;
    setHighlightedDongNames: LateBound<(dongNames: string[]) => void>;
  };
};

/**
 * Creates the entire 3D scene, layers, controllers, and returns the context.
 * Returns null if data or container is not available.
 */
export function setupEngineScene(
  props: MapSimulatorSceneRuntimeProps,
): EngineSceneContext | null {
  const {
    containerRef,
    data,
    poiFeatureRowsRef,
    appliedTaxiCountRef,
    appliedTrafficCountRef,
    cameraModeRef,
    showLabelsRef,
    showTransitRef,
    showNonRoadRef,
    showRoadNetworkRef,
    nonRoadGroupRef,
    roadNetworkGroupRef,
    transitGroupRef,
    optionalLabelObjectsRef,
    setStatus,
    setStatusDetail,
    setLoadingProgress,
    setFollowTaxiId,
  } = props;

  if (!data || !containerRef.current) {
    return null;
  }

  const hotspotPool: Hotspot[] = data.hotspotPool;
  const taxiRoutePool: RouteTemplate[] = data.taxiRoutePool;
  const trafficRoutePool: RouteTemplate[] = data.trafficRoutePool;
  const loopRoutes: RouteTemplate[] = data.loopRoutes;
  if (!taxiRoutePool.length || !trafficRoutePool.length || !hotspotPool.length) {
    setStatus("error");
    setStatusDetail("시뮬레이션 경로 데이터가 부족합니다.");
    setLoadingProgress(0);
    return null;
  }

  const container = containerRef.current;
  const simulationData = data;
  const simulationSource = createLocalSimulationSource();
  const isPageHidden = document.visibilityState === "hidden";
  const { scene, sceneFog, camera } = createMapSceneBase(container);

  const { renderer, labelRenderer, preventDefaultTouch } = createMapSceneRenderers({
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
  const mapSize = bounds.getSize(new THREE.Vector3());
  const centerPoint = bounds.getCenter(new THREE.Vector3());
  const movementBounds = bounds
    .clone()
    .expandByVector(new THREE.Vector3(48, 0, 48));
  const maxMapDistance = Math.max(
    CAMERA_MAX_DISTANCE,
    Math.max(mapSize.x, mapSize.z) * 1.28,
  );
  const initialOffset = createOverviewCameraOffset();
  const overviewYaw = Math.atan2(initialOffset.x, initialOffset.z);
  const overviewDistance = overviewCameraDistance();
  const cameraRig = createSimulatorCameraRig({
    centerPoint,
    initialOffset,
    maxMapDistance,
    overviewYaw,
  });

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2(2, 2);
  const boundaryPointerHits: THREE.Intersection[] = [];
  const cameraOffset = new THREE.Vector3();

  const rendererController = createSimulatorRendererController({
    camera,
    container,
    getCameraMode: () => cameraModeRef.current,
    getIsPageHidden: () => document.visibilityState === "hidden",
    labelRenderer,
    onViewportChanged: () => {},
    renderer,
    scene,
  });

  syncSunShadowBounds(sun, mapSize);

  const mapSceneGeometry = createMapSceneGeometry({
    centerPoint,
    data,
    dongBoundaryWallHeight,
    mapSize,
    poiFeatureRows: [...(poiFeatureRowsRef.current ?? [])],
  });
  const { groundMaterial } = mapSceneGeometry;
  const mapLayers = attachMapSceneGeometryLayers({
    mapSceneGeometry,
    scene,
    showNonRoad: showNonRoadRef.current,
  });
  const { demandVisualLayer, dongFloorGroup } = mapLayers;
  const nonRoadGroup = mapLayers.nonRoadGroup;
  nonRoadGroupRef.current = nonRoadGroup;

  const environmentVisuals = createEnvironmentVisuals({
    scene,
    mapSize,
    centerPoint,
  });

  const signalById = new Map<string, SignalData>();
  const signalByKey = new Map<string, SignalData>();
  const signalVisuals: SignalVisual[] = [];
  const hotspotVisuals: HotspotVisual[] = [];
  const pedestrianVisuals: PedestrianVisual[] = [];
  const vehicles: Vehicle[] = [];
  const taxiVehicles: Vehicle[] = [];
  const trafficVehicles: Vehicle[] = [];
  const simulationTrailPoints: VehicleTrailPoint[] = [];
  const taxiClickTargets: THREE.Object3D[] = [];
  const taxiById = new Map<string, Vehicle>();
  const vehicleById = new Map<string, Vehicle>();
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

  const frameSignalStates = new globalThis.Map<string, SignalFlow>();
  const activeVehicleDensity = {
    taxis: appliedTaxiCountRef.current,
    traffic: appliedTrafficCountRef.current,
  };

  // --- Late-bound callback refs ---
  const lateBound = {
    getTaxiAssetTemplate: createLateBound(() => null as THREE.Group | null),
    getTrafficAssetTemplates: createLateBound(() => new Map() as ReadonlyMap<TrafficVehicleModelKey, THREE.Group>),
    getLatestSimulationSnapshot: createLateBound(() => null as SimulationSnapshot | null),
    isSceneDisposed: createLateBound(() => false),
    resetVehicleSimulationAccumulator: createLateBound(() => {}),
    markVisualsDirty: createLateBound(() => {}),
    renderNow: createLateBound(() => {
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }),
    getHighlightedDongNames: createLateBound(() => [] as string[]),
    getPointer: createLateBound(() => ({ x: 0, y: 0 })),
    setHighlightedDongNames: createLateBound((_dongNames: string[]) => {}),
  };

  // Vehicle runtime sync
  const simulationTrailLayer = createDefaultSimulationTrailLayer(scene);
  const vehicleRuntimeSync = createVehicleRuntimeSyncController({
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
    getTaxiAssetTemplate: () => lateBound.getTaxiAssetTemplate.current(),
    getTrafficAssetTemplates: () => lateBound.getTrafficAssetTemplates.current(),
    getLatestSimulationSnapshot: () => lateBound.getLatestSimulationSnapshot.current(),
    isSceneDisposed: () => lateBound.isSceneDisposed.current(),
    resetVehicleSimulationAccumulator: () => lateBound.resetVehicleSimulationAccumulator.current(),
    syncSelectedTaxi: () => {
      if (props.followTaxiIdRef.current && taxiById.has(props.followTaxiIdRef.current)) {
        return;
      }
      const fallbackTaxiId = taxiVehicles[0]?.id ?? "";
      if (props.followTaxiIdRef.current !== fallbackTaxiId) {
        props.followTaxiIdRef.current = fallbackTaxiId;
        setFollowTaxiId(fallbackTaxiId);
      }
    },
    taxiTrailColorFor: (vehicle: Vehicle) =>
      vehicle.isOccupied ? 0xfb7185 : 0x22d3ee,
    markVisualsDirty: () => lateBound.markVisualsDirty.current(),
    renderNow: () => lateBound.renderNow.current(),
  });

  // Labels
  const labelObjects: CSS2DObject[] = [];
  const optionalLabelObjects: CSS2DObject[] = [];
  const transitHoverTargets: THREE.Object3D[] = [];
  const poiClickTargets: THREE.Object3D[] = [];
  const poiByCode = new Map<string, MapPoiFeatureRow>();
  const districtLabelEntries: SceneLabelEntry[] = [];
  const optionalLabelEntries: SceneLabelEntry[] = [];

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

  // Dong boundary
  const dongBoundaryLayer = mapLayers.dongBoundaryLayer;

  // Static road
  const staticRoadLayer = mapLayers.staticRoadLayer;

  // Building mass
  const buildingMassLayer = mapLayers.buildingMassLayer;

  // Label visibility controller
  const labelVisibilityController = createSceneLabelVisibilityController({
    districtLabelEntries,
    optionalLabelEntries,
    getHighlightedDongNames: () => lateBound.getHighlightedDongNames.current(),
    getShowLabels: () => showLabelsRef.current,
    getShowTransit: () => showTransitRef.current,
  });

  // Pointer pick controller
  const pointerPickController = createMapPointerPickController({
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

  // POI markers
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

  // Road network overlay
  const currentGraph = data.graph;
  const roadNetworkOverlay = buildRoadNetworkOverlay(currentGraph);
  roadNetworkOverlay.visible = showRoadNetworkRef.current;
  scene.add(roadNetworkOverlay);
  roadNetworkGroupRef.current = roadNetworkOverlay;

  // Signals
  const signals = data.signals;
  signals.forEach((signal) => {
    signalById.set(signal.id, signal);
    signalByKey.set(signal.key, signal);
  });

  const trafficSignalLayer = createTrafficSignalLayer({
    signals,
    loopRoutes,
  });
  signalVisuals.push(...trafficSignalLayer.signalVisuals);
  const crosswalkMaterial = trafficSignalLayer.crosswalkMaterial;
  const stopLineMaterial = trafficSignalLayer.stopLineMaterial;
  scene.add(trafficSignalLayer.group);

  // Environment settings
  const environmentSettings = createEnvironmentSettingsController({
    ambientLight,
    buildingMaterial: buildingMassLayer.buildingMaterial,
    buildingRoofMaterial: buildingMassLayer.buildingRoofMaterial,
    centerPoint,
    crosswalkMaterial,
    environmentVisuals,
    getIsPageHidden: () => document.visibilityState === "hidden",
    groundMaterial,
    hemisphereLight,
    laneMarkerMaterial: staticRoadLayer.laneMarkerMaterial,
    renderer,
    roadMaterials: staticRoadLayer.roadMaterials,
    roadSheenMaterial: staticRoadLayer.roadSheenMaterial,
    scene,
    sceneFog,
    simulationCenter: simulationData.center,
    stopLineMaterial,
    sun,
  });

  // Hotspot visual layer
  const taxiRouteById = new globalThis.Map(
    taxiRoutePool.map((route) => [route.id, route]),
  );
  const hotspotVisualLayer = createHotspotVisualLayer({
    hotspots: hotspotPool,
    taxiRouteById,
  });
  hotspotVisuals.push(...hotspotVisualLayer.hotspotVisuals);
  scene.add(hotspotVisualLayer.group);

  // Pedestrian visual layer
  const pedestrianVisualLayer = createPedestrianVisualLayer(signalVisuals);
  pedestrianVisuals.push(...pedestrianVisualLayer.pedestrianVisuals);
  scene.add(pedestrianVisualLayer.group);

  // Road labels
  const roadLabelLayer = createRoadLabelLayer({
    routes: taxiRoutePool,
    showLabels: showLabelsRef.current,
  });
  labelObjects.push(...roadLabelLayer.labelObjects);
  optionalLabelObjects.push(...roadLabelLayer.optionalLabelObjects);
  optionalLabelEntries.push(...roadLabelLayer.optionalLabelEntries);
  roadLabelLayer.labelObjects.forEach((label) => scene.add(label));

  // Hover hint controller
  const hoverHintController = createHoverHintController({
    element: boundaryHintText,
    cursorElement: container,
    getPointer: () => lateBound.getPointer.current(),
    isDragging: () => cameraRig.dragging,
    setHighlightedDongNames: (dongNames: string[]) =>
      lateBound.setHighlightedDongNames.current(dongNames),
  });

  // Deferred asset load scheduler
  const deferredAssetLoadScheduler = createDeferredAssetLoadScheduler({
    isDisposed: () => lateBound.isSceneDisposed.current(),
  });

  // Timer
  const timer = new THREE.Timer();
  timer.connect(document);

  return {
    props,
    scene,
    sceneFog,
    camera,
    renderer,
    labelRenderer,
    container,
    preventDefaultTouch,
    ambientLight,
    hemisphereLight,
    sun,
    cameraRig,
    centerPoint,
    movementBounds,
    mapSize,
    maxMapDistance,
    overviewYaw,
    overviewDistance,
    simulationData,
    simulationSource,
    staticContext,
    hotspotPool,
    taxiRoutePool,
    trafficRoutePool,
    loopRoutes,
    routeById,
    signalById,
    signalByKey,
    dongBoundarySegments,
    demandVisualLayer,
    dongBoundaryLayer,
    staticRoadLayer,
    buildingMassLayer,
    dongFloorGroup,
    groundMaterial,
    nonRoadGroup,
    simulationTrailLayer,
    roadNetworkOverlay,
    poiMarkerGroup,
    environmentVisuals,
    signalVisuals,
    hotspotVisuals,
    pedestrianVisuals,
    vehicles,
    taxiVehicles,
    trafficVehicles,
    taxiById,
    vehicleById,
    taxiClickTargets,
    simulationTrailPoints,
    vehicleRuntimeSync,
    labelObjects,
    optionalLabelObjects,
    districtLabelEntries,
    optionalLabelEntries,
    transitHoverTargets,
    poiClickTargets,
    poiByCode,
    boundaryHintText,
    transitHoverMaterial,
    transitGroup,
    rendererController,
    environmentSettings,
    labelVisibilityController,
    hoverHintController,
    pointerPickController,
    deferredAssetLoadScheduler,
    frameSignalStates,
    activeVehicleDensity,
    raycaster,
    pointerNdc,
    boundaryPointerHits,
    cameraOffset,
    timer,
    sceneDisposed: false,
    isPageHidden,
    crosswalkMaterial,
    stopLineMaterial,
    dongWallMesh: dongBoundaryLayer.wallMesh,
    hotspotVisualGroup: hotspotVisualLayer.group,
    pedestrianVisualGroup: pedestrianVisualLayer.group,
    trafficSignalGroup: trafficSignalLayer.group,
    _lateBound: lateBound,
  };
}
