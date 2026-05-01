import { type ReactNode } from "react";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from "geojson";
import {
  createDispatchPlannerRegistry,
  createDemandAwareDispatchPlanner,
  createHeuristicDispatchPlanner,
} from "@/components/map-simulator/dispatch-planner";
import {
  formatKstDateTime,
  type WeatherMode,
} from "@/components/map-simulator/simulation-environment";
import {
  ASSET_FETCH_TIMEOUT_MS,
  AUTO_REFRESH_BAND_HYSTERESIS_RATIO,
  AUTO_RENDER_HALF_REFRESH_THRESHOLD,
  COMMON_REFRESH_RATE_BANDS,
  CURBSIDE_EDGE_INSET_MAX,
  CURBSIDE_EDGE_INSET_MIN,
  CURBSIDE_EXTRA_OFFSET_MAX,
  DRIVE_PIXEL_RATIO,
  DRIVE_RENDER_FPS,
  FOLLOW_PIXEL_RATIO,
  FOLLOW_RENDER_FPS,
  HIDDEN_PIXEL_RATIO,
  HOTSPOT_SLOWDOWN_DISTANCE,
  INTERSECTION_LEFT_TURN_GAP_DISTANCE,
  LARGE_LOW_RISE_BUILDING_AREA_M2,
  LARGE_LOW_RISE_BUILDING_MAX_HEIGHT_M,
  LOCAL_SCENARIO_FOCUS_CENTER_BLEND,
  LOCAL_SCENARIO_FOCUS_DISTANCE,
  LOCAL_SCENARIO_FOCUS_PITCH,
  LOCAL_SCENARIO_FOCUS_YAW_OFFSET,
  OVERVIEW_PIXEL_RATIO,
  OVERVIEW_RENDER_FPS,
  POSITION_SCALE,
  ROAD_LAYER_Y,
  ROAD_NETWORK_EDGE_Y_OFFSET,
  ROAD_NETWORK_NODE_Y,
  ROAD_SEGMENT_INDEX_CELL_SIZE,
  ROAD_WIDTH_SCALE,
  SIGNAL_CLUSTER_DISTANCE,
  SIGNAL_COORDINATION_BAND_SIZE,
  SIGNAL_COORDINATION_PHASE_STEP,
  SIGNAL_CYCLE,
  SIGNAL_NODE_SNAP_DISTANCE,
  SIGNAL_ROAD_SNAP_DISTANCE,
  SIGNAL_WAVE_TRAVEL_SPEED,
  TAXI_ASSET_TARGET_LENGTH,
  TRAFFIC_ASSET_TARGET_LENGTH,
  VEHICLE_PROXIMITY_CELL_SIZE,
  BUILDING_HEIGHT_SCALE,
} from "@/components/map-simulator/scene-constants";
export const DEFAULT_TAXI_COUNT = 12;
export const DEFAULT_TRAFFIC_COUNT = 16;
export const MIN_TAXI_COUNT = 4;
export const MAX_TAXI_COUNT = 24;
export const MIN_TRAFFIC_COUNT = 8;
export const MAX_TRAFFIC_COUNT = 36;
export const KAKAO_TAXI_ASSET_PATH = "/assets/kakao-taxi/Sonata_Taxi_01.fbx";
export const KAKAO_TRAFFIC_ASSET_PATHS = [
  "/assets/kakao-traffic/Sportage_01.fbx",
  "/assets/kakao-traffic/Porter_01.fbx",
] as const;
export const DEFAULT_MAP_CENTER = { lat: 37.5, lon: 127.0328 };
export const TAXI_ASSET_LOAD_DELAY_MS = 1_500;
export const TAXI_ASSET_IDLE_TIMEOUT_MS = 800;

export type SignalAxis = "ns" | "ew";
export type SignalDirection = "north" | "east" | "south" | "west";
export type TurnMovement = "straight" | "left" | "right";
export type SignalPhase =
  | "ns_flow"
  | "ns_yellow"
  | "ns_left"
  | "ew_flow"
  | "ew_yellow"
  | "ew_left"
  | "ped_walk"
  | "ped_flash"
  | "clearance";

export type RoadProperties = {
  roadClass: "arterial" | "connector" | "local";
  width: number;
  name: string | null;
  highway: string | null;
  sourceWayId: string | null;
  oneway: "no" | "forward" | "backward";
};

export type TurnRestrictionMode = "no" | "only";

export type TurnRestriction = {
  id: string;
  viaKey: string;
  fromWayId: string;
  toWayId: string;
  kind: string;
  mode: TurnRestrictionMode;
};

export type NonRoadCategory =
  | "green"
  | "pedestrian"
  | "parking"
  | "water"
  | "facility";

export type NonRoadProperties = {
  category: NonRoadCategory;
  kind: string | null;
  name: string | null;
  sourceTag: string | null;
  area: number;
};

export type BuildingProperties = {
  height: number;
  area: number;
  label: string | null;
  kind: string | null;
  address: string | null;
};

export type DongProperties = {
  name: string;
  nameEn: string | null;
};

export type TransitCategory = "bus_stop" | "subway_station";

export type TransitProperties = {
  category: TransitCategory;
  name: string | null;
  operator: string | null;
  network: string | null;
  ref: string | null;
  sourceType: string | null;
  importance: number;
};

export type TrafficSignalProperties = {
  name: string | null;
  signalType: string | null;
  direction: string | null;
  crossing: string | null;
  buttonOperated: boolean;
  turns: string | null;
};

export type NonRoadFeature = Feature<Polygon | MultiPolygon, NonRoadProperties>;
export type RoadFeature = Feature<LineString | MultiLineString, RoadProperties>;
export type BuildingFeature = Feature<Polygon | MultiPolygon, BuildingProperties>;
export type DongFeature = Feature<Polygon | MultiPolygon, DongProperties>;
export type TrafficSignalFeatureCollection = FeatureCollection<
  Point,
  TrafficSignalProperties
>;
export type NonRoadFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  NonRoadProperties
>;
export type RoadFeatureCollection = FeatureCollection<
  LineString | MultiLineString,
  RoadProperties
> & {
  routing?: {
    turnRestrictions?: TurnRestriction[];
  };
};
export type BuildingFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  BuildingProperties
>;
export type DongFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  DongProperties
>;
export type TransitFeatureCollection = FeatureCollection<Point, TransitProperties>;
export type SerializedRoadNetworkNode = {
  key: string;
  x: number;
  z: number;
  outDegree?: number;
  neighborCount?: number;
  isIntersection?: boolean;
  isTerminal?: boolean;
};

export type SerializedRoadNetworkSegment = {
  id: string;
  from: string;
  to: string;
  roadClass: RoadProperties["roadClass"];
  roadWidth: number;
  length: number;
  name: string | null;
  wayId?: string | null;
  travelCost?: number;
};

export type SerializedRoadNetwork = {
  version: number;
  center: { lat: number; lon: number };
  nodes: SerializedRoadNetworkNode[];
  segments: SerializedRoadNetworkSegment[];
  turnRestrictions?: TurnRestriction[];
  stats: {
    nodeCount: number;
    segmentCount: number;
    directedEdgeCount: number;
    turnRestrictionCount?: number;
  };
};

export type AssetMeta = {
  path: string;
  lastModified: string | null;
  featureCount: number;
};

export type SimulationMeta = {
  source: string;
  boundarySource: string;
  dispatchPlannerId: string;
  latestAssetUpdatedAt: string | null;
  loadedAt: string;
  assets: {
    nonRoad: AssetMeta | null;
    roads: AssetMeta;
    buildings: AssetMeta;
    dongs: AssetMeta;
    transit: AssetMeta;
    trafficSignals: AssetMeta | null;
    roadNetwork: AssetMeta | null;
  };
};

export type RouteNode = {
  key: string;
  point: THREE.Vector3;
  outDegree?: number;
  neighborCount?: number;
  isIntersection?: boolean;
  isTerminal?: boolean;
};

export type SignalData = {
  id: string;
  key: string;
  point: THREE.Vector3;
  visualPoint: THREE.Vector3;
  offset: number;
  approaches: SignalDirection[];
  hasProtectedLeft: boolean;
  priorityAxis: SignalAxis;
  timingPlan: SignalTimingPlan;
};

export type SignalFlow = {
  phase: SignalPhase;
  ns: "green" | "yellow" | "red";
  ew: "green" | "yellow" | "red";
  nsLeft: boolean;
  ewLeft: boolean;
  pedestrian: "walk" | "flash" | "stop";
};

export type SignalTurnDemand = {
  left: number;
  straight: number;
  right: number;
};

export type SignalApproachDemand = Record<SignalDirection, SignalTurnDemand>;
export type SignalApproachDistance = Record<SignalDirection, number>;
export type SignalAxisOccupancy = {
  ns: number;
  ew: number;
};
export type SignalDirectionalOccupancy = Record<SignalDirection, number>;
export type SignalPhaseStep = {
  duration: number;
  flow: SignalFlow;
};
export type SignalTimingPlan = {
  sequence: SignalPhaseStep[];
};

export type StopMarker = {
  signalId: string;
  signal: SignalData;
  distance: number;
  axis: SignalAxis;
  turn: TurnMovement;
};

export type NextStopState = {
  index: number;
  stop: StopMarker | null;
  ahead: number;
};

export type RouteSample = {
  position: THREE.Vector3;
  heading: THREE.Vector3;
  segmentIndex: number;
};

export type RouteTemplate = {
  id: string;
  name: string | null;
  roadClass: RoadProperties["roadClass"];
  roadWidth: number;
  laneOffset: number;
  nodes: RouteNode[];
  cumulative: number[];
  segmentLengths: number[];
  segmentHeadings: THREE.Vector3[];
  totalLength: number;
  stops: StopMarker[];
  startKey: string;
  endKey: string;
  isLoop: boolean;
};

export type VehiclePalette = {
  body: number;
  cabin: number;
  sign: number | null;
};

export type VehicleMaterialHint = "body" | "glass" | "trim" | "metal" | "default";

export type VehicleKind = "taxi" | "traffic";
export type VehiclePlanMode = "traffic" | "pickup" | "dropoff";
export type BaseCameraMode = "drive" | "overview" | "follow";
export type CameraMode = BaseCameraMode | "ride";
export type CircumstanceMode = "live" | "specific";

export type VehicleMotionState = RouteSample & {
  lanePosition: THREE.Vector3;
  right: THREE.Vector3;
  yaw: number;
  nextStopIndex: number;
};

export type Vehicle = {
  id: string;
  kind: VehicleKind;
  route: RouteTemplate;
  group: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
  signMaterial: THREE.MeshStandardMaterial | null;
  headlightMaterial?: THREE.MeshStandardMaterial | null;
  tailLightMaterial?: THREE.MeshStandardMaterial | null;
  baseSpeed: number;
  speed: number;
  distance: number;
  safeGap: number;
  length: number;
  currentSignalId: string | null;
  roadName: string | null;
  palette: VehiclePalette;
  isOccupied: boolean;
  pickupHotspot: Hotspot | null;
  dropoffHotspot: Hotspot | null;
  jobAssignedAt: number;
  pickupStartedAt: number | null;
  serviceTimer: number;
  planMode: VehiclePlanMode;
  previousMotion: VehicleMotionState;
  motion: VehicleMotionState;
  renderMotion: VehicleMotionState;
};

export type VehicleSimulationSample = {
  vehicle: Vehicle;
  motion: VehicleMotionState;
  nextStopState: NextStopState;
  proximityCellX: number;
  proximityCellZ: number;
};

export type VehicleProximityBuckets = Map<
  number,
  Map<number, VehicleSimulationSample[]>
>;

export type Stats = {
  taxis: number;
  traffic: number;
  waiting: number;
  signals: number;
  activeTrips: number;
  completedTrips: number;
  pedestrians: number;
  pickups: number;
  dropoffs: number;
  activeCalls: number;
  avgPickupWaitSeconds: number;
  avgRideSeconds: number;
};

export type FpsMode = "auto" | "fixed60" | "unlimited";

export type FpsStats = {
  fps: number;
  capLabel: string;
  simulationMs: number;
  signalMs: number;
  vehicleMs: number;
  overlayMs: number;
  renderMs: number;
  simulationHz: number;
  vehicles: number;
};

export type LocalScenarioPreset = {
  id: string;
  label: string;
  detail: string;
  summary: string;
  presentationNote: string;
  speakerNotes: string[];
  taxis: number;
  traffic: number;
  minutes: number;
  weather: WeatherMode;
  focusLabel: string;
  focusStationKeyword?: string;
  camera?: {
    distance?: number;
    pitch?: number;
    focusCenterBlend?: number;
    yawOffset?: number;
  };
};

export type SceneStatus = "loading" | "rendering" | "ready" | "error";

export type SimulationData = {
  center: { lat: number; lon: number };
  nonRoad: NonRoadFeatureCollection;
  roads: RoadFeatureCollection;
  projectedRoadSegments: ProjectedRoadSegment[];
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex;
  buildings: BuildingFeatureCollection;
  buildingMasses: BuildingMass[];
  dongs: DongFeatureCollection;
  dongRegions: DongRegion[];
  dongBoundarySegments: DongBoundarySegment[];
  transit: TransitFeatureCollection;
  transitLandmarks: TransitLandmark[];
  trafficSignals: TrafficSignalFeatureCollection;
  roadNetwork: SerializedRoadNetwork | null;
  graph: RoadGraph;
  signals: SignalData[];
  loopRoutes: RouteTemplate[];
  taxiRoutePool: RouteTemplate[];
  trafficRoutePool: RouteTemplate[];
  hotspotPool: Hotspot[];
  meta: SimulationMeta;
};

export const EMPTY_NON_ROAD_FEATURE_COLLECTION: NonRoadFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export const EMPTY_TRAFFIC_SIGNAL_FEATURE_COLLECTION: TrafficSignalFeatureCollection =
{
  type: "FeatureCollection",
  features: [],
};

export type Hotspot = {
  id: string;
  nodeKey: string;
  routeId: string;
  distance: number;
  position: THREE.Vector3;
  point: THREE.Vector3;
  label: string;
  roadName: string | null;
};

export type SimulationAssetKey = keyof SimulationMeta["assets"];

export const SIMULATION_ASSET_LABELS: Array<{
  key: SimulationAssetKey;
  label: string;
}> = [
  { key: "dongs", label: "행정동" },
  { key: "nonRoad", label: "비도로" },
  { key: "roads", label: "도로" },
  { key: "buildings", label: "건물" },
  { key: "transit", label: "대중교통" },
  { key: "trafficSignals", label: "신호등" },
  { key: "roadNetwork", label: "도로 그래프" },
];

export function assetFileName(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

export function markMeshResourceSharing(
  mesh: THREE.Mesh,
  {
    geometry = true,
    material = false,
  }: { geometry?: boolean; material?: boolean } = {},
) {
  if (geometry) {
    mesh.userData.skipGeometryDispose = true;
  }
  if (material) {
    mesh.userData.skipMaterialDispose = true;
  }
  return mesh;
}

export function disposeMaterialResources(material: THREE.Material) {
  const materialWithTextures = material as THREE.Material &
    Partial<Record<(typeof MATERIAL_TEXTURE_KEYS)[number], THREE.Texture | null>>;

  MATERIAL_TEXTURE_KEYS.forEach((key) => {
    materialWithTextures[key]?.dispose?.();
  });
  material.dispose();
}

export function beginSuppressingFbxLoaderWarnings() {
  if (fbxLoaderWarnSuppressionDepth === 0) {
    originalConsoleWarnForFbxLoader = console.warn;
    console.warn = (...args: unknown[]) => {
      const first = args[0];
      if (
        typeof first === "string" &&
        first.startsWith("THREE.FBXLoader:")
      ) {
        return;
      }
      originalConsoleWarnForFbxLoader?.(...args);
    };
  }

  fbxLoaderWarnSuppressionDepth += 1;
}

export function endSuppressingFbxLoaderWarnings() {
  if (fbxLoaderWarnSuppressionDepth === 0) {
    return;
  }

  fbxLoaderWarnSuppressionDepth -= 1;
  if (fbxLoaderWarnSuppressionDepth === 0 && originalConsoleWarnForFbxLoader) {
    console.warn = originalConsoleWarnForFbxLoader;
    originalConsoleWarnForFbxLoader = null;
  }
}

export function pedestrianBodyMaterialFor(color: number) {
  let material = PEDESTRIAN_BODY_MATERIALS.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    PEDESTRIAN_BODY_MATERIALS.set(color, material);
  }
  return material;
}

export function callerTorsoMaterialFor(color: number) {
  let material = CALLER_TORSO_MATERIALS.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
    CALLER_TORSO_MATERIALS.set(color, material);
  }
  return material;
}

export function callerArmMaterialFor(color: number) {
  let material = CALLER_ARM_MATERIALS.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.84 });
    CALLER_ARM_MATERIALS.set(color, material);
  }
  return material;
}

export function callerBottomMaterialFor(color: number) {
  let material = CALLER_BOTTOM_MATERIALS.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
    CALLER_BOTTOM_MATERIALS.set(color, material);
  }
  return material;
}

export function sharedVehicleTemplatePlaceholderMaterial() {
  VEHICLE_TEMPLATE_PLACEHOLDER_MATERIAL ??= new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  return VEHICLE_TEMPLATE_PLACEHOLDER_MATERIAL;
}

export function sharedImportedTaxiSignGeometry() {
  IMPORTED_TAXI_SIGN_GEOMETRY ??= new THREE.BoxGeometry(0.74, 0.22, 0.38);
  return IMPORTED_TAXI_SIGN_GEOMETRY;
}

export function sharedImportedTaxiShadowGeometry() {
  IMPORTED_TAXI_SHADOW_GEOMETRY ??= new THREE.PlaneGeometry(2.5, 5);
  return IMPORTED_TAXI_SHADOW_GEOMETRY;
}

export function sharedImportedTrafficShadowGeometry() {
  IMPORTED_TRAFFIC_SHADOW_GEOMETRY ??= new THREE.PlaneGeometry(2.5, 5.1);
  return IMPORTED_TRAFFIC_SHADOW_GEOMETRY;
}

export function sharedImportedTaxiClickTargetGeometry() {
  IMPORTED_TAXI_CLICK_TARGET_GEOMETRY ??= new THREE.BoxGeometry(3.2, 3.2, 6.8);
  return IMPORTED_TAXI_CLICK_TARGET_GEOMETRY;
}

export function sharedTaxiHeadlightGeometry() {
  TAXI_HEADLIGHT_GEOMETRY ??= new THREE.BoxGeometry(1.22, 0.13, 0.08);
  return TAXI_HEADLIGHT_GEOMETRY;
}

export function sharedTaxiTailLightGeometry() {
  TAXI_TAIL_LIGHT_GEOMETRY ??= new THREE.BoxGeometry(1.08, 0.12, 0.08);
  return TAXI_TAIL_LIGHT_GEOMETRY;
}

export function sharedPedestrianBodyGeometry() {
  PEDESTRIAN_BODY_GEOMETRY ??= new THREE.BoxGeometry(0.34, 0.82, 0.24);
  return PEDESTRIAN_BODY_GEOMETRY;
}

export function sharedPedestrianHeadGeometry() {
  PEDESTRIAN_HEAD_GEOMETRY ??= new THREE.SphereGeometry(0.18, 10, 10);
  return PEDESTRIAN_HEAD_GEOMETRY;
}

export function sharedPedestrianFeetGeometry() {
  PEDESTRIAN_FEET_GEOMETRY ??= new THREE.BoxGeometry(0.28, 0.12, 0.2);
  return PEDESTRIAN_FEET_GEOMETRY;
}

export function sharedPedestrianArmGeometry() {
  PEDESTRIAN_ARM_GEOMETRY ??= new THREE.BoxGeometry(0.13, 0.38, 0.17);
  return PEDESTRIAN_ARM_GEOMETRY;
}

export function sharedPedestrianHeadMaterial() {
  PEDESTRIAN_HEAD_MATERIAL ??= new THREE.MeshStandardMaterial({
    color: 0xf4d9c2,
    roughness: 0.7,
  });
  return PEDESTRIAN_HEAD_MATERIAL;
}

export function sharedPedestrianFeetMaterial() {
  PEDESTRIAN_FEET_MATERIAL ??= new THREE.MeshStandardMaterial({
    color: 0x1a2331,
    roughness: 0.92,
  });
  return PEDESTRIAN_FEET_MATERIAL;
}

export function sharedCallerShadowGeometry() {
  CALLER_SHADOW_GEOMETRY ??= new THREE.PlaneGeometry(1.1, 0.72);
  return CALLER_SHADOW_GEOMETRY;
}

export function sharedCallerShoesGeometry() {
  CALLER_SHOES_GEOMETRY ??= new THREE.BoxGeometry(0.36, 0.12, 0.24);
  return CALLER_SHOES_GEOMETRY;
}

export function sharedCallerLegsGeometry() {
  CALLER_LEGS_GEOMETRY ??= new THREE.BoxGeometry(0.3, 0.52, 0.22);
  return CALLER_LEGS_GEOMETRY;
}

export function sharedCallerTorsoGeometry() {
  CALLER_TORSO_GEOMETRY ??= new THREE.BoxGeometry(0.48, 0.62, 0.28);
  return CALLER_TORSO_GEOMETRY;
}

export function sharedCallerHeadGeometry() {
  CALLER_HEAD_GEOMETRY ??= new THREE.BoxGeometry(0.3, 0.3, 0.3);
  return CALLER_HEAD_GEOMETRY;
}

export function sharedCallerLeftArmGeometry() {
  CALLER_LEFT_ARM_GEOMETRY ??= new THREE.BoxGeometry(0.14, 0.56, 0.14);
  return CALLER_LEFT_ARM_GEOMETRY;
}

export function sharedCallerWaveArmGeometry() {
  CALLER_WAVE_ARM_GEOMETRY ??= new THREE.BoxGeometry(0.14, 0.6, 0.14);
  return CALLER_WAVE_ARM_GEOMETRY;
}

export function sharedCallerHailCubeGeometry() {
  CALLER_HAIL_CUBE_GEOMETRY ??= new THREE.BoxGeometry(0.24, 0.24, 0.16);
  return CALLER_HAIL_CUBE_GEOMETRY;
}

export function sharedCallerShadowMaterial() {
  CALLER_SHADOW_MATERIAL ??= new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.14,
  });
  return CALLER_SHADOW_MATERIAL;
}

export function sharedCallerShoesMaterial() {
  CALLER_SHOES_MATERIAL ??= new THREE.MeshStandardMaterial({
    color: 0x161c28,
    roughness: 0.94,
  });
  return CALLER_SHOES_MATERIAL;
}

export function sharedCallerHeadMaterial() {
  CALLER_HEAD_MATERIAL ??= new THREE.MeshStandardMaterial({
    color: 0xf2d7bd,
    roughness: 0.75,
  });
  return CALLER_HEAD_MATERIAL;
}

// Register additional planners here as you add data-driven dispatch engines.
export const DISPATCH_PLANNER_REGISTRY = createDispatchPlannerRegistry(
  [
    createHeuristicDispatchPlanner<RouteTemplate, Hotspot>(),
    createDemandAwareDispatchPlanner<RouteTemplate, Hotspot>(),
  ],
  "demand-aware-v1",
);
export const ACTIVE_DISPATCH_PLANNER = DISPATCH_PLANNER_REGISTRY.getPlanner(
  process.env.NEXT_PUBLIC_DISPATCH_PLANNER?.trim() || null,
);
export const ACTIVE_DISPATCH_PLANNER_ID = ACTIVE_DISPATCH_PLANNER.id;

export type BuildingMass = {
  id: string;
  label: string | null;
  height: number;
  position: THREE.Vector3;
  width: number;
  depth: number;
  rotationY: number;
  color: number;
};

export type DongRegion = {
  id: string;
  name: string;
  nameEn: string | null;
  position: THREE.Vector3;
  rings: THREE.Vector3[][];
  color: number;
};

export type DongBoundarySegment = {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  center: THREE.Vector3;
  angle: number;
  length: number;
  leftDong: string | null;
  rightDong: string | null;
};

export type ProjectedRoadSegment = {
  roadClass: RoadProperties["roadClass"];
  width: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  name: string | null;
};

export type RoadSegmentSpatialIndex = {
  cellSize: number;
  columns: Map<number, Map<number, number[]>>;
};

export type TransitLandmark = {
  id: string;
  category: TransitCategory;
  name: string | null;
  position: THREE.Vector3;
  heading: THREE.Vector3;
  sideSign: 1 | -1;
  yaw: number;
  importance: number;
  roadClass: RoadProperties["roadClass"] | null;
  isMajor: boolean;
};

export type CameraFocusTarget = {
  x: number;
  z: number;
  distance: number;
  pitch: number;
  label: string;
  yaw?: number;
};

export type NearestRoadContext = {
  closest: THREE.Vector3;
  heading: THREE.Vector3;
  width: number;
  roadClass: RoadProperties["roadClass"];
  name: string | null;
  distance: number;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  roadClass: RoadProperties["roadClass"];
  roadWidth: number;
  length: number;
  travelCost: number;
  name: string | null;
  wayId: string | null;
};

export type RoadGraph = {
  nodes: Map<string, RouteNode>;
  adjacency: Map<string, GraphEdge[]>;
  edgeById: Map<string, GraphEdge>;
  turnRestrictionsByViaKey: Map<string, TurnRestriction[]>;
};

export type SignalLampVisual = {
  mesh: THREE.Mesh;
  axis: SignalAxis;
};

export type SignalVisual = SignalData & {
  group: THREE.Group;
  reds: SignalLampVisual[];
  yellows: SignalLampVisual[];
  greens: SignalLampVisual[];
  leftArrows: SignalLampVisual[];
  pedestrianLamps: SignalLampVisual[];
  lastVisualSignature: string;
};

export type PedestrianVisual = {
  signalId: string;
  axis: SignalAxis;
  group: THREE.Group;
  leftArm: THREE.Object3D | null;
  rightArm: THREE.Object3D | null;
  phaseOffset: number;
  speed: number;
  lateralOffset: number;
  direction: 1 | -1;
};

export type HotspotMarkerMode = "pickup" | "dropoff" | "idle";
export type SceneLabelKind = "district" | "building" | "transit" | "road";
export type DispatchHotspotPresentation = {
  accentColor: number;
  badgeLabel: string;
  badgeBorderColor: string;
  badgeBackground: string;
  badgeTextColor: string;
  showsCaller: boolean;
};

export type DispatchPlannerPresentation = {
  id: string;
  label: string;
  routingLabel: string;
  routingDetail: string;
  hotspot: Record<HotspotMarkerMode, DispatchHotspotPresentation>;
};

export type SceneLabelEntry = {
  label: CSS2DObject;
  kind: SceneLabelKind;
  priority: number;
  name: string | null;
};

export type LabelDistanceEntry = {
  entry: SceneLabelEntry;
  distanceSq: number;
};

export type HotspotVisual = {
  hotspot: Hotspot;
  base: THREE.Mesh;
  baseMaterial: THREE.MeshStandardMaterial;
  glow: THREE.Mesh;
  glowMaterial: THREE.MeshStandardMaterial;
  beacon: THREE.Mesh;
  beaconMaterial: THREE.MeshStandardMaterial;
  ring: THREE.Mesh;
  ringMaterial: THREE.MeshStandardMaterial;
  callerGroup: THREE.Group;
  waveArmPivot: THREE.Group;
  hailCube: THREE.Mesh;
  hailMaterial: THREE.MeshStandardMaterial;
  callBadge: CSS2DObject;
  badgeElement: HTMLDivElement;
  lastMarkerMode: HotspotMarkerMode;
  lastAccentColor: number;
  lastBadgeText: string;
};

export const DEFAULT_DISPATCH_PRESENTATION: DispatchPlannerPresentation = {
  id: ACTIVE_DISPATCH_PLANNER_ID,
  label: "수요 우선 배차",
  routingLabel: "수요 우선 휴리스틱",
  routingDetail:
    "기본 경로는 shortest path를 쓰되, 승차/하차 포인트 우선순위는 planner 설정으로 분리해 둔 상태입니다.",
  hotspot: {
    pickup: {
      accentColor: 0xc99543,
      badgeLabel: "승차",
      badgeBorderColor: "rgba(196,154,88,0.34)",
      badgeBackground: "rgba(35,29,22,0.84)",
      badgeTextColor: "#efe3c6",
      showsCaller: true,
    },
    dropoff: {
      accentColor: 0x78908a,
      badgeLabel: "하차",
      badgeBorderColor: "rgba(124,151,146,0.32)",
      badgeBackground: "rgba(24,31,30,0.82)",
      badgeTextColor: "#d5dfdc",
      showsCaller: false,
    },
    idle: {
      accentColor: 0x5c646c,
      badgeLabel: "콜 대기",
      badgeBorderColor: "rgba(118,126,134,0.26)",
      badgeBackground: "rgba(28,31,35,0.82)",
      badgeTextColor: "#cfd5db",
      showsCaller: false,
    },
  },
};

export const DISPATCH_PRESENTATIONS = new Map<string, DispatchPlannerPresentation>([
  [
    "heuristic-default",
    {
      ...DEFAULT_DISPATCH_PRESENTATION,
      id: "heuristic-default",
      label: "기본 휴리스틱 배차",
      routingLabel: "근접 우선 경로",
      routingDetail:
        "출발 지점에서 가까운 승차 후보를 고르고, 도로 그래프 위 shortest path로 경로를 확정합니다.",
    },
  ],
  [
    "demand-aware-v1",
    {
      ...DEFAULT_DISPATCH_PRESENTATION,
      id: "demand-aware-v1",
      label: "수요 우선 배차",
      routingLabel: "수요 우선 휴리스틱",
      routingDetail:
        "shortest path를 유지하면서 승차/하차 후보 점수에 수요 편향을 섞는 현재 기본 planner입니다.",
    },
  ],
]);

export function resolveDispatchPlannerPresentation(
  plannerId: string | null | undefined,
) {
  return (
    (plannerId ? DISPATCH_PRESENTATIONS.get(plannerId) : null) ??
    DEFAULT_DISPATCH_PRESENTATION
  );
}

export const TAXI_PALETTE: VehiclePalette = {
  body: 0xf5a100,
  cabin: 0x1e252e,
  sign: 0xf4ebcf,
};

export const TRAFFIC_PALETTES: VehiclePalette[] = [
  { body: 0xf4f5f7, cabin: 0xdce7f0, sign: null },
  { body: 0x353c45, cabin: 0xc9d5df, sign: null },
  { body: 0x79889a, cabin: 0xd8e2ea, sign: null },
  { body: 0xc94d3f, cabin: 0xf0d7cf, sign: null },
  { body: 0x4f6478, cabin: 0xd4dfe7, sign: null },
];

// Keep scene styling centralized so future asset or dispatch-layer swaps do
// not require touching simulation logic.
export const DONG_REGION_COLORS = [0x667983, 0x728274, 0x8f8068, 0x876f6a, 0x728193];
export const HOTSPOT_IDLE_COLORS = [0x7a6b57, 0x62716c, 0x76645c];
export const CALLER_TOP_PALETTES = [0x8a7d70, 0x6f7d8a, 0x6d8376, 0x97846a, 0x7a7387];
export const CALLER_BOTTOM_PALETTES = [0x25292d, 0x2b3035, 0x31353a, 0x2a2e32];
export const SUBWAY_STRUCTURE_ACCENTS = [0x78aaa0, 0x89b9ae, 0x6f978f];
export const MATERIAL_TEXTURE_KEYS = [
  "map",
  "alphaMap",
  "aoMap",
  "bumpMap",
  "displacementMap",
  "emissiveMap",
  "envMap",
  "lightMap",
  "metalnessMap",
  "normalMap",
  "roughnessMap",
  "specularMap",
  "clearcoatMap",
  "clearcoatNormalMap",
  "clearcoatRoughnessMap",
  "sheenColorMap",
  "sheenRoughnessMap",
  "thicknessMap",
  "transmissionMap",
] as const;
let VEHICLE_TEMPLATE_PLACEHOLDER_MATERIAL: THREE.MeshBasicMaterial | null = null;
let IMPORTED_TAXI_SIGN_GEOMETRY: THREE.BoxGeometry | null = null;
let IMPORTED_TAXI_SHADOW_GEOMETRY: THREE.PlaneGeometry | null = null;
let IMPORTED_TRAFFIC_SHADOW_GEOMETRY: THREE.PlaneGeometry | null = null;
let IMPORTED_TAXI_CLICK_TARGET_GEOMETRY: THREE.BoxGeometry | null = null;
let TAXI_HEADLIGHT_GEOMETRY: THREE.BoxGeometry | null = null;
let TAXI_TAIL_LIGHT_GEOMETRY: THREE.BoxGeometry | null = null;
let PEDESTRIAN_BODY_GEOMETRY: THREE.BoxGeometry | null = null;
let PEDESTRIAN_HEAD_GEOMETRY: THREE.SphereGeometry | null = null;
let PEDESTRIAN_FEET_GEOMETRY: THREE.BoxGeometry | null = null;
let PEDESTRIAN_ARM_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_SHADOW_GEOMETRY: THREE.PlaneGeometry | null = null;
let CALLER_SHOES_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_LEGS_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_TORSO_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_HEAD_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_LEFT_ARM_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_WAVE_ARM_GEOMETRY: THREE.BoxGeometry | null = null;
let CALLER_HAIL_CUBE_GEOMETRY: THREE.BoxGeometry | null = null;
export const PEDESTRIAN_BODY_MATERIALS = new Map<number, THREE.MeshStandardMaterial>();
export const CALLER_TORSO_MATERIALS = new Map<number, THREE.MeshStandardMaterial>();
export const CALLER_ARM_MATERIALS = new Map<number, THREE.MeshStandardMaterial>();
export const CALLER_BOTTOM_MATERIALS = new Map<number, THREE.MeshStandardMaterial>();
let PEDESTRIAN_HEAD_MATERIAL: THREE.MeshStandardMaterial | null = null;
let PEDESTRIAN_FEET_MATERIAL: THREE.MeshStandardMaterial | null = null;
let CALLER_SHADOW_MATERIAL: THREE.MeshBasicMaterial | null = null;
let CALLER_SHOES_MATERIAL: THREE.MeshStandardMaterial | null = null;
let CALLER_HEAD_MATERIAL: THREE.MeshStandardMaterial | null = null;
let fbxLoaderWarnSuppressionDepth = 0;
let originalConsoleWarnForFbxLoader: typeof console.warn | null = null;
export const PANEL_EYEBROW_CLASS =
  "mb-2 text-[11px] uppercase tracking-[0.28em] text-[#99cbbd]";
export const PANEL_SECTION_LABEL_CLASS =
  "text-xs uppercase tracking-[0.16em] text-[#99cbbd]/80";
export const PANEL_CARD_CLASS =
  "rounded-2xl border border-white/8 bg-white/[0.045] p-4 text-sm";
export const PANEL_CARD_COMPACT_CLASS =
  "rounded-2xl border border-white/8 bg-white/[0.045] p-3 text-sm";
export const PANEL_ACCENT_CARD_CLASS =
  "rounded-2xl border border-[#87cbb0]/12 bg-[#87cbb0]/[0.06] p-4 text-sm";
export const PANEL_INSET_CLASS =
  "rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2 text-xs leading-5 text-slate-400";
export const PANEL_INSET_PADDED_CLASS =
  "rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-3";
export const PANEL_TOKEN_CLASS =
  "rounded-full border border-white/8 bg-slate-950/55 px-2 py-1 text-slate-100";
export const PANEL_STATUS_TILE_CLASS =
  "rounded-2xl border border-white/8 bg-slate-950/55 p-3";

export function panelSelectableClass(selected: boolean) {
  return selected
    ? "border-[#87cbb0]/35 bg-[#87cbb0]/14 text-[#e3f2ed]"
    : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:text-white";
}

export function panelBadgeClass(active: boolean) {
  return `rounded-full border px-2 py-1 text-[11px] font-medium ${
    active
      ? "border-[#87cbb0]/22 bg-[#87cbb0]/10 text-[#d7efe6]"
      : "border-white/10 bg-slate-950/70 text-slate-300"
  }`;
}

export function panelPillToggleClass(selected: boolean) {
  return `rounded-full border px-2 py-1 transition ${
    selected
      ? "border-[#87cbb0]/28 bg-[#87cbb0]/12 text-[#e1f1eb]"
      : "border-[#87cbb0]/12 bg-[#87cbb0]/[0.06] text-[#c6ddd5] hover:border-[#87cbb0]/22 hover:bg-[#87cbb0]/10"
  }`;
}

export function HoverInfo({
  title,
  children,
  align = "left",
}: {
  title: string;
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`${title} 도움말`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/12 bg-slate-900/80 text-[11px] font-semibold text-slate-300 transition hover:border-[#87cbb0]/35 hover:text-[#d7efe6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#87cbb0]/35"
      >
        ?
      </button>
      <span
        className={`pointer-events-none absolute ${align === "right" ? "right-0" : "left-0"} top-full z-30 mt-2 w-[220px] sm:w-[240px] translate-y-1 rounded-2xl border border-white/10 bg-slate-950/96 px-3 py-3 text-left opacity-0 shadow-xl transition duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100`}
      >
        <span className="block text-[10px] uppercase tracking-[0.16em] text-[#99cbbd]/80">
          {title}
        </span>
        <span className="mt-1 block text-[11px] leading-5 text-slate-300">
          {children}
        </span>
      </span>
    </span>
  );
}

export const LOCAL_SCENARIO_PRESETS: LocalScenarioPreset[] = [
  {
    id: "baseline",
    label: "기본 시연",
    detail: "정오 기준 기본 설명 장면",
    summary: "강남역 코어 9개 동 OSM 레이어를 가장 중립적으로 설명하는 기준 장면입니다.",
    presentationNote:
      "행정동 범위, 도로 그래프, 기본 택시 흐름을 차분하게 소개할 때 쓰기 좋습니다.",
    speakerNotes: [
      "9개 실제 행정동과 OSM 도로를 기반으로 한 기본 디지털 트윈 장면입니다.",
      "배차 실험 이전에 공간 구조와 기본 주행 흐름을 설명할 때 가장 안정적입니다.",
    ],
    taxis: DEFAULT_TAXI_COUNT,
    traffic: DEFAULT_TRAFFIC_COUNT,
    minutes: 12 * 60,
    weather: "clear",
    focusLabel: "강남역",
    focusStationKeyword: "강남",
    camera: {
      distance: LOCAL_SCENARIO_FOCUS_DISTANCE,
      pitch: LOCAL_SCENARIO_FOCUS_PITCH,
      focusCenterBlend: LOCAL_SCENARIO_FOCUS_CENTER_BLEND,
      yawOffset: LOCAL_SCENARIO_FOCUS_YAW_OFFSET,
    },
  },
  {
    id: "gangnam-peak",
    label: "강남역 퇴근 피크",
    detail: "퇴근 시간대 역세권 혼잡",
    summary:
      "퇴근 시간대 강남역 주변의 높은 도로 점유와 택시 대응을 설명하는 혼잡 장면입니다.",
    presentationNote:
      "배차나 혼잡 대응 이야기를 꺼낼 때 가장 설명력이 좋은 프리셋입니다.",
    speakerNotes: [
      "강남역 퇴근 피크를 가정해 도로 점유와 택시 대응을 더 빽빽하게 보여줍니다.",
      "혼잡 구간에서 신호와 차량 흐름이 어떻게 읽히는지 설명하기 좋습니다.",
    ],
    taxis: 16,
    traffic: 24,
    minutes: 18 * 60 + 30,
    weather: "clear",
    focusLabel: "강남역",
    focusStationKeyword: "강남",
    camera: {
      distance: LOCAL_SCENARIO_FOCUS_DISTANCE,
      pitch: LOCAL_SCENARIO_FOCUS_PITCH,
      focusCenterBlend: LOCAL_SCENARIO_FOCUS_CENTER_BLEND,
      yawOffset: LOCAL_SCENARIO_FOCUS_YAW_OFFSET,
    },
  },
  {
    id: "rainy-evening",
    label: "우천 혼잡",
    detail: "비 오는 저녁 보수 주행",
    summary:
      "우천 조건에서 보수적으로 움직이는 택시와 더 무거워진 저녁 흐름을 보여주는 장면입니다.",
    presentationNote:
      "날씨가 시야와 이동 흐름에 어떻게 영향을 주는지 말할 때 자연스럽게 이어집니다.",
    speakerNotes: [
      "날씨를 붙이면 같은 도로망 위에서도 체감 흐름과 시각 밀도가 달라집니다.",
      "우천 상황에서 저녁 혼잡을 어떻게 읽을지 보여주는 설명용 프리셋입니다.",
    ],
    taxis: 18,
    traffic: 26,
    minutes: 19 * 60,
    weather: "heavy-rain",
    focusLabel: "강남역",
    focusStationKeyword: "강남",
    camera: {
      distance: LOCAL_SCENARIO_FOCUS_DISTANCE,
      pitch: LOCAL_SCENARIO_FOCUS_PITCH,
      focusCenterBlend: LOCAL_SCENARIO_FOCUS_CENTER_BLEND,
      yawOffset: LOCAL_SCENARIO_FOCUS_YAW_OFFSET,
    },
  },
  {
    id: "late-night",
    label: "심야 순환",
    detail: "교통이 풀린 야간 순환",
    summary:
      "일반 교통이 줄어든 뒤 택시 순환성과 심야 분위기가 더 잘 읽히는 장면입니다.",
    presentationNote:
      "낮/퇴근 피크와 대비되는 안정적인 야간 상태를 보여주기에 적합합니다.",
    speakerNotes: [
      "심야에는 일반 교통이 줄어들어 택시 순환성과 장면 가독성이 더 또렷해집니다.",
      "낮과 피크 시간대 대비용으로 보여주기 좋은 안정 상태 프리셋입니다.",
    ],
    taxis: 10,
    traffic: 10,
    minutes: 23 * 60 + 20,
    weather: "cloudy",
    focusLabel: "역삼역 권역",
    focusStationKeyword: "역삼",
    camera: {
      distance: LOCAL_SCENARIO_FOCUS_DISTANCE,
      pitch: LOCAL_SCENARIO_FOCUS_PITCH,
      focusCenterBlend: LOCAL_SCENARIO_FOCUS_CENTER_BLEND,
      yawOffset: LOCAL_SCENARIO_FOCUS_YAW_OFFSET,
    },
  },
];

export function taxiDisplayNumber(vehicleId: string) {
  const matched = vehicleId.match(/(\d+)$/);
  return matched ? Number(matched[1]) + 1 : null;
}

export function formatHotspotTaxiBadge(baseLabel: string, taxiNumbers: number[]) {
  if (!taxiNumbers.length) {
    return baseLabel;
  }

  const uniqueTaxiNumbers = [...new Set(taxiNumbers)].sort((left, right) => left - right);
  const visibleTaxiNumbers = uniqueTaxiNumbers.slice(0, 3).join(", ");
  const overflowCount = uniqueTaxiNumbers.length - 3;
  return `${baseLabel} · 택시 ${visibleTaxiNumbers}${overflowCount > 0 ? ` +${overflowCount}` : ""}`;
}

export async function fetchJsonAsset<T>(
  path: string,
  countResolver: (data: T) => number,
): Promise<{ data: T; meta: AssetMeta }> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, ASSET_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(path, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }

    const data = (await response.json()) as T;
    return {
      data,
      meta: {
        path,
        lastModified: formatKstDateTime(
          response.headers.get("last-modified") ?? "",
        ),
        featureCount: countResolver(data),
      },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Timed out loading ${path} after ${Math.round(ASSET_FETCH_TIMEOUT_MS / 1000)}s`,
      );
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function fetchGeoJsonAsset<T extends FeatureCollection>(
  path: string,
): Promise<{ data: T; meta: AssetMeta }> {
  return fetchJsonAsset<T>(path, (data) =>
    Array.isArray(data.features) ? data.features.length : 0,
  );
}

export async function fetchOptionalGeoJsonAsset<T extends FeatureCollection>(
  path: string,
  label: string,
) {
  try {
    return await fetchGeoJsonAsset<T>(path);
  } catch (error) {
    console.warn(`Skipping optional ${label} asset.`, error);
    return null;
  }
}

export async function fetchRoadNetworkAsset(path: string) {
  try {
    return await fetchJsonAsset<SerializedRoadNetwork>(
      path,
      (data) => data.stats.segmentCount,
    );
  } catch (error) {
    console.warn("Falling back to client-side road-graph build.", error);
    return null;
  }
}

export function renderFpsCapFor(mode: CameraMode) {
  switch (mode) {
    case "overview":
      return OVERVIEW_RENDER_FPS;
    case "follow":
    case "ride":
      return FOLLOW_RENDER_FPS;
    default:
      return DRIVE_RENDER_FPS;
  }
}

export function nearestRefreshRateBand(refreshRateEstimate: number) {
  return COMMON_REFRESH_RATE_BANDS.reduce<number>(
    (closest, candidate) =>
      Math.abs(candidate - refreshRateEstimate) <
        Math.abs(closest - refreshRateEstimate)
        ? candidate
        : closest,
    COMMON_REFRESH_RATE_BANDS[0],
  );
}

export function stabilizeRefreshRateBand(
  refreshRateEstimate: number,
  currentBand: number | null,
) {
  if (currentBand !== null) {
    const keepTolerance = Math.max(
      4,
      currentBand * AUTO_REFRESH_BAND_HYSTERESIS_RATIO,
    );
    if (Math.abs(refreshRateEstimate - currentBand) <= keepTolerance) {
      return currentBand;
    }
  }

  return nearestRefreshRateBand(refreshRateEstimate);
}

export function autoRenderFpsFor(
  mode: CameraMode,
  refreshRateEstimate: number | null,
) {
  const baseCap = renderFpsCapFor(mode);
  if (refreshRateEstimate === null) {
    return baseCap;
  }

  if (refreshRateEstimate >= AUTO_RENDER_HALF_REFRESH_THRESHOLD) {
    return Math.round(refreshRateEstimate / 2);
  }

  return Math.round(refreshRateEstimate);
}

export function resolveRenderCap(
  mode: CameraMode,
  fpsMode: FpsMode,
  refreshRateEstimate: number | null,
) {
  switch (fpsMode) {
    case "unlimited":
      return null;
    case "fixed60":
      return 60;
    default:
      return autoRenderFpsFor(mode, refreshRateEstimate);
  }
}

export function renderCapLabel(
  cap: number | null,
  isHidden: boolean,
  fpsMode: FpsMode,
) {
  if (isHidden && cap !== null) {
    return `${Math.round(cap)} FPS (백그라운드)`;
  }

  if (fpsMode === "unlimited" || cap === null) {
    return "무제한";
  }

  return `${Math.round(cap)} FPS`;
}

export function fpsModeSummary(fpsMode: FpsMode) {
  switch (fpsMode) {
    case "fixed60":
      return "보이는 렌더링을 60 FPS에 고정합니다.";
    case "unlimited":
      return "장치 한계에 닿을 때까지 보이는 렌더링 제한을 풀어둡니다.";
    default:
      return "자동 모드는 가장 가까운 주사율 대역에 맞춘 뒤, 100Hz 미만은 전체 주사율, 100Hz 이상은 절반 주사율을 목표로 잡습니다.";
  }
}

export function renderPixelRatioFor(mode: CameraMode, isHidden: boolean) {
  if (isHidden) {
    return HIDDEN_PIXEL_RATIO;
  }

  switch (mode) {
    case "overview":
      return OVERVIEW_PIXEL_RATIO;
    case "follow":
    case "ride":
      return FOLLOW_PIXEL_RATIO;
    default:
      return DRIVE_PIXEL_RATIO;
  }
}

export function precipitationDrawRatioFor(mode: CameraMode, isHidden: boolean) {
  if (isHidden) {
    return 0.35;
  }

  switch (mode) {
    case "overview":
      return 0.58;
    case "drive":
      return 0.82;
    case "ride":
      return 0.9;
    default:
      return 1;
  }
}

export function labelVisibilityBudget(mode: CameraMode) {
  switch (mode) {
    case "overview":
      return {
        districtLimit: 9,
        districtDistanceSq: 420 * 420,
        optionalLimit: 16,
        optionalDistanceSq: 250 * 250,
      };
    case "follow":
      return {
        districtLimit: 5,
        districtDistanceSq: 250 * 250,
        optionalLimit: 10,
        optionalDistanceSq: 190 * 190,
      };
    case "ride":
      return {
        districtLimit: 3,
        districtDistanceSq: 170 * 170,
        optionalLimit: 5,
        optionalDistanceSq: 130 * 130,
      };
    default:
      return {
        districtLimit: 4,
        districtDistanceSq: 220 * 220,
        optionalLimit: 8,
        optionalDistanceSq: 170 * 170,
      };
  }
}

export function geoKey(position: Position) {
  return `${position[0].toFixed(5)}:${position[1].toFixed(5)}`;
}

export function visitGeometryPositions(
  geometry: LineString | MultiLineString | Polygon | MultiPolygon,
  visit: (position: Position) => void,
) {
  if (geometry.type === "LineString") {
    geometry.coordinates.forEach(visit);
    return;
  }

  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
    geometry.coordinates.forEach((line) => line.forEach(visit));
    return;
  }

  geometry.coordinates.forEach((polygon) =>
    polygon.forEach((ring) => ring.forEach(visit)),
  );
}

export function featureCollectionCenter(
  featureCollection: FeatureCollection<
    LineString | MultiLineString | Polygon | MultiPolygon
  >,
) {
  let south = Number.POSITIVE_INFINITY;
  let west = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;

  featureCollection.features.forEach((feature) => {
    visitGeometryPositions(feature.geometry, ([lon, lat]) => {
      south = Math.min(south, lat);
      west = Math.min(west, lon);
      north = Math.max(north, lat);
      east = Math.max(east, lon);
    });
  });

  if (!Number.isFinite(south)) {
    return DEFAULT_MAP_CENTER;
  }

  return {
    lat: (south + north) / 2,
    lon: (west + east) / 2,
  };
}

export function projectPoint(
  position: Position,
  center: { lat: number; lon: number },
) {
  const latFactor = 110540 * POSITION_SCALE;
  const lonFactor =
    111320 * Math.cos((center.lat * Math.PI) / 180) * POSITION_SCALE;
  return new THREE.Vector3(
    (position[0] - center.lon) * lonFactor,
    0,
    -(position[1] - center.lat) * latFactor,
  );
}

export function lineStringsOfRoad(
  feature: RoadFeature,
  center: { lat: number; lon: number },
) {
  if (feature.geometry.type === "LineString") {
    return [
      feature.geometry.coordinates.map((coordinate) => ({
        key: geoKey(coordinate),
        point: projectPoint(coordinate, center),
      })),
    ];
  }

  return feature.geometry.coordinates.map((line) =>
    line.map((coordinate) => ({
      key: geoKey(coordinate),
      point: projectPoint(coordinate, center),
    })),
  );
}

export function buildProjectedRoadSegments(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
) {
  return roads.features.flatMap((feature) =>
    lineStringsOfRoad(feature, center).flatMap((line) =>
      line.slice(1).map((node, index) => ({
        roadClass: feature.properties.roadClass,
        width: feature.properties.width * ROAD_WIDTH_SCALE,
        start: line[index].point,
        end: node.point,
        name: feature.properties.name,
      })),
    ),
  );
}

export function roadSegmentCellCoord(value: number, cellSize: number) {
  return Math.floor(value / cellSize);
}

export function buildRoadSegmentSpatialIndex(
  roadSegments: ProjectedRoadSegment[],
  cellSize = ROAD_SEGMENT_INDEX_CELL_SIZE,
): RoadSegmentSpatialIndex {
  const columns = new Map<number, Map<number, number[]>>();

  for (let segmentIndex = 0; segmentIndex < roadSegments.length; segmentIndex += 1) {
    const segment = roadSegments[segmentIndex]!;
    const minX = Math.min(segment.start.x, segment.end.x);
    const maxX = Math.max(segment.start.x, segment.end.x);
    const minZ = Math.min(segment.start.z, segment.end.z);
    const maxZ = Math.max(segment.start.z, segment.end.z);

    const startCellX = roadSegmentCellCoord(minX, cellSize);
    const endCellX = roadSegmentCellCoord(maxX, cellSize);
    const startCellZ = roadSegmentCellCoord(minZ, cellSize);
    const endCellZ = roadSegmentCellCoord(maxZ, cellSize);

    for (let cellX = startCellX; cellX <= endCellX; cellX += 1) {
      let column = columns.get(cellX);
      if (!column) {
        column = new Map<number, number[]>();
        columns.set(cellX, column);
      }

      for (let cellZ = startCellZ; cellZ <= endCellZ; cellZ += 1) {
        let bucket = column.get(cellZ);
        if (!bucket) {
          bucket = [];
          column.set(cellZ, bucket);
        }
        bucket.push(segmentIndex);
      }
    }
  }

  return {
    cellSize,
    columns,
  };
}

export function collectRoadSegmentCandidateIndices(
  point: THREE.Vector3,
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex | null,
  maxDistance: number,
) {
  if (!roadSegmentSpatialIndex || !Number.isFinite(maxDistance)) {
    return null;
  }

  const cellRadius = Math.max(
    1,
    Math.ceil(maxDistance / roadSegmentSpatialIndex.cellSize) + 1,
  );
  const centerCellX = roadSegmentCellCoord(point.x, roadSegmentSpatialIndex.cellSize);
  const centerCellZ = roadSegmentCellCoord(point.z, roadSegmentSpatialIndex.cellSize);
  const seen = new Set<number>();

  for (
    let cellX = centerCellX - cellRadius;
    cellX <= centerCellX + cellRadius;
    cellX += 1
  ) {
    const column = roadSegmentSpatialIndex.columns.get(cellX);
    if (!column) {
      continue;
    }

    for (
      let cellZ = centerCellZ - cellRadius;
      cellZ <= centerCellZ + cellRadius;
      cellZ += 1
    ) {
      const bucket = column.get(cellZ);
      if (!bucket) {
        continue;
      }

      for (let bucketIndex = 0; bucketIndex < bucket.length; bucketIndex += 1) {
        const segmentIndex = bucket[bucketIndex]!;
        if (segmentIndex >= 0 && segmentIndex < roadSegments.length) {
          seen.add(segmentIndex);
        }
      }
    }
  }

  return seen.size ? [...seen] : null;
}

export function outerRingOfBuilding(
  feature: BuildingFeature,
  center: { lat: number; lon: number },
) {
  const ring =
    feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : (feature.geometry.coordinates[0]?.[0] ?? []);

  return ring.map((coordinate) => projectPoint(coordinate, center));
}

export function outerRingsOfDong(
  feature: DongFeature,
  center: { lat: number; lon: number },
) {
  if (feature.geometry.type === "Polygon") {
    const ring = feature.geometry.coordinates[0] ?? [];
    return ring.length
      ? [ring.map((coordinate) => projectPoint(coordinate, center))]
      : [];
  }

  return feature.geometry.coordinates
    .map((polygon) => polygon[0] ?? [])
    .filter((ring) => ring.length)
    .map((ring) => ring.map((coordinate) => projectPoint(coordinate, center)));
}

export function shapePointsFromCoordinates(
  ring: Position[],
  center: { lat: number; lon: number },
  clockwise: boolean,
) {
  const points = ring.map((coordinate) => {
    const point = projectPoint(coordinate, center);
    return new THREE.Vector2(point.x, -point.z);
  });

  if (
    points.length > 1 &&
    points[0].distanceTo(points[points.length - 1]) < 0.001
  ) {
    points.pop();
  }

  if (points.length < 3) {
    return null;
  }

  if (THREE.ShapeUtils.isClockWise(points) !== clockwise) {
    points.reverse();
  }

  return points;
}

export function shapeFromPolygonCoordinates(
  rings: Position[][],
  center: { lat: number; lon: number },
) {
  const outerPoints = shapePointsFromCoordinates(rings[0] ?? [], center, false);
  if (!outerPoints) {
    return null;
  }

  const shape = new THREE.Shape(outerPoints);
  rings.slice(1).forEach((ring) => {
    const holePoints = shapePointsFromCoordinates(ring, center, true);
    if (!holePoints) {
      return;
    }
    shape.holes.push(new THREE.Path(holePoints));
  });

  return shape;
}

export function shapesOfNonRoadFeature(
  feature: NonRoadFeature,
  center: { lat: number; lon: number },
) {
  if (feature.geometry.type === "Polygon") {
    const shape = shapeFromPolygonCoordinates(
      feature.geometry.coordinates,
      center,
    );
    return shape ? [shape] : [];
  }

  return feature.geometry.coordinates
    .map((polygon) => shapeFromPolygonCoordinates(polygon, center))
    .filter(Boolean) as THREE.Shape[];
}

export function distanceXZ(start: THREE.Vector3, end: THREE.Vector3) {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

export function polygonAreaXZ(points: THREE.Vector3[]) {
  let usablePoints = points;
  if (usablePoints.length > 1) {
    const first = usablePoints[0];
    const last = usablePoints[usablePoints.length - 1];
    if (first.distanceToSquared(last) < 0.0001) {
      usablePoints = usablePoints.slice(0, -1);
    }
  }

  if (usablePoints.length < 3) {
    return 0;
  }

  let areaTwice = 0;
  usablePoints.forEach((point, index) => {
    const next = usablePoints[(index + 1) % usablePoints.length];
    areaTwice += point.x * next.z - next.x * point.z;
  });

  return Math.abs(areaTwice) * 0.5;
}

export function buildCumulative(points: THREE.Vector3[]) {
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(
      cumulative[index - 1] + distanceXZ(points[index - 1], points[index]),
    );
  }
  return cumulative;
}

export function buildSegmentLengthsFromCumulative(cumulative: number[]) {
  const segmentLengths: number[] = [];
  for (let index = 0; index < cumulative.length - 1; index += 1) {
    segmentLengths.push(cumulative[index + 1]! - cumulative[index]!);
  }
  return segmentLengths;
}

export function buildSegmentHeadings(points: THREE.Vector3[]) {
  const segmentHeadings: THREE.Vector3[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const heading = points[index + 1]!.clone().sub(points[index]!);
    if (heading.lengthSq() < 0.0001) {
      heading.set(0, 0, 1);
    } else {
      heading.normalize();
    }
    segmentHeadings.push(heading);
  }
  return segmentHeadings;
}

export function normalizeDistance(value: number, totalLength: number) {
  if (totalLength <= 0) {
    return 0;
  }
  return ((value % totalLength) + totalLength) % totalLength;
}

export function clampRouteDistance(route: RouteTemplate, value: number) {
  if (route.isLoop) {
    return normalizeDistance(value, route.totalLength);
  }
  return THREE.MathUtils.clamp(value, 0, route.totalLength);
}

export function routeDistanceAhead(
  route: RouteTemplate,
  current: number,
  target: number,
) {
  if (route.isLoop) {
    const normalizedCurrent = normalizeDistance(current, route.totalLength);
    const normalizedTarget = normalizeDistance(target, route.totalLength);
    if (normalizedTarget >= normalizedCurrent) {
      return normalizedTarget - normalizedCurrent;
    }
    return route.totalLength - normalizedCurrent + normalizedTarget;
  }

  if (target < current) {
    return Number.POSITIVE_INFINITY;
  }
  return target - current;
}

export function createRouteSample(): RouteSample {
  return {
    position: new THREE.Vector3(),
    heading: new THREE.Vector3(0, 0, 1),
    segmentIndex: 0,
  };
}

export function createVehicleMotionState(): VehicleMotionState {
  return {
    ...createRouteSample(),
    lanePosition: new THREE.Vector3(),
    right: new THREE.Vector3(1, 0, 0),
    yaw: 0,
    nextStopIndex: 0,
  };
}

export function copyVehicleMotionState(
  target: VehicleMotionState,
  source: VehicleMotionState,
) {
  target.position.copy(source.position);
  target.heading.copy(source.heading);
  target.segmentIndex = source.segmentIndex;
  target.lanePosition.copy(source.lanePosition);
  target.right.copy(source.right);
  target.yaw = source.yaw;
  target.nextStopIndex = source.nextStopIndex;
  return target;
}

export function createNextStopState(): NextStopState {
  return {
    index: -1,
    stop: null,
    ahead: Number.POSITIVE_INFINITY,
  };
}

export function createVehicleSimulationSample(
  vehicle: Vehicle,
): VehicleSimulationSample {
  return {
    vehicle,
    motion: vehicle.motion,
    nextStopState: createNextStopState(),
    proximityCellX: 0,
    proximityCellZ: 0,
  };
}

export function vehicleProximityCellCoord(value: number) {
  return Math.floor(value / VEHICLE_PROXIMITY_CELL_SIZE);
}

export function addVehicleSampleToBucket(
  buckets: VehicleProximityBuckets,
  sample: VehicleSimulationSample,
  cellX = sample.proximityCellX,
  cellZ = sample.proximityCellZ,
) {
  let column = buckets.get(cellX);
  if (!column) {
    column = new Map<number, VehicleSimulationSample[]>();
    buckets.set(cellX, column);
  }

  let bucket = column.get(cellZ);
  if (!bucket) {
    bucket = [];
    column.set(cellZ, bucket);
  }
  bucket.push(sample);
}

export function clearVehicleSampleBuckets(buckets: VehicleProximityBuckets) {
  buckets.forEach((column) => {
    column.forEach((bucket) => {
      bucket.length = 0;
    });
  });
}

export function syncVehicleSampleBucket(
  buckets: VehicleProximityBuckets,
  sample: VehicleSimulationSample,
) {
  const nextCellX = vehicleProximityCellCoord(sample.motion.lanePosition.x);
  const nextCellZ = vehicleProximityCellCoord(sample.motion.lanePosition.z);
  if (
    nextCellX === sample.proximityCellX &&
    nextCellZ === sample.proximityCellZ
  ) {
    return;
  }

  const currentColumn = buckets.get(sample.proximityCellX);
  const currentBucket = currentColumn?.get(sample.proximityCellZ);
  if (currentBucket) {
    const sampleIndex = currentBucket.indexOf(sample);
    if (sampleIndex !== -1) {
      currentBucket[sampleIndex] = currentBucket[currentBucket.length - 1];
      currentBucket.pop();
    }
    if (!currentBucket.length) {
      currentColumn?.delete(sample.proximityCellZ);
      if (currentColumn && !currentColumn.size) {
        buckets.delete(sample.proximityCellX);
      }
    }
  }

  sample.proximityCellX = nextCellX;
  sample.proximityCellZ = nextCellZ;
  addVehicleSampleToBucket(buckets, sample, nextCellX, nextCellZ);
}

export function routeSegmentIndexAtDistance(
  route: RouteTemplate,
  distance: number,
  segmentIndexHint = 0,
) {
  if (route.nodes.length < 2 || route.totalLength <= 0) {
    return 0;
  }

  const clampedDistance = clampRouteDistance(route, distance);
  let segmentIndex = THREE.MathUtils.clamp(
    segmentIndexHint,
    0,
    route.cumulative.length - 2,
  );

  while (
    segmentIndex < route.cumulative.length - 2 &&
    route.cumulative[segmentIndex + 1] < clampedDistance
  ) {
    segmentIndex += 1;
  }

  while (segmentIndex > 0 && route.cumulative[segmentIndex] > clampedDistance) {
    segmentIndex -= 1;
  }

  return segmentIndex;
}

export function sampleRouteInto(
  route: RouteTemplate,
  distance: number,
  target: RouteSample,
  segmentIndexHint = 0,
) {
  if (route.nodes.length < 2 || route.totalLength <= 0) {
    target.position.copy(route.nodes[0]?.point ?? new THREE.Vector3());
    target.heading.set(0, 0, 1);
    target.segmentIndex = 0;
    return target;
  }

  const clampedDistance = clampRouteDistance(route, distance);
  const segmentIndex = routeSegmentIndexAtDistance(
    route,
    clampedDistance,
    segmentIndexHint,
  );
  const start = route.nodes[segmentIndex].point;
  const end = route.nodes[segmentIndex + 1]?.point ?? start;
  const segmentStart = route.cumulative[segmentIndex];
  const segmentLength = Math.max(route.segmentLengths[segmentIndex] ?? 0, 0.0001);
  const segmentHeading = route.segmentHeadings[segmentIndex];
  if (segmentHeading) {
    target.heading.copy(segmentHeading);
  } else {
    target.heading.copy(end).sub(start);
    if (target.heading.lengthSq() < 0.0001) {
      target.heading.set(0, 0, 1);
    } else {
      target.heading.normalize();
    }
  }

  target.position
    .copy(start)
    .lerp(end, (clampedDistance - segmentStart) / segmentLength);
  target.segmentIndex = segmentIndex;
  return target;
}

export function writeRightVector(heading: THREE.Vector3, target: THREE.Vector3) {
  target.set(heading.z, 0, -heading.x);
  if (target.lengthSq() < 0.0001) {
    target.set(1, 0, 0);
  } else {
    target.normalize();
  }
  return target;
}

export function resolveNextStopInto(
  route: RouteTemplate,
  currentDistance: number,
  target: NextStopState,
  startIndex = 0,
) {
  if (!route.stops.length) {
    target.index = -1;
    target.stop = null;
    target.ahead = Number.POSITIVE_INFINITY;
    return target;
  }

  if (!route.isLoop) {
    let index = THREE.MathUtils.clamp(startIndex, 0, route.stops.length);
    while (
      index < route.stops.length &&
      route.stops[index].distance < currentDistance - 0.001
    ) {
      index += 1;
    }

    if (index >= route.stops.length) {
      target.index = route.stops.length;
      target.stop = null;
      target.ahead = Number.POSITIVE_INFINITY;
      return target;
    }

    target.index = index;
    target.stop = route.stops[index];
    target.ahead = Math.max(0, route.stops[index].distance - currentDistance);
    return target;
  }

  let bestIndex = THREE.MathUtils.clamp(startIndex, 0, route.stops.length - 1);
  let bestAhead = routeDistanceAhead(
    route,
    currentDistance,
    route.stops[bestIndex].distance,
  );

  for (let step = 0; step < route.stops.length - 1; step += 1) {
    const candidateIndex = (bestIndex + 1) % route.stops.length;
    const candidateAhead = routeDistanceAhead(
      route,
      currentDistance,
      route.stops[candidateIndex].distance,
    );
    if (candidateAhead > bestAhead + 0.001) {
      break;
    }
    bestIndex = candidateIndex;
    bestAhead = candidateAhead;
    if (bestAhead <= 0.001) {
      break;
    }
  }

  target.index = bestIndex;
  target.stop = route.stops[bestIndex];
  target.ahead = bestAhead;
  return target;
}

export function resolveNextStop(
  route: RouteTemplate,
  currentDistance: number,
  startIndex = 0,
) {
  return resolveNextStopInto(
    route,
    currentDistance,
    createNextStopState(),
    startIndex,
  );
}

export function offsetToRight(
  position: THREE.Vector3,
  heading: THREE.Vector3,
  offset: number,
) {
  const right = writeRightVector(heading, new THREE.Vector3());
  return position.clone().addScaledVector(right, offset);
}

export function curbsideLaneOffset(route: Pick<RouteTemplate, "roadWidth" | "laneOffset">) {
  const edgeInset = THREE.MathUtils.clamp(
    route.roadWidth * 0.16,
    CURBSIDE_EDGE_INSET_MIN,
    CURBSIDE_EDGE_INSET_MAX,
  );
  return THREE.MathUtils.clamp(
    route.roadWidth * 0.5 - edgeInset,
    route.laneOffset + 0.16,
    route.laneOffset + CURBSIDE_EXTRA_OFFSET_MAX,
  );
}

export function curbsideApproachBlend(vehicle: Vehicle) {
  if (vehicle.kind !== "taxi" || vehicle.route.isLoop) {
    return 0;
  }
  if (vehicle.serviceTimer > 0) {
    return 1;
  }

  const destinationGap = Math.max(0, vehicle.route.totalLength - vehicle.distance);
  if (destinationGap >= HOTSPOT_SLOWDOWN_DISTANCE) {
    return 0;
  }

  return THREE.MathUtils.smoothstep(
    1 - destinationGap / HOTSPOT_SLOWDOWN_DISTANCE,
    0,
    1,
  );
}

export function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function dampAngle(
  current: number,
  target: number,
  lambda: number,
  delta: number,
) {
  const gap = wrapAngle(target - current);
  return wrapAngle(current + gap * (1 - Math.exp(-lambda * delta)));
}

export function sampleRoute(
  route: RouteTemplate,
  distance: number,
  segmentIndexHint = 0,
) {
  return sampleRouteInto(
    route,
    distance,
    createRouteSample(),
    segmentIndexHint,
  );
}

export function dominantAxis(start: THREE.Vector3, end: THREE.Vector3): SignalAxis {
  return Math.abs(end.x - start.x) > Math.abs(end.z - start.z) ? "ew" : "ns";
}

export function signalDirectionForVector(vector: THREE.Vector3): SignalDirection {
  if (Math.abs(vector.x) > Math.abs(vector.z)) {
    return vector.x >= 0 ? "east" : "west";
  }
  return vector.z >= 0 ? "south" : "north";
}

export function signalAxisForDirection(direction: SignalDirection): SignalAxis {
  return direction === "east" || direction === "west" ? "ew" : "ns";
}

export function approachDirectionForHeading(heading: THREE.Vector3): SignalDirection {
  if (Math.abs(heading.x) > Math.abs(heading.z)) {
    return heading.x >= 0 ? "west" : "east";
  }
  return heading.z >= 0 ? "north" : "south";
}

export function opposingSignalDirection(direction: SignalDirection): SignalDirection {
  switch (direction) {
    case "north":
      return "south";
    case "south":
      return "north";
    case "east":
      return "west";
    default:
      return "east";
  }
}

export function dominantAxisForHeading(heading: THREE.Vector3): SignalAxis {
  return Math.abs(heading.x) > Math.abs(heading.z) ? "ew" : "ns";
}

export function normalizeSignalOffset(offset: number) {
  return ((offset % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
}

export function createSignalTurnDemand(): SignalTurnDemand {
  return {
    left: 0,
    straight: 0,
    right: 0,
  };
}

export function createSignalApproachDemand(): SignalApproachDemand {
  return {
    north: createSignalTurnDemand(),
    east: createSignalTurnDemand(),
    south: createSignalTurnDemand(),
    west: createSignalTurnDemand(),
  };
}

export function createSignalApproachDistance(): SignalApproachDistance {
  return {
    north: Number.POSITIVE_INFINITY,
    east: Number.POSITIVE_INFINITY,
    south: Number.POSITIVE_INFINITY,
    west: Number.POSITIVE_INFINITY,
  };
}

export function resetSignalAxisOccupancy(target: SignalAxisOccupancy) {
  target.ns = 0;
  target.ew = 0;
  return target;
}

export function createSignalDirectionalOccupancy(): SignalDirectionalOccupancy {
  return {
    north: 0,
    east: 0,
    south: 0,
    west: 0,
  };
}

export function resetSignalDirectionalOccupancy(target: SignalDirectionalOccupancy) {
  target.north = 0;
  target.east = 0;
  target.south = 0;
  target.west = 0;
  return target;
}

export function resetSignalTurnDemand(target: SignalTurnDemand) {
  target.left = 0;
  target.straight = 0;
  target.right = 0;
  return target;
}

export function resetSignalApproachDemand(target: SignalApproachDemand) {
  resetSignalTurnDemand(target.north);
  resetSignalTurnDemand(target.east);
  resetSignalTurnDemand(target.south);
  resetSignalTurnDemand(target.west);
  return target;
}

export function resetSignalApproachDistance(target: SignalApproachDistance) {
  target.north = Number.POSITIVE_INFINITY;
  target.east = Number.POSITIVE_INFINITY;
  target.south = Number.POSITIVE_INFINITY;
  target.west = Number.POSITIVE_INFINITY;
  return target;
}

export function createSignalAxisOccupancy(): SignalAxisOccupancy {
  return {
    ns: 0,
    ew: 0,
  };
}

export function signalFlowForAxis(
  axis: SignalAxis,
  phase: "green" | "yellow" | "left",
) {
  if (axis === "ns") {
    if (phase === "green") {
      return SIGNAL_FLOW_NS_GREEN;
    }
    if (phase === "yellow") {
      return SIGNAL_FLOW_NS_YELLOW;
    }
    return SIGNAL_FLOW_NS_LEFT;
  }

  if (phase === "green") {
    return SIGNAL_FLOW_EW_GREEN;
  }
  if (phase === "yellow") {
    return SIGNAL_FLOW_EW_YELLOW;
  }
  return SIGNAL_FLOW_EW_LEFT;
}

export function pushSignalPhase(
  sequence: SignalPhaseStep[],
  duration: number,
  flow: SignalFlow,
) {
  if (duration <= 0.001) {
    return;
  }
  sequence.push({ duration, flow });
}

export function buildSignalTimingPlan(
  approaches: SignalDirection[],
  priorityAxis: SignalAxis,
  hasProtectedLeft: boolean,
): SignalTimingPlan {
  const axisCounts = signalAxisPresence(approaches);
  const majorApproachCount = priorityAxis === "ns" ? axisCounts.ns : axisCounts.ew;
  const minorApproachCount = priorityAxis === "ns" ? axisCounts.ew : axisCounts.ns;
  const yellowDuration = 1.1;
  const clearanceDuration = 0.7;
  const pedestrianWalkDuration = approaches.length >= 4 ? 2.4 : 2.1;
  const pedestrianFlashDuration = approaches.length >= 4 ? 1.65 : 1.45;
  const majorLeftDuration =
    hasProtectedLeft && majorApproachCount > 1 ? 1.45 : 0;
  const minorLeftDuration =
    hasProtectedLeft && minorApproachCount > 1 ? 1.2 : 0;
  const fixedDuration =
    yellowDuration * 2 +
    clearanceDuration * 2 +
    pedestrianWalkDuration +
    pedestrianFlashDuration +
    majorLeftDuration +
    minorLeftDuration;
  const remainingFlowDuration = Math.max(8.6, SIGNAL_CYCLE - fixedDuration);
  const majorGreenBias = THREE.MathUtils.clamp(
    0.54 +
    (majorApproachCount - minorApproachCount) * 0.05 +
    (hasProtectedLeft ? 0.02 : 0),
    0.54,
    0.64,
  );
  const majorGreenDuration = Math.max(
    4.8,
    remainingFlowDuration * majorGreenBias,
  );
  const minorGreenDuration = Math.max(
    4.2,
    remainingFlowDuration - majorGreenDuration,
  );
  const cycleAdjustment =
    SIGNAL_CYCLE -
    (majorLeftDuration +
      majorGreenDuration +
      yellowDuration +
      clearanceDuration +
      minorLeftDuration +
      minorGreenDuration +
      yellowDuration +
      clearanceDuration +
      pedestrianWalkDuration +
      pedestrianFlashDuration);
  const minorAxis = priorityAxis === "ns" ? "ew" : "ns";
  const sequence: SignalPhaseStep[] = [];
  pushSignalPhase(
    sequence,
    majorLeftDuration,
    signalFlowForAxis(priorityAxis, "left"),
  );
  pushSignalPhase(
    sequence,
    majorGreenDuration,
    signalFlowForAxis(priorityAxis, "green"),
  );
  pushSignalPhase(
    sequence,
    yellowDuration,
    signalFlowForAxis(priorityAxis, "yellow"),
  );
  pushSignalPhase(sequence, clearanceDuration, SIGNAL_FLOW_CLEARANCE);
  pushSignalPhase(
    sequence,
    minorLeftDuration,
    signalFlowForAxis(minorAxis, "left"),
  );
  pushSignalPhase(
    sequence,
    minorGreenDuration,
    signalFlowForAxis(minorAxis, "green"),
  );
  pushSignalPhase(
    sequence,
    yellowDuration,
    signalFlowForAxis(minorAxis, "yellow"),
  );
  pushSignalPhase(sequence, clearanceDuration, SIGNAL_FLOW_CLEARANCE);
  pushSignalPhase(sequence, pedestrianWalkDuration, SIGNAL_FLOW_PED_WALK);
  pushSignalPhase(
    sequence,
    pedestrianFlashDuration + cycleAdjustment,
    SIGNAL_FLOW_PED_FLASH,
  );
  return { sequence };
}

export function createSignalData(
  id: string,
  key: string,
  point: THREE.Vector3,
  approaches: SignalDirection[],
  hasProtectedLeft: boolean,
  visualPoint: THREE.Vector3 = point,
): Omit<SignalData, "offset"> {
  const priorityAxis = preferredSignalAxisForApproaches(approaches, point);
  return {
    id,
    key,
    point,
    visualPoint,
    approaches,
    hasProtectedLeft,
    priorityAxis,
    timingPlan: buildSignalTimingPlan(
      approaches,
      priorityAxis,
      hasProtectedLeft,
    ),
  };
}

export function signalAxisPresence(approaches: SignalDirection[]) {
  return approaches.reduce(
    (counts, direction) => {
      if (signalAxisForDirection(direction) === "ew") {
        counts.ew += 1;
      } else {
        counts.ns += 1;
      }
      return counts;
    },
    { ns: 0, ew: 0 },
  );
}

export function preferredSignalAxisForApproaches(
  approaches: SignalDirection[],
  point: THREE.Vector3,
): SignalAxis {
  const counts = signalAxisPresence(approaches);
  if (counts.ns === counts.ew) {
    return Math.abs(point.z) >= Math.abs(point.x) ? "ns" : "ew";
  }
  return counts.ns > counts.ew ? "ns" : "ew";
}

export function assignCoordinatedSignalOffsets(
  signals: Array<Omit<SignalData, "offset">>,
) {
  const grouped = new Map<
    string,
    Array<{
      signal: Omit<SignalData, "offset">;
      axisPosition: number;
      corridorBand: number;
    }>
  >();

  signals.forEach((signal) => {
    const priorityAxis = signal.priorityAxis;
    const axisPosition =
      priorityAxis === "ew" ? signal.point.x : signal.point.z;
    const crossAxisPosition =
      priorityAxis === "ew" ? signal.point.z : signal.point.x;
    const corridorBand = Math.round(
      crossAxisPosition / SIGNAL_COORDINATION_BAND_SIZE,
    );
    const groupKey = `${priorityAxis}:${corridorBand}`;
    const group = grouped.get(groupKey) ?? [];
    group.push({ signal, axisPosition, corridorBand });
    grouped.set(groupKey, group);
  });

  const offsetBySignalKey = new Map<string, number>();
  grouped.forEach((group, groupKey) => {
    group.sort((left, right) => left.axisPosition - right.axisPosition);
    const corridorSeed = normalizeSignalOffset(
      group[0].corridorBand * SIGNAL_COORDINATION_PHASE_STEP +
      (groupKey.startsWith("ew") ? SIGNAL_CYCLE * 0.33 : 0),
    );
    const corridorStart = group[0].axisPosition;

    group.forEach((entry, index) => {
      const progressionOffset =
        -(entry.axisPosition - corridorStart) / SIGNAL_WAVE_TRAVEL_SPEED;
      offsetBySignalKey.set(
        entry.signal.key,
        normalizeSignalOffset(
          corridorSeed + progressionOffset + index * 0.08,
        ),
      );
    });
  });

  return signals.map((signal) => ({
    ...signal,
    offset: offsetBySignalKey.get(signal.key) ?? 0,
  }));
}

export function averagePoint(points: THREE.Vector3[]) {
  if (!points.length) {
    return new THREE.Vector3();
  }

  const total = points.reduce(
    (sum, point) => sum.add(point),
    new THREE.Vector3(),
  );
  return total.multiplyScalar(1 / points.length);
}

export function classifyTurn(
  previous: THREE.Vector3,
  current: THREE.Vector3,
  next: THREE.Vector3,
): TurnMovement {
  const incoming = current.clone().sub(previous).normalize();
  const outgoing = next.clone().sub(current).normalize();
  const dot = incoming.dot(outgoing);
  if (dot > 0.72) {
    return "straight";
  }
  const cross = incoming.x * outgoing.z - incoming.z * outgoing.x;
  return cross > 0 ? "right" : "left";
}

export function colorForBuilding(height: number) {
  if (height >= 45) return 0x8f99a5;
  if (height >= 25) return 0x76808a;
  return 0x5d6670;
}

export function buildDongRegions(
  dongs: DongFeatureCollection,
  center: { lat: number; lon: number },
) {
  return dongs.features
    .map((feature, index) => {
      const rings = outerRingsOfDong(feature, center).filter(
        (ring) => ring.length >= 3,
      );
      if (!rings.length) {
        return null;
      }

      const bounds = new THREE.Box3();
      rings.forEach((ring) =>
        ring.forEach((point) => bounds.expandByPoint(point)),
      );

      return {
        id: `dong-${index}`,
        name: feature.properties.name,
        nameEn: feature.properties.nameEn,
        position: bounds.getCenter(new THREE.Vector3()),
        rings,
        color: DONG_REGION_COLORS[index % DONG_REGION_COLORS.length],
      } satisfies DongRegion;
    })
    .filter(Boolean) as DongRegion[];
}

export function pointInDongRing(point: THREE.Vector3, ring: THREE.Vector3[]) {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const current = ring[index];
    const prior = ring[previous];
    const intersects =
      current.z > point.z !== prior.z > point.z &&
      point.x <
      ((prior.x - current.x) * (point.z - current.z)) /
      (prior.z - current.z || Number.EPSILON) +
      current.x;

    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

export function dongContainsPoint(dong: DongRegion, point: THREE.Vector3) {
  return dong.rings.some(
    (ring) => ring.length >= 3 && pointInDongRing(point, ring),
  );
}

export function canonicalBoundaryPoint(point: THREE.Vector3) {
  return `${point.x.toFixed(3)}:${point.z.toFixed(3)}`;
}

export function buildDongBoundarySegments(dongRegions: DongRegion[]) {
  const segmentMap = new Map<
    string,
    {
      start: THREE.Vector3;
      end: THREE.Vector3;
    }
  >();

  dongRegions.forEach((dong) => {
    dong.rings.forEach((ring) => {
      for (let index = 0; index < ring.length - 1; index += 1) {
        const start = ring[index];
        const end = ring[index + 1];
        const length = distanceXZ(start, end);
        if (length < 1.5) {
          continue;
        }

        const useOriginalOrder =
          start.x < end.x ||
          (Math.abs(start.x - end.x) < 0.001 && start.z <= end.z);
        const canonicalStart = useOriginalOrder ? start : end;
        const canonicalEnd = useOriginalOrder ? end : start;
        const key = `${canonicalBoundaryPoint(canonicalStart)}|${canonicalBoundaryPoint(canonicalEnd)}`;

        if (!segmentMap.has(key)) {
          segmentMap.set(key, {
            start: canonicalStart.clone(),
            end: canonicalEnd.clone(),
          });
        }
      }
    });
  });

  return [...segmentMap.entries()]
    .map(([key, value]) => {
      const direction = value.end.clone().sub(value.start);
      const length = direction.length();
      const center = value.start.clone().lerp(value.end, 0.5);
      const normal = new THREE.Vector3(
        -direction.z,
        0,
        direction.x,
      ).normalize();
      const probeDistance = Math.min(Math.max(length * 0.08, 0.9), 2.2);
      const leftProbe = center.clone().addScaledVector(normal, probeDistance);
      const rightProbe = center.clone().addScaledVector(normal, -probeDistance);
      const leftDong =
        dongRegions.find((dong) => dongContainsPoint(dong, leftProbe))?.name ??
        null;
      const rightDong =
        dongRegions.find((dong) => dongContainsPoint(dong, rightProbe))?.name ??
        null;

      return {
        id: key,
        start: value.start,
        end: value.end,
        center,
        angle: Math.atan2(
          value.end.x - value.start.x,
          value.end.z - value.start.z,
        ),
        length,
        leftDong,
        rightDong,
      } satisfies DongBoundarySegment;
    })
    .filter(
      (segment) =>
        Boolean(segment.leftDong) &&
        Boolean(segment.rightDong) &&
        segment.leftDong !== segment.rightDong,
    );
}

export function boundaryHintElement() {
  const element = document.createElement("div");
  element.style.padding = "8px 14px";
  element.style.borderRadius = "16px";
  element.style.border = "1px solid rgba(162,255,187,0.28)";
  element.style.background = "rgba(5,28,18,0.88)";
  element.style.color = "#d9ffe5";
  element.style.fontSize = "12px";
  element.style.fontWeight = "600";
  element.style.fontFamily = "Pretendard, SUIT Variable, sans-serif";
  element.style.letterSpacing = "0.02em";
  element.style.whiteSpace = "nowrap";
  element.style.pointerEvents = "none";
  element.style.boxShadow = "0 10px 28px rgba(0,0,0,0.28)";
  element.style.position = "absolute";
  element.style.left = "0";
  element.style.top = "0";
  element.style.transform = "translate(14px, -18px)";
  element.style.zIndex = "12";
  element.style.display = "none";
  return element;
}

export function dongShapeFromRing(ring: THREE.Vector3[]) {
  const points = ring.map((point) => new THREE.Vector2(point.x, -point.z));
  if (
    points.length > 1 &&
    points[0].distanceTo(points[points.length - 1]) < 0.001
  ) {
    points.pop();
  }
  if (points.length < 3) {
    return null;
  }
  if (THREE.ShapeUtils.isClockWise(points)) {
    points.reverse();
  }
  return new THREE.Shape(points);
}

export const nearestRoadDelta = new THREE.Vector3();
export const nearestRoadOffset = new THREE.Vector3();
export const nearestRoadClosest = new THREE.Vector3();
export const nearestRoadHeading = new THREE.Vector3();

export function nearestRoadContext(
  point: THREE.Vector3,
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex | null = null,
  maxDistance = Number.POSITIVE_INFINITY,
): NearestRoadContext | null {
  let best: NearestRoadContext | null = null;
  const candidateIndices =
    collectRoadSegmentCandidateIndices(
      point,
      roadSegments,
      roadSegmentSpatialIndex,
      maxDistance,
    ) ??
    roadSegments.map((_, index) => index);

  for (
    let candidateIndex = 0;
    candidateIndex < candidateIndices.length;
    candidateIndex += 1
  ) {
    const segment = roadSegments[candidateIndices[candidateIndex]!]!;
    nearestRoadDelta.copy(segment.end).sub(segment.start);
    const lengthSq = nearestRoadDelta.lengthSq();
    if (lengthSq < 0.0001) {
      continue;
    }

    const t = THREE.MathUtils.clamp(
      nearestRoadOffset.copy(point).sub(segment.start).dot(nearestRoadDelta) /
      lengthSq,
      0,
      1,
    );
    nearestRoadClosest.copy(segment.start).lerp(segment.end, t);
    const distance = distanceXZ(point, nearestRoadClosest);
    if (best && distance >= best.distance) {
      continue;
    }

    best = {
      closest: nearestRoadClosest.clone(),
      heading: nearestRoadHeading.copy(nearestRoadDelta).normalize().clone(),
      width: segment.width,
      roadClass: segment.roadClass,
      name: segment.name,
      distance,
    };
  }

  return best;
}

export function nearbyRoadSegments(
  point: THREE.Vector3,
  roadSegments: ProjectedRoadSegment[],
  maxDistance: number,
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex | null = null,
) {
  const candidateIndices =
    collectRoadSegmentCandidateIndices(
      point,
      roadSegments,
      roadSegmentSpatialIndex,
      maxDistance,
    ) ??
    roadSegments.map((_, index) => index);

  return candidateIndices
    .map((index) => roadSegments[index]!)
    .filter((segment) => {
    nearestRoadDelta.copy(segment.end).sub(segment.start);
    const lengthSq = nearestRoadDelta.lengthSq();
    if (lengthSq < 0.0001) {
      return false;
    }

    const t = THREE.MathUtils.clamp(
      nearestRoadOffset.copy(point).sub(segment.start).dot(nearestRoadDelta) /
      lengthSq,
      0,
      1,
    );
    nearestRoadClosest.copy(segment.start).lerp(segment.end, t);
    return distanceXZ(point, nearestRoadClosest) <= maxDistance;
  });
}

export function nearestGraphNode(
  point: THREE.Vector3,
  graph: RoadGraph,
  maxDistance: number,
): RouteNode | null {
  let best: RouteNode | null = null;
  let bestDistance = maxDistance;

  graph.nodes.forEach((node) => {
    const distance = distanceXZ(point, node.point);
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  });

  return best;
}

export function filterTransitBySpacing(
  landmarks: TransitLandmark[],
  minimumDistance: number,
  maximumCount: number,
) {
  const kept: TransitLandmark[] = [];
  landmarks
    .sort((left, right) => {
      const importanceGap = right.importance - left.importance;
      if (importanceGap !== 0) {
        return importanceGap;
      }

      return (left.name ?? "").localeCompare(right.name ?? "", "ko");
    })
    .forEach((landmark) => {
      if (kept.length >= maximumCount) {
        return;
      }

      if (
        kept.every(
          (entry) =>
            distanceXZ(entry.position, landmark.position) >= minimumDistance,
        )
      ) {
        kept.push(landmark);
      }
    });

  return kept;
}

export function buildTransitLandmarks(
  transit: TransitFeatureCollection,
  center: { lat: number; lon: number },
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex,
) {
  const raw = transit.features
    .map((feature, index) => {
      if (feature.geometry.type !== "Point") {
        return null;
      }

      const originalPoint = projectPoint(feature.geometry.coordinates, center);
      const fallbackHeading = new THREE.Vector3(0, 0, 1);

      if (feature.properties.category === "bus_stop") {
        const nearestRoad = nearestRoadContext(
          originalPoint,
          roadSegments,
          roadSegmentSpatialIndex,
          12,
        );
        if (
          !nearestRoad ||
          nearestRoad.distance > 12 ||
          nearestRoad.roadClass !== "arterial"
        ) {
          return null;
        }

        const right = new THREE.Vector3(
          nearestRoad.heading.z,
          0,
          -nearestRoad.heading.x,
        ).normalize();
        const sideSign =
          right.dot(originalPoint.clone().sub(nearestRoad.closest)) >= 0
            ? 1
            : -1;
        const importance =
          feature.properties.importance +
          roadRank(nearestRoad.roadClass) * 2 +
          (nearestRoad.name ? 1 : 0);

        return {
          id: `transit-${index}`,
          category: "bus_stop" as const,
          name: feature.properties.name,
          position: nearestRoad.closest
            .clone()
            .addScaledVector(
              right,
              sideSign * (nearestRoad.width * 0.58 + 1.35),
            )
            .setY(0.12),
          heading: nearestRoad.heading.clone(),
          sideSign,
          yaw: Math.atan2(nearestRoad.heading.x, nearestRoad.heading.z),
          importance,
          roadClass: nearestRoad.roadClass,
          isMajor: nearestRoad.roadClass === "arterial" || importance >= 9,
        } satisfies TransitLandmark;
      }

      const nearestRoad = nearestRoadContext(
        originalPoint,
        roadSegments,
        roadSegmentSpatialIndex,
        22,
      );
      const nearestHeading = nearestRoad?.heading.clone() ?? fallbackHeading;
      const nearestRight = new THREE.Vector3(
        nearestHeading.z,
        0,
        -nearestHeading.x,
      ).normalize();
      const sideSign =
        nearestRoad && nearestRoad.distance < 22
          ? nearestRight.dot(originalPoint.clone().sub(nearestRoad.closest)) >=
            0
            ? 1
            : -1
          : 1;
      const position =
        nearestRoad && nearestRoad.distance < 22
          ? nearestRoad.closest
            .clone()
            .addScaledVector(
              nearestRight,
              sideSign * (nearestRoad.width * 0.42 + 2.3),
            )
            .setY(0.12)
          : originalPoint.clone().setY(0.12);

      return {
        id: `transit-${index}`,
        category: "subway_station" as const,
        name: feature.properties.name,
        position,
        heading: nearestHeading,
        sideSign,
        yaw: Math.atan2(nearestHeading.x, nearestHeading.z),
        importance:
          feature.properties.importance +
          2 +
          (feature.properties.name ? 4 : 0) +
          (nearestRoad?.name ? 1 : 0),
        roadClass: nearestRoad?.roadClass ?? null,
        isMajor: Boolean(feature.properties.name),
      } satisfies TransitLandmark;
    })
    .filter(Boolean) as TransitLandmark[];

  const subwayStations = filterTransitBySpacing(
    raw.filter((feature) => feature.category === "subway_station"),
    62,
    8,
  );
  const busStops = filterTransitBySpacing(
    raw.filter((feature) => feature.category === "bus_stop"),
    62,
    8,
  );

  return [...subwayStations, ...busStops];
}

export function roadRank(roadClass: RoadProperties["roadClass"]) {
  switch (roadClass) {
    case "arterial":
      return 3;
    case "connector":
      return 2;
    default:
      return 1;
  }
}

export function roadTravelCost(roadClass: RoadProperties["roadClass"]) {
  switch (roadClass) {
    case "arterial":
      return 0.9;
    case "connector":
      return 1;
    default:
      return 1.18;
  }
}

export function edgeTravelCost(
  length: number,
  roadClass: RoadProperties["roadClass"],
) {
  return length * roadTravelCost(roadClass);
}

export function annotateRoadGraphNodes(
  nodes: Map<string, RouteNode>,
  adjacency: Map<string, GraphEdge[]>,
  edgeById: Map<string, GraphEdge>,
) {
  const neighborSets = new Map<string, Set<string>>();

  edgeById.forEach((edge) => {
    const fromNeighbors = neighborSets.get(edge.from) ?? new Set<string>();
    fromNeighbors.add(edge.to);
    neighborSets.set(edge.from, fromNeighbors);

    const toNeighbors = neighborSets.get(edge.to) ?? new Set<string>();
    toNeighbors.add(edge.from);
    neighborSets.set(edge.to, toNeighbors);
  });

  nodes.forEach((node, key) => {
    const neighborCount = neighborSets.get(key)?.size ?? 0;
    const outDegree = adjacency.get(key)?.length ?? 0;
    node.neighborCount = neighborCount;
    node.outDegree = outDegree;
    node.isIntersection = neighborCount >= 3;
    node.isTerminal = neighborCount <= 1;
  });
}

export type QueueEntry = {
  key: string;
  cost: number;
};

export type PathSearchResult = {
  nodeKeys: string[];
  edgeIds: string[];
};

export function queuePush(queue: QueueEntry[], entry: QueueEntry) {
  queue.push(entry);
  let index = queue.length - 1;

  while (index > 0) {
    const parentIndex = Math.floor((index - 1) / 2);
    if (queue[parentIndex].cost <= queue[index].cost) {
      break;
    }

    [queue[parentIndex], queue[index]] = [queue[index], queue[parentIndex]];
    index = parentIndex;
  }
}

export function queuePop(queue: QueueEntry[]) {
  if (!queue.length) {
    return null;
  }

  const root = queue[0];
  const tail = queue.pop();
  if (!queue.length || !tail) {
    return root;
  }

  queue[0] = tail;
  let index = 0;

  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    let smallest = index;

    if (left < queue.length && queue[left].cost < queue[smallest].cost) {
      smallest = left;
    }
    if (right < queue.length && queue[right].cost < queue[smallest].cost) {
      smallest = right;
    }
    if (smallest === index) {
      break;
    }

    [queue[index], queue[smallest]] = [queue[smallest], queue[index]];
    index = smallest;
  }

  return root;
}

export function mostCommonLabel(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (!value) {
      return;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  let bestLabel: string | null = null;
  let bestCount = 0;
  counts.forEach((count, label) => {
    if (count > bestCount) {
      bestCount = count;
      bestLabel = label;
    }
  });
  return bestLabel;
}

export function labelElement(
  text: string,
  kind: "road" | "building" | "service" | "district" | "transit",
) {
  const element = document.createElement("div");
  element.textContent = text;
  element.dataset.labelKind = kind;
  element.style.padding =
    kind === "road"
      ? "2px 8px"
      : kind === "service"
        ? "3px 10px"
        : kind === "transit"
          ? "4px 11px"
          : kind === "district"
            ? "4px 12px"
            : "3px 9px";
  element.style.borderRadius = "999px";
  element.style.border = "1px solid rgba(255,255,255,0.12)";
  element.style.background =
    kind === "road"
      ? "rgba(8,18,34,0.72)"
      : kind === "service"
        ? "rgba(51,36,7,0.86)"
        : kind === "transit"
          ? "rgba(5,32,44,0.92)"
          : kind === "district"
            ? "rgba(5,48,67,0.96)"
            : "rgba(12,20,36,0.85)";
  element.style.color =
    kind === "road"
      ? "#cfe7ff"
      : kind === "service"
        ? "#ffe7a8"
        : kind === "transit"
          ? "#a8eeff"
          : kind === "district"
            ? "#d5f6ff"
            : "#f7fbff";
  element.style.fontSize =
    kind === "road" ? "11px" : kind === "district" ? "13px" : "12px";
  element.style.fontWeight = kind === "district" ? "700" : "500";
  element.style.fontFamily = "Pretendard, SUIT Variable, sans-serif";
  element.style.letterSpacing = "0.02em";
  element.style.whiteSpace = "nowrap";
  element.style.pointerEvents = "none";
  element.style.transition =
    kind === "district"
      ? "background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 140ms ease"
      : "none";
  element.style.boxShadow = "0 8px 18px rgba(0,0,0,0.25)";
  return element;
}

export function hotspotCallElement() {
  const element = document.createElement("div");
  element.textContent = "승차";
  element.dataset.labelKind = "hotspot";
  element.style.padding = "2px 7px";
  element.style.borderRadius = "999px";
  element.style.border = "1px solid rgba(180,161,128,0.28)";
  element.style.background = "rgba(25,24,22,0.78)";
  element.style.color = "#ddd2bb";
  element.style.fontSize = "10px";
  element.style.fontWeight = "600";
  element.style.fontFamily = "Pretendard, SUIT Variable, sans-serif";
  element.style.letterSpacing = "0";
  element.style.whiteSpace = "nowrap";
  element.style.pointerEvents = "none";
  element.style.boxShadow = "0 4px 10px rgba(0,0,0,0.18)";
  return element;
}

export function buildBuildingMasses(
  buildings: BuildingFeatureCollection,
  center: { lat: number; lon: number },
) {
  const BUILDING_FOOTPRINT_INSET = 1.1;

  return buildings.features
    .map((feature, index) => {
      const footprintAreaM2 = feature.properties.area ?? 0;
      const heightMeters = feature.properties.height ?? 15;
      const label = feature.properties.label ?? "";
      const isLargeLowRiseComplex =
        footprintAreaM2 >= LARGE_LOW_RISE_BUILDING_AREA_M2 &&
        heightMeters <= LARGE_LOW_RISE_BUILDING_MAX_HEIGHT_M;
      const isUndergroundRetailSlab =
        /지하|underground/i.test(label) &&
        footprintAreaM2 >= 4_000 &&
        heightMeters <= LARGE_LOW_RISE_BUILDING_MAX_HEIGHT_M;

      // Very large low-rise footprints such as underground malls or horizontal
      // retail complexes collapse into one oversized slab when rendered as a
      // single box. Skipping those keeps roads/signals readable.
      if (isLargeLowRiseComplex || isUndergroundRetailSlab) {
        return null;
      }

      const ring = outerRingOfBuilding(feature, center);
      if (ring.length < 4) {
        return null;
      }

      let longestEdgeLength = 0;
      let rotationY = 0;
      for (let index = 0; index < ring.length - 1; index += 1) {
        const current = ring[index];
        const next = ring[index + 1];
        const edgeLength = distanceXZ(current, next);
        if (edgeLength <= longestEdgeLength) {
          continue;
        }
        longestEdgeLength = edgeLength;
        rotationY = Math.atan2(next.x - current.x, next.z - current.z);
      }

      const anchor = ring
        .reduce((sum, point) => sum.add(point), new THREE.Vector3())
        .multiplyScalar(1 / ring.length);
      const cos = Math.cos(rotationY);
      const sin = Math.sin(rotationY);
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minZ = Number.POSITIVE_INFINITY;
      let maxZ = Number.NEGATIVE_INFINITY;

      ring.forEach((point) => {
        const dx = point.x - anchor.x;
        const dz = point.z - anchor.z;
        const localX = dx * cos - dz * sin;
        const localZ = dx * sin + dz * cos;
        minX = Math.min(minX, localX);
        maxX = Math.max(maxX, localX);
        minZ = Math.min(minZ, localZ);
        maxZ = Math.max(maxZ, localZ);
      });

      const rawWidth = maxX - minX;
      const rawDepth = maxZ - minZ;
      const footprintArea = polygonAreaXZ(ring);
      const bboxArea = rawWidth * rawDepth;
      const footprintFillRatio =
        bboxArea > 0 ? THREE.MathUtils.clamp(footprintArea / bboxArea, 0, 1) : 1;
      // Concave or courtyard footprints look overly inflated as one box, so
      // compact them a bit while keeping the renderer lightweight.
      const compactScale =
        bboxArea >= 140 && footprintFillRatio < 0.92
          ? Math.sqrt(
            THREE.MathUtils.lerp(
              THREE.MathUtils.clamp(footprintFillRatio, 0.24, 1),
              1,
              0.42,
            ),
          )
          : 1;
      const width = Math.max(
        0.8,
        Math.max(0.8, rawWidth - BUILDING_FOOTPRINT_INSET) * compactScale,
      );
      const depth = Math.max(
        0.8,
        Math.max(0.8, rawDepth - BUILDING_FOOTPRINT_INSET) * compactScale,
      );
      if (width < 0.8 || depth < 0.8) {
        return null;
      }

      const localCenterX = (minX + maxX) / 2;
      const localCenterZ = (minZ + maxZ) / 2;
      const footprintCenter = new THREE.Vector3(
        anchor.x + localCenterX * cos + localCenterZ * sin,
        0,
        anchor.z - localCenterX * sin + localCenterZ * cos,
      );

      return {
        id: `building-${index}`,
        label: feature.properties.label,
        height: Math.max(2, heightMeters * BUILDING_HEIGHT_SCALE),
        position: footprintCenter,
        width,
        depth,
        rotationY,
        color: colorForBuilding(heightMeters),
      } satisfies BuildingMass;
    })
    .filter(Boolean) as BuildingMass[];
}

export function createSubwayStationStructure(
  seed: number,
  sideSign: 1 | -1,
  isMajor: boolean,
) {
  const accent = SUBWAY_STRUCTURE_ACCENTS[seed % SUBWAY_STRUCTURE_ACCENTS.length]!;
  const group = new THREE.Group();

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(isMajor ? 1.18 : 0.98, isMajor ? 1.78 : 1.46, 28),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: isMajor ? 0.2 : 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.04;
  group.add(halo);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 2.6 : 2.1, 0.18, isMajor ? 2.1 : 1.72),
    new THREE.MeshStandardMaterial({ color: 0xdbe2e6, roughness: 0.92 }),
  );
  base.position.y = 0.09;
  base.receiveShadow = true;
  group.add(base);

  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 2.15 : 1.8, 0.16, isMajor ? 1.22 : 1),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: isMajor ? 0.14 : 0.1,
      roughness: 0.42,
    }),
  );
  canopy.position.set(0.12 * sideSign, 1.58, -0.14);
  canopy.castShadow = true;
  group.add(canopy);

  const glassRoof = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 1.92 : 1.62, 0.08, isMajor ? 0.82 : 0.72),
    new THREE.MeshStandardMaterial({
      color: 0xe4ebe8,
      emissive: 0x1c312f,
      emissiveIntensity: 0.06,
      transparent: true,
      opacity: 0.74,
      roughness: 0.24,
      metalness: 0.08,
    }),
  );
  glassRoof.position.set(0.18 * sideSign, 1.4, -0.12);
  glassRoof.castShadow = true;
  group.add(glassRoof);

  const sidePanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.08, isMajor ? 0.94 : 0.78),
    new THREE.MeshStandardMaterial({
      color: 0xd4e1de,
      transparent: true,
      opacity: 0.62,
      roughness: 0.2,
      metalness: 0.08,
    }),
  );
  sidePanel.position.set(0.72 * sideSign, 0.86, -0.18);
  group.add(sidePanel);

  const sideRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.82, isMajor ? 1.12 : 0.92),
    new THREE.MeshStandardMaterial({ color: 0x768690, roughness: 0.52 }),
  );
  sideRail.position.set(-0.52 * sideSign, 0.64, 0.38);
  sideRail.castShadow = true;
  group.add(sideRail);

  const gateWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 1.24, isMajor ? 0.92 : 0.74),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8ea,
      roughness: 0.58,
      metalness: 0.04,
    }),
  );
  gateWall.position.set(0.94 * sideSign, 0.82, -0.22);
  gateWall.castShadow = true;
  group.add(gateWall);

  const totem = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, isMajor ? 2.48 : 2.18, 0.26),
    new THREE.MeshStandardMaterial({ color: 0xe5ebed, roughness: 0.58 }),
  );
  totem.position.set(-0.92 * sideSign, isMajor ? 1.24 : 1.08, -0.68);
  totem.castShadow = true;
  group.add(totem);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 0.96 : 0.78, 0.48, 0.14),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: isMajor ? 0.18 : 0.14,
      roughness: 0.44,
    }),
  );
  sign.position.set(-0.92 * sideSign, isMajor ? 2.0 : 1.82, -0.68);
  group.add(sign);

  const stationMarker = new THREE.Mesh(
    new THREE.BoxGeometry(isMajor ? 0.4 : 0.34, isMajor ? 0.4 : 0.34, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0xf0f5f2,
      emissive: 0xe6f1ec,
      emissiveIntensity: isMajor ? 0.22 : 0.16,
      roughness: 0.3,
      metalness: 0.08,
    }),
  );
  stationMarker.position.set(-0.92 * sideSign, isMajor ? 2.02 : 1.84, -0.6);
  group.add(stationMarker);

  Array.from({ length: isMajor ? 5 : 4 }, (_, index) => index).forEach(
    (stepIndex) => {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.16, isMajor ? 1.14 : 0.98),
        new THREE.MeshStandardMaterial({ color: 0xb4c0c4, roughness: 0.86 }),
      );
      step.position.set(
        (0.78 - stepIndex * 0.18) * -sideSign,
        0.08 + stepIndex * 0.13,
        0.42,
      );
      step.castShadow = true;
      group.add(step);
    },
  );

  return group;
}

export function buildFallbackSignals(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
) {
  const nodeMap = new Map<
    string,
    {
      point: THREE.Vector3;
      roadIds: Set<string>;
      namedRoads: Set<string>;
      rank: number;
      approaches: THREE.Vector3[];
    }
  >();

  roads.features.forEach((feature, featureIndex) => {
    lineStringsOfRoad(feature, center).forEach((line) => {
      line.forEach((node, nodeIndex) => {
        const entry = nodeMap.get(node.key) ?? {
          point: node.point,
          roadIds: new Set<string>(),
          namedRoads: new Set<string>(),
          rank: 0,
          approaches: [],
        };
        entry.roadIds.add(String(feature.id ?? `road-${featureIndex}`));
        if (feature.properties.name) {
          entry.namedRoads.add(feature.properties.name);
        }
        entry.rank = Math.max(
          entry.rank,
          roadRank(feature.properties.roadClass),
        );
        if (nodeIndex > 0) {
          const incoming = line[nodeIndex - 1].point.clone().sub(node.point);
          if (incoming.lengthSq() > 0.5) {
            entry.approaches.push(incoming.normalize());
          }
        }
        if (nodeIndex < line.length - 1) {
          const outgoing = line[nodeIndex + 1].point.clone().sub(node.point);
          if (outgoing.lengthSq() > 0.5) {
            entry.approaches.push(outgoing.normalize());
          }
        }
        nodeMap.set(node.key, entry);
      });
    });
  });

  const candidates = [...nodeMap.entries()]
    .map(([key, entry]) => {
      const approaches = Array.from(
        new Set(
          entry.approaches
            .filter((approach) => approach.lengthSq() > 0.25)
            .map((approach) => signalDirectionForVector(approach)),
        ),
      );
      const axisCount = new Set(
        approaches.map((approach) => signalAxisForDirection(approach)),
      ).size;
      const score =
        entry.rank * 14 +
        entry.roadIds.size * 5 +
        approaches.length * 6 +
        entry.namedRoads.size * 3;

      return {
        key,
        point: entry.point.clone(),
        rank: entry.rank,
        roadCount: entry.roadIds.size,
        axisCount,
        approachCount: approaches.length,
        approaches,
        score,
      };
    })
    .filter(
      (candidate) =>
        candidate.roadCount >= 2 &&
        candidate.axisCount >= 2 &&
        candidate.approachCount >= 3 &&
        candidate.rank >= 2,
    )
    .sort((left, right) => {
      const scoreGap = right.score - left.score;
      if (scoreGap !== 0) {
        return scoreGap;
      }
      return right.roadCount - left.roadCount;
    });

  const kept = candidates.filter((candidate, index, list) =>
    list
      .slice(0, index)
      .every((existing) => distanceXZ(existing.point, candidate.point) >= 24),
  );

  return assignCoordinatedSignalOffsets(
    kept
      .slice(0, 18)
      .map((candidate, index) =>
        createSignalData(
          `signal-${index}`,
          candidate.key,
          candidate.point.clone(),
          candidate.approaches,
          candidate.approaches.length >= 4,
          candidate.point.clone(),
        ),
      ),
  );
}

export function buildSignalsFromOsm(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
  graph: RoadGraph,
  trafficSignals: TrafficSignalFeatureCollection,
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex,
) {
  if (!roadSegments.length || !trafficSignals.features.length) {
    return [] as SignalData[];
  }

  const clustered: Array<{
    points: THREE.Vector3[];
    names: Set<string>;
    types: Set<string>;
    turnHints: Set<string>;
    buttonOperatedCount: number;
  }> = [];

  trafficSignals.features.forEach((feature) => {
    if (feature.geometry.type !== "Point") {
      return;
    }

    const point = projectPoint(feature.geometry.coordinates, center);
    const nearestRoad = nearestRoadContext(
      point,
      roadSegments,
      roadSegmentSpatialIndex,
      SIGNAL_ROAD_SNAP_DISTANCE,
    );
    if (!nearestRoad || nearestRoad.distance > SIGNAL_ROAD_SNAP_DISTANCE) {
      return;
    }

    let bestCluster: (typeof clustered)[number] | null = null;
    let bestDistance = SIGNAL_CLUSTER_DISTANCE;
    clustered.forEach((cluster) => {
      const centroid = averagePoint(cluster.points);
      const distance = distanceXZ(point, centroid);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCluster = cluster;
      }
    });

    const target: (typeof clustered)[number] = bestCluster ?? {
      points: [] as THREE.Vector3[],
      names: new Set<string>(),
      types: new Set<string>(),
      turnHints: new Set<string>(),
      buttonOperatedCount: 0,
    };
    if (!bestCluster) {
      clustered.push(target);
    }

    target.points.push(point);
    if (feature.properties.name) {
      target.names.add(feature.properties.name);
    }
    if (feature.properties.signalType) {
      target.types.add(feature.properties.signalType);
    }
    if (feature.properties.turns) {
      target.turnHints.add(feature.properties.turns);
    }
    if (feature.properties.buttonOperated) {
      target.buttonOperatedCount += 1;
    }
  });

  const byAnchorKey = new Map<
    string,
    Omit<SignalData, "offset"> & { score: number }
  >();

  clustered.forEach((cluster) => {
    const clusterPoint = averagePoint(cluster.points);
    const anchorNode = nearestGraphNode(
      clusterPoint,
      graph,
      SIGNAL_NODE_SNAP_DISTANCE,
    );
    if (!anchorNode || !anchorNode.isIntersection) {
      return;
    }

    const nearbySegmentsForSignal = nearbyRoadSegments(
      anchorNode.point,
      roadSegments,
      SIGNAL_ROAD_SNAP_DISTANCE,
      roadSegmentSpatialIndex,
    );
    if (!nearbySegmentsForSignal.length) {
      return;
    }

    const approaches = Array.from(
      new Set(
        nearbySegmentsForSignal.flatMap((segment) => {
          const directions: SignalDirection[] = [];
          const startVector = segment.start.clone().sub(anchorNode.point);
          const endVector = segment.end.clone().sub(anchorNode.point);
          if (startVector.lengthSq() > 9) {
            directions.push(signalDirectionForVector(startVector));
          }
          if (endVector.lengthSq() > 9) {
            directions.push(signalDirectionForVector(endVector));
          }
          return directions;
        }),
      ),
    );
    const axisCount = new Set(
      approaches.map((approach) => signalAxisForDirection(approach)),
    ).size;
    if (approaches.length < 3 || axisCount < 2) {
      return;
    }

    const rank = nearbySegmentsForSignal.reduce(
      (best, segment) => Math.max(best, roadRank(segment.roadClass)),
      1,
    );
    const score =
      cluster.points.length * 12 +
      approaches.length * 8 +
      rank * 10 +
      nearbySegmentsForSignal.length;
    const hasProtectedLeft =
      approaches.length >= 4 &&
      (rank >= 3 || cluster.turnHints.size > 0 || cluster.points.length >= 2);
    const candidate = {
      ...createSignalData(
        `signal-${byAnchorKey.size}`,
        anchorNode.key,
        anchorNode.point.clone(),
        approaches,
        hasProtectedLeft,
      ),
      score,
    };
    const existing = byAnchorKey.get(anchorNode.key);
    if (!existing || candidate.score > existing.score) {
      byAnchorKey.set(anchorNode.key, candidate);
    }
  });

  return assignCoordinatedSignalOffsets(
    [...byAnchorKey.values()]
      .sort((left, right) => right.score - left.score)
      .map((signal, index) =>
        createSignalData(
          `signal-${index}`,
          signal.key,
          signal.point,
          signal.approaches,
          signal.hasProtectedLeft,
          signal.visualPoint,
        ),
      ),
  );
}

export function buildSignals(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
  graph: RoadGraph,
  trafficSignals: TrafficSignalFeatureCollection,
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex,
) {
  const actualSignals = buildSignalsFromOsm(
    roads,
    center,
    graph,
    trafficSignals,
    roadSegments,
    roadSegmentSpatialIndex,
  );
  if (actualSignals.length) {
    return actualSignals;
  }
  return buildFallbackSignals(roads, center);
}

export function indexTurnRestrictionsByViaKey(
  restrictions: TurnRestriction[],
  nodes: Map<string, RouteNode>,
  edgeById: Map<string, GraphEdge>,
) {
  const wayIds = new Set(
    [...edgeById.values()]
      .map((edge) => edge.wayId)
      .filter((wayId): wayId is string => Boolean(wayId)),
  );
  const byViaKey = new Map<string, TurnRestriction[]>();

  restrictions.forEach((restriction) => {
    if (
      !nodes.has(restriction.viaKey) ||
      !wayIds.has(restriction.fromWayId) ||
      !wayIds.has(restriction.toWayId)
    ) {
      return;
    }

    const current = byViaKey.get(restriction.viaKey) ?? [];
    current.push(restriction);
    byViaKey.set(restriction.viaKey, current);
  });

  return byViaKey;
}

export function buildRoadGraph(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
): RoadGraph {
  const nodes = new Map<string, RouteNode>();
  const adjacency = new Map<string, GraphEdge[]>();
  const edgeById = new Map<string, GraphEdge>();
  const pushEdge = (edge: GraphEdge) => {
    const edges = adjacency.get(edge.from) ?? [];
    edges.push(edge);
    adjacency.set(edge.from, edges);
    edgeById.set(edge.id, edge);
  };

  roads.features.forEach((feature, featureIndex) => {
    lineStringsOfRoad(feature, center).forEach((line, lineIndex) => {
      line.forEach((node) => {
        if (!nodes.has(node.key)) {
          nodes.set(node.key, { key: node.key, point: node.point.clone() });
        }
      });

      for (let index = 0; index < line.length - 1; index += 1) {
        const from = line[index];
        const to = line[index + 1];
        const length = distanceXZ(from.point, to.point);
        if (length < 1) {
          continue;
        }

        const roadWidth = feature.properties.width * ROAD_WIDTH_SCALE;
        const baseId = `${feature.id ?? featureIndex}-${lineIndex}-${index}`;
        const baseEdge = {
          roadClass: feature.properties.roadClass,
          roadWidth,
          length,
          travelCost: edgeTravelCost(length, feature.properties.roadClass),
          name: feature.properties.name,
          wayId: feature.properties.sourceWayId,
        } satisfies Omit<GraphEdge, "id" | "from" | "to">;

        const forward: GraphEdge = {
          id: `${baseId}-f`,
          from: from.key,
          to: to.key,
          ...baseEdge,
        };
        const backward: GraphEdge = {
          id: `${baseId}-r`,
          from: to.key,
          to: from.key,
          ...baseEdge,
        };

        if (feature.properties.oneway === "forward") {
          pushEdge(forward);
        } else if (feature.properties.oneway === "backward") {
          pushEdge(backward);
        } else {
          pushEdge(forward);
          pushEdge(backward);
        }
      }
    });
  });

  annotateRoadGraphNodes(nodes, adjacency, edgeById);

  return {
    nodes,
    adjacency,
    edgeById,
    turnRestrictionsByViaKey: indexTurnRestrictionsByViaKey(
      roads.routing?.turnRestrictions ?? [],
      nodes,
      edgeById,
    ),
  };
}

export function deserializeRoadGraph(data: SerializedRoadNetwork): RoadGraph {
  const nodes = new Map<string, RouteNode>(
    data.nodes.map((node) => [
      node.key,
      {
        key: node.key,
        point: new THREE.Vector3(node.x, 0, node.z),
        outDegree: node.outDegree,
        neighborCount: node.neighborCount,
        isIntersection: node.isIntersection,
        isTerminal: node.isTerminal,
      },
    ]),
  );
  const adjacency = new Map<string, GraphEdge[]>();
  const edgeById = new Map<string, GraphEdge>();
  const pushEdge = (edge: GraphEdge) => {
    const edges = adjacency.get(edge.from) ?? [];
    edges.push(edge);
    adjacency.set(edge.from, edges);
    edgeById.set(edge.id, edge);
  };

  data.segments.forEach((segment) => {
    if (data.version >= 2) {
      pushEdge({
        id: segment.id,
        from: segment.from,
        to: segment.to,
        roadClass: segment.roadClass,
        roadWidth: segment.roadWidth,
        length: segment.length,
        travelCost:
          segment.travelCost ??
          edgeTravelCost(segment.length, segment.roadClass),
        name: segment.name,
        wayId: segment.wayId ?? null,
      });
      return;
    }

    const base = {
      roadClass: segment.roadClass,
      roadWidth: segment.roadWidth,
      length: segment.length,
      travelCost:
        segment.travelCost ??
        edgeTravelCost(segment.length, segment.roadClass),
      name: segment.name,
      wayId: segment.wayId ?? null,
    } satisfies Omit<GraphEdge, "id" | "from" | "to">;

    pushEdge({
      id: `${segment.id}-f`,
      from: segment.from,
      to: segment.to,
      ...base,
    });
    pushEdge({
      id: `${segment.id}-r`,
      from: segment.to,
      to: segment.from,
      ...base,
    });
  });

  annotateRoadGraphNodes(nodes, adjacency, edgeById);

  return {
    nodes,
    adjacency,
    edgeById,
    turnRestrictionsByViaKey: indexTurnRestrictionsByViaKey(
      data.turnRestrictions ?? [],
      nodes,
      edgeById,
    ),
  };
}

export function buildRoadNetworkOverlay(graph: RoadGraph) {
  const group = new THREE.Group();
  group.name = "road-network-overlay";

  const edgePositions = {
    arterial: [] as number[],
    connector: [] as number[],
    local: [] as number[],
  };
  const seenEdges = new Set<string>();

  graph.edgeById.forEach((edge) => {
    const fromNode = graph.nodes.get(edge.from);
    const toNode = graph.nodes.get(edge.to);
    if (!fromNode || !toNode) {
      return;
    }

    const canonicalKey =
      edge.from < edge.to
        ? `${edge.from}|${edge.to}`
        : `${edge.to}|${edge.from}`;
    if (seenEdges.has(canonicalKey)) {
      return;
    }
    seenEdges.add(canonicalKey);

    const y = ROAD_LAYER_Y[edge.roadClass] + ROAD_NETWORK_EDGE_Y_OFFSET;
    edgePositions[edge.roadClass].push(
      fromNode.point.x,
      y,
      fromNode.point.z,
      toNode.point.x,
      y,
      toNode.point.z,
    );
  });

  const edgeMaterials = {
    arterial: new THREE.LineBasicMaterial({
      color: 0x7cf9ff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
    connector: new THREE.LineBasicMaterial({
      color: 0x4ed6ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
    local: new THREE.LineBasicMaterial({
      color: 0x3e87af,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  };

  (["arterial", "connector", "local"] as const).forEach((roadClass) => {
    const positions = edgePositions[roadClass];
    if (!positions.length) {
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const lines = new THREE.LineSegments(geometry, edgeMaterials[roadClass]);
    lines.renderOrder =
      roadClass === "arterial" ? 92 : roadClass === "connector" ? 91 : 90;
    group.add(lines);
  });

  const nodePositions = {
    intersection: [] as number[],
    endpoint: [] as number[],
    passthrough: [] as number[],
  };

  graph.adjacency.forEach((edges, key) => {
    const node = graph.nodes.get(key);
    if (!node) {
      return;
    }

    const degree = new Set(edges.map((edge) => edge.to)).size;
    const bucket =
      degree >= 3 ? "intersection" : degree === 1 ? "endpoint" : "passthrough";
    nodePositions[bucket].push(node.point.x, ROAD_NETWORK_NODE_Y, node.point.z);
  });

  const addNodePoints = (
    positions: number[],
    color: number,
    size: number,
    opacity: number,
    renderOrder: number,
  ) => {
    if (!positions.length) {
      return;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color,
        size,
        sizeAttenuation: true,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    points.renderOrder = renderOrder;
    group.add(points);
  };

  addNodePoints(nodePositions.passthrough, 0xa9eaff, 0.6, 0.18, 93);
  addNodePoints(nodePositions.endpoint, 0xffb388, 1.35, 0.7, 94);
  addNodePoints(nodePositions.intersection, 0xfff1a5, 1.9, 0.92, 95);

  return group;
}

export function disposeObject3DResources(object: THREE.Object3D) {
  object.traverse((child) => {
    const resourceHolder = child as THREE.Object3D & {
      geometry?: { dispose?: () => void };
      material?: THREE.Material | THREE.Material[];
    };
    if (!resourceHolder.userData.skipGeometryDispose) {
      resourceHolder.geometry?.dispose?.();
    }
    if (resourceHolder.userData.skipMaterialDispose) {
      return;
    }
    if (Array.isArray(resourceHolder.material)) {
      resourceHolder.material.forEach((material) => {
        if (material instanceof THREE.Material) {
          disposeMaterialResources(material);
        }
      });
    } else {
      if (resourceHolder.material instanceof THREE.Material) {
        disposeMaterialResources(resourceHolder.material);
      }
    }
  });
}

export function turnStateKey(nodeKey: string, incomingEdgeId: string | null) {
  return `${nodeKey}|${incomingEdgeId ?? ""}`;
}

export function parseTurnStateKey(key: string) {
  const separatorIndex = key.indexOf("|");
  if (separatorIndex < 0) {
    return { nodeKey: key, incomingEdgeId: null };
  }

  const incomingEdgeId = key.slice(separatorIndex + 1);
  return {
    nodeKey: key.slice(0, separatorIndex),
    incomingEdgeId: incomingEdgeId || null,
  };
}

export function isUTurn(incomingEdge: GraphEdge, outgoingEdge: GraphEdge) {
  return outgoingEdge.to === incomingEdge.from;
}

export function isTurnRestricted(
  graph: RoadGraph,
  viaKey: string,
  incomingEdge: GraphEdge,
  outgoingEdge: GraphEdge,
) {
  if (!incomingEdge.wayId || !outgoingEdge.wayId) {
    return false;
  }

  const restrictions = graph.turnRestrictionsByViaKey.get(viaKey) ?? [];
  return restrictions.some((restriction) => {
    if (restriction.fromWayId !== incomingEdge.wayId) {
      return false;
    }

    const isUTurnRule = restriction.kind.endsWith("u_turn");
    const matchesAllowedWay = outgoingEdge.wayId === restriction.toWayId;

    if (restriction.mode === "no") {
      if (!matchesAllowedWay) {
        return false;
      }
      return isUTurnRule ? isUTurn(incomingEdge, outgoingEdge) : true;
    }

    if (isUTurnRule) {
      return !(matchesAllowedWay && isUTurn(incomingEdge, outgoingEdge));
    }

    return !matchesAllowedWay;
  });
}

export function shortestPath(
  graph: RoadGraph,
  startKey: string,
  endKey: string,
): PathSearchResult | null {
  if (startKey === endKey) {
    return { nodeKeys: [startKey], edgeIds: [] };
  }

  const startStateKey = turnStateKey(startKey, null);
  const frontier: QueueEntry[] = [];
  const visited = new Set<string>();
  const distances = new Map<string, number>([[startStateKey, 0]]);
  const previous = new Map<string, { stateKey: string; edgeId: string }>();
  let bestEndStateKey: string | null = null;
  queuePush(frontier, { key: startStateKey, cost: 0 });

  while (frontier.length) {
    const current = queuePop(frontier);
    if (!current || visited.has(current.key)) {
      continue;
    }

    if (
      current.cost > (distances.get(current.key) ?? Number.POSITIVE_INFINITY)
    ) {
      continue;
    }

    const { nodeKey, incomingEdgeId } = parseTurnStateKey(current.key);
    if (nodeKey === endKey) {
      bestEndStateKey = current.key;
      break;
    }

    visited.add(current.key);
    const incomingEdge = incomingEdgeId
      ? graph.edgeById.get(incomingEdgeId) ?? null
      : null;

    (graph.adjacency.get(nodeKey) ?? []).forEach((edge) => {
      if (incomingEdge && isTurnRestricted(graph, nodeKey, incomingEdge, edge)) {
        return;
      }

      const nextStateKey = turnStateKey(edge.to, edge.id);
      const nextCost = current.cost + edge.travelCost;
      const knownCost =
        distances.get(nextStateKey) ?? Number.POSITIVE_INFINITY;
      if (nextCost < knownCost) {
        distances.set(nextStateKey, nextCost);
        previous.set(nextStateKey, {
          stateKey: current.key,
          edgeId: edge.id,
        });
        queuePush(frontier, { key: nextStateKey, cost: nextCost });
      }
    });
  }

  if (!bestEndStateKey) {
    return null;
  }

  const nodeKeys = [endKey];
  const edgeIds: string[] = [];
  let cursor = bestEndStateKey;
  while (cursor !== startStateKey) {
    const step = previous.get(cursor);
    if (!step) {
      return null;
    }

    edgeIds.push(step.edgeId);
    nodeKeys.push(parseTurnStateKey(step.stateKey).nodeKey);
    cursor = step.stateKey;
  }

  return {
    nodeKeys: nodeKeys.reverse(),
    edgeIds: edgeIds.reverse(),
  };
}

export function buildPathRoute(
  graph: RoadGraph,
  signalByKey: Map<string, SignalData>,
  path: PathSearchResult,
  id: string,
  label: string | null,
) {
  const { nodeKeys, edgeIds } = path;
  if (nodeKeys.length < 2) {
    return null;
  }

  const nodes = nodeKeys
    .map((key) => graph.nodes.get(key))
    .filter(Boolean)
    .map((node) => ({
      key: node?.key ?? "",
      point: node?.point.clone() ?? new THREE.Vector3(),
    }));

  if (nodes.length < 2) {
    return null;
  }

  const edgeProps = edgeIds
    .map((edgeId) => graph.edgeById.get(edgeId))
    .filter(Boolean) as GraphEdge[];

  const points = nodes.map((node) => node.point);
  const cumulative = buildCumulative(points);
  const segmentLengths = buildSegmentLengthsFromCumulative(cumulative);
  const segmentHeadings = buildSegmentHeadings(points);
  const totalLength = cumulative[cumulative.length - 1] ?? 0;
  if (totalLength < 2) {
    return null;
  }

  const roadClass = edgeProps.reduce<RoadProperties["roadClass"]>(
    (best, edge) => {
      return roadRank(edge.roadClass) > roadRank(best) ? edge.roadClass : best;
    },
    edgeProps[0]?.roadClass ?? "local",
  );
  const roadWidth =
    edgeProps.reduce((sum, edge) => sum + edge.roadWidth, 0) /
    Math.max(edgeProps.length, 1);

  const stops: StopMarker[] = [];
  for (let index = 1; index < nodes.length - 1; index += 1) {
    const signal = signalByKey.get(nodes[index].key);
    if (!signal) {
      continue;
    }

    const previousStop = stops[stops.length - 1];
    if (previousStop?.signalId === signal.id) {
      continue;
    }

    stops.push({
      signalId: signal.id,
      signal,
      distance: Math.max(0, cumulative[index] - 2.8),
      axis: dominantAxis(nodes[index - 1].point, nodes[index].point),
      turn: classifyTurn(
        nodes[index - 1].point,
        nodes[index].point,
        nodes[index + 1].point,
      ),
    });
  }

  return {
    id,
    name: label ?? mostCommonLabel(edgeProps.map((edge) => edge.name)) ?? null,
    roadClass,
    roadWidth,
    laneOffset: THREE.MathUtils.clamp(roadWidth * 0.22, 0.45, 0.95),
    nodes,
    cumulative,
    segmentLengths,
    segmentHeadings,
    totalLength,
    stops,
    startKey: nodeKeys[0],
    endKey: nodeKeys[nodeKeys.length - 1],
    isLoop: false,
  } satisfies RouteTemplate;
}

export function buildShortestRoute(
  graph: RoadGraph,
  signalByKey: Map<string, SignalData>,
  startKey: string,
  endKey: string,
  id: string,
  label: string | null,
) {
  const path = shortestPath(graph, startKey, endKey);
  if (!path || path.nodeKeys.length < 2) {
    return null;
  }
  return buildPathRoute(graph, signalByKey, path, id, label);
}

export function compareRoadRouteCandidates(
  left: {
    name: string | null;
    roadClass: RoadProperties["roadClass"];
    length?: number;
    totalLength?: number;
  },
  right: {
    name: string | null;
    roadClass: RoadProperties["roadClass"];
    length?: number;
    totalLength?: number;
  },
) {
  const leftLength = left.length ?? left.totalLength ?? 0;
  const rightLength = right.length ?? right.totalLength ?? 0;
  const nameGap = Number(Boolean(right.name)) - Number(Boolean(left.name));
  if (nameGap !== 0) {
    return nameGap;
  }
  const rankGap = roadRank(right.roadClass) - roadRank(left.roadClass);
  if (rankGap !== 0) {
    return rankGap;
  }
  return rightLength - leftLength;
}

export function buildRoadRouteFromNodes(
  id: string,
  name: string | null,
  roadClass: RoadProperties["roadClass"],
  roadWidth: number,
  nodes: RouteNode[],
  signalByKey: Map<string, SignalData>,
  isLoop: boolean,
) {
  if (nodes.length < 2) {
    return null;
  }

  const points = nodes.map((node) => node.point);
  const cumulative = buildCumulative(points);
  const segmentLengths = buildSegmentLengthsFromCumulative(cumulative);
  const segmentHeadings = buildSegmentHeadings(points);
  const totalLength = cumulative[cumulative.length - 1] ?? 0;
  if (totalLength < 2) {
    return null;
  }

  const stops: StopMarker[] = [];
  for (let index = 1; index < nodes.length - 1; index += 1) {
    const signal = signalByKey.get(nodes[index].key);
    if (!signal) {
      continue;
    }

    const previousStop = stops[stops.length - 1];
    if (previousStop?.signalId === signal.id) {
      continue;
    }

    stops.push({
      signalId: signal.id,
      signal,
      distance: Math.max(0, cumulative[index] - 2.8),
      axis: dominantAxis(nodes[index - 1].point, nodes[index].point),
      turn: classifyTurn(
        nodes[index - 1].point,
        nodes[index].point,
        nodes[index + 1].point,
      ),
    });
  }

  return {
    id,
    name,
    roadClass,
    roadWidth,
    laneOffset: THREE.MathUtils.clamp(roadWidth * 0.22, 0.45, 0.95),
    nodes,
    cumulative,
    segmentLengths,
    segmentHeadings,
    totalLength,
    stops,
    startKey: nodes[0].key,
    endKey: nodes[nodes.length - 1].key,
    isLoop,
  } satisfies RouteTemplate;
}

export function buildLoopRoutes(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
  signalByKey: Map<string, SignalData>,
) {
  const candidates = roads.features
    .filter((feature) => feature.properties.oneway === "no")
    .flatMap((feature, featureIndex) =>
      lineStringsOfRoad(feature, center).map((line, lineIndex) => {
        const points = line.map((node) => node.point);
        return {
          id: `${feature.id ?? featureIndex}-${lineIndex}`,
          name: feature.properties.name,
          roadClass: feature.properties.roadClass,
          roadWidth: feature.properties.width * ROAD_WIDTH_SCALE,
          nodes: line,
          length: buildCumulative(points).at(-1) ?? 0,
        };
      }),
    )
    .filter(
      (candidate) => candidate.nodes.length >= 2 && candidate.length >= 34,
    );

  return candidates
    .sort(compareRoadRouteCandidates)
    .map((candidate) => {
      const roundTripNodes = [
        ...candidate.nodes,
        ...candidate.nodes
          .slice(0, -1)
          .reverse()
          .map((node) => ({
            key: node.key,
            point: node.point.clone(),
          })),
      ];
      return buildRoadRouteFromNodes(
        candidate.id,
        candidate.name,
        candidate.roadClass,
        candidate.roadWidth,
        roundTripNodes,
        signalByKey,
        true,
      );
    })
    .filter((route): route is RouteTemplate => Boolean(route && route.totalLength >= 40));
}

export function buildTrafficRoutes(
  roads: RoadFeatureCollection,
  center: { lat: number; lon: number },
  signalByKey: Map<string, SignalData>,
) {
  return roads.features
    .flatMap((feature, featureIndex) =>
      lineStringsOfRoad(feature, center).flatMap((line, lineIndex) => {
        const nodes = line.map((node) => ({
          key: node.key,
          point: node.point.clone(),
        }));
        const length = buildCumulative(nodes.map((node) => node.point)).at(-1) ?? 0;
        if (nodes.length < 2 || length < 34) {
          return [];
        }

        const baseId = `${feature.id ?? featureIndex}-${lineIndex}`;
        const roadWidth = feature.properties.width * ROAD_WIDTH_SCALE;
        const routes = [] as RouteTemplate[];

        if (feature.properties.oneway !== "backward") {
          const forwardRoute = buildRoadRouteFromNodes(
            `${baseId}-forward`,
            feature.properties.name,
            feature.properties.roadClass,
            roadWidth,
            nodes,
            signalByKey,
            false,
          );
          if (forwardRoute) {
            routes.push(forwardRoute);
          }
        }

        if (feature.properties.oneway !== "forward") {
          const reversedNodes = [...nodes].reverse().map((node) => ({
            key: node.key,
            point: node.point.clone(),
          }));
          const reverseRoute = buildRoadRouteFromNodes(
            `${baseId}-reverse`,
            feature.properties.name,
            feature.properties.roadClass,
            roadWidth,
            reversedNodes,
            signalByKey,
            false,
          );
          if (reverseRoute) {
            routes.push(reverseRoute);
          }
        }

        return routes;
      }),
    )
    .sort(compareRoadRouteCandidates)
    .filter((route) => route.totalLength >= 40);
}

export function hotspotLabelForRoute(
  route: RouteTemplate,
  position: THREE.Vector3,
  buildings: BuildingMass[],
  index: number,
) {
  let nearestLabel: string | null = null;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;

  for (let buildingIndex = 0; buildingIndex < buildings.length; buildingIndex += 1) {
    const building = buildings[buildingIndex]!;
    if (!building.label) {
      continue;
    }

    const distanceSq = building.position.distanceToSquared(position);
    if (distanceSq < nearestDistanceSq) {
      nearestDistanceSq = distanceSq;
      nearestLabel = building.label;
    }
  }

  if (nearestLabel && nearestDistanceSq < 34 * 34) {
    return nearestLabel;
  }
  if (route.name) {
    return `${route.name} 승차지`;
  }
  return `택시 포인트 ${index + 1}`;
}

export function selectDispatchHotspotNodeIndex(
  route: RouteTemplate,
  graph: RoadGraph,
  signalByKey: Map<string, SignalData>,
  targetDistance: number,
  usedNodeKeys: Set<string>,
) {
  let bestIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 1; index < route.nodes.length - 1; index += 1) {
    const candidateNode = route.nodes[index]!;
    if (usedNodeKeys.has(candidateNode.key)) {
      continue;
    }

    const candidateGraphNode = graph.nodes.get(candidateNode.key) ?? candidateNode;
    const gap = Math.abs(route.cumulative[index]! - targetDistance);
    const previousGap = route.cumulative[index]! - route.cumulative[index - 1]!;
    const nextGap = route.cumulative[index + 1]! - route.cumulative[index]!;
    const clearance = Math.min(previousGap, nextGap);
    const turn = classifyTurn(
      route.nodes[index - 1]!.point,
      candidateNode.point,
      route.nodes[index + 1]!.point,
    );

    let score = gap;
    if (
      (candidateGraphNode.isTerminal ?? false) ||
      (candidateGraphNode.neighborCount ?? 0) <= 1
    ) {
      score += 80;
    }
    if (
      (candidateGraphNode.isIntersection ?? false) ||
      (candidateGraphNode.neighborCount ?? 0) >= 3
    ) {
      score += 24;
    }
    if (signalByKey.has(candidateNode.key)) {
      score += 18;
    }
    if (turn !== "straight") {
      score += 9;
    }
    if (clearance < 7) {
      score += (7 - clearance) * 4;
    }

    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore === Number.POSITIVE_INFINITY ? 1 : bestIndex;
}

export function buildTaxiHotspots(
  routes: RouteTemplate[],
  buildings: BuildingMass[],
  graph: RoadGraph,
  signalByKey: Map<string, SignalData>,
) {
  return routes.flatMap((route, routeIndex) => {
    if (route.nodes.length < 4) {
      return [] as Hotspot[];
    }

    const fractions =
      route.totalLength > 180 ? [0.14, 0.38, 0.63, 0.86] : [0.22, 0.58, 0.84];
    const usedNodeKeys = new Set<string>();
    return fractions.map((fraction, hotspotIndex) => {
      const targetDistance = route.totalLength * fraction + routeIndex * 4.5;
      const nodeIndex = selectDispatchHotspotNodeIndex(
        route,
        graph,
        signalByKey,
        targetDistance,
        usedNodeKeys,
      );
      usedNodeKeys.add(route.nodes[nodeIndex]!.key);

      const currentPoint = route.nodes[nodeIndex].point;
      const previousPoint = route.nodes[Math.max(0, nodeIndex - 1)].point;
      const nextPoint =
        route.nodes[Math.min(route.nodes.length - 1, nodeIndex + 1)].point;
      const heading = nextPoint.clone().sub(previousPoint);
      if (heading.lengthSq() < 0.0001) {
        heading.set(0, 0, 1);
      } else {
        heading.normalize();
      }

      const lanePosition = offsetToRight(
        currentPoint,
        heading,
        curbsideLaneOffset(route),
      );
      return {
        id: `${route.id}-hotspot-${hotspotIndex}`,
        nodeKey: route.nodes[nodeIndex].key,
        routeId: route.id,
        distance: route.cumulative[nodeIndex],
        position: lanePosition.clone().setY(0.14),
        point: lanePosition.clone(),
        label: hotspotLabelForRoute(
          route,
          lanePosition,
          buildings,
          hotspotIndex,
        ),
        roadName: route.name,
      } satisfies Hotspot;
    });
  });
}

export const SIGNAL_FLOW_NS_GREEN: SignalFlow = {
  phase: "ns_flow",
  ns: "green",
  ew: "red",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "stop",
};

export const SIGNAL_FLOW_NS_YELLOW: SignalFlow = {
  phase: "ns_yellow",
  ns: "yellow",
  ew: "red",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "stop",
};

export const SIGNAL_FLOW_NS_LEFT: SignalFlow = {
  phase: "ns_left",
  ns: "red",
  ew: "red",
  nsLeft: true,
  ewLeft: false,
  pedestrian: "stop",
};

export const SIGNAL_FLOW_EW_GREEN: SignalFlow = {
  phase: "ew_flow",
  ns: "red",
  ew: "green",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "stop",
};

export const SIGNAL_FLOW_EW_YELLOW: SignalFlow = {
  phase: "ew_yellow",
  ns: "red",
  ew: "yellow",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "stop",
};

export const SIGNAL_FLOW_EW_LEFT: SignalFlow = {
  phase: "ew_left",
  ns: "red",
  ew: "red",
  nsLeft: false,
  ewLeft: true,
  pedestrian: "stop",
};

export const SIGNAL_FLOW_CLEARANCE: SignalFlow = {
  phase: "clearance",
  ns: "red",
  ew: "red",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "stop",
};

export const SIGNAL_FLOW_PED_WALK: SignalFlow = {
  phase: "ped_walk",
  ns: "red",
  ew: "red",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "walk",
};

export const SIGNAL_FLOW_PED_FLASH: SignalFlow = {
  phase: "ped_flash",
  ns: "red",
  ew: "red",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "flash",
};

export function signalState(signal: SignalData, elapsedTime: number): SignalFlow {
  const phase = normalizeSignalOffset(elapsedTime + signal.offset);
  let elapsed = 0;
  for (let index = 0; index < signal.timingPlan.sequence.length; index += 1) {
    const step = signal.timingPlan.sequence[index]!;
    elapsed += step.duration;
    if (phase < elapsed) {
      return step.flow;
    }
  }
  return (
    signal.timingPlan.sequence[signal.timingPlan.sequence.length - 1]?.flow ??
    SIGNAL_FLOW_PED_FLASH
  );
}

export function canVehicleProceed(
  stop: StopMarker,
  state: SignalFlow,
  conflictingAxisOccupied: boolean,
  opposingPriorityDemand = 0,
  opposingPriorityDistance = Number.POSITIVE_INFINITY,
) {
  if (
    state.phase === "clearance" ||
    state.phase === "ped_walk" ||
    state.phase === "ped_flash"
  ) {
    return false;
  }
  if (stop.turn === "left") {
    if (stop.axis === "ns") {
      return (
        state.nsLeft ||
        (state.ns === "green" &&
          !conflictingAxisOccupied &&
          (opposingPriorityDemand === 0 ||
            opposingPriorityDistance > INTERSECTION_LEFT_TURN_GAP_DISTANCE))
      );
    }
    return (
      state.ewLeft ||
      (state.ew === "green" &&
        !conflictingAxisOccupied &&
        (opposingPriorityDemand === 0 ||
          opposingPriorityDistance > INTERSECTION_LEFT_TURN_GAP_DISTANCE))
    );
  }
  return stop.axis === "ns" ? state.ns === "green" : state.ew === "green";
}

export function loadVehicleAssetTemplate(path: string, timeoutMs = ASSET_FETCH_TIMEOUT_MS) {
  const loader = new FBXLoader();

  return new Promise<THREE.Group>((resolve, reject) => {
    beginSuppressingFbxLoaderWarnings();
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      endSuppressingFbxLoaderWarnings();
      callback();
    };
    const timeoutId = window.setTimeout(() => {
      finish(() => {
        reject(new Error(`Timed out loading vehicle asset: ${path}`));
      });
    }, timeoutMs);

    loader.load(
      path,
      (object) => {
        finish(() => {
          resolve(object);
        });
      },
      undefined,
      (error) => {
        finish(() => {
          reject(error);
        });
      },
    );
  });
}

export function normalizeVehicleAssetTemplate(
  source: THREE.Group,
  targetLength: number,
) {
  const container = new THREE.Group();
  const model = source;
  container.add(model);

  let bounds = new THREE.Box3().setFromObject(container);
  const initialSize = bounds.getSize(new THREE.Vector3());
  if (initialSize.x > initialSize.z * 1.12) {
    model.rotation.y = Math.PI / 2;
    bounds = new THREE.Box3().setFromObject(container);
  }

  const normalizedSize = bounds.getSize(new THREE.Vector3());
  const length = Math.max(normalizedSize.z, normalizedSize.x, 0.001);
  model.scale.setScalar(targetLength / length);

  bounds = new THREE.Box3().setFromObject(container);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= bounds.min.y;

  const sourceMaterials = new Set<THREE.Material>();
  container.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    child.castShadow = true;
    child.receiveShadow = true;
    child.userData.vehicleMaterialHint = vehicleAssetMaterialHint(child);
    child.userData.skipMaterialDispose = true;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.Material) || sourceMaterials.has(material)) {
        return;
      }
      sourceMaterials.add(material);
      disposeMaterialResources(material);
    });
    child.material = sharedVehicleTemplatePlaceholderMaterial();
  });

  return container;
}

export function normalizeTaxiAssetTemplate(source: THREE.Group) {
  return normalizeVehicleAssetTemplate(source, TAXI_ASSET_TARGET_LENGTH);
}

export function normalizeTrafficAssetTemplate(source: THREE.Group) {
  return normalizeVehicleAssetTemplate(source, TRAFFIC_ASSET_TARGET_LENGTH);
}

export function vehicleAssetMaterialHint(object: THREE.Object3D): VehicleMaterialHint {
  const cachedHint = object.userData.vehicleMaterialHint;
  if (
    cachedHint === "body" ||
    cachedHint === "glass" ||
    cachedHint === "trim" ||
    cachedHint === "metal" ||
    cachedHint === "default"
  ) {
    return cachedHint;
  }

  const mesh = object as THREE.Mesh;
  const sourceLabel = [
    object.name,
    Array.isArray(mesh.material)
      ? mesh.material.map((material) => material?.name ?? "").join(" ")
      : mesh.material instanceof THREE.Material
        ? mesh.material.name
        : "",
  ]
    .join(" ")
    .toLowerCase();

  if (/paint|orange/.test(sourceLabel)) {
    return "body";
  }
  if (/glass|screen|window|blue_grass/.test(sourceLabel)) {
    return "glass";
  }
  if (/rubber|tire|wheel|plastic|black|air_duct/.test(sourceLabel)) {
    return "trim";
  }
  if (/silver|metallic|chrome/.test(sourceLabel)) {
    return "metal";
  }
  return "default";
}

export function createTaxiAssetGroup(
  palette: VehiclePalette,
  taxiAssetTemplate: THREE.Group,
) {
  const group = taxiAssetTemplate.clone(true);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    emissive: 0x321500,
    emissiveIntensity: 0.1,
    roughness: 0.82,
    metalness: 0.16,
  });
  const signMaterial = new THREE.MeshStandardMaterial({
    color: palette.sign ?? 0xffe1aa,
    emissive: 0x7d4800,
    emissiveIntensity: 0.28,
    roughness: 0.66,
    metalness: 0.02,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x91a1ae,
    emissive: 0x101923,
    emissiveIntensity: 0.05,
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.9,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d2024,
    roughness: 0.94,
    metalness: 0.04,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x959aa0,
    roughness: 0.66,
    metalness: 0.24,
  });
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdf8a,
    emissive: 0xffb22e,
    emissiveIntensity: 0.05,
    roughness: 0.34,
  });
  const tailLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xdd1111,
    emissive: 0xdd1111,
    emissiveIntensity: 0.08,
    roughness: 0.42,
  });

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.userData.skipGeometryDispose = true;
    child.userData.skipMaterialDispose = false;

    const hint = vehicleAssetMaterialHint(child);
    if (hint === "body") {
      child.material = bodyMaterial;
      return;
    }
    if (hint === "glass") {
      child.material = glassMaterial;
      return;
    }
    if (hint === "trim") {
      child.material = trimMaterial;
      return;
    }
    if (hint === "metal") {
      child.material = metalMaterial;
      return;
    }
    child.material = metalMaterial;
  });

  const assetBounds = new THREE.Box3().setFromObject(group);
  const sign = markMeshResourceSharing(
    new THREE.Mesh(sharedImportedTaxiSignGeometry(), signMaterial),
  );
  sign.position.set(0, assetBounds.max.y + 0.1, -0.08);
  sign.castShadow = true;
  group.add(sign);

  const headlight = markMeshResourceSharing(
    new THREE.Mesh(sharedTaxiHeadlightGeometry(), headlightMaterial),
  );
  headlight.position.set(0, assetBounds.min.y + 0.48, assetBounds.max.z + 0.035);
  group.add(headlight);

  const tailLight = markMeshResourceSharing(
    new THREE.Mesh(sharedTaxiTailLightGeometry(), tailLightMaterial),
  );
  tailLight.position.set(0, assetBounds.min.y + 0.5, assetBounds.min.z - 0.035);
  group.add(tailLight);

  const shadow = new THREE.Mesh(
    sharedImportedTaxiShadowGeometry(),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.userData.skipGeometryDispose = true;
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const clickTarget = new THREE.Mesh(
    sharedImportedTaxiClickTargetGeometry(),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
  );
  clickTarget.userData.skipGeometryDispose = true;
  clickTarget.position.y = 1.4;
  group.add(clickTarget);

  return {
    group,
    bodyMaterial,
    signMaterial,
    headlightMaterial,
    tailLightMaterial,
    clickTarget,
  };
}

export function createTrafficAssetGroup(
  palette: VehiclePalette,
  trafficAssetTemplate: THREE.Group,
) {
  const group = trafficAssetTemplate.clone(true);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    emissive: 0x111417,
    emissiveIntensity: 0.05,
    roughness: 0.88,
    metalness: 0.12,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x96a6b3,
    emissive: 0x101923,
    emissiveIntensity: 0.04,
    roughness: 0.2,
    metalness: 0.08,
    transparent: true,
    opacity: 0.92,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x20242a,
    roughness: 0.95,
    metalness: 0.03,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x959ba2,
    roughness: 0.7,
    metalness: 0.22,
  });

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.userData.skipGeometryDispose = true;
    child.userData.skipMaterialDispose = false;

    const hint = vehicleAssetMaterialHint(child);
    if (hint === "body") {
      child.material = bodyMaterial;
      return;
    }
    if (hint === "glass") {
      child.material = glassMaterial;
      return;
    }
    if (hint === "trim") {
      child.material = trimMaterial;
      return;
    }
    if (hint === "metal") {
      child.material = metalMaterial;
      return;
    }
    child.material = metalMaterial;
  });

  const shadow = new THREE.Mesh(
    sharedImportedTrafficShadowGeometry(),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.userData.skipGeometryDispose = true;
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return {
    group,
    bodyMaterial,
    signMaterial: null,
    headlightMaterial: null,
    tailLightMaterial: null,
    clickTarget: null,
  };
}

export function createVehicleGroup(
  kind: VehicleKind,
  palette: VehiclePalette,
  {
    taxiAssetTemplate = null,
    importedAssetTemplate = null,
  }: {
    taxiAssetTemplate?: THREE.Group | null;
    importedAssetTemplate?: THREE.Group | null;
  } = {},
) {
  if (kind === "taxi" && taxiAssetTemplate) {
    return createTaxiAssetGroup(palette, taxiAssetTemplate);
  }
  if (kind === "traffic" && importedAssetTemplate) {
    return createTrafficAssetGroup(palette, importedAssetTemplate);
  }

  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    roughness: 0.9,
    metalness: 0.12,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.8 : 1.62,
      1.2,
      kind === "taxi" ? 4.3 : 4.05,
    ),
    bodyMaterial,
  );
  body.position.y = 0.7;
  group.add(body);

  const lowerTrim = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.88 : 1.7,
      0.22,
      kind === "taxi" ? 4.18 : 3.94,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x1d2024,
      roughness: 0.94,
      metalness: 0.04,
    }),
  );
  lowerTrim.position.y = 0.2;
  group.add(lowerTrim);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(kind === "taxi" ? 1.24 : 1.14, 0.95, 2.05),
    new THREE.MeshStandardMaterial({
      color: palette.cabin,
      roughness: 0.68,
      metalness: 0.04,
    }),
  );
  cabin.position.set(0, 1.5, 0.15);
  group.add(cabin);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.08, 0.18, 1.46),
    new THREE.MeshStandardMaterial({
      color: 0x8fa1ae,
      emissive: 0x0f1821,
      emissiveIntensity: 0.06,
      roughness: 0.22,
      metalness: 0.08,
    }),
  );
  windshield.position.set(0, 2.05, 0.15);
  group.add(windshield);

  let signMaterial: THREE.MeshStandardMaterial | null = null;
  let headlightMaterial: THREE.MeshStandardMaterial | null = null;
  let tailLightMaterial: THREE.MeshStandardMaterial | null = null;
  if (kind === "taxi") {
    signMaterial = new THREE.MeshStandardMaterial({
      color: palette.sign ?? 0xfff9d8,
      emissive: 0x3d2b0c,
      emissiveIntensity: 0.08,
      roughness: 0.72,
      metalness: 0,
    });
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.22, 0.38),
      signMaterial,
    );
    sign.position.set(0, 2.28, -0.08);
    group.add(sign);

    headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdf8a,
      emissive: 0xffb22e,
      emissiveIntensity: 0.05,
      roughness: 0.34,
    });
    const headlight = markMeshResourceSharing(
      new THREE.Mesh(sharedTaxiHeadlightGeometry(), headlightMaterial),
    );
    headlight.position.set(0, 0.7, 2.18);
    group.add(headlight);

    tailLightMaterial = new THREE.MeshStandardMaterial({
      color: 0xdd1111,
      emissive: 0xdd1111,
      emissiveIntensity: 0.08,
      roughness: 0.42,
    });
    const tailLight = markMeshResourceSharing(
      new THREE.Mesh(sharedTaxiTailLightGeometry(), tailLightMaterial),
    );
    tailLight.position.set(0, 0.7, -2.18);
    group.add(tailLight);
  }

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 4.9),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  let clickTarget: THREE.Mesh | null = null;
  if (kind === "taxi") {
    clickTarget = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3.2, 6.8),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      }),
    );
    clickTarget.position.y = 1.4;
    group.add(clickTarget);
  }

  return {
    group,
    bodyMaterial,
    signMaterial,
    headlightMaterial,
    tailLightMaterial,
    clickTarget,
  };
}

export function createPedestrianGroup(seed: number) {
  const palette = [0xff8d71, 0x78c4ff, 0x79d58f, 0xffcb44, 0xc6a2ff][seed % 5];
  const group = new THREE.Group();

  const body = markMeshResourceSharing(
    new THREE.Mesh(
      sharedPedestrianBodyGeometry(),
      pedestrianBodyMaterialFor(palette),
    ),
    { material: true },
  );
  body.position.y = 0.59;
  group.add(body);

  const head = markMeshResourceSharing(
    new THREE.Mesh(sharedPedestrianHeadGeometry(), sharedPedestrianHeadMaterial()),
    { material: true },
  );
  head.position.y = 1.17;
  group.add(head);

  const feet = markMeshResourceSharing(
    new THREE.Mesh(sharedPedestrianFeetGeometry(), sharedPedestrianFeetMaterial()),
    { material: true },
  );
  feet.position.y = 0.12;
  group.add(feet);

  const leftArm = markMeshResourceSharing(
    new THREE.Mesh(sharedPedestrianArmGeometry(), pedestrianBodyMaterialFor(palette)),
    { material: true },
  );
  leftArm.name = "pedestrian-left-arm";
  leftArm.position.set(-0.28, 0.64, 0);
  leftArm.rotation.z = 0.12;
  group.add(leftArm);

  const rightArm = markMeshResourceSharing(
    new THREE.Mesh(sharedPedestrianArmGeometry(), pedestrianBodyMaterialFor(palette)),
    { material: true },
  );
  rightArm.name = "pedestrian-right-arm";
  rightArm.position.set(0.28, 0.64, 0);
  rightArm.rotation.z = -0.12;
  group.add(rightArm);

  return group;
}

export function createCallerGroup(seed: number) {
  const topPalette = CALLER_TOP_PALETTES[seed % CALLER_TOP_PALETTES.length]!;
  const bottomPalette =
    CALLER_BOTTOM_PALETTES[seed % CALLER_BOTTOM_PALETTES.length]!;
  const group = new THREE.Group();

  const torsoMaterial = callerTorsoMaterialFor(topPalette);
  const armMaterial = callerArmMaterialFor(topPalette);
  const bottomMaterial = callerBottomMaterialFor(bottomPalette);
  const shadow = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerShadowGeometry(), sharedCallerShadowMaterial()),
    { material: true },
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const shoes = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerShoesGeometry(), sharedCallerShoesMaterial()),
    { material: true },
  );
  shoes.position.y = 0.06;
  group.add(shoes);

  const legs = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerLegsGeometry(), bottomMaterial),
    { material: true },
  );
  legs.position.y = 0.38;
  group.add(legs);

  const torso = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerTorsoGeometry(), torsoMaterial),
    { material: true },
  );
  torso.position.y = 0.94;
  group.add(torso);

  const head = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerHeadGeometry(), sharedCallerHeadMaterial()),
    { material: true },
  );
  head.position.y = 1.42;
  group.add(head);

  const leftArm = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerLeftArmGeometry(), armMaterial),
    { material: true },
  );
  leftArm.position.set(-0.34, 0.9, 0);
  leftArm.rotation.z = 0.18;
  group.add(leftArm);

  const waveArmPivot = new THREE.Group();
  waveArmPivot.position.set(0.32, 1.16, 0);
  group.add(waveArmPivot);

  const waveArm = markMeshResourceSharing(
    new THREE.Mesh(sharedCallerWaveArmGeometry(), armMaterial),
    { material: true },
  );
  waveArm.position.set(0, -0.28, 0);
  waveArmPivot.add(waveArm);

  const hailCube = new THREE.Mesh(
    sharedCallerHailCubeGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0xb8c2c9,
      emissive: 0x21303c,
      emissiveIntensity: 0.08,
      roughness: 0.58,
    }),
  );
  hailCube.userData.skipGeometryDispose = true;
  hailCube.position.set(0.12, -0.62, 0.08);
  waveArmPivot.add(hailCube);

  return { group, waveArmPivot, hailCube };
}

export function buildMajorRoadNames(roads: RoadFeatureCollection | null) {
  if (!roads) {
    return [];
  }
  return [
    ...new Set(
      roads.features
        .filter(
          (feature) =>
            feature.properties.name && feature.properties.roadClass !== "local",
        )
        .map((feature) => feature.properties.name as string),
    ),
  ].slice(0, 6);
}

export function setTaxiAppearance(vehicle: Vehicle, daylight = 1) {
  if (vehicle.kind !== "taxi") {
    return;
  }
  const nightGlow = THREE.MathUtils.clamp((0.28 - daylight) / 0.28, 0, 1);
  if (vehicle.planMode === "dropoff" || vehicle.isOccupied) {
    vehicle.bodyMaterial.color.setHex(0xf08d1a);
    vehicle.bodyMaterial.emissive.setHex(0x472300);
    vehicle.bodyMaterial.emissiveIntensity = 0.18;
    vehicle.signMaterial?.color.setHex(0xffc7cc);
    vehicle.signMaterial?.emissive.setHex(0xdd1111);
    if (vehicle.signMaterial) {
      vehicle.signMaterial.emissiveIntensity = 1.02;
    }
  } else {
    vehicle.bodyMaterial.color.setHex(vehicle.palette.body);
    vehicle.bodyMaterial.emissive.setHex(0x321500);
    vehicle.bodyMaterial.emissiveIntensity = 0.1;
    vehicle.signMaterial?.color.setHex(0xc7ffd1);
    vehicle.signMaterial?.emissive.setHex(0x00cc44);
    if (vehicle.signMaterial) {
      vehicle.signMaterial.emissiveIntensity = 0.96;
    }
  }

  if (vehicle.headlightMaterial) {
    vehicle.headlightMaterial.color.setHex(0xffdf8a);
    vehicle.headlightMaterial.emissive.setHex(0xffb22e);
    vehicle.headlightMaterial.emissiveIntensity = 0.08 + nightGlow * 1.25;
  }
  if (vehicle.tailLightMaterial) {
    vehicle.tailLightMaterial.color.setHex(0xdd1111);
    vehicle.tailLightMaterial.emissive.setHex(0xdd1111);
    vehicle.tailLightMaterial.emissiveIntensity = 0.12 + nightGlow * 1.15;
  }
}

export function updateVehicleMotionState(vehicle: Vehicle) {
  sampleRouteInto(
    vehicle.route,
    vehicle.distance,
    vehicle.motion,
    vehicle.motion.segmentIndex,
  );
  writeRightVector(vehicle.motion.heading, vehicle.motion.right);
  const pullOverBlend = curbsideApproachBlend(vehicle);
  const laneOffset =
    pullOverBlend > 0
      ? THREE.MathUtils.lerp(
        vehicle.route.laneOffset,
        curbsideLaneOffset(vehicle.route),
        pullOverBlend,
      )
      : vehicle.route.laneOffset;
  vehicle.motion.lanePosition
    .copy(vehicle.motion.position)
    .addScaledVector(vehicle.motion.right, laneOffset);
  vehicle.motion.yaw = Math.atan2(
    vehicle.motion.heading.x,
    vehicle.motion.heading.z,
  );
}

export function syncVehicleTransform(vehicle: Vehicle, alpha = 1) {
  const nextAlpha = THREE.MathUtils.clamp(alpha, 0, 1);
  const { previousMotion, motion, renderMotion } = vehicle;

  if (nextAlpha >= 0.999) {
    copyVehicleMotionState(renderMotion, motion);
  } else {
    renderMotion.position.copy(previousMotion.position).lerp(motion.position, nextAlpha);
    renderMotion.heading.copy(previousMotion.heading).lerp(motion.heading, nextAlpha);
    if (renderMotion.heading.lengthSq() < 0.0001) {
      renderMotion.heading.copy(motion.heading);
    } else {
      renderMotion.heading.normalize();
    }
    renderMotion.segmentIndex = motion.segmentIndex;
    renderMotion.lanePosition
      .copy(previousMotion.lanePosition)
      .lerp(motion.lanePosition, nextAlpha);
    renderMotion.right.copy(previousMotion.right).lerp(motion.right, nextAlpha);
    if (renderMotion.right.lengthSq() < 0.0001) {
      renderMotion.right.copy(motion.right);
    } else {
      renderMotion.right.normalize();
    }
    renderMotion.yaw =
      previousMotion.yaw +
      wrapAngle(motion.yaw - previousMotion.yaw) * nextAlpha;
    renderMotion.nextStopIndex = motion.nextStopIndex;
  }

  vehicle.group.position.copy(renderMotion.lanePosition);
  vehicle.group.rotation.y = renderMotion.yaw;
}

export function assignVehicleRoute(
  vehicle: Vehicle,
  route: RouteTemplate,
  distance = 0,
) {
  vehicle.route = route;
  vehicle.distance = distance;
  vehicle.roadName = route.name;
  vehicle.motion.segmentIndex = routeSegmentIndexAtDistance(route, distance, 0);
  vehicle.motion.nextStopIndex = resolveNextStop(route, distance, 0).index;
  updateVehicleMotionState(vehicle);
  copyVehicleMotionState(vehicle.previousMotion, vehicle.motion);
  copyVehicleMotionState(vehicle.renderMotion, vehicle.motion);
}
