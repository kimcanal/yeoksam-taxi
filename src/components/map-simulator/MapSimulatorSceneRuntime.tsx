/* eslint-disable react-hooks/exhaustive-deps */
import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import * as THREE from "three";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { DispatchDemandSnapshot } from "@/components/map-simulator/dispatch-planner";
import {
  buildEnvironmentState,
  daylightFactor,
  mixHexColor,
  sunsetFactor,
  type WeatherMode,
} from "@/components/map-simulator/simulation-environment";
import {
  CAMERA_BASE_MOVE_SCALE,
  CAMERA_BASE_TURN_SCALE,
  CAMERA_DRAG_SENSITIVITY,
  CAMERA_DRIVE_SPEED,
  CAMERA_LOOK_HEIGHT,
  CAMERA_MAX_DISTANCE,
  CAMERA_MAX_PITCH,
  CAMERA_MIN_DISTANCE,
  CAMERA_MIN_PITCH,
  CAMERA_STRAFE_SPEED,
  CAMERA_TURN_SPEED,
  CROSSWALK_STEP,
  CROSSWALK_STRIPE_COUNT,
  CROSSWALK_WIDTH,
  CURBSIDE_SIDEWALK_OFFSET,
  HIDDEN_RENDER_FPS,
  HOTSPOT_ACTIVITY_REFRESH_INTERVAL,
  HOTSPOT_SLOWDOWN_DISTANCE,
  HOTSPOT_TRIGGER_DISTANCE,
  HOVER_REFRESH_INTERVAL,
  INTERSECTION_BOX_ENTRY_LOOKAHEAD,
  INTERSECTION_BOX_OCCUPANCY_RADIUS_SQ,
  INTERSECTION_EXIT_BLOCK_SPEED,
  INTERSECTION_EXIT_QUEUE_RADIUS_SQ,
  INTERSECTION_OCCUPANCY_LOOKAHEAD,
  INTERSECTION_SIGNAL_LOOKAHEAD,
  LABEL_RENDER_INTERVAL,
  LABEL_VISIBILITY_REFRESH_INTERVAL,
  MAX_VEHICLE_SIMULATION_STEPS,
  NON_ROAD_LAYER_Y,
  PEDESTRIAN_SPAN,
  ROAD_LAYER_Y,
  SERVICE_STOP_DURATION,
  SIGNAL_CYCLE,
  SIGNAL_RADIUS_SQ,
  SIMULATION_STATS_UPDATE_INTERVAL,
  TAXI_CLICK_MOVE_THRESHOLD,
  TAXI_VIEW_CAMERA_BACK_OFFSET,
  TAXI_VIEW_CAMERA_HEIGHT,
  TAXI_VIEW_CAMERA_SIDE_OFFSET,
  TAXI_VIEW_LOOK_AHEAD,
  TRAFFIC_ROUTE_REENTRY_DISTANCE,
  VEHICLE_FOLLOW_LOOKAHEAD_BUFFER,
  VEHICLE_PROXIMITY_CELL_SIZE,
  VEHICLE_SIMULATION_STEP,
} from "@/components/map-simulator/scene-constants";
import {
  ACTIVE_DISPATCH_PLANNER,
  BaseCameraMode,
  CameraMode,
  CameraFocusTarget,
  DongBoundarySegment,
  FpsMode,
  FpsStats,
  HOTSPOT_IDLE_COLORS,
  Hotspot,
  HotspotMarkerMode,
  HotspotVisual,
  KAKAO_TAXI_ASSET_PATH,
  KAKAO_TRAFFIC_ASSET_PATHS,
  LabelDistanceEntry,
  PedestrianVisual,
  RoadGraph,
  RouteTemplate,
  SceneLabelEntry,
  SceneLabelKind,
  SignalApproachDemand,
  SignalApproachDistance,
  SignalAxisOccupancy,
  SignalData,
  SignalDirectionalOccupancy,
  SignalFlow,
  SignalLampVisual,
  SignalVisual,
  Stats,
  SceneStatus,
  SimulationData,
  TAXI_ASSET_IDLE_TIMEOUT_MS,
  TAXI_ASSET_LOAD_DELAY_MS,
  TAXI_PALETTE,
  TRAFFIC_PALETTES,
  Vehicle,
  VehicleProximityBuckets,
  VehicleSimulationSample,
  addVehicleSampleToBucket,
  approachDirectionForHeading,
  assignVehicleRoute,
  boundaryHintElement,
  buildRoadNetworkOverlay,
  buildShortestRoute,
  canVehicleProceed,
  clampRouteDistance,
  clearVehicleSampleBuckets,
  copyVehicleMotionState,
  createCallerGroup,
  createPedestrianGroup,
  createSubwayStationStructure,
  createVehicleGroup,
  createVehicleMotionState,
  createVehicleSimulationSample,
  curbsideLaneOffset,
  dampAngle,
  disposeObject3DResources,
  distanceXZ,
  dominantAxisForHeading,
  dongShapeFromRing,
  formatHotspotTaxiBadge,
  hotspotCallElement,
  labelElement,
  labelVisibilityBudget,
  loadVehicleAssetTemplate,
  normalizeTaxiAssetTemplate,
  normalizeTrafficAssetTemplate,
  offsetToRight,
  opposingSignalDirection,
  precipitationDrawRatioFor,
  renderCapLabel,
  renderPixelRatioFor,
  resetSignalApproachDemand,
  resetSignalApproachDistance,
  resetSignalAxisOccupancy,
  resetSignalDirectionalOccupancy,
  resolveDispatchPlannerPresentation,
  resolveNextStop,
  resolveNextStopInto,
  resolveRenderCap,
  routeSegmentIndexAtDistance,
  sampleRoute,
  setTaxiAppearance,
  shapesOfNonRoadFeature,
  signalDirectionForVector,
  signalState,
  stabilizeRefreshRateBand,
  syncVehicleSampleBucket,
  syncVehicleTransform,
  updateVehicleMotionState,
  vehicleProximityCellCoord,
  wrapAngle,
} from "@/components/map-simulator/core";
import type {
  HotspotSnapshot,
  SceneStaticContext,
  SignalSnapshot,
  SimulationConfig,
  SimulationSnapshot,
  SimulationSource,
  VehiclePoseSnapshot,
  VehicleSnapshot,
} from "@/components/map-simulator/simulation-source";

type MapSimulatorSceneRuntimeProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  data: SimulationData | null;
  simulationSource: SimulationSource;
  appliedTaxiCountRef: MutableRefObject<number>;
  appliedTrafficCountRef: MutableRefObject<number>;
  cameraModeRef: MutableRefObject<CameraMode>;
  followTaxiIdRef: MutableRefObject<string>;
  rideExitModeRef: MutableRefObject<BaseCameraMode>;
  showLabelsRef: MutableRefObject<boolean>;
  optionalLabelObjectsRef: MutableRefObject<CSS2DObject[]>;
  showTransitRef: MutableRefObject<boolean>;
  transitGroupRef: MutableRefObject<THREE.Group | null>;
  hoverRefreshRequestRef: MutableRefObject<number>;
  labelRefreshRequestRef: MutableRefObject<number>;
  showFpsRef: MutableRefObject<boolean>;
  fpsModeRef: MutableRefObject<FpsMode>;
  showNonRoadRef: MutableRefObject<boolean>;
  nonRoadGroupRef: MutableRefObject<THREE.Group | null>;
  showRoadNetworkRef: MutableRefObject<boolean>;
  roadNetworkGroupRef: MutableRefObject<THREE.Group | null>;
  cameraFocusTargetRef: MutableRefObject<CameraFocusTarget | null>;
  simulationDateRef: MutableRefObject<string>;
  simulationTimeRef: MutableRefObject<number>;
  weatherModeRef: MutableRefObject<WeatherMode>;
  congestionSpeedMultiplierRef: MutableRefObject<number>;
  setStatus: Dispatch<SetStateAction<SceneStatus>>;
  setStatusDetail: Dispatch<SetStateAction<string>>;
  setLoadingProgress: Dispatch<SetStateAction<number>>;
  setStats: Dispatch<SetStateAction<Stats>>;
  setFpsStats: Dispatch<SetStateAction<FpsStats>>;
  setShowFps: Dispatch<SetStateAction<boolean>>;
  setFollowTaxiId: Dispatch<SetStateAction<string>>;
  setCameraMode: Dispatch<SetStateAction<CameraMode>>;
  onCameraFocusChange?: (focus: {
    x: number;
    z: number;
    label: string;
    headingX: number;
    headingZ: number;
  }) => void;
};

export default function MapSimulatorSceneRuntime({
  containerRef,
  data,
  simulationSource,
  appliedTaxiCountRef,
  appliedTrafficCountRef,
  cameraModeRef,
  followTaxiIdRef,
  rideExitModeRef,
  showLabelsRef,
  optionalLabelObjectsRef,
  showTransitRef,
  transitGroupRef,
  hoverRefreshRequestRef,
  labelRefreshRequestRef,
  showFpsRef,
  fpsModeRef,
  showNonRoadRef,
  nonRoadGroupRef,
  showRoadNetworkRef,
  roadNetworkGroupRef,
  cameraFocusTargetRef,
  simulationDateRef,
  simulationTimeRef,
  weatherModeRef,
  congestionSpeedMultiplierRef,
  setStatus,
  setStatusDetail,
  setLoadingProgress,
  setStats,
  setFpsStats,
  setShowFps,
  setFollowTaxiId,
  setCameraMode,
  onCameraFocusChange,
}: MapSimulatorSceneRuntimeProps) {
  useEffect(() => {
    if (!data || !containerRef.current) {
      return undefined;
    }

    const container = containerRef.current;
    const simulationData = data;
    const dispatchPresentation = resolveDispatchPlannerPresentation(
      simulationData.meta.dispatchPlannerId,
    );
    let sceneDisposed = false;
    let isPageHidden = document.visibilityState === "hidden";
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

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        renderPixelRatioFor(
          cameraModeRef.current,
          document.visibilityState === "hidden",
        ),
      ),
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    container.appendChild(labelRenderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
    scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0xb6d5ff, 0x172333, 0.82);
    scene.add(hemisphereLight);

    const sun = new THREE.DirectionalLight(0xfff1d0, 1.15);
    sun.position.set(110, 180, 80);
    sun.castShadow = false;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 420;
    sun.shadow.camera.left = -180;
    sun.shadow.camera.right = 180;
    sun.shadow.camera.top = 180;
    sun.shadow.camera.bottom = -180;
    scene.add(sun);
    scene.add(sun.target);

    const buildingFeatures = data.buildingMasses;
    const dongRegions = data.dongRegions;
    const roadSegments = data.projectedRoadSegments;
    const transitLandmarks = data.transitLandmarks;
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
    const dummy = new THREE.Object3D();
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
    };
    let lastMiniMapFocusReportTimestamp = 0;
    let lastMiniMapFocusReportX = Number.POSITIVE_INFINITY;
    let lastMiniMapFocusReportZ = Number.POSITIVE_INFINITY;
    let lastMiniMapFocusReportHeadingX = Number.POSITIVE_INFINITY;
    let lastMiniMapFocusReportHeadingZ = Number.POSITIVE_INFINITY;
    let lastMiniMapFocusReportLabel = "";
    const pressedKeys = new Set<string>();
    const followOrbit = { yawOffset: 0.22 };
    let activeCameraMode = cameraModeRef.current;
    let activeFollowTaxiId = followTaxiIdRef.current;
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(2, 2);
    const taxiPointerHits: THREE.Intersection[] = [];
    const transitPointerHits: THREE.Intersection[] = [];
    const boundaryPointerHits: THREE.Intersection[] = [];
    const cameraOffset = new THREE.Vector3();
    const driveLookDirection = new THREE.Vector3();
    const driveStrafeDirection = new THREE.Vector3();
    const followFocusTarget = new THREE.Vector3();
    let pointerInside = false;
    let pointerClientX = 0;
    let pointerClientY = 0;
    let pointerDownClientX = 0;
    let pointerDownClientY = 0;
    let pointerDragged = false;
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
    const labelDistanceEntries: LabelDistanceEntry[] = [];

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

    const shadowSpan = Math.max(size.x, size.z) * 0.72;
    sun.shadow.camera.far = Math.max(420, shadowSpan * 3.2);
    sun.shadow.camera.left = -shadowSpan;
    sun.shadow.camera.right = shadowSpan;
    sun.shadow.camera.top = shadowSpan;
    sun.shadow.camera.bottom = -shadowSpan;
    sun.shadow.camera.updateProjectionMatrix();

    const createPrecipitationLayer = (
      count: number,
      material: THREE.PointsMaterial,
      minHeight: number,
      maxHeight: number,
    ) => {
      const positions = new Float32Array(count * 3);
      const seeds = new Float32Array(count);
      const spanX = size.x + 180;
      const spanZ = size.z + 180;
      const minX = centerPoint.x - spanX / 2;
      const maxX = centerPoint.x + spanX / 2;
      const minZ = centerPoint.z - spanZ / 2;
      const maxZ = centerPoint.z + spanZ / 2;

      for (let index = 0; index < count; index += 1) {
        const offset = index * 3;
        positions[offset] = THREE.MathUtils.lerp(minX, maxX, Math.random());
        positions[offset + 1] = THREE.MathUtils.lerp(
          minHeight,
          maxHeight,
          Math.random(),
        );
        positions[offset + 2] = THREE.MathUtils.lerp(minZ, maxZ, Math.random());
        seeds[index] = Math.random();
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      geometry.setDrawRange(0, count);
      const points = new THREE.Points(geometry, material);
      points.visible = false;
      scene.add(points);

      return {
        geometry,
        material,
        points,
        seeds,
        minHeight,
        maxHeight,
        minX,
        maxX,
        minZ,
        maxZ,
      };
    };

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x202327,
      roughness: 0.98,
      metalness: 0.01,
    });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size.x + 120, size.z + 120),
      groundMaterial,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(centerPoint.x, 0, centerPoint.z);
    ground.receiveShadow = true;
    scene.add(ground);

    const dongFloorGroup = new THREE.Group();
    const dongFloorMaterials: THREE.MeshBasicMaterial[] = [];
    dongRegions.forEach((dong) => {
      dong.rings.forEach((ring) => {
        const shape = dongShapeFromRing(ring);
        if (!shape) {
          return;
        }

        const fillMaterial = new THREE.MeshBasicMaterial({
          color: dong.color,
          transparent: true,
          opacity: 0.03,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        dongFloorMaterials.push(fillMaterial);
        const fill = new THREE.Mesh(
          new THREE.ShapeGeometry(shape),
          fillMaterial,
        );
        fill.rotation.x = -Math.PI / 2;
        fill.position.y = 0.018;
        fill.renderOrder = 2;
        dongFloorGroup.add(fill);
      });
    });
    scene.add(dongFloorGroup);

    const nonRoadShapes = {
      facility: [] as THREE.Shape[],
      green: [] as THREE.Shape[],
      pedestrian: [] as THREE.Shape[],
      parking: [] as THREE.Shape[],
      water: [] as THREE.Shape[],
    };

    data.nonRoad.features.forEach((feature) => {
      shapesOfNonRoadFeature(feature, data.center).forEach((shape) => {
        nonRoadShapes[feature.properties.category].push(shape);
      });
    });

    const nonRoadMaterials = {
      facility: new THREE.MeshBasicMaterial({
        color: 0x4f5358,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      }),
      green: new THREE.MeshBasicMaterial({
        color: 0x465344,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -3,
      }),
      pedestrian: new THREE.MeshBasicMaterial({
        color: 0x67645f,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -4,
      }),
      parking: new THREE.MeshBasicMaterial({
        color: 0x6c655c,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -5,
      }),
      water: new THREE.MeshBasicMaterial({
        color: 0x485965,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -6,
      }),
    };

    nonRoadGroup = new THREE.Group();
    nonRoadGroup.name = "non-road-surfaces";

    (["facility", "green", "pedestrian", "parking", "water"] as const).forEach(
      (category) => {
        const shapes = nonRoadShapes[category];
        if (!shapes.length) {
          return;
        }

        const mesh = new THREE.Mesh(
          new THREE.ShapeGeometry(shapes),
          nonRoadMaterials[category],
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = NON_ROAD_LAYER_Y[category];
        mesh.renderOrder = 6;
        nonRoadGroup?.add(mesh);
      },
    );

    nonRoadGroup.visible = showNonRoadRef.current;
    scene.add(nonRoadGroup);
    nonRoadGroupRef.current = nonRoadGroup;

    const celestialRadius = Math.max(size.x, size.z) + 320;
    const sunDiscMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd9a8,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(9.4, 20, 20),
      sunDiscMaterial,
    );
    scene.add(sunDisc);

    const sunHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb66c,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(17.6, 20, 20),
      sunHaloMaterial,
    );
    scene.add(sunHalo);

    const sunsetGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8b47,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    const sunsetGlow = new THREE.Mesh(
      new THREE.SphereGeometry(27, 20, 20),
      sunsetGlowMaterial,
    );
    scene.add(sunsetGlow);

    const moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xe9f2ff,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(6.6, 18, 18),
      moonMaterial,
    );
    scene.add(moon);

    const starPositions = new Float32Array(280 * 3);
    for (let index = 0; index < 280; index += 1) {
      const azimuth = Math.random() * Math.PI * 2;
      const elevation = THREE.MathUtils.lerp(0.24, 1.14, Math.random());
      const radius = celestialRadius + Math.random() * 120;
      const offset = index * 3;
      starPositions[offset] =
        centerPoint.x + Math.cos(azimuth) * Math.cos(elevation) * radius;
      starPositions[offset + 1] = Math.sin(elevation) * radius * 0.82 + 110;
      starPositions[offset + 2] =
        centerPoint.z + Math.sin(azimuth) * Math.cos(elevation) * radius;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3),
    );
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xf4f8ff,
      size: 1.9,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    const cloudPuffGeometry = new THREE.SphereGeometry(1, 14, 14);
    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xdfe8f2,
      emissive: 0x243344,
      emissiveIntensity: 0.05,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    const cloudClusters = Array.from({ length: 5 }, (_, index) => {
      const cluster = new THREE.Group();
      const azimuth =
        (index / 8) * Math.PI * 2 + (index % 2 === 0 ? 0.22 : -0.16);
      const elevation = THREE.MathUtils.lerp(0.24, 0.5, (index % 5) / 5);
      const radius =
        celestialRadius * THREE.MathUtils.lerp(0.56, 0.72, (index % 4) / 4);
      const anchor = new THREE.Vector3(
        centerPoint.x + Math.cos(azimuth) * Math.cos(elevation) * radius,
        Math.sin(elevation) * radius * 0.76 + 72 + (index % 3) * 10,
        centerPoint.z + Math.sin(azimuth) * Math.cos(elevation) * radius,
      );

      [
        { x: -7.5, y: 0.4, z: 0, sx: 7.2, sy: 2.8, sz: 3.6 },
        { x: -2.2, y: 1.2, z: 1.1, sx: 6.1, sy: 2.5, sz: 3.1 },
        { x: 3.8, y: 0.8, z: -0.4, sx: 7.8, sy: 3.1, sz: 3.7 },
        { x: 8.4, y: 0.1, z: 0.7, sx: 5.8, sy: 2.2, sz: 2.8 },
      ].forEach((puff) => {
        const mesh = new THREE.Mesh(cloudPuffGeometry, cloudMaterial);
        mesh.position.set(puff.x, puff.y, puff.z);
        mesh.scale.set(puff.sx, puff.sy, puff.sz);
        cluster.add(mesh);
      });

      cluster.position.copy(anchor);
      scene.add(cluster);
      return { cluster, anchor, phase: index * 0.9 };
    });

    const stormCloudMaterial = new THREE.MeshLambertMaterial({
      color: 0x7a8da0,
      emissive: 0x1e2a36,
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    const stormCloudClusters = Array.from({ length: 4 }, (_, index) => {
      const cluster = new THREE.Group();
      const azimuth =
        (index / 6) * Math.PI * 2 + (index % 2 === 0 ? 0.34 : -0.22);
      const elevation = THREE.MathUtils.lerp(0.16, 0.28, (index % 3) / 3);
      const radius =
        celestialRadius * THREE.MathUtils.lerp(0.48, 0.62, (index % 4) / 4);
      const anchor = new THREE.Vector3(
        centerPoint.x + Math.cos(azimuth) * Math.cos(elevation) * radius,
        Math.sin(elevation) * radius * 0.62 + 56 + (index % 2) * 7,
        centerPoint.z + Math.sin(azimuth) * Math.cos(elevation) * radius,
      );

      [
        { x: -10.5, y: 0.2, z: 0.5, sx: 10.8, sy: 3.8, sz: 5.2 },
        { x: -3.2, y: 1.1, z: -1.2, sx: 9.6, sy: 3.4, sz: 4.7 },
        { x: 5.4, y: 0.9, z: 0.3, sx: 11.2, sy: 4.2, sz: 5.6 },
        { x: 13.2, y: 0.1, z: -0.4, sx: 8.2, sy: 3.1, sz: 4.4 },
      ].forEach((puff) => {
        const mesh = new THREE.Mesh(cloudPuffGeometry, stormCloudMaterial);
        mesh.position.set(puff.x, puff.y, puff.z);
        mesh.scale.set(puff.sx, puff.sy, puff.sz);
        cluster.add(mesh);
      });

      cluster.position.copy(anchor);
      cluster.visible = false;
      scene.add(cluster);
      return { cluster, anchor, phase: index * 1.2 };
    });

    const rainLayer = createPrecipitationLayer(
      480,
      new THREE.PointsMaterial({
        color: 0xb8ddff,
        size: 0.28,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
      12,
      76,
    );
    const snowLayer = createPrecipitationLayer(
      360,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.68,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
      10,
      70,
    );
    const rainPositions = rainLayer.geometry.attributes.position
      .array as Float32Array;
    const snowPositions = snowLayer.geometry.attributes.position
      .array as Float32Array;
    const rainSeedCount = rainLayer.seeds.length;
    const snowSeedCount = snowLayer.seeds.length;
    let activeRainSeedCount = rainSeedCount;
    let activeSnowSeedCount = snowSeedCount;
    let appliedPrecipitationDensitySignature = "";
    const syncPrecipitationDensity = (mode: CameraMode) => {
      const drawRatio = precipitationDrawRatioFor(mode, isPageHidden);
      const rainDrawCount = Math.round(rainSeedCount * drawRatio);
      const snowDrawCount = Math.round(snowSeedCount * drawRatio);
      const nextSignature = `${mode}:${isPageHidden ? "hidden" : "visible"}:${rainDrawCount}:${snowDrawCount}`;
      if (nextSignature === appliedPrecipitationDensitySignature) {
        return;
      }

      appliedPrecipitationDensitySignature = nextSignature;
      activeRainSeedCount = rainDrawCount;
      activeSnowSeedCount = snowDrawCount;
      rainLayer.geometry.setDrawRange(0, rainDrawCount);
      snowLayer.geometry.setDrawRange(0, snowDrawCount);
    };

    const signalById = new Map<string, SignalData>();
    const signalByKey = new Map<string, SignalData>();
    const signalVisuals: SignalVisual[] = [];
    const hotspotVisuals: HotspotVisual[] = [];
    const pedestrianVisuals: PedestrianVisual[] = [];
    const vehicles: Vehicle[] = [];
    const taxiVehicles: Vehicle[] = [];
    const trafficVehicles: Vehicle[] = [];
    const taxiClickTargets: THREE.Object3D[] = [];
    const taxiById = new Map<string, Vehicle>();
    const vehicleById = new Map<string, Vehicle>();
    const routeCache = new Map<string, RouteTemplate | null>();
    let graph: RoadGraph | null = data.graph;
    let dispatchPlanner: ReturnType<
      typeof ACTIVE_DISPATCH_PLANNER.createSession
    > | null = null;
    const hotspotPool: Hotspot[] = data.hotspotPool;
    let completedTrips = 0;
    let completedPickups = 0;
    let totalPickupWaitSeconds = 0;
    let totalRideSeconds = 0;
    let activePedestrians = 0;
    let crosswalkMaterial: THREE.MeshStandardMaterial | null = null;
    let stopLineMaterial: THREE.MeshStandardMaterial | null = null;
    let roadNetworkOverlay: THREE.Group | null = null;
    const taxiRoutePool: RouteTemplate[] = data.taxiRoutePool;
    const trafficRoutePool: RouteTemplate[] = data.trafficRoutePool;
    const loopRoutes: RouteTemplate[] = data.loopRoutes;
    const hotspotById = new Map(
      hotspotPool.map((hotspot) => [hotspot.id, hotspot] as const),
    );
    const routeById = new Map(
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
    let vehicleLayerReady = false;
    let taxiAssetTemplate: THREE.Group | null = null;
    let trafficAssetTemplates: THREE.Group[] = [];
    let activeVehicleSpeedMultiplier = 1;
    let activeStarOpacity = 0;
    let vehicleSimulationAccumulator = 0;
    let latestSimulationSnapshot: SimulationSnapshot | null = null;
    let activeVehicleIdentitySignature = "";
    let appliedDateIso: string | null = null;
    let appliedWeatherMode: WeatherMode | null = null;
    let appliedTimeMinutes = -1;
    let hotspotActivityAccumulator = HOTSPOT_ACTIVITY_REFRESH_INTERVAL;
    void hotspotActivityAccumulator;
    const frameSignalStates = new Map<string, SignalFlow>();
    const activePickupsByHotspot = new Map<string, number>();
    const activeDropoffsByHotspot = new Map<string, number>();
    const intersectionOccupancy = new Map<string, SignalAxisOccupancy>();
    const intersectionApproachDemand = new Map<string, SignalApproachDemand>();
    const intersectionApproachDistance = new Map<
      string,
      SignalApproachDistance
    >();
    const intersectionExitOccupancy = new Map<
      string,
      SignalDirectionalOccupancy
    >();
    const proximityBuckets: VehicleProximityBuckets = new Map();
    const vehicleSimulationSamples: VehicleSimulationSample[] = [];
    const activeVehicleDensity = {
      taxis: appliedTaxiCountRef.current,
      traffic: appliedTrafficCountRef.current,
    };

    const rebuildHotspotDemandMaps = (
      pickupDemandMap: Map<string, number>,
      dropoffDemandMap: Map<string, number>,
      excludedVehicleId?: string | null,
    ) => {
      pickupDemandMap.clear();
      dropoffDemandMap.clear();

      for (let index = 0; index < vehicles.length; index += 1) {
        const vehicle = vehicles[index]!;
        if (vehicle.kind !== "taxi" || vehicle.id === excludedVehicleId) {
          continue;
        }

        if (!vehicle.isOccupied && vehicle.pickupHotspot) {
          pickupDemandMap.set(
            vehicle.pickupHotspot.id,
            (pickupDemandMap.get(vehicle.pickupHotspot.id) ?? 0) + 1,
          );
        }

        if (vehicle.isOccupied && vehicle.dropoffHotspot) {
          dropoffDemandMap.set(
            vehicle.dropoffHotspot.id,
            (dropoffDemandMap.get(vehicle.dropoffHotspot.id) ?? 0) + 1,
          );
        }
      }
    };

    const decrementDemandCount = (
      demandMap: Map<string, number>,
      hotspotId: string | null | undefined,
    ) => {
      if (!hotspotId) {
        return;
      }

      const nextCount = (demandMap.get(hotspotId) ?? 0) - 1;
      if (nextCount > 0) {
        demandMap.set(hotspotId, nextCount);
      } else {
        demandMap.delete(hotspotId);
      }
    };

    const incrementDemandCount = (
      demandMap: Map<string, number>,
      hotspotId: string | null | undefined,
    ) => {
      if (!hotspotId) {
        return;
      }

      demandMap.set(hotspotId, (demandMap.get(hotspotId) ?? 0) + 1);
    };

    const replaceDemandMapContents = (
      demandMap: Map<string, number>,
      nextValues: ReadonlyMap<string, number>,
    ) => {
      demandMap.clear();
      nextValues.forEach((count, hotspotId) => {
        demandMap.set(hotspotId, count);
      });
    };

    const createDispatchDemandSnapshotFromMaps = (
      elapsedTimeSeconds: number,
      pickupDemandMap: Map<string, number>,
      dropoffDemandMap: Map<string, number>,
    ): DispatchDemandSnapshot => ({
      elapsedTimeSeconds,
      completedTrips,
      hotspotCount: hotspotPool.length,
      activePickupsByHotspotId: pickupDemandMap,
      activeDropoffsByHotspotId: dropoffDemandMap,
    });

    let hotspotDemandMapsDirty = true;
    const syncActiveHotspotDemandMaps = () => {
      rebuildHotspotDemandMaps(activePickupsByHotspot, activeDropoffsByHotspot);
      hotspotDemandMapsDirty = false;
      hotspotActivityAccumulator = 0;
    };

    const createDispatchDemandSnapshot = (
      elapsedTimeSeconds: number,
      excludedVehicleId?: string | null,
    ): DispatchDemandSnapshot => {
      if (hotspotDemandMapsDirty) {
        syncActiveHotspotDemandMaps();
      }

      const pickupDemandMap = new Map(activePickupsByHotspot);
      const dropoffDemandMap = new Map(activeDropoffsByHotspot);
      const excludedVehicle = excludedVehicleId
        ? taxiById.get(excludedVehicleId) ?? null
        : null;

      if (excludedVehicle) {
        if (!excludedVehicle.isOccupied && excludedVehicle.pickupHotspot) {
          decrementDemandCount(
            pickupDemandMap,
            excludedVehicle.pickupHotspot.id,
          );
        }

        if (excludedVehicle.isOccupied && excludedVehicle.dropoffHotspot) {
          decrementDemandCount(
            dropoffDemandMap,
            excludedVehicle.dropoffHotspot.id,
          );
        }
      }

      return createDispatchDemandSnapshotFromMaps(
        elapsedTimeSeconds,
        pickupDemandMap,
        dropoffDemandMap,
      );
    };

    const demandMapTotal = (demandMap: ReadonlyMap<string, number>) => {
      let total = 0;
      demandMap.forEach((count) => {
        total += count;
      });
      return total;
    };

    const buildStatsSnapshot = (
      nextTaxiCount: number,
      nextTrafficCount: number,
      waitingVehicles: number,
      activeTrips: number,
    ) => ({
      taxis: nextTaxiCount,
      traffic: nextTrafficCount,
      waiting: waitingVehicles,
      signals: signalVisuals.length,
      activeTrips,
      completedTrips,
      pedestrians: activePedestrians,
      pickups: completedPickups,
      dropoffs: completedTrips,
      activeCalls: demandMapTotal(activePickupsByHotspot),
      avgPickupWaitSeconds:
        completedPickups > 0 ? totalPickupWaitSeconds / completedPickups : 0,
      avgRideSeconds: completedTrips > 0 ? totalRideSeconds / completedTrips : 0,
    });

    const statsMatch = (left: Stats, right: Stats) =>
      left.taxis === right.taxis &&
      left.traffic === right.traffic &&
      left.waiting === right.waiting &&
      left.signals === right.signals &&
      left.activeTrips === right.activeTrips &&
      left.completedTrips === right.completedTrips &&
      left.pedestrians === right.pedestrians &&
      left.pickups === right.pickups &&
      left.dropoffs === right.dropoffs &&
      left.activeCalls === right.activeCalls &&
      left.avgPickupWaitSeconds === right.avgPickupWaitSeconds &&
      left.avgRideSeconds === right.avgRideSeconds;

    const commitStatsSnapshot = (nextStats: Stats) => {
      setStats((current) => (statsMatch(current, nextStats) ? current : nextStats));
    };

    const routeBuilder = (
      start: string,
      end: string,
      id: string,
      label: string | null,
    ) => {
      if (!graph) {
        return null;
      }
      const cacheKey = `${start}|${end}`;
      if (routeCache.has(cacheKey)) {
        return routeCache.get(cacheKey) ?? null;
      }
      const route = buildShortestRoute(
        graph,
        signalByKey,
        start,
        end,
        id,
        label,
      );
      routeCache.set(cacheKey, route);
      return route;
    };

    const rebuildDispatchPlanner = () => {
      if (!graph || !hotspotPool.length) {
        dispatchPlanner = null;
        return;
      }

      dispatchPlanner = ACTIVE_DISPATCH_PLANNER.createSession({
        hotspots: hotspotPool,
        graph,
        routeBuilder,
      });
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

    const writeMotionFromPose = (
      target: Vehicle["motion"],
      pose: VehiclePoseSnapshot,
    ) => {
      target.position.copy(pose.position);
      target.lanePosition.copy(pose.lanePosition);
      target.heading.copy(pose.heading);
      target.right.copy(pose.right);
      target.yaw = pose.yaw;
      target.segmentIndex = pose.segmentIndex;
      target.nextStopIndex = pose.nextStopIndex;
    };

    const fallbackRouteForKind = (kind: VehicleSnapshot["kind"]) =>
      kind === "taxi"
        ? taxiRoutePool[0] ?? trafficRoutePool[0] ?? loopRoutes[0]
        : trafficRoutePool[0] ?? taxiRoutePool[0] ?? loopRoutes[0];

    const resolveRouteForSnapshot = (vehicleSnapshot: VehicleSnapshot) =>
      routeById.get(vehicleSnapshot.routeId) ??
      fallbackRouteForKind(vehicleSnapshot.kind);

    const createVehicleFromSnapshot = (
      vehicleSnapshot: VehicleSnapshot,
      snapshotIndex: number,
    ) => {
      const route = resolveRouteForSnapshot(vehicleSnapshot);
      if (!route) {
        return null;
      }

      const templateOptions =
        vehicleSnapshot.kind === "taxi"
          ? { taxiAssetTemplate }
          : {
            importedAssetTemplate: resolveTrafficAssetTemplate(snapshotIndex),
          };
      const { group, bodyMaterial, signMaterial, clickTarget } =
        createVehicleGroup(
          vehicleSnapshot.kind,
          vehicleSnapshot.palette,
          templateOptions,
        );
      scene.add(group);

      const vehicle: Vehicle = {
        id: vehicleSnapshot.id,
        kind: vehicleSnapshot.kind,
        route,
        group,
        bodyMaterial,
        signMaterial,
        baseSpeed: vehicleSnapshot.baseSpeed,
        speed: vehicleSnapshot.speed,
        distance: 0,
        safeGap: vehicleSnapshot.safeGap,
        length: vehicleSnapshot.length,
        currentSignalId: null,
        roadName: vehicleSnapshot.roadName,
        palette: vehicleSnapshot.palette,
        isOccupied: vehicleSnapshot.isOccupied,
        pickupHotspot:
          (vehicleSnapshot.pickupHotspotId
            ? hotspotById.get(vehicleSnapshot.pickupHotspotId)
            : null) ?? null,
        dropoffHotspot:
          (vehicleSnapshot.dropoffHotspotId
            ? hotspotById.get(vehicleSnapshot.dropoffHotspotId)
            : null) ?? null,
        jobAssignedAt: 0,
        pickupStartedAt: null,
        serviceTimer: 0,
        planMode: vehicleSnapshot.planMode,
        previousMotion: createVehicleMotionState(),
        motion: createVehicleMotionState(),
        renderMotion: createVehicleMotionState(),
      };

      group.userData.vehicleId = vehicle.id;
      group.traverse((child) => {
        child.userData.vehicleId = vehicle.id;
      });
      if (clickTarget && vehicle.kind === "taxi") {
        taxiClickTargets.push(clickTarget);
      }

      writeMotionFromPose(vehicle.previousMotion, vehicleSnapshot.previousPose);
      writeMotionFromPose(vehicle.motion, vehicleSnapshot.pose);
      copyVehicleMotionState(vehicle.renderMotion, vehicle.motion);
      setTaxiAppearance(vehicle);
      syncVehicleTransform(vehicle, 1);
      vehicleById.set(vehicle.id, vehicle);
      return vehicle;
    };

    const pickNextTrafficRoute = (
      currentRouteId: string,
      vehicleIndex: number,
      elapsedTime: number,
    ) => {
      if (!trafficRoutePool.length) {
        return null;
      }

      const seed =
        Math.floor(elapsedTime * 0.6) + vehicleIndex * 7 + completedTrips * 3;
      for (let offset = 0; offset < trafficRoutePool.length; offset += 1) {
        const route =
          trafficRoutePool[
            (seed + offset + trafficRoutePool.length) % trafficRoutePool.length
          ]!;
        if (trafficRoutePool.length === 1 || route.id !== currentRouteId) {
          return route;
        }
      }

      return trafficRoutePool[seed % trafficRoutePool.length]!;
    };

    const resolveTrafficAssetTemplate = (vehicleIndex: number) =>
      trafficAssetTemplates.length
        ? trafficAssetTemplates[vehicleIndex % trafficAssetTemplates.length]!
        : null;

    const updateVehicleLayerStats = (
      nextTaxiCount: number,
      nextTrafficCount: number,
    ) => {
      commitStatsSnapshot(
        buildStatsSnapshot(nextTaxiCount, nextTrafficCount, 0, 0),
      );
    };

    const upgradeTaxiVehicleMeshes = () => {
      if (!taxiAssetTemplate || !taxiVehicles.length) {
        return;
      }

      taxiClickTargets.length = 0;
      taxiVehicles.forEach((vehicle) => {
        const previousGroup = vehicle.group;
        const { group, bodyMaterial, signMaterial, clickTarget } =
          createVehicleGroup("taxi", vehicle.palette, { taxiAssetTemplate });

        group.userData.vehicleId = vehicle.id;
        group.traverse((child) => {
          child.userData.vehicleId = vehicle.id;
        });
        scene.add(group);

        vehicle.group = group;
        vehicle.bodyMaterial = bodyMaterial;
        vehicle.signMaterial = signMaterial;
        setTaxiAppearance(vehicle);
        syncVehicleTransform(vehicle, 1);
        if (clickTarget) {
          taxiClickTargets.push(clickTarget);
        }

        previousGroup.removeFromParent();
        disposeObject3DResources(previousGroup);
      });

      hoverNeedsUpdate = true;
      labelRenderPending = true;
      labelRenderAccumulator = 0;
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    const upgradeTrafficVehicleMeshes = () => {
      if (!trafficAssetTemplates.length || !trafficVehicles.length) {
        return;
      }

      trafficVehicles.forEach((vehicle, index) => {
        const previousGroup = vehicle.group;
        const { group, bodyMaterial, signMaterial } = createVehicleGroup(
          "traffic",
          vehicle.palette,
          { importedAssetTemplate: resolveTrafficAssetTemplate(index) },
        );

        group.userData.vehicleId = vehicle.id;
        group.traverse((child) => {
          child.userData.vehicleId = vehicle.id;
        });
        scene.add(group);

        vehicle.group = group;
        vehicle.bodyMaterial = bodyMaterial;
        vehicle.signMaterial = signMaterial;
        syncVehicleTransform(vehicle, 1);

        previousGroup.removeFromParent();
        disposeObject3DResources(previousGroup);
      });

      labelRenderPending = true;
      labelRenderAccumulator = 0;
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    const clearVehicleLayer = () => {
      vehicles.forEach((vehicle) => {
        vehicle.group.removeFromParent();
        disposeObject3DResources(vehicle.group);
      });
      vehicles.length = 0;
      taxiVehicles.length = 0;
      trafficVehicles.length = 0;
      taxiClickTargets.length = 0;
      taxiById.clear();
      vehicleById.clear();
      activePickupsByHotspot.clear();
      activeDropoffsByHotspot.clear();
      hotspotDemandMapsDirty = false;
      hotspotActivityAccumulator = 0;
      vehicleSimulationAccumulator = 0;
      completedTrips = 0;
      completedPickups = 0;
      totalPickupWaitSeconds = 0;
      totalRideSeconds = 0;
    };

    const syncVehicleLayerFromSnapshot = (
      vehicleSnapshots: VehicleSnapshot[],
      interpolationAlpha = 1,
    ) => {
      const nextIdentitySignature = vehicleSnapshots
        .map((vehicleSnapshot) => vehicleSnapshot.id)
        .join("|");
      const shouldRebuildVehicleGroups =
        !vehicleLayerReady ||
        nextIdentitySignature !== activeVehicleIdentitySignature;

      if (shouldRebuildVehicleGroups) {
        clearVehicleLayer();
        activeVehicleIdentitySignature = nextIdentitySignature;

        vehicleSnapshots.forEach((vehicleSnapshot, snapshotIndex) => {
          const vehicle = createVehicleFromSnapshot(vehicleSnapshot, snapshotIndex);
          if (!vehicle) {
            return;
          }
          vehicles.push(vehicle);
          if (vehicle.kind === "taxi") {
            taxiVehicles.push(vehicle);
            taxiById.set(vehicle.id, vehicle);
          } else {
            trafficVehicles.push(vehicle);
          }
        });
        vehicleLayerReady = true;
      } else {
        vehicles.length = 0;
        taxiVehicles.length = 0;
        trafficVehicles.length = 0;

        vehicleSnapshots.forEach((vehicleSnapshot) => {
          const vehicle = vehicleById.get(vehicleSnapshot.id);
          if (!vehicle) {
            return;
          }

          vehicles.push(vehicle);
          if (vehicle.kind === "taxi") {
            taxiVehicles.push(vehicle);
            taxiById.set(vehicle.id, vehicle);
          } else {
            trafficVehicles.push(vehicle);
          }
        });
      }

      vehicleSnapshots.forEach((vehicleSnapshot) => {
        const vehicle = vehicleById.get(vehicleSnapshot.id);
        if (!vehicle) {
          return;
        }

        vehicle.route = resolveRouteForSnapshot(vehicleSnapshot) ?? vehicle.route;
        vehicle.baseSpeed = vehicleSnapshot.baseSpeed;
        vehicle.speed = vehicleSnapshot.speed;
        vehicle.safeGap = vehicleSnapshot.safeGap;
        vehicle.length = vehicleSnapshot.length;
        vehicle.roadName = vehicleSnapshot.roadName;
        vehicle.palette = vehicleSnapshot.palette;
        vehicle.planMode = vehicleSnapshot.planMode;
        vehicle.isOccupied = vehicleSnapshot.isOccupied;
        vehicle.pickupHotspot =
          (vehicleSnapshot.pickupHotspotId
            ? hotspotById.get(vehicleSnapshot.pickupHotspotId)
            : null) ?? null;
        vehicle.dropoffHotspot =
          (vehicleSnapshot.dropoffHotspotId
            ? hotspotById.get(vehicleSnapshot.dropoffHotspotId)
            : null) ?? null;
        writeMotionFromPose(vehicle.previousMotion, vehicleSnapshot.previousPose);
        writeMotionFromPose(vehicle.motion, vehicleSnapshot.pose);
        setTaxiAppearance(vehicle);
        syncVehicleTransform(vehicle, interpolationAlpha);
      });

      syncSelectedTaxi();
    };

    const commitSourceStats = (snapshotStats: Stats) => {
      commitStatsSnapshot({
        ...snapshotStats,
        signals: signalVisuals.length,
        pedestrians: activePedestrians,
      });
    };

    const rebuildVehicleLayer = (nextTaxiCount: number, nextTrafficCount: number) => {
      if (!dispatchPlanner || !hotspotPool.length || !trafficRoutePool.length) {
        return;
      }
      if (!sceneDisposed) {
        setStatusDetail("차량 레이어 구성 중");
        setLoadingProgress(86);
      }

      clearVehicleLayer();
      activeVehicleDensity.taxis = nextTaxiCount;
      activeVehicleDensity.traffic = nextTrafficCount;
      const bootstrapPickupDemandMap = new Map<string, number>();
      const bootstrapDropoffDemandMap = new Map<string, number>();

      for (let index = 0; index < nextTaxiCount; index += 1) {
        const spawnHotspot = hotspotPool[(index * 2) % hotspotPool.length];
        const vehicleId = `taxi-${index}`;
        const job = dispatchPlanner.planJob({
          startKey: spawnHotspot.nodeKey,
          seed: index + 1,
          vehicleId,
          demandSnapshot: createDispatchDemandSnapshotFromMaps(
            0,
            bootstrapPickupDemandMap,
            bootstrapDropoffDemandMap,
          ),
        });
        if (!job) {
          continue;
        }

        const { group, bodyMaterial, signMaterial, clickTarget } =
          createVehicleGroup("taxi", TAXI_PALETTE, { taxiAssetTemplate });
        scene.add(group);

        const vehicle: Vehicle = {
          id: vehicleId,
          kind: "taxi",
          route: job.pickupRoute,
          group,
          bodyMaterial,
          signMaterial,
          baseSpeed: 7.1 + (index % 4) * 0.55,
          speed: 0,
          distance: 0,
          safeGap: 7.8,
          length: 4.6,
          currentSignalId: null,
          roadName: job.pickupRoute.name,
          palette: TAXI_PALETTE,
          isOccupied: false,
          pickupHotspot: job.pickupHotspot,
          dropoffHotspot: job.dropoffHotspot,
          jobAssignedAt: latestElapsedTime,
          pickupStartedAt: null,
          serviceTimer: 0,
          planMode: "pickup",
          previousMotion: createVehicleMotionState(),
          motion: createVehicleMotionState(),
          renderMotion: createVehicleMotionState(),
        };
        vehicle.motion.nextStopIndex = resolveNextStop(
          job.pickupRoute,
          0,
          0,
        ).index;
        group.userData.vehicleId = vehicle.id;
        group.traverse((child) => {
          child.userData.vehicleId = vehicle.id;
        });
        if (clickTarget) {
          taxiClickTargets.push(clickTarget);
        }
        setTaxiAppearance(vehicle);
        updateVehicleMotionState(vehicle);
        copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
        copyVehicleMotionState(vehicle.renderMotion, vehicle.motion);
        syncVehicleTransform(vehicle, 1);
        vehicles.push(vehicle);
        taxiVehicles.push(vehicle);
        taxiById.set(vehicle.id, vehicle);
        incrementDemandCount(bootstrapPickupDemandMap, job.pickupHotspot.id);
      }

      for (let index = 0; index < nextTrafficCount; index += 1) {
        const route = trafficRoutePool[index % trafficRoutePool.length];
        const palette = TRAFFIC_PALETTES[index % TRAFFIC_PALETTES.length];
        const { group, bodyMaterial, signMaterial } = createVehicleGroup(
          "traffic",
          palette,
          { importedAssetTemplate: resolveTrafficAssetTemplate(index) },
        );
        scene.add(group);

        const vehicle: Vehicle = {
          id: `traffic-${index}`,
          kind: "traffic",
          route,
          group,
          bodyMaterial,
          signMaterial,
          baseSpeed: 5.6 + (index % 5) * 0.4,
          speed: 0,
          distance: (route.totalLength / nextTrafficCount) * index,
          safeGap: 6.4,
          length: 4.2,
          currentSignalId: null,
          roadName: route.name,
          palette,
          isOccupied: false,
          pickupHotspot: null,
          dropoffHotspot: null,
          jobAssignedAt: 0,
          pickupStartedAt: null,
          serviceTimer: 0,
          planMode: "traffic",
          previousMotion: createVehicleMotionState(),
          motion: createVehicleMotionState(),
          renderMotion: createVehicleMotionState(),
        };
        vehicle.motion.segmentIndex = routeSegmentIndexAtDistance(
          route,
          vehicle.distance,
          0,
        );
        vehicle.motion.nextStopIndex = resolveNextStop(
          route,
          vehicle.distance,
          0,
        ).index;
        updateVehicleMotionState(vehicle);
        copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
        copyVehicleMotionState(vehicle.renderMotion, vehicle.motion);
        syncVehicleTransform(vehicle, 1);
        vehicles.push(vehicle);
        trafficVehicles.push(vehicle);
      }

      replaceDemandMapContents(activePickupsByHotspot, bootstrapPickupDemandMap);
      replaceDemandMapContents(activeDropoffsByHotspot, bootstrapDropoffDemandMap);
      hotspotDemandMapsDirty = false;
      hotspotActivityAccumulator = 0;
      syncSelectedTaxi();
      hoverNeedsUpdate = true;
      updateVehicleLayerStats(taxiVehicles.length, vehicles.length - taxiVehicles.length);
      if (!sceneDisposed) {
        setLoadingProgress(100);
        setStatus("ready");
        setStatusDetail("주행 준비 완료");
      }
    };
    void rebuildVehicleLayer;

    const syncVehicleDensity = () => {
      if (!vehicleLayerReady) {
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

    const dongBoundaryGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x6dbb9b,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const dongBoundaryGlowMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.035, 1),
      dongBoundaryGlowMaterial,
      dongBoundarySegments.length,
    );

    dongBoundarySegments.forEach((segment, index) => {
      dummy.position.set(segment.center.x, 0.26, segment.center.z);
      dummy.rotation.set(0, segment.angle, 0);
      dummy.scale.set(2.1, 1, segment.length + 1.1);
      dummy.updateMatrix();
      dongBoundaryGlowMesh.setMatrixAt(index, dummy.matrix);
      dongBoundaryGlowMesh.setColorAt(index, new THREE.Color(0x87cbb0));
    });

    dongBoundaryGlowMesh.instanceMatrix.needsUpdate = true;
    if (dongBoundaryGlowMesh.instanceColor) {
      dongBoundaryGlowMesh.instanceColor.needsUpdate = true;
    }
    dongBoundaryGlowMesh.renderOrder = 35;
    scene.add(dongBoundaryGlowMesh);

    const dongBoundaryLineMaterial = new THREE.MeshBasicMaterial({
      color: 0x87d2b0,
      transparent: true,
      opacity: 0.78,
    });
    const dongBoundaryMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.05, 1),
      dongBoundaryLineMaterial,
      dongBoundarySegments.length,
    );

    dongBoundarySegments.forEach((segment, index) => {
      dummy.position.set(segment.center.x, 0.315, segment.center.z);
      dummy.rotation.set(0, segment.angle, 0);
      dummy.scale.set(1.28, 1.4, segment.length + 0.44);
      dummy.updateMatrix();
      dongBoundaryMesh.setMatrixAt(index, dummy.matrix);
      dongBoundaryMesh.setColorAt(index, new THREE.Color(0x91d6b5));
    });

    dongBoundaryMesh.instanceMatrix.needsUpdate = true;
    if (dongBoundaryMesh.instanceColor) {
      dongBoundaryMesh.instanceColor.needsUpdate = true;
    }
    dongBoundaryMesh.renderOrder = 36;
    scene.add(dongBoundaryMesh);

    const dongWallMaterial = new THREE.MeshBasicMaterial({
      color: 0x87cbb0,
      transparent: true,
      opacity: 0.001,
      depthWrite: false,
    });
    const dongWallMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      dongWallMaterial,
      dongBoundarySegments.length,
    );

    dongBoundarySegments.forEach((segment, index) => {
      dummy.position.set(
        segment.center.x,
        dongBoundaryWallHeight / 2,
        segment.center.z,
      );
      dummy.rotation.set(0, segment.angle, 0);
      dummy.scale.set(0.42, dongBoundaryWallHeight, segment.length + 0.16);
      dummy.updateMatrix();
      dongWallMesh.setMatrixAt(index, dummy.matrix);
      dongWallMesh.setColorAt(index, new THREE.Color(0x8bffb7));
    });

    dongWallMesh.instanceMatrix.needsUpdate = true;
    if (dongWallMesh.instanceColor) {
      dongWallMesh.instanceColor.needsUpdate = true;
    }
    dongWallMesh.renderOrder = 24;
    scene.add(dongWallMesh);

    const roadMaterials = {
      arterial: new THREE.MeshStandardMaterial({
        color: 0x626d77,
        roughness: 0.94,
        metalness: 0.01,
        emissive: 0x0d1720,
        emissiveIntensity: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
      connector: new THREE.MeshStandardMaterial({
        color: 0x4e5861,
        roughness: 0.95,
        metalness: 0.01,
        emissive: 0x0b131b,
        emissiveIntensity: 0.035,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
      local: new THREE.MeshStandardMaterial({
        color: 0x343c44,
        roughness: 0.98,
        metalness: 0.01,
        polygonOffset: true,
        polygonOffsetFactor: 0,
        polygonOffsetUnits: 0,
      }),
    };

    const roadGeometries = {
      arterial: [] as typeof roadSegments,
      connector: [] as typeof roadSegments,
      local: [] as typeof roadSegments,
    };

    roadSegments.forEach((segment) => {
      if (distanceXZ(segment.start, segment.end) < 1) {
        return;
      }
      roadGeometries[segment.roadClass].push(segment);
    });

    (["arterial", "connector", "local"] as const).forEach((roadClass) => {
      const segments = roadGeometries[roadClass];
      const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.25, 1),
        roadMaterials[roadClass],
        segments.length,
      );

      segments.forEach((segment, index) => {
        const length = distanceXZ(segment.start, segment.end);
        const center = segment.start.clone().lerp(segment.end, 0.5);
        const angle = Math.atan2(
          segment.end.x - segment.start.x,
          segment.end.z - segment.start.z,
        );
        dummy.position.set(center.x, ROAD_LAYER_Y[roadClass], center.z);
        dummy.rotation.set(0, angle, 0);
        dummy.scale.set(segment.width, 1, length + 1.2);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.renderOrder =
        roadClass === "arterial" ? 20 : roadClass === "connector" ? 10 : 0;
      scene.add(mesh);
    });

    const laneMarkers = roadSegments.flatMap((segment) => {
      if (segment.roadClass === "local") {
        return [];
      }
      const length = distanceXZ(segment.start, segment.end);
      if (length < 12) {
        return [];
      }
      const dashLength = segment.roadClass === "arterial" ? 4.8 : 3.7;
      const gapLength = segment.roadClass === "arterial" ? 4.2 : 3.5;
      const angle = Math.atan2(
        segment.end.x - segment.start.x,
        segment.end.z - segment.start.z,
      );
      const markerCount = Math.max(
        1,
        Math.floor((length - 4) / (dashLength + gapLength)),
      );

      return Array.from({ length: markerCount }, (_, markerIndex) => {
        const dashCenter = Math.min(
          length - dashLength * 0.5 - 2,
          2 + markerIndex * (dashLength + gapLength) + dashLength * 0.5,
        );
        return {
          center: segment.start.clone().lerp(segment.end, dashCenter / length),
          angle,
          length: dashLength,
        };
      });
    });

    const laneMarkerMaterial = new THREE.MeshStandardMaterial({
      color: 0xf3e9cf,
      emissive: 0x4c412d,
      emissiveIntensity: 0.06,
      roughness: 0.82,
    });
    const laneMarkerMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 0.03, 1),
      laneMarkerMaterial,
      laneMarkers.length,
    );

    laneMarkers.forEach((marker, index) => {
      dummy.position.set(marker.center.x, 0.16, marker.center.z);
      dummy.rotation.set(0, marker.angle, 0);
      dummy.scale.set(1, 1, marker.length);
      dummy.updateMatrix();
      laneMarkerMesh.setMatrixAt(index, dummy.matrix);
    });
    laneMarkerMesh.instanceMatrix.needsUpdate = true;
    scene.add(laneMarkerMesh);

    const buildingMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.98,
      metalness: 0.02,
      emissive: 0x171b20,
      emissiveIntensity: 0.025,
    });
    const buildingMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      buildingMaterial,
      buildingFeatures.length,
    );

    buildingFeatures.forEach((building, index) => {
      dummy.position.set(
        building.position.x,
        building.height / 2,
        building.position.z,
      );
      dummy.rotation.set(0, building.rotationY, 0);
      dummy.scale.set(building.width, building.height, building.depth);
      dummy.updateMatrix();
      buildingMesh.setMatrixAt(index, dummy.matrix);
      buildingMesh.setColorAt(index, new THREE.Color(building.color));
    });
    buildingMesh.instanceMatrix.needsUpdate = true;
    if (buildingMesh.instanceColor) {
      buildingMesh.instanceColor.needsUpdate = true;
    }
    scene.add(buildingMesh);

    const labelObjects: CSS2DObject[] = [];
    const optionalLabelObjects: CSS2DObject[] = [];
    const districtLabelElements = new Map<string, HTMLDivElement>();
    const transitHoverTargets: THREE.Object3D[] = [];
    const registerSceneLabel = (
      label: CSS2DObject,
      kind: SceneLabelKind,
      priority: number,
      name: string | null,
    ) => {
      const entry = {
        label,
        kind,
        priority,
        name,
      } satisfies SceneLabelEntry;
      if (kind === "district") {
        districtLabelEntries.push(entry);
      } else {
        optionalLabelEntries.push(entry);
      }
      return entry;
    };
    const transitGroup = new THREE.Group();
    transitGroup.visible = showTransitRef.current;
    scene.add(transitGroup);
    transitGroupRef.current = transitGroup;
    const boundaryHintText = boundaryHintElement();
    container.appendChild(boundaryHintText);
    const transitHoverMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    transitHoverMaterial.colorWrite = false;

    const applyDistrictPresentation = (mode: CameraMode) => {
      const isOverview = mode === "overview";
      dongFloorMaterials.forEach((material) => {
        material.opacity = isOverview ? 0.05 : 0.024;
      });
      dongBoundaryGlowMaterial.opacity = isOverview ? 0.2 : 0.13;
      dongBoundaryLineMaterial.color.setHex(isOverview ? 0x93d7b7 : 0x7fc8a9);
      dongBoundaryLineMaterial.opacity = isOverview ? 0.8 : 0.62;
      dongWallMaterial.opacity = 0.001;
    };

    const applyRenderBudget = (mode: CameraMode) => {
      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio,
          renderPixelRatioFor(mode, isPageHidden),
        ),
      );
      renderer.setSize(container.clientWidth, container.clientHeight, false);
    };

    let activeHighlightedDongNames: string[] = [];
    const setBoundaryDongHighlight = (dongNames: string[]) => {
      const activeDongs = new Set(dongNames.filter(Boolean));
      const previousDongs = activeHighlightedDongNames;
      if (
        previousDongs.length === activeDongs.size &&
        previousDongs.every((dongName) => activeDongs.has(dongName))
      ) {
        return;
      }

      activeHighlightedDongNames = [...activeDongs];
      markLabelVisibilityDirty();
      districtLabelElements.forEach((element, dongName) => {
        const isActive = activeDongs.has(dongName);
        element.style.background = isActive
          ? "rgba(18,84,45,0.97)"
          : "rgba(5,48,67,0.96)";
        element.style.borderColor = isActive
          ? "rgba(162,255,187,0.5)"
          : "rgba(255,255,255,0.12)";
        element.style.color = isActive ? "#f2fff5" : "#d5f6ff";
        element.style.boxShadow = isActive
          ? "0 0 0 1px rgba(162,255,187,0.12), 0 10px 24px rgba(0,0,0,0.32)"
          : "0 8px 18px rgba(0,0,0,0.25)";
        element.style.transform = isActive
          ? "translateY(-1px) scale(1.03)"
          : "none";
      });
    };

    const syncLabelVisibility = (mode: CameraMode) => {
      const budget = labelVisibilityBudget(mode);
      const cameraPosition = camera.position;
      const highlightedDongs = new Set(activeHighlightedDongNames);
      let visibleDistrictCount = 0;
      let visibleOptionalCount = 0;

      labelDistanceEntries.length = 0;
      districtLabelEntries.forEach((entry) => {
        const isHighlighted = entry.name ? highlightedDongs.has(entry.name) : false;
        if (isHighlighted) {
          entry.label.visible = true;
          visibleDistrictCount += 1;
          return;
        }

        entry.label.visible = false;
        const distanceSq = entry.label.position.distanceToSquared(cameraPosition);
        if (distanceSq <= budget.districtDistanceSq) {
          labelDistanceEntries.push({ entry, distanceSq });
        }
      });

      labelDistanceEntries.sort(
        (left, right) =>
          left.entry.priority - right.entry.priority ||
          left.distanceSq - right.distanceSq,
      );
      for (
        let index = 0;
        index < Math.max(0, budget.districtLimit - visibleDistrictCount) &&
        index < labelDistanceEntries.length;
        index += 1
      ) {
        labelDistanceEntries[index]!.entry.label.visible = true;
        visibleDistrictCount += 1;
      }

      labelDistanceEntries.length = 0;
      optionalLabelEntries.forEach((entry) => {
        entry.label.visible = false;
        const isMapContextLabel =
          entry.kind === "transit" || entry.kind === "road";
        if (!showLabelsRef.current && !isMapContextLabel) {
          return;
        }
        if (entry.kind === "transit" && !showTransitRef.current) {
          return;
        }

        const distanceSq = entry.label.position.distanceToSquared(cameraPosition);
        if (distanceSq <= budget.optionalDistanceSq) {
          labelDistanceEntries.push({ entry, distanceSq });
        }
      });

      labelDistanceEntries.sort(
        (left, right) =>
          left.entry.priority - right.entry.priority ||
          left.distanceSq - right.distanceSq,
      );
      for (
        let index = 0;
        index < budget.optionalLimit && index < labelDistanceEntries.length;
        index += 1
      ) {
        labelDistanceEntries[index]!.entry.label.visible = true;
        visibleOptionalCount += 1;
      }

      visibleSceneLabelCount = visibleDistrictCount + visibleOptionalCount;
      labelRenderPending = true;
    };

    const resolveFollowTaxi = () =>
      taxiById.get(followTaxiIdRef.current) ?? taxiVehicles[0] ?? null;

    const resolveTaxiFromPointerRay = () => {
      if (!taxiClickTargets.length) {
        return null;
      }

      taxiPointerHits.length = 0;
      raycaster.intersectObjects(taxiClickTargets, false, taxiPointerHits);
      const hit = taxiPointerHits[0];
      if (!hit) {
        return null;
      }

      const hitVehicleId = (hit.object.userData?.vehicleId ??
        hit.object.parent?.userData?.vehicleId) as string | undefined;
      if (!hitVehicleId) {
        return null;
      }
      return taxiById.get(hitVehicleId) ?? null;
    };

    const findTaxiFromPointer = () => {
      raycaster.setFromCamera(pointerNdc, camera);
      return resolveTaxiFromPointerRay();
    };

    const resolveTransitNameFromPointerRay = () => {
      if (!showTransitRef.current || !transitHoverTargets.length) {
        return null;
      }

      transitPointerHits.length = 0;
      raycaster.intersectObjects(
        transitHoverTargets,
        false,
        transitPointerHits,
      );
      const hit = transitPointerHits[0];
      const transitName = hit?.object.userData?.transitName as
        | string
        | undefined;
      return transitName ?? null;
    };

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

    dongRegions.forEach((dong) => {
      const label = new CSS2DObject(labelElement(dong.name, "district"));
      label.position.set(dong.position.x, 2.8, dong.position.z);
      label.visible = true;
      districtLabelElements.set(dong.name, label.element as HTMLDivElement);
      labelObjects.push(label);
      registerSceneLabel(label, "district", 0, dong.name);
      scene.add(label);
    });

    buildingFeatures
      .filter((building) => building.label)
      .sort((left, right) => right.height - left.height)
      .slice(0, 7)
      .forEach((building) => {
        const label = new CSS2DObject(
          labelElement(building.label as string, "building"),
        );
        label.position.set(
          building.position.x,
          Math.min(building.height + 4, 38),
          building.position.z,
        );
        label.visible = showLabelsRef.current;
        labelObjects.push(label);
        optionalLabelObjects.push(label);
        registerSceneLabel(label, "building", 0, building.label as string);
        scene.add(label);
      });

    transitLandmarks
      .filter((landmark) => landmark.category === "subway_station")
      .forEach((landmark, index) => {
        const structure = createSubwayStationStructure(
          index,
          landmark.sideSign,
          landmark.isMajor,
        );
        structure.position.copy(landmark.position);
        structure.rotation.y = landmark.yaw;
        structure.scale.setScalar(landmark.isMajor ? 1.14 : 0.94);
        const hoverTarget = new THREE.Mesh(
          new THREE.BoxGeometry(
            landmark.isMajor ? 3.8 : 3.2,
            landmark.isMajor ? 3.5 : 3,
            landmark.isMajor ? 3.6 : 3,
          ),
          transitHoverMaterial,
        );
        hoverTarget.position.set(0, landmark.isMajor ? 1.56 : 1.36, 0);
        hoverTarget.userData.transitName = landmark.name ?? "지하철역";
        structure.add(hoverTarget);
        transitHoverTargets.push(hoverTarget);
        transitGroup.add(structure);

        if (landmark.name) {
          const label = new CSS2DObject(labelElement(landmark.name, "transit"));
          label.position.set(
            landmark.position.x,
            landmark.isMajor ? 3.5 : 3.15,
            landmark.position.z,
          );
          label.visible = showLabelsRef.current;
          labelObjects.push(label);
          optionalLabelObjects.push(label);
          registerSceneLabel(label, "transit", landmark.isMajor ? 0 : 1, landmark.name);
          transitGroup.add(label);
        }
      });

    optionalLabelObjectsRef.current = optionalLabelObjects;

    const currentGraph = data.graph;
    graph = currentGraph;
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

    const taxiRouteById = new Map(
      taxiRoutePool.map((route) => [route.id, route]),
    );
    if (!hotspotPool.length) {
      return undefined;
    }
    rebuildDispatchPlanner();

    const nextSignalVisuals = signals.map((signal) => {
      const group = new THREE.Group();
      const reds: SignalLampVisual[] = [];
      const yellows: SignalLampVisual[] = [];
      const greens: SignalLampVisual[] = [];
      const leftArrows: SignalLampVisual[] = [];
      const pedestrianLamps: SignalLampVisual[] = [];

      const mastDistance = signal.approaches.length >= 4 ? 4.2 : 3.6;
      const mastLayout = signal.approaches.map((direction) => {
        switch (direction) {
          case "north":
            return {
              axis: "ns" as const,
              offset: new THREE.Vector3(0, 0, -mastDistance),
              yaw: 0,
            };
          case "south":
            return {
              axis: "ns" as const,
              offset: new THREE.Vector3(0, 0, mastDistance),
              yaw: Math.PI,
            };
          case "east":
            return {
              axis: "ew" as const,
              offset: new THREE.Vector3(mastDistance, 0, 0),
              yaw: Math.PI / 2,
            };
          default:
            return {
              axis: "ew" as const,
              offset: new THREE.Vector3(-mastDistance, 0, 0),
              yaw: -Math.PI / 2,
            };
        }
      });

        mastLayout.forEach(({ axis, offset, yaw }) => {
          const mast = new THREE.Group();
          mast.position.copy(offset);
          mast.rotation.y = yaw;

          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 3.35, 8),
            new THREE.MeshStandardMaterial({
              color: 0x8d98a6,
              roughness: 0.62,
            }),
          );
          pole.position.set(0, 1.675, 0);
          pole.castShadow = true;
          mast.add(pole);

          const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.58, 1.24, 0.42),
            new THREE.MeshStandardMaterial({ color: 0x10161f, roughness: 0.5 }),
          );
          head.position.set(0.02, 2.62, 0);
          mast.add(head);

          const red = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 12, 12),
            new THREE.MeshStandardMaterial({
              color: 0x431015,
              emissive: 0x230709,
            }),
          );
          red.position.set(0.02, 2.92, 0.24);
          mast.add(red);
          reds.push({ mesh: red, axis });

          const yellow = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 12, 12),
            new THREE.MeshStandardMaterial({
              color: 0x4a3612,
              emissive: 0x2a1806,
            }),
          );
          yellow.position.set(0.02, 2.67, 0.24);
          mast.add(yellow);
          yellows.push({ mesh: yellow, axis });

          const green = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 12, 12),
            new THREE.MeshStandardMaterial({
              color: 0x123f22,
              emissive: 0x081a0f,
            }),
          );
          green.position.set(0.02, 2.42, 0.24);
          mast.add(green);
          greens.push({ mesh: green, axis });

          const leftArrow = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.24, 0.14),
            new THREE.MeshStandardMaterial({
              color: 0x0f2218,
              emissive: 0x07120b,
            }),
          );
          leftArrow.position.set(0.36, 2.66, 0.18);
          leftArrow.visible = signal.hasProtectedLeft;
          mast.add(leftArrow);
          leftArrows.push({ mesh: leftArrow, axis });

          const pedestrianLamp = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.24, 0.14),
            new THREE.MeshStandardMaterial({
              color: 0x222833,
              emissive: 0x10151d,
            }),
          );
          pedestrianLamp.position.set(-0.36, 2.18, 0.18);
          mast.add(pedestrianLamp);
          pedestrianLamps.push({ mesh: pedestrianLamp, axis });

          group.add(mast);
        });

        group.position.copy(signal.visualPoint);
        scene.add(group);

        return {
          ...signal,
          group,
          reds,
          yellows,
          greens,
          leftArrows,
          pedestrianLamps,
          lastVisualSignature: "",
        } satisfies SignalVisual;
      });
      signalVisuals.push(...nextSignalVisuals);

      const crosswalkStripes = signalVisuals.flatMap((signal) => {
        const stripeOffset = (CROSSWALK_STRIPE_COUNT - 1) * 0.5;
        const nsStripes = Array.from(
          { length: CROSSWALK_STRIPE_COUNT },
          (_, index) => ({
            center: signal.visualPoint
              .clone()
              .add(
                new THREE.Vector3(
                  0,
                  0.03,
                  (index - stripeOffset) * CROSSWALK_STEP,
                ),
              ),
            angle: 0,
            width: CROSSWALK_WIDTH,
            depth: 0.34,
          }),
        );
        const ewStripes = Array.from(
          { length: CROSSWALK_STRIPE_COUNT },
          (_, index) => ({
            center: signal.visualPoint
              .clone()
              .add(
                new THREE.Vector3(
                  (index - stripeOffset) * CROSSWALK_STEP,
                  0.03,
                  0,
                ),
              ),
            angle: Math.PI / 2,
            width: CROSSWALK_WIDTH,
            depth: 0.34,
          }),
        );
        return [...nsStripes, ...ewStripes];
      });

      crosswalkMaterial = new THREE.MeshStandardMaterial({
        color: 0xc6cbd1,
        emissive: 0x15181c,
        emissiveIntensity: 0.02,
        roughness: 0.9,
      });
      const crosswalkMesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.02, 1),
        crosswalkMaterial,
        crosswalkStripes.length,
      );

      crosswalkStripes.forEach((stripe, index) => {
        dummy.position.copy(stripe.center);
        dummy.rotation.set(0, stripe.angle, 0);
        dummy.scale.set(stripe.width, 1, stripe.depth);
        dummy.updateMatrix();
        crosswalkMesh.setMatrixAt(index, dummy.matrix);
      });
      crosswalkMesh.instanceMatrix.needsUpdate = true;
      scene.add(crosswalkMesh);

      const stopLineMarkers = loopRoutes
        .filter((route) => route.roadClass !== "local")
        .flatMap((route) => route.stops.map((stop) => ({ route, stop })));

      stopLineMaterial = new THREE.MeshStandardMaterial({
        color: 0xd5d9dd,
        emissive: 0x181c22,
        emissiveIntensity: 0.03,
        roughness: 0.82,
      });
      const stopLineMesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.04, 0.32),
        stopLineMaterial,
        stopLineMarkers.length,
      );

      stopLineMarkers.forEach((marker, index) => {
        const sample = sampleRoute(marker.route, marker.stop.distance);
        const lanePosition = offsetToRight(
          sample.position,
          sample.heading,
          marker.route.laneOffset,
        );
        dummy.position.set(lanePosition.x, 0.18, lanePosition.z);
        dummy.rotation.set(
          0,
          Math.atan2(sample.heading.x, sample.heading.z),
          0,
        );
        dummy.scale.set(Math.min(marker.route.roadWidth * 0.48, 2.4), 1, 1);
        dummy.updateMatrix();
        stopLineMesh.setMatrixAt(index, dummy.matrix);
      });
      stopLineMesh.instanceMatrix.needsUpdate = true;
      scene.add(stopLineMesh);

      const nextHotspotVisuals = hotspotPool.map((hotspot, index) => {
        const group = new THREE.Group();
        const baseColor = HOTSPOT_IDLE_COLORS[index % HOTSPOT_IDLE_COLORS.length]!;
        const hotspotRoute = taxiRouteById.get(hotspot.routeId);
        const hotspotSample = hotspotRoute
          ? sampleRoute(hotspotRoute, hotspot.distance)
          : {
            position: hotspot.position.clone(),
            heading: new THREE.Vector3(0, 0, 1),
          };

        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.96, 1.12, 0.12, 20),
          new THREE.MeshStandardMaterial({
            color: 0x2c2f33,
            emissive: baseColor,
            emissiveIntensity: 0.05,
            roughness: 0.82,
            metalness: 0.04,
          }),
        );
        const baseMaterial = base.material as THREE.MeshStandardMaterial;
        base.position.y = 0.08;
        base.scale.setScalar(0.72);
        baseMaterial.emissiveIntensity = 0.025;
        group.add(base);

        const glow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.66, 0.78, 0.08, 18),
          new THREE.MeshStandardMaterial({
            color: 0xd2cbc0,
            emissive: baseColor,
            emissiveIntensity: 0.08,
            transparent: true,
            opacity: 0.18,
            roughness: 0.56,
          }),
        );
        const glowMaterial = glow.material as THREE.MeshStandardMaterial;
        glow.position.y = 0.18;
        glow.scale.setScalar(0.62);
        glowMaterial.emissiveIntensity = 0.035;
        glowMaterial.opacity = 0.1;
        group.add(glow);

        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 18, 18),
          new THREE.MeshStandardMaterial({
            color: 0xd9d4cb,
            emissive: baseColor,
            emissiveIntensity: 0.12,
            transparent: true,
            opacity: 0.22,
            roughness: 0.4,
          }),
        );
        const beaconMaterial = beacon.material as THREE.MeshStandardMaterial;
        beacon.position.y = 0.34;
        beacon.scale.setScalar(0.56);
        beaconMaterial.emissiveIntensity = 0.045;
        beaconMaterial.opacity = 0.12;
        group.add(beacon);

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.82, 0.05, 10, 28),
          new THREE.MeshStandardMaterial({
            color: 0xcfc4ad,
            emissive: baseColor,
            emissiveIntensity: 0.08,
            roughness: 0.68,
          }),
        );
        const ringMaterial = ring.material as THREE.MeshStandardMaterial;
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.18;
        ring.scale.setScalar(0.68);
        ringMaterial.emissiveIntensity = 0.03;
        group.add(ring);

        const caller = createCallerGroup(index);
        const curbOffset = hotspotRoute
          ? curbsideLaneOffset(hotspotRoute) + CURBSIDE_SIDEWALK_OFFSET
          : 2.15;
        const callerAnchor = offsetToRight(
          hotspotSample.position,
          hotspotSample.heading,
          curbOffset,
        ).addScaledVector(hotspotSample.heading, -0.3);
        caller.group.position.set(
          callerAnchor.x - hotspot.position.x,
          0.04,
          callerAnchor.z - hotspot.position.z,
        );
        caller.group.rotation.y = Math.atan2(
          hotspotSample.position.x - callerAnchor.x,
          hotspotSample.position.z - callerAnchor.z,
        );
        caller.group.visible = false;
        caller.waveArmPivot.rotation.z = -0.72;
        caller.hailCube.scale.setScalar(0.62);
        (caller.hailCube.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.03;
        group.add(caller.group);

        const callBadge = new CSS2DObject(hotspotCallElement());
        const badgeElement = callBadge.element as HTMLDivElement;
        callBadge.position.set(0, 1.92, 0);
        callBadge.visible = false;
        group.add(callBadge);

        group.position.copy(hotspot.position);
        scene.add(group);
        return {
          hotspot,
          base,
          baseMaterial,
          glow,
          glowMaterial,
          beacon,
          beaconMaterial,
          ring,
          ringMaterial,
          callerGroup: caller.group,
          waveArmPivot: caller.waveArmPivot,
          hailCube: caller.hailCube,
          hailMaterial: caller.hailCube.material as THREE.MeshStandardMaterial,
          callBadge,
          badgeElement,
          lastMarkerMode: "idle",
          lastAccentColor: baseColor,
          lastBadgeText: "승차",
        } satisfies HotspotVisual;
      });
      hotspotVisuals.push(...nextHotspotVisuals);

      const nextPedestrianVisuals: PedestrianVisual[] = signalVisuals.flatMap(
        (signal, signalIndex) => [
          {
            signalId: signal.id,
            axis: "ns" as const,
            group: createPedestrianGroup(signalIndex),
            phaseOffset: signalIndex * 0.17,
            speed: 0.18 + (signalIndex % 3) * 0.03,
            lateralOffset: -2.1,
            direction: 1 as const,
          },
          {
            signalId: signal.id,
            axis: "ns" as const,
            group: createPedestrianGroup(signalIndex + 2),
            phaseOffset: signalIndex * 0.13 + 0.4,
            speed: 0.16 + (signalIndex % 2) * 0.02,
            lateralOffset: 2.1,
            direction: -1 as const,
          },
          {
            signalId: signal.id,
            axis: "ew" as const,
            group: createPedestrianGroup(signalIndex + 4),
            phaseOffset: signalIndex * 0.11 + 0.2,
            speed: 0.19 + (signalIndex % 4) * 0.02,
            lateralOffset: -2.1,
            direction: 1 as const,
          },
          {
            signalId: signal.id,
            axis: "ew" as const,
            group: createPedestrianGroup(signalIndex + 7),
            phaseOffset: signalIndex * 0.09 + 0.6,
            speed: 0.17 + (signalIndex % 3) * 0.02,
            lateralOffset: 2.1,
            direction: -1 as const,
          },
        ],
      );
      nextPedestrianVisuals.forEach((pedestrian) => {
        pedestrian.group.visible = false;
        scene.add(pedestrian.group);
      });
      pedestrianVisuals.push(...nextPedestrianVisuals);

      taxiRoutePool
        .filter((route) => route.name)
        .slice(0, 6)
        .forEach((route) => {
          const sample = sampleRoute(route, route.totalLength * 0.4);
          const label = new CSS2DObject(
            labelElement(route.name as string, "road"),
          );
          label.position.copy(sample.position.clone().setY(1.6));
          label.visible = showLabelsRef.current;
          labelObjects.push(label);
          optionalLabelObjects.push(label);
          registerSceneLabel(label, "road", 2, route.name);
          scene.add(label);
        });

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
    let trafficAssetLoadStarted = false;
    let lastUserInteractionTimestamp = performance.now();
    const DEFERRED_ASSET_USER_IDLE_MS = 800;
    const markUserInteraction = () => {
      lastUserInteractionTimestamp = performance.now();
    };
    const waitForIdleSlice = (callback: () => void, timeoutMs: number) => {
      const requestIdleCallback = window.requestIdleCallback?.bind(window);
      if (requestIdleCallback) {
        return requestIdleCallback(
          () => {
            if (!sceneDisposed) {
              callback();
            }
          },
          { timeout: timeoutMs },
        );
      }

      return window.setTimeout(() => {
        if (!sceneDisposed) {
          callback();
        }
      }, 0);
    };
    const cancelIdleSlice = (handle: number) => {
      if (!handle) {
        return;
      }
      const cancelIdleCallback = window.cancelIdleCallback?.bind(window);
      if (cancelIdleCallback) {
        cancelIdleCallback(handle);
        return;
      }
      window.clearTimeout(handle);
    };
    const scheduleDeferredAssetLoad = (
      callback: () => void,
      delayMs: number,
      idleTimeoutMs: number,
    ) => {
      let idleHandle = 0;
      let retryHandle = 0;
      const scheduleWhenInteractionSettles = () => {
        if (sceneDisposed) {
          return;
        }

        const idleForMs = performance.now() - lastUserInteractionTimestamp;
        if (idleForMs < DEFERRED_ASSET_USER_IDLE_MS) {
          retryHandle = window.setTimeout(
            scheduleWhenInteractionSettles,
            Math.min(DEFERRED_ASSET_USER_IDLE_MS - idleForMs, 500),
          );
          return;
        }

        idleHandle = waitForIdleSlice(callback, idleTimeoutMs);
      };
      const timeoutHandle = window.setTimeout(
        scheduleWhenInteractionSettles,
        delayMs,
      );

      return () => {
        window.clearTimeout(timeoutHandle);
        window.clearTimeout(retryHandle);
        cancelIdleSlice(idleHandle);
      };
    };
    const loadTaxiAssetInBackground = () => {
      if (sceneDisposed || taxiAssetTemplate || taxiAssetLoadStarted) {
        return;
      }

      taxiAssetLoadStarted = true;
      void (async () => {
        try {
          const loadedTemplate = await loadVehicleAssetTemplate(KAKAO_TAXI_ASSET_PATH);
          if (sceneDisposed) {
            disposeObject3DResources(loadedTemplate);
            return;
          }

          taxiAssetTemplate = normalizeTaxiAssetTemplate(loadedTemplate);
          if (sceneDisposed) {
            disposeObject3DResources(taxiAssetTemplate);
            taxiAssetTemplate = null;
            return;
          }

          upgradeTaxiVehicleMeshes();
        } catch (error) {
          console.warn(
            "Failed to load Kakao taxi asset; keeping primitive taxi.",
            error,
          );
        }
      })();
    };
    const loadTrafficAssetsInBackground = () => {
      if (sceneDisposed || trafficAssetTemplates.length || trafficAssetLoadStarted) {
        return;
      }

      trafficAssetLoadStarted = true;
      void (async () => {
        const results = await Promise.allSettled(
          KAKAO_TRAFFIC_ASSET_PATHS.map(async (path) =>
            normalizeTrafficAssetTemplate(await loadVehicleAssetTemplate(path)),
          ),
        );

        if (sceneDisposed) {
          results.forEach((result) => {
            if (result.status === "fulfilled") {
              disposeObject3DResources(result.value);
            }
          });
          return;
        }

        trafficAssetTemplates = results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );

        results.forEach((result, index) => {
          if (result.status === "rejected") {
            console.warn(
              `Failed to load traffic asset: ${KAKAO_TRAFFIC_ASSET_PATHS[index]}`,
              result.reason,
            );
          }
        });

        if (!trafficAssetTemplates.length) {
          return;
        }

        upgradeTrafficVehicleMeshes();
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
    let refreshRateBand: number | null = null;
    let latestElapsedTime = 0;
    let statsAccumulator = 0;
    let fpsSampleElapsed = 0;
    let fpsFrameCount = 0;
    let simulationCpuSampleMs = 0;
    let signalCpuSampleMs = 0;
    let vehicleCpuSampleMs = 0;
    let overlayCpuSampleMs = 0;
    let renderCpuSampleMs = 0;
    let simulationStepSampleCount = 0;

    function applyEnvironment(
      dateIso: string,
      minutes: number,
      nextWeatherMode: WeatherMode,
    ) {
      const environment = buildEnvironmentState(
        dateIso,
        minutes,
        nextWeatherMode,
        simulationData.center,
      );
      const daylight = daylightFactor(dateIso, minutes, simulationData.center);
      const sunset = sunsetFactor(dateIso, minutes, simulationData.center);
      const cloudVisibility =
        nextWeatherMode === "clear"
          ? 1
          : nextWeatherMode === "cloudy"
            ? 0.78
            : nextWeatherMode === "heavy-rain"
              ? 0.42
              : 0.58;
      const background = scene.background as THREE.Color | null;

      background?.setHex(environment.skyColor);
      sceneFog.color.setHex(environment.fogColor);
      sceneFog.near = environment.fogNear;
      sceneFog.far = environment.fogFar;

      ambientLight.color.setHex(environment.ambientColor);
      ambientLight.intensity = environment.ambientIntensity;
      hemisphereLight.color.setHex(environment.hemiSkyColor);
      hemisphereLight.groundColor.setHex(environment.hemiGroundColor);
      hemisphereLight.intensity = environment.hemiIntensity;

      sun.color.setHex(environment.sunColor);
      sun.intensity = environment.sunIntensity;

      groundMaterial.color.setHex(environment.groundColor);
      roadMaterials.arterial.color.setHex(environment.roadColors.arterial);
      roadMaterials.connector.color.setHex(environment.roadColors.connector);
      roadMaterials.local.color.setHex(environment.roadColors.local);
      (
        [
          roadMaterials.arterial,
          roadMaterials.connector,
          roadMaterials.local,
        ] as THREE.MeshStandardMaterial[]
      ).forEach((material) => {
        material.roughness = environment.roadRoughness;
        material.metalness = environment.roadMetalness;
      });

      laneMarkerMaterial.color.setHex(environment.laneMarkerColor);
      laneMarkerMaterial.emissive.setHex(environment.laneMarkerEmissive);
      laneMarkerMaterial.emissiveIntensity = environment.laneMarkerIntensity;
      buildingMaterial.color.setHex(environment.buildingTint);
      buildingMaterial.emissive.setHex(environment.buildingEmissive);
      buildingMaterial.emissiveIntensity =
        environment.buildingEmissiveIntensity;
      if (crosswalkMaterial) {
        crosswalkMaterial.color.setHex(environment.crosswalkColor);
        crosswalkMaterial.emissive.setHex(environment.crosswalkEmissive);
        crosswalkMaterial.emissiveIntensity = environment.crosswalkIntensity;
      }
      if (stopLineMaterial) {
        stopLineMaterial.color.setHex(environment.stopLineColor);
        stopLineMaterial.emissive.setHex(environment.stopLineEmissive);
        stopLineMaterial.emissiveIntensity = environment.stopLineIntensity;
      }

      const skyDirection = environment.sunPosition.clone().normalize();
      const keyLightDirection =
        skyDirection.y > 0.06
          ? skyDirection
          : skyDirection
            .clone()
            .multiplyScalar(-1)
            .setY(Math.abs(skyDirection.y) * 0.72 + 0.2)
            .normalize();
      sun.position.copy(
        centerPoint
          .clone()
          .addScaledVector(keyLightDirection, celestialRadius * 0.56),
      );
      sun.target.position.copy(centerPoint);
      sun.target.updateMatrixWorld();
      const sunAnchor = centerPoint
        .clone()
        .addScaledVector(skyDirection, celestialRadius);
      sunDisc.position.copy(sunAnchor);
      sunHalo.position.copy(sunAnchor);
      sunsetGlow.position.copy(
        centerPoint
          .clone()
          .addScaledVector(
            new THREE.Vector3(
              skyDirection.x,
              Math.max(0.12, skyDirection.y * 0.48),
              skyDirection.z,
            ).normalize(),
            celestialRadius * 0.84,
          ),
      );

      const moonDirection = skyDirection.clone().multiplyScalar(-1);
      moonDirection.y = Math.max(0.2, moonDirection.y * 0.76 + 0.22);
      moonDirection.normalize();
      moon.position.copy(
        centerPoint
          .clone()
          .addScaledVector(moonDirection, celestialRadius * 0.92),
      );

      sunDiscMaterial.color.setHex(sunset > 0.18 ? 0xffc78b : 0xfff1c9);
      sunDiscMaterial.opacity =
        THREE.MathUtils.clamp(daylight * 0.34 + sunset * 0.52, 0, 0.86) *
        (0.88 + cloudVisibility * 0.12);
      sunHaloMaterial.opacity =
        THREE.MathUtils.clamp(daylight * 0.1 + sunset * 0.22, 0, 0.24) *
        cloudVisibility;
      sunsetGlowMaterial.opacity =
        THREE.MathUtils.clamp(sunset * 0.24, 0, 0.22) *
        (0.86 + cloudVisibility * 0.14);
      moonMaterial.opacity =
        THREE.MathUtils.clamp((0.22 - daylight) / 0.22, 0, 0.88) *
        (nextWeatherMode === "heavy-rain"
          ? 0.34
          : nextWeatherMode === "cloudy"
            ? 0.72
            : 0.84);
      activeStarOpacity =
        THREE.MathUtils.clamp((0.2 - daylight) / 0.2, 0, 0.78) *
        (nextWeatherMode === "heavy-rain"
          ? 0.12
          : nextWeatherMode === "cloudy"
            ? 0.46
            : nextWeatherMode === "heavy-snow"
              ? 0.58
              : 0.88);
      const cloudOpacityBase =
        nextWeatherMode === "clear"
          ? 0.08
          : nextWeatherMode === "cloudy"
            ? 0.4
            : nextWeatherMode === "heavy-rain"
              ? 0.54
              : 0.48;
      const cloudColor =
        nextWeatherMode === "heavy-rain"
          ? 0xa9b7c6
          : nextWeatherMode === "heavy-snow"
            ? 0xe7eff6
            : 0xe2eaf2;
      cloudMaterial.color.setHex(cloudColor);
      cloudMaterial.emissive.setHex(
        nextWeatherMode === "heavy-rain" ? 0x293948 : 0x243443,
      );
      cloudMaterial.opacity =
        nextWeatherMode === "heavy-rain"
          ? 0.2
          : cloudOpacityBase * (daylight > 0.08 ? 1.04 : 0.9);
      cloudClusters.forEach(({ cluster }) => {
        cluster.visible =
          nextWeatherMode !== "heavy-rain" && cloudOpacityBase > 0.01;
      });
      const stormCloudOpacity = nextWeatherMode === "heavy-rain" ? 0.62 : 0;
      stormCloudMaterial.opacity = stormCloudOpacity;
      stormCloudMaterial.color.setHex(
        nextWeatherMode === "heavy-rain" ? 0x66798d : 0x73879a,
      );
      stormCloudClusters.forEach(({ cluster }) => {
        cluster.visible = stormCloudOpacity > 0.01;
      });

      activeVehicleSpeedMultiplier = environment.vehicleSpeedMultiplier * congestionSpeedMultiplierRef.current;
      rainLayer.points.visible = environment.precipitation === "rain";
      rainLayer.material.opacity = environment.precipitationOpacity;
      rainLayer.material.size = 0.22 + environment.precipitationIntensity * 0.1;
      snowLayer.points.visible = environment.precipitation === "snow";
      snowLayer.material.opacity = environment.precipitationOpacity;
      snowLayer.material.size =
        0.58 + environment.precipitationIntensity * 0.18;

      renderer.toneMappingExposure = environment.exposure;
    }

    const updatePrecipitation = (delta: number, elapsedTime: number) => {
      if (rainLayer.points.visible) {
        for (let index = 0; index < activeRainSeedCount; index += 1) {
          const offset = index * 3;
          rainPositions[offset] += delta * 3.1;
          rainPositions[offset + 1] -= delta * (36 + rainLayer.seeds[index] * 16);
          rainPositions[offset + 2] += delta * 5.1;

          if (rainPositions[offset] > rainLayer.maxX)
            rainPositions[offset] = rainLayer.minX;
          if (rainPositions[offset + 2] > rainLayer.maxZ)
            rainPositions[offset + 2] = rainLayer.minZ;
          if (rainPositions[offset + 1] < rainLayer.minHeight) {
            rainPositions[offset] = THREE.MathUtils.lerp(
              rainLayer.minX,
              rainLayer.maxX,
              Math.random(),
            );
            rainPositions[offset + 1] = rainLayer.maxHeight;
            rainPositions[offset + 2] = THREE.MathUtils.lerp(
              rainLayer.minZ,
              rainLayer.maxZ,
              Math.random(),
            );
          }
        }
        rainLayer.geometry.attributes.position.needsUpdate = true;
      }

      if (snowLayer.points.visible) {
        for (let index = 0; index < activeSnowSeedCount; index += 1) {
          const offset = index * 3;
          const sway =
            Math.sin(elapsedTime * 1.6 + snowLayer.seeds[index] * Math.PI * 2) *
            0.52;
          snowPositions[offset] += sway * delta;
          snowPositions[offset + 1] -= delta * (7 + snowLayer.seeds[index] * 3.2);
          snowPositions[offset + 2] +=
            delta * (1.1 + snowLayer.seeds[index] * 0.8);

          if (snowPositions[offset] > snowLayer.maxX)
            snowPositions[offset] = snowLayer.minX;
          if (snowPositions[offset] < snowLayer.minX)
            snowPositions[offset] = snowLayer.maxX;
          if (snowPositions[offset + 2] > snowLayer.maxZ)
            snowPositions[offset + 2] = snowLayer.minZ;
          if (snowPositions[offset + 1] < snowLayer.minHeight) {
            snowPositions[offset] = THREE.MathUtils.lerp(
              snowLayer.minX,
              snowLayer.maxX,
              Math.random(),
            );
            snowPositions[offset + 1] = snowLayer.maxHeight;
            snowPositions[offset + 2] = THREE.MathUtils.lerp(
              snowLayer.minZ,
              snowLayer.maxZ,
              Math.random(),
            );
          }
        }
        snowLayer.geometry.attributes.position.needsUpdate = true;
      }
    };

    const updateSignalVisuals = (
      signalSnapshots: SignalSnapshot[],
      elapsedTime: number,
    ) => {
      if (!signalVisuals.length) {
        frameSignalStates.clear();
        return;
      }
      const signalSnapshotById = new Map(
        signalSnapshots.map((signalSnapshot) => [signalSnapshot.id, signalSnapshot] as const),
      );
      frameSignalStates.clear();
      signalVisuals.forEach((signal) => {
        const signalSnapshot = signalSnapshotById.get(signal.id);
        const state = signalSnapshot?.flow ?? signalState(signal, elapsedTime);
        const pedestrianFlashVisible =
          state.pedestrian === "flash" && Math.sin(elapsedTime * 12) > 0;
        frameSignalStates.set(signal.id, state);

        const visualSignature = `${state.phase}:${pedestrianFlashVisible ? "flash-on" : "flash-off"}`;
        if (visualSignature === signal.lastVisualSignature) {
          return;
        }
        signal.lastVisualSignature = visualSignature;

        signal.reds.forEach(({ mesh, axis }) => {
          (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            (axis === "ns" ? state.ns : state.ew) === "red"
              ? 0xff2d55
              : 0x240608,
          );
        });
        signal.yellows.forEach(({ mesh, axis }) => {
          (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            (axis === "ns" ? state.ns : state.ew) === "yellow"
              ? 0xffc247
              : 0x2a1806,
          );
        });
        signal.greens.forEach(({ mesh, axis }) => {
          (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            (axis === "ns" ? state.ns : state.ew) === "green"
              ? 0x3cf07b
              : 0x08190d,
          );
        });
        signal.leftArrows.forEach(({ mesh, axis }) => {
          (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            mesh.visible && (axis === "ns" ? state.nsLeft : state.ewLeft)
              ? 0x54f49d
              : 0x08190d,
          );
        });
        signal.pedestrianLamps.forEach(({ mesh }) => {
          (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            state.pedestrian === "walk"
              ? 0xf6f7ff
              : pedestrianFlashVisible
                ? 0xf9c756
                : 0x111721,
          );
        });
      });
    };

    const updateHotspotVisuals = (
      hotspotSnapshots: HotspotSnapshot[],
      elapsedTime: number,
    ) => {
      if (!hotspotVisuals.length) {
        return;
      }
      const hotspotSnapshotById = new Map(
        hotspotSnapshots.map((hotspotSnapshot) => [hotspotSnapshot.id, hotspotSnapshot] as const),
      );

      for (let index = 0; index < hotspotVisuals.length; index += 1) {
        const visual = hotspotVisuals[index]!;
        const hotspotSnapshot = hotspotSnapshotById.get(visual.hotspot.id);
        const markerMode: HotspotMarkerMode = hotspotSnapshot?.mode ?? "idle";
        const isActive = markerMode !== "idle";
        const markerPresentation = dispatchPresentation.hotspot[markerMode];
        const accentColor = markerPresentation.accentColor;
        const badgeText = formatHotspotTaxiBadge(
          markerPresentation.badgeLabel,
          hotspotSnapshot?.assignedTaxiNumbers ?? [],
        );

        if (visual.lastAccentColor !== accentColor) {
          visual.lastAccentColor = accentColor;
          visual.baseMaterial.color.setHex(
            mixHexColor(0x2c2f33, accentColor, markerMode === "idle" ? 0.16 : 0.3),
          );
          visual.baseMaterial.emissive.setHex(accentColor);
          visual.glowMaterial.color.setHex(
            mixHexColor(0xd2cbc0, accentColor, markerMode === "pickup" ? 0.18 : 0.1),
          );
          visual.glowMaterial.emissive.setHex(accentColor);
          visual.beaconMaterial.color.setHex(
            mixHexColor(0xd9d4cb, accentColor, markerMode === "pickup" ? 0.14 : 0.08),
          );
          visual.beaconMaterial.emissive.setHex(accentColor);
          visual.ringMaterial.color.setHex(
            mixHexColor(0xcfc4ad, accentColor, markerMode === "pickup" ? 0.16 : 0.08),
          );
          visual.ringMaterial.emissive.setHex(accentColor);
        }

        if (visual.lastMarkerMode !== markerMode) {
          visual.lastMarkerMode = markerMode;
          visual.callerGroup.visible = markerPresentation.showsCaller;
          visual.callBadge.visible = isActive;
          visual.badgeElement.style.borderColor =
            markerPresentation.badgeBorderColor;
          visual.badgeElement.style.background =
            markerPresentation.badgeBackground;
          visual.badgeElement.style.color = markerPresentation.badgeTextColor;

          if (!isActive) {
            visual.base.scale.setScalar(0.72);
            visual.glow.scale.setScalar(0.62);
            visual.beacon.scale.setScalar(0.56);
            visual.ring.scale.setScalar(0.68);
            visual.ring.rotation.z = index * 0.2;
            visual.baseMaterial.emissiveIntensity = 0.025;
            visual.glowMaterial.emissiveIntensity = 0.035;
            visual.glowMaterial.opacity = 0.1;
            visual.beaconMaterial.emissiveIntensity = 0.045;
            visual.beaconMaterial.opacity = 0.12;
            visual.ringMaterial.emissiveIntensity = 0.03;
            visual.hailMaterial.emissiveIntensity = 0.03;
            visual.callerGroup.position.y = 0.04;
            visual.waveArmPivot.rotation.z = -0.72;
            visual.hailCube.scale.setScalar(0.62);
            visual.callBadge.position.y = 1.92;
          }
        }

        if (visual.lastBadgeText !== badgeText) {
          visual.lastBadgeText = badgeText;
          visual.badgeElement.textContent = badgeText;
        }

        if (!isActive) {
          continue;
        }

        const pulse = 0.72 + Math.sin(elapsedTime * 2.2 + index * 0.7) * 0.12;
        visual.base.scale.setScalar(0.8 + pulse * 0.04);
        visual.glow.scale.setScalar(0.82 + pulse * 0.08);
        visual.beacon.scale.setScalar(0.72 + pulse * 0.1);
        visual.ring.scale.setScalar(0.84 + pulse * 0.08);
        visual.ring.rotation.z = elapsedTime * 0.24 + index * 0.12;

        visual.baseMaterial.emissiveIntensity = 0.07 + pulse * 0.04;
        visual.glowMaterial.emissiveIntensity = 0.08 + pulse * 0.05;
        visual.glowMaterial.opacity = 0.18 + pulse * 0.06;
        visual.beaconMaterial.emissiveIntensity = 0.1 + pulse * 0.06;
        visual.beaconMaterial.opacity = 0.2 + pulse * 0.08;
        visual.ringMaterial.emissiveIntensity = 0.08 + pulse * 0.05;
        visual.hailMaterial.emissiveIntensity =
          markerMode === "pickup" ? 0.08 + pulse * 0.08 : 0.03;
        visual.callerGroup.position.y =
          0.04 +
          (markerMode === "pickup"
            ? Math.sin(elapsedTime * 2.5 + index) * 0.025
            : 0);
        visual.waveArmPivot.rotation.z =
          markerMode === "pickup"
            ? -0.78 - Math.sin(elapsedTime * 4.2 + index * 0.8) * 0.18
            : -0.72;
        visual.hailCube.scale.setScalar(
          markerMode === "pickup" ? 0.72 + pulse * 0.08 : 0.62,
        );
        visual.callBadge.position.y =
          1.92 + (isActive ? Math.sin(elapsedTime * 2.2 + index) * 0.04 : 0);
      }
    };

    const updatePedestrians = (elapsedTime: number) => {
      if (!pedestrianVisuals.length) {
        activePedestrians = 0;
        return;
      }

      let visibleCount = 0;
      pedestrianVisuals.forEach((pedestrian) => {
        const signal = signalById.get(pedestrian.signalId);
        if (!signal) {
          pedestrian.group.visible = false;
          return;
        }

        const state =
          frameSignalStates.get(pedestrian.signalId) ??
          signalState(signal, elapsedTime);
        const cycleNumber = Math.floor(elapsedTime / SIGNAL_CYCLE);
        const signalSeed = Math.round(signal.offset * 100);
        const skipThisCycle = ((cycleNumber * 7 + signalSeed) % 5) < 2;
        const pedestrianFlashVisible =
          !skipThisCycle &&
          state.pedestrian === "flash" &&
          Math.sin(elapsedTime * 14 + pedestrian.phaseOffset) > 0;
        const isVisible =
          !skipThisCycle &&
          (state.pedestrian === "walk" || pedestrianFlashVisible);

        pedestrian.group.visible = isVisible;
        if (!isVisible) {
          return;
        }

        visibleCount += 1;
        const progressBase =
          (elapsedTime * pedestrian.speed + pedestrian.phaseOffset) % 1;
        const progress =
          pedestrian.direction === 1 ? progressBase : 1 - progressBase;
        const travel = THREE.MathUtils.lerp(
          -PEDESTRIAN_SPAN,
          PEDESTRIAN_SPAN,
          progress,
        );
        const bob =
          Math.sin(elapsedTime * 9 + pedestrian.phaseOffset * 11) * 0.05;

        if (pedestrian.axis === "ns") {
          pedestrian.group.position.set(
            signal.visualPoint.x + pedestrian.lateralOffset,
            bob,
            signal.visualPoint.z + travel,
          );
          pedestrian.group.rotation.y = 0;
        } else {
          pedestrian.group.position.set(
            signal.visualPoint.x + travel,
            bob,
            signal.visualPoint.z + pedestrian.lateralOffset,
          );
          pedestrian.group.rotation.y = Math.PI / 2;
        }
      });
      activePedestrians = visibleCount;
    };

    const updateVehicles = (delta: number, elapsedTime: number) => {
      if (!vehicles.length) {
        intersectionOccupancy.forEach(resetSignalAxisOccupancy);
        intersectionApproachDemand.forEach(resetSignalApproachDemand);
        intersectionApproachDistance.forEach(resetSignalApproachDistance);
        intersectionExitOccupancy.forEach(resetSignalDirectionalOccupancy);
        clearVehicleSampleBuckets(proximityBuckets);

        statsAccumulator += delta;
        if (statsAccumulator >= SIMULATION_STATS_UPDATE_INTERVAL) {
          statsAccumulator = 0;
          commitStatsSnapshot(
            buildStatsSnapshot(taxiVehicles.length, 0, 0, 0),
          );
        }
        return;
      }

      vehicleSimulationSamples.length = vehicles.length;
      intersectionOccupancy.forEach(resetSignalAxisOccupancy);
      intersectionApproachDemand.forEach(resetSignalApproachDemand);
      intersectionApproachDistance.forEach(resetSignalApproachDistance);
      intersectionExitOccupancy.forEach(resetSignalDirectionalOccupancy);
      clearVehicleSampleBuckets(proximityBuckets);
      for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex += 1) {
        const vehicle = vehicles[vehicleIndex]!;
        copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
      }

      for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex += 1) {
        const vehicle = vehicles[vehicleIndex]!;
        let sample = vehicleSimulationSamples[vehicleIndex];
        if (!sample) {
          sample = createVehicleSimulationSample(vehicle);
          vehicleSimulationSamples[vehicleIndex] = sample;
        } else {
          sample.vehicle = vehicle;
          sample.motion = vehicle.motion;
        }

        const currentMotion = sample.motion;
        const nextStopState = resolveNextStopInto(
          vehicle.route,
          vehicle.distance,
          sample.nextStopState,
          vehicle.motion.nextStopIndex,
        );
        vehicle.motion.nextStopIndex = nextStopState.index;
        vehicle.currentSignalId = null;

        const stop = nextStopState.stop;
        const signal = stop?.signal ?? null;
        if (signal && stop) {
          const signalDistanceSq = currentMotion.position.distanceToSquared(
            signal.point,
          );
          if (signalDistanceSq < SIGNAL_RADIUS_SQ) {
            vehicle.currentSignalId = signal.id;
          }
          if (nextStopState.ahead < INTERSECTION_SIGNAL_LOOKAHEAD) {
            const approachDemand = intersectionApproachDemand.get(signal.id)!;
            const approachDistance = intersectionApproachDistance.get(signal.id)!;
            const approachDirection = approachDirectionForHeading(
              vehicle.motion.heading,
            );
            approachDemand[approachDirection][stop.turn] += 1;
            if (stop.turn === "straight" || stop.turn === "right") {
              approachDistance[approachDirection] = Math.min(
                approachDistance[approachDirection],
                nextStopState.ahead,
              );
            }
          }
        }

        if (vehicle.currentSignalId) {
          const currentSignal = signalById.get(vehicle.currentSignalId) ?? null;
          const currentSignalDistanceSq =
            currentSignal?.point.distanceToSquared(currentMotion.position) ??
            Number.POSITIVE_INFINITY;
          if (
            currentSignal &&
            currentSignalDistanceSq < INTERSECTION_BOX_OCCUPANCY_RADIUS_SQ
          ) {
            const claim = intersectionOccupancy.get(currentSignal.id)!;
            const movementAxis = dominantAxisForHeading(vehicle.motion.heading);
            claim[movementAxis] += 1;
          }
          const isQueuedPastIntersection =
            currentSignal &&
            currentSignalDistanceSq < INTERSECTION_EXIT_QUEUE_RADIUS_SQ &&
            vehicle.speed < INTERSECTION_EXIT_BLOCK_SPEED &&
            nextStopState.stop?.signalId !== currentSignal.id;
          if (currentSignal && isQueuedPastIntersection) {
            const exitClaim = intersectionExitOccupancy.get(currentSignal.id)!;
            const travelDirection = signalDirectionForVector(
              vehicle.motion.heading,
            );
            exitClaim[travelDirection] += 1;
          }
        }

        sample.proximityCellX = vehicleProximityCellCoord(
          currentMotion.lanePosition.x,
        );
        sample.proximityCellZ = vehicleProximityCellCoord(
          currentMotion.lanePosition.z,
        );
        addVehicleSampleToBucket(proximityBuckets, sample);
      }

      let waitingVehicles = 0;
      let activeTrips = 0;

      for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex += 1) {
        const vehicle = vehicles[vehicleIndex]!;
        const current = vehicleSimulationSamples[vehicleIndex]!;
        const currentMotion = current.motion;
        let nextStopState = current.nextStopState;
        let targetSpeed = vehicle.baseSpeed * activeVehicleSpeedMultiplier;
        let holdPosition = false;

        if (vehicle.serviceTimer > 0) {
          vehicle.serviceTimer = Math.max(0, vehicle.serviceTimer - delta);
          targetSpeed = 0;
          holdPosition = true;
          waitingVehicles += 1;

          if (vehicle.serviceTimer === 0 && vehicle.kind === "taxi") {
            if (!vehicle.isOccupied && vehicle.pickupHotspot) {
              completedPickups += 1;
              totalPickupWaitSeconds += Math.max(
                0,
                elapsedTime - vehicle.jobAssignedAt,
              );
              vehicle.pickupStartedAt = elapsedTime;
              const completedPickupHotspotId = vehicle.pickupHotspot.id;
              vehicle.isOccupied = true;
              vehicle.pickupHotspot = null;
              decrementDemandCount(
                activePickupsByHotspot,
                completedPickupHotspotId,
              );
              incrementDemandCount(
                activeDropoffsByHotspot,
                vehicle.dropoffHotspot?.id,
              );
              hotspotDemandMapsDirty = false;
              hotspotActivityAccumulator = 0;
              setTaxiAppearance(vehicle);
              const dropRoute = routeBuilder(
                vehicle.route.endKey,
                vehicle.dropoffHotspot?.nodeKey ?? vehicle.route.endKey,
                `${vehicle.id}-dropoff-${completedTrips}`,
                vehicle.dropoffHotspot?.roadName ??
                vehicle.dropoffHotspot?.label ??
                null,
              );
              if (dropRoute) {
                assignVehicleRoute(vehicle, dropRoute, 0);
                vehicle.planMode = "dropoff";
                nextStopState = resolveNextStopInto(
                  vehicle.route,
                  vehicle.distance,
                  nextStopState,
                  0,
                );
                vehicle.motion.nextStopIndex = nextStopState.index;
              }
            } else if (vehicle.isOccupied && vehicle.dropoffHotspot) {
              totalRideSeconds += Math.max(
                0,
                elapsedTime - (vehicle.pickupStartedAt ?? elapsedTime),
              );
              vehicle.pickupStartedAt = null;
              completedTrips += 1;
              if (!dispatchPlanner || !hotspotPool.length) {
                continue;
              }
              const completedDropoffHotspotId = vehicle.dropoffHotspot.id;
              decrementDemandCount(
                activeDropoffsByHotspot,
                completedDropoffHotspotId,
              );
              hotspotDemandMapsDirty = false;
              hotspotActivityAccumulator = 0;
              const nextJob = dispatchPlanner.planJob({
                startKey: vehicle.route.endKey,
                seed: completedTrips + vehicleIndex + 1,
                vehicleId: vehicle.id,
                demandSnapshot: createDispatchDemandSnapshot(
                  elapsedTime,
                  vehicle.id,
                ),
              });
              if (nextJob) {
                vehicle.pickupHotspot = nextJob.pickupHotspot;
                vehicle.dropoffHotspot = nextJob.dropoffHotspot;
                assignVehicleRoute(vehicle, nextJob.pickupRoute, 0);
                vehicle.planMode = "pickup";
                vehicle.isOccupied = false;
                vehicle.jobAssignedAt = elapsedTime;
                incrementDemandCount(
                  activePickupsByHotspot,
                  nextJob.pickupHotspot.id,
                );
                hotspotDemandMapsDirty = false;
                hotspotActivityAccumulator = 0;
                setTaxiAppearance(vehicle);
                nextStopState = resolveNextStopInto(
                  vehicle.route,
                  vehicle.distance,
                  nextStopState,
                  0,
                );
                vehicle.motion.nextStopIndex = nextStopState.index;
              }
            }
          }
        }

        if (!holdPosition) {
          const maxInteractionDistance =
            vehicle.safeGap + VEHICLE_FOLLOW_LOOKAHEAD_BUFFER;
          const searchCellRadius = Math.max(
            1,
            Math.ceil(maxInteractionDistance / VEHICLE_PROXIMITY_CELL_SIZE),
          );
          const currentCellX = vehicleProximityCellCoord(
            currentMotion.lanePosition.x,
          );
          const currentCellZ = vehicleProximityCellCoord(
            currentMotion.lanePosition.z,
          );

          searchNearbyVehicles: for (
            let cellX = currentCellX - searchCellRadius;
            cellX <= currentCellX + searchCellRadius;
            cellX += 1
          ) {
            for (
              let cellZ = currentCellZ - searchCellRadius;
              cellZ <= currentCellZ + searchCellRadius;
              cellZ += 1
            ) {
              const bucket = proximityBuckets.get(cellX)?.get(cellZ);
              if (!bucket) {
                continue;
              }

              for (let bucketIndex = 0; bucketIndex < bucket.length; bucketIndex += 1) {
                const other = bucket[bucketIndex];
                if (other.vehicle === vehicle) {
                  continue;
                }

                const alignment = currentMotion.heading.dot(other.motion.heading);
                if (alignment < 0.35) {
                  continue;
                }

                const deltaX =
                  other.motion.lanePosition.x - currentMotion.lanePosition.x;
                const deltaZ =
                  other.motion.lanePosition.z - currentMotion.lanePosition.z;
                const longitudinal =
                  deltaX * currentMotion.heading.x +
                  deltaZ * currentMotion.heading.z;
                if (
                  longitudinal <= 0 ||
                  longitudinal > maxInteractionDistance
                ) {
                  continue;
                }

                const lateral = Math.abs(
                  deltaX * currentMotion.right.x + deltaZ * currentMotion.right.z,
                );
                const laneTolerance =
                  Math.max(vehicle.route.roadWidth, other.vehicle.route.roadWidth) *
                  0.48;
                if (lateral > laneTolerance) {
                  continue;
                }

                const gapLimit = Math.max(
                  0,
                  (longitudinal - other.vehicle.length * 0.65 - 0.9) * 1.1,
                );
                targetSpeed = Math.min(targetSpeed, gapLimit);
                if (targetSpeed <= 0.001) {
                  targetSpeed = 0;
                  break searchNearbyVehicles;
                }
              }
            }
          }
        }

        if (
          !holdPosition &&
          nextStopState.stop &&
          nextStopState.ahead < INTERSECTION_SIGNAL_LOOKAHEAD
        ) {
          const signal = nextStopState.stop.signal;
          if (signal) {
            const state =
              frameSignalStates.get(signal.id) ?? signalState(signal, elapsedTime);
            const occupancyState = intersectionOccupancy.get(signal.id);
            const approachDemandState = intersectionApproachDemand.get(signal.id);
            const approachDistanceState = intersectionApproachDistance.get(
              signal.id,
            );
            const exitOccupancyState = intersectionExitOccupancy.get(signal.id);
            const conflictingAxisOccupied =
              occupancyState &&
              (nextStopState.stop.axis === "ns"
                ? occupancyState.ew > 0
                : occupancyState.ns > 0);
            const approachDirection = approachDirectionForHeading(
              currentMotion.heading,
            );
            const opposingDirection = opposingSignalDirection(approachDirection);
            const opposingPriorityDemand = approachDemandState
              ? approachDemandState[opposingDirection].straight +
              approachDemandState[opposingDirection].right
              : 0;
            const opposingPriorityDistance =
              approachDistanceState?.[opposingDirection] ??
              Number.POSITIVE_INFINITY;
            const travelDirection = signalDirectionForVector(currentMotion.heading);
            const sameDirectionExitBlocked =
              (exitOccupancyState?.[travelDirection] ?? 0) > 0;
            const canGo = canVehicleProceed(
              nextStopState.stop,
              state,
              Boolean(conflictingAxisOccupied),
              opposingPriorityDemand,
              opposingPriorityDistance,
            );
            const blockedByIntersection =
              Boolean(conflictingAxisOccupied) &&
              nextStopState.ahead < INTERSECTION_OCCUPANCY_LOOKAHEAD;
            const blockedByExitQueue =
              sameDirectionExitBlocked &&
              nextStopState.ahead < INTERSECTION_BOX_ENTRY_LOOKAHEAD;
            if (!canGo || blockedByIntersection || blockedByExitQueue) {
              const stopGap = Math.max(0, nextStopState.ahead - 0.8);
              targetSpeed = Math.min(targetSpeed, Math.max(0, stopGap * 1.32));
              if (stopGap < 1.1) {
                waitingVehicles += 1;
              }
            }
          }
        }

        if (!holdPosition && !vehicle.route.isLoop) {
          const destinationGap = Math.max(
            0,
            vehicle.route.totalLength - vehicle.distance,
          );
          if (destinationGap < HOTSPOT_SLOWDOWN_DISTANCE) {
            const curbGap = Math.max(0, destinationGap - 0.65);
            targetSpeed = Math.min(targetSpeed, Math.max(0, curbGap * 1.4));
            if (destinationGap < HOTSPOT_TRIGGER_DISTANCE) {
              if (vehicle.kind === "traffic") {
                const nextRoute = pickNextTrafficRoute(
                  vehicle.route.id,
                  vehicleIndex,
                  elapsedTime,
                );
                if (nextRoute) {
                  const entryDistance = Math.min(
                    nextRoute.totalLength * 0.12,
                    TRAFFIC_ROUTE_REENTRY_DISTANCE + (vehicleIndex % 4) * 1.1,
                  );
                  assignVehicleRoute(vehicle, nextRoute, entryDistance);
                  nextStopState = resolveNextStopInto(
                    vehicle.route,
                    vehicle.distance,
                    nextStopState,
                    vehicle.motion.nextStopIndex,
                  );
                  vehicle.motion.nextStopIndex = nextStopState.index;
                  syncVehicleSampleBucket(proximityBuckets, current);
                  continue;
                }
              } else {
                vehicle.serviceTimer = SERVICE_STOP_DURATION;
                targetSpeed = 0;
                holdPosition = true;
                waitingVehicles += 1;
              }
            }
          }
        }

        vehicle.speed = holdPosition
          ? 0
          : THREE.MathUtils.damp(vehicle.speed, targetSpeed, 3.2, delta);
        if (!holdPosition || (vehicle.kind === "taxi" && vehicle.serviceTimer > 0)) {
          vehicle.distance = clampRouteDistance(
            vehicle.route,
            holdPosition
              ? vehicle.distance
              : vehicle.distance + vehicle.speed * delta,
          );
          updateVehicleMotionState(vehicle);
        }

        syncVehicleSampleBucket(proximityBuckets, current);
        if (vehicle.kind === "taxi" && vehicle.isOccupied) {
          activeTrips += 1;
        }
      }

      statsAccumulator += delta;
      if (statsAccumulator >= SIMULATION_STATS_UPDATE_INTERVAL) {
        statsAccumulator = 0;
        commitStatsSnapshot(
          buildStatsSnapshot(
            taxiVehicles.length,
            vehicles.length - taxiVehicles.length,
            waitingVehicles,
            activeTrips,
          ),
        );
      }
    };
    void updateVehicles;

    let activeHintText = "";
    let activeHintVisible = false;
    let activeHintCursor = "grab";
    let activeHintX = Number.NaN;
    let activeHintY = Number.NaN;

    const updateHoverHint = (
      nextText: string | null,
      nextCursor: "grab" | "pointer" | "help",
      highlightedDongNames: string[],
    ) => {
      setBoundaryDongHighlight(highlightedDongNames);

      if (!nextText) {
        if (activeHintVisible) {
          boundaryHintText.style.display = "none";
          activeHintVisible = false;
        }
        activeHintText = "";
        activeHintX = Number.NaN;
        activeHintY = Number.NaN;
        if (!cameraRig.dragging && activeHintCursor !== "grab") {
          renderer.domElement.style.cursor = "grab";
          activeHintCursor = "grab";
        }
        return;
      }

      if (!activeHintVisible) {
        boundaryHintText.style.display = "block";
        activeHintVisible = true;
      }
      if (activeHintText !== nextText) {
        boundaryHintText.textContent = nextText;
        activeHintText = nextText;
      }
      if (activeHintX !== pointerClientX) {
        boundaryHintText.style.left = `${pointerClientX}px`;
        activeHintX = pointerClientX;
      }
      if (activeHintY !== pointerClientY) {
        boundaryHintText.style.top = `${pointerClientY}px`;
        activeHintY = pointerClientY;
      }
      if (!cameraRig.dragging && activeHintCursor !== nextCursor) {
        renderer.domElement.style.cursor = nextCursor;
        activeHintCursor = nextCursor;
      }
    };

    const clearHoverHint = () => {
      updateHoverHint(null, "grab", []);
    };

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
      updateHoverHint(`Taxi ${taxiNumber} · 클릭해서 택시 시점`, "pointer", []);
    };

    const setTransitHover = (stationName: string | null) => {
      if (!stationName) {
        clearHoverHint();
        return;
      }

      updateHoverHint(stationName, "help", []);
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
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      applyRenderBudget(cameraModeRef.current);
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
      markHoverDirty();
      markLabelVisibilityDirty();
    };

    const controlKeyCodes = new Set([
      "KeyW",
      "KeyA",
      "KeyQ",
      "KeyS",
      "KeyD",
      "KeyE",
      "KeyF",
      "ShiftLeft",
      "ShiftRight",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ]);

    const isInteractiveTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) {
        return false;
      }
      const tagName = element.tagName;
      return (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        tagName === "BUTTON" ||
        element.isContentEditable
      );
    };

    const stopDragging = () => {
      cameraRig.dragging = false;
      cameraRig.pointerId = -1;
      renderer.domElement.style.cursor = "grab";
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
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
      cameraRig.dragging = true;
      cameraRig.pointerId = event.pointerId;
      cameraRig.pointerX = event.clientX;
      cameraRig.pointerY = event.clientY;
      pointerDownClientX = event.clientX;
      pointerDownClientY = event.clientY;
      pointerDragged = false;
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
      if (cameraModeRef.current === "follow") {
        followOrbit.yawOffset = wrapAngle(
          followOrbit.yawOffset - deltaX * CAMERA_DRAG_SENSITIVITY,
        );
      } else if (cameraModeRef.current === "ride") {
        return;
      } else {
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
      if (event.pointerId !== cameraRig.pointerId) {
        return;
      }
      const shouldTreatAsClick = !pointerDragged;
      stopDragging();
      markHoverDirty();
      if (shouldTreatAsClick) {
        const clickedTaxi = findTaxiFromPointer();
        if (clickedTaxi) {
          enterRideMode(clickedTaxi);
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
        return;
      }
      if (event.code === "KeyF") {
        if (!isInteractiveTarget(event.target)) {
          event.preventDefault();
        }
        setShowFps((current) => !current);
        return;
      }
      if (!controlKeyCodes.has(event.code)) {
        return;
      }
      if (!isInteractiveTarget(event.target)) {
        event.preventDefault();
      }
      pressedKeys.add(event.code);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!controlKeyCodes.has(event.code)) {
        return;
      }
      pressedKeys.delete(event.code);
    };

    const onWindowBlur = () => {
      pressedKeys.clear();
      pointerInside = false;
      pointerDragged = false;
      pointerNdc.set(2, 2);
      boundaryHintText.style.display = "none";
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
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

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
      latestElapsedTime = elapsedTime;
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
      const currentMode = cameraModeRef.current;
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
      vehicleSimulationAccumulator = Math.min(
        vehicleSimulationAccumulator + delta,
        VEHICLE_SIMULATION_STEP * MAX_VEHICLE_SIMULATION_STEPS,
      );
      let vehicleSimulationSteps = 0;
      const vehicleCpuStart = performance.now();
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
      simulationStepSampleCount += vehicleSimulationSteps;
      vehicleCpuSampleMs += performance.now() - vehicleCpuStart;
      const signalCpuStart = performance.now();
      updateSignalVisuals(
        simulationSnapshot.signals,
        simulationSnapshot.clock.elapsedTimeSeconds,
      );
      signalCpuSampleMs += performance.now() - signalCpuStart;

      if (currentMode === "drive") {
        cameraLookLift = CAMERA_LOOK_HEIGHT;
        const forwardInput =
          Number(pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp")) -
          Number(pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown"));
        const strafeInput =
          Number(pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight")) -
          Number(pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft"));
        const turnInput =
          Number(pressedKeys.has("KeyE")) - Number(pressedKeys.has("KeyQ"));
        const boostScale =
          pressedKeys.has("ShiftLeft") || pressedKeys.has("ShiftRight")
            ? 1.8
            : 1;
        const moveSpeed =
          CAMERA_DRIVE_SPEED * CAMERA_BASE_MOVE_SCALE * boostScale;
        const strafeSpeed =
          CAMERA_STRAFE_SPEED * CAMERA_BASE_MOVE_SCALE * boostScale;
        const turnSpeed = CAMERA_TURN_SPEED * CAMERA_BASE_TURN_SCALE;

        if (turnInput !== 0) {
          cameraRig.yaw += turnInput * turnSpeed * delta;
        }
        if (forwardInput !== 0 || strafeInput !== 0) {
          driveLookDirection.copy(cameraRig.focus).sub(camera.position).setY(0);
          if (driveLookDirection.lengthSq() < 0.0001) {
            driveLookDirection.set(
              -Math.sin(cameraRig.yaw),
              0,
              -Math.cos(cameraRig.yaw),
            );
          }
          driveLookDirection.normalize();
          driveStrafeDirection.set(
            -driveLookDirection.z,
            0,
            driveLookDirection.x,
          ).normalize();
          cameraRig.focus.addScaledVector(
            driveStrafeDirection,
            strafeInput * strafeSpeed * delta,
          );
          cameraRig.focus.addScaledVector(
            driveLookDirection,
            forwardInput * moveSpeed * delta,
          );
        }
        cameraRig.focus.y = THREE.MathUtils.damp(
          cameraRig.focus.y,
          0,
          4.6,
          delta,
        );
        if (
          forwardInput !== 0 ||
          strafeInput !== 0 ||
          turnInput !== 0 ||
          cameraRig.dragging
        ) {
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
        cameraRig.focus.copy(centerPoint);
        cameraRig.focus.y = 0;
        cameraRig.yaw = overviewYaw;
        cameraRig.pitch = 0.7;
        cameraRig.distance = Math.sqrt(120 * 120 + 135 * 135 + 150 * 150);
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
            ? "택시 시점"
            : currentMode === "follow"
              ? "택시 추적 위치"
              : "현재 보고 있는 위치";
        const focusDeltaSq =
          (nextMiniMapFocus.x - lastMiniMapFocusReportX) ** 2 +
          (nextMiniMapFocus.z - lastMiniMapFocusReportZ) ** 2;
        const headingDeltaSq =
          (miniMapCameraDirection.x - lastMiniMapFocusReportHeadingX) ** 2 +
          (miniMapCameraDirection.z - lastMiniMapFocusReportHeadingZ) ** 2;
        if (
          frameTimestamp - lastMiniMapFocusReportTimestamp > 240 &&
          (focusDeltaSq > 1.6 ||
            headingDeltaSq > 0.006 ||
            nextMiniMapFocusLabel !== lastMiniMapFocusReportLabel)
        ) {
          lastMiniMapFocusReportTimestamp = frameTimestamp;
          lastMiniMapFocusReportX = nextMiniMapFocus.x;
          lastMiniMapFocusReportZ = nextMiniMapFocus.z;
          lastMiniMapFocusReportHeadingX = miniMapCameraDirection.x;
          lastMiniMapFocusReportHeadingZ = miniMapCameraDirection.z;
          lastMiniMapFocusReportLabel = nextMiniMapFocusLabel;
          onCameraFocusChange({
            x: nextMiniMapFocus.x,
            z: nextMiniMapFocus.z,
            label: nextMiniMapFocusLabel,
            headingX: miniMapCameraDirection.x,
            headingZ: miniMapCameraDirection.z,
          });
        }
      }

      const overlayCpuStart = performance.now();
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
      overlayCpuSampleMs += performance.now() - overlayCpuStart;
      simulationCpuSampleMs =
        signalCpuSampleMs + vehicleCpuSampleMs + overlayCpuSampleMs;
      fpsFrameCount += 1;
      fpsSampleElapsed += delta;
      if (fpsSampleElapsed >= 0.45) {
        const nextCapLabel = renderCapLabel(
          activeRenderCap,
          isPageHidden,
          fpsModeRef.current,
        );
        const nextFps = Math.max(1, Math.round(fpsFrameCount / fpsSampleElapsed));
        if (showFpsRef.current) {
          const nextSimulationMs =
            Math.round(
              (simulationCpuSampleMs / Math.max(1, fpsFrameCount)) * 100,
            ) / 100;
          const nextSignalMs =
            Math.round((signalCpuSampleMs / Math.max(1, fpsFrameCount)) * 100) /
            100;
          const nextVehicleMs =
            Math.round((vehicleCpuSampleMs / Math.max(1, fpsFrameCount)) * 100) /
            100;
          const nextOverlayMs =
            Math.round((overlayCpuSampleMs / Math.max(1, fpsFrameCount)) * 100) /
            100;
          const nextRenderMs =
            Math.round((renderCpuSampleMs / Math.max(1, fpsFrameCount)) * 100) /
            100;
          const nextSimulationHz = Math.round(
            simulationStepSampleCount / fpsSampleElapsed,
          );
          const nextVehicles = vehicles.length;
          setFpsStats((current) =>
            current.fps === nextFps &&
              current.capLabel === nextCapLabel &&
              current.simulationMs === nextSimulationMs &&
              current.signalMs === nextSignalMs &&
              current.vehicleMs === nextVehicleMs &&
              current.overlayMs === nextOverlayMs &&
              current.renderMs === nextRenderMs &&
              current.simulationHz === nextSimulationHz &&
              current.vehicles === nextVehicles
              ? current
              : {
                fps: nextFps,
                capLabel: nextCapLabel,
                simulationMs: nextSimulationMs,
                signalMs: nextSignalMs,
                vehicleMs: nextVehicleMs,
                overlayMs: nextOverlayMs,
                renderMs: nextRenderMs,
                simulationHz: nextSimulationHz,
                vehicles: nextVehicles,
              },
          );
        } else {
          setFpsStats((current) =>
            current.fps === nextFps &&
              current.capLabel === nextCapLabel &&
              current.vehicles === vehicles.length
              ? current
              : {
                ...current,
                fps: nextFps,
                capLabel: nextCapLabel,
                vehicles: vehicles.length,
              },
          );
        }
        fpsFrameCount = 0;
        fpsSampleElapsed = 0;
        simulationCpuSampleMs = 0;
        signalCpuSampleMs = 0;
        vehicleCpuSampleMs = 0;
        overlayCpuSampleMs = 0;
        renderCpuSampleMs = 0;
        simulationStepSampleCount = 0;
      }
      starsMaterial.opacity =
        activeStarOpacity * (0.92 + Math.sin(elapsedTime * 0.7) * 0.08);
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
      const renderCpuStart = performance.now();
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
      renderCpuSampleMs += performance.now() - renderCpuStart;
    };

    finalizeVehicleLayerSetup();
    window.addEventListener("pointerdown", markUserInteraction, true);
    window.addEventListener("wheel", markUserInteraction, true);
    window.addEventListener("keydown", markUserInteraction, true);
    const cancelTaxiAssetLoadSchedule = scheduleDeferredAssetLoad(
      loadTaxiAssetInBackground,
      TAXI_ASSET_LOAD_DELAY_MS,
      TAXI_ASSET_IDLE_TIMEOUT_MS,
    );
    const cancelTrafficAssetLoadSchedule = scheduleDeferredAssetLoad(
      loadTrafficAssetsInBackground,
      1300,
      TAXI_ASSET_IDLE_TIMEOUT_MS,
    );
    animate();

    return () => {
      sceneDisposed = true;
      cancelTaxiAssetLoadSchedule();
      cancelTrafficAssetLoadSchedule();
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", markUserInteraction, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("wheel", markUserInteraction, true);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keydown", markUserInteraction, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
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
      trafficAssetTemplates.forEach((template) => {
        disposeObject3DResources(template);
      });
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
      vehicleLayerReady = false;
      clearVehicleLayer();
      if (transitGroupRef.current === transitGroup) {
        transitGroupRef.current = null;
      }
      if (optionalLabelObjectsRef.current === optionalLabelObjects) {
        optionalLabelObjectsRef.current = [];
      }
      labelObjects.forEach((label) => label.removeFromParent());
      container.removeChild(boundaryHintText);
      container.removeChild(renderer.domElement);
      container.removeChild(labelRenderer.domElement);
    };
  }, [
    appliedTaxiCountRef,
    appliedTrafficCountRef,
    cameraModeRef,
    data,
    fpsModeRef,
    followTaxiIdRef,
    simulationSource,
    showFpsRef,
    showLabelsRef,
    showNonRoadRef,
    showRoadNetworkRef,
    showTransitRef,
    simulationDateRef,
    simulationTimeRef,
    weatherModeRef,
  ]);

  return null;
}
