"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
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
  type DispatchDemandSnapshot,
} from "@/components/map-simulator/dispatch-planner";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";

const DEFAULT_TAXI_COUNT = 12;
const DEFAULT_TRAFFIC_COUNT = 16;
const ASSET_FETCH_TIMEOUT_MS = 20_000;
const MIN_TAXI_COUNT = 4;
const MAX_TAXI_COUNT = 24;
const MIN_TRAFFIC_COUNT = 8;
const MAX_TRAFFIC_COUNT = 36;
const POSITION_SCALE = 0.2;
const ROAD_WIDTH_SCALE = 0.6;
const BUILDING_HEIGHT_SCALE = 0.2;
const SIGNAL_RADIUS = 7;
const SIGNAL_CYCLE = 24;
const SIGNAL_CLUSTER_DISTANCE = 18;
const SIGNAL_ROAD_SNAP_DISTANCE = 14;
const SIGNAL_NODE_SNAP_DISTANCE = 16;
const SIGNAL_COORDINATION_BAND_SIZE = 14;
const SIGNAL_COORDINATION_PHASE_STEP = 1.35;
const SIGNAL_WAVE_TRAVEL_SPEED = 6.4;
const KAKAO_TAXI_ASSET_PATH = "/assets/kakao-taxi/Sonata_Taxi_01.fbx";
const DEFAULT_MAP_CENTER = { lat: 37.5, lon: 127.0328 };
const HOTSPOT_SLOWDOWN_DISTANCE = 16;
const HOTSPOT_TRIGGER_DISTANCE = 1.2;
const SERVICE_STOP_DURATION = 1.6;
const VEHICLE_SIMULATION_FPS = 30;
const VEHICLE_SIMULATION_STEP = 1 / VEHICLE_SIMULATION_FPS;
const MAX_VEHICLE_SIMULATION_STEPS = 4;
const SIGNAL_RADIUS_SQ = SIGNAL_RADIUS * SIGNAL_RADIUS;
const CURBSIDE_EDGE_INSET_MIN = 0.45;
const CURBSIDE_EDGE_INSET_MAX = 0.72;
const CURBSIDE_EXTRA_OFFSET_MAX = 1.05;
const CURBSIDE_SIDEWALK_OFFSET = 0.92;
const INTERSECTION_BOX_OCCUPANCY_RADIUS = 2.35;
const INTERSECTION_OCCUPANCY_LOOKAHEAD = 6;
const INTERSECTION_EXIT_QUEUE_RADIUS = 8.8;
const INTERSECTION_BOX_OCCUPANCY_RADIUS_SQ =
  INTERSECTION_BOX_OCCUPANCY_RADIUS * INTERSECTION_BOX_OCCUPANCY_RADIUS;
const INTERSECTION_EXIT_QUEUE_RADIUS_SQ =
  INTERSECTION_EXIT_QUEUE_RADIUS * INTERSECTION_EXIT_QUEUE_RADIUS;
const INTERSECTION_EXIT_BLOCK_SPEED = 2.4;
const INTERSECTION_BOX_ENTRY_LOOKAHEAD = 10.5;
const INTERSECTION_SIGNAL_LOOKAHEAD = 18;
const INTERSECTION_LEFT_TURN_GAP_DISTANCE = 7.2;
const VEHICLE_FOLLOW_LOOKAHEAD_BUFFER = 8;
const VEHICLE_PROXIMITY_CELL_SIZE = 12;
const ROAD_SEGMENT_INDEX_CELL_SIZE = 24;
const CROSSWALK_STRIPE_COUNT = 4;
const CROSSWALK_STEP = 1.35;
const CROSSWALK_WIDTH = 5.4;
const PEDESTRIAN_SPAN = 4.2;
const CAMERA_DRIVE_SPEED = 26;
const CAMERA_STRAFE_SPEED = 22;
const CAMERA_TURN_SPEED = 1.95;
const CAMERA_BASE_MOVE_SCALE = 1.8;
const CAMERA_BASE_TURN_SCALE = 0.95;
const CAMERA_DRAG_SENSITIVITY = 0.0042;
const CAMERA_MIN_DISTANCE = 34;
const CAMERA_MAX_DISTANCE = 560;
const CAMERA_MIN_PITCH = 0.34;
const CAMERA_MAX_PITCH = 1.16;
const CAMERA_LOOK_HEIGHT = 6;
const SUBWAY_FOCUS_DISTANCE = 56;
const SUBWAY_FOCUS_PITCH = 0.82;
const TAXI_VIEW_CAMERA_HEIGHT = 4.1;
const TAXI_VIEW_CAMERA_BACK_OFFSET = -10.5;
const TAXI_VIEW_CAMERA_SIDE_OFFSET = 0.5;
const TAXI_VIEW_LOOK_AHEAD = 18;
const TAXI_CLICK_MOVE_THRESHOLD = 8;
const SHOW_DONG_BOUNDARIES = false;
const DRIVE_RENDER_FPS = 60;
const FOLLOW_RENDER_FPS = 60;
const OVERVIEW_RENDER_FPS = 60;
const HIDDEN_RENDER_FPS = 12;
const SIMULATION_STATS_UPDATE_INTERVAL = 0.3;
const HOTSPOT_ACTIVITY_REFRESH_INTERVAL = 1.2;
const HOVER_REFRESH_INTERVAL = 1 / 30;
const LABEL_RENDER_INTERVAL = 1 / 30;
const LABEL_VISIBILITY_REFRESH_INTERVAL = 0.14;
const TRAFFIC_ROUTE_REENTRY_DISTANCE = 6.4;
const COMMON_REFRESH_RATE_BANDS = [
  60, 72, 75, 90, 100, 120, 144, 165, 180, 200, 240,
] as const;
const AUTO_RENDER_HALF_REFRESH_THRESHOLD = 100;
const AUTO_REFRESH_BAND_HYSTERESIS_RATIO = 0.1;
const DRIVE_PIXEL_RATIO = 0.85;
const FOLLOW_PIXEL_RATIO = 0.85;
const OVERVIEW_PIXEL_RATIO = 0.75;
const HIDDEN_PIXEL_RATIO = 0.6;
const ROAD_LAYER_Y = {
  local: 0.116,
  connector: 0.121,
  arterial: 0.126,
} as const;
const NON_ROAD_LAYER_Y = {
  facility: 0.048,
  green: 0.056,
  pedestrian: 0.064,
  parking: 0.072,
  water: 0.08,
} as const;
const ROAD_NETWORK_EDGE_Y_OFFSET = 0.42;
const ROAD_NETWORK_NODE_Y = 0.72;
const LARGE_LOW_RISE_BUILDING_AREA_M2 = 12_000;
const LARGE_LOW_RISE_BUILDING_MAX_HEIGHT_M = 20;
const LOCAL_SCENARIO_FOCUS_DISTANCE = 34;
const LOCAL_SCENARIO_FOCUS_PITCH = 0.34;
const LOCAL_SCENARIO_FOCUS_CENTER_BLEND = 0.3;
const LOCAL_SCENARIO_FOCUS_YAW_OFFSET = -0.76;
const TAXI_ASSET_TARGET_LENGTH = 4.28;

type SignalAxis = "ns" | "ew";
type SignalDirection = "north" | "east" | "south" | "west";
type TurnMovement = "straight" | "left" | "right";
type SignalPhase =
  | "ns_flow"
  | "ns_yellow"
  | "ns_left"
  | "ew_flow"
  | "ew_yellow"
  | "ew_left"
  | "ped_walk"
  | "ped_flash"
  | "clearance";

type RoadProperties = {
  roadClass: "arterial" | "connector" | "local";
  width: number;
  name: string | null;
  highway: string | null;
  sourceWayId: string | null;
  oneway: "no" | "forward" | "backward";
};

type TurnRestrictionMode = "no" | "only";

type TurnRestriction = {
  id: string;
  viaKey: string;
  fromWayId: string;
  toWayId: string;
  kind: string;
  mode: TurnRestrictionMode;
};

type NonRoadCategory =
  | "green"
  | "pedestrian"
  | "parking"
  | "water"
  | "facility";

type NonRoadProperties = {
  category: NonRoadCategory;
  kind: string | null;
  name: string | null;
  sourceTag: string | null;
  area: number;
};

type BuildingProperties = {
  height: number;
  area: number;
  label: string | null;
  kind: string | null;
  address: string | null;
};

type DongProperties = {
  name: string;
  nameEn: string | null;
};

type TransitCategory = "bus_stop" | "subway_station";

type TransitProperties = {
  category: TransitCategory;
  name: string | null;
  operator: string | null;
  network: string | null;
  ref: string | null;
  sourceType: string | null;
  importance: number;
};

type TrafficSignalProperties = {
  name: string | null;
  signalType: string | null;
  direction: string | null;
  crossing: string | null;
  buttonOperated: boolean;
  turns: string | null;
};

type NonRoadFeature = Feature<Polygon | MultiPolygon, NonRoadProperties>;
type RoadFeature = Feature<LineString | MultiLineString, RoadProperties>;
type BuildingFeature = Feature<Polygon | MultiPolygon, BuildingProperties>;
type DongFeature = Feature<Polygon | MultiPolygon, DongProperties>;
type TrafficSignalFeatureCollection = FeatureCollection<
  Point,
  TrafficSignalProperties
>;
type NonRoadFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  NonRoadProperties
>;
type RoadFeatureCollection = FeatureCollection<
  LineString | MultiLineString,
  RoadProperties
> & {
  routing?: {
    turnRestrictions?: TurnRestriction[];
  };
};
type BuildingFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  BuildingProperties
>;
type DongFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  DongProperties
>;
type TransitFeatureCollection = FeatureCollection<Point, TransitProperties>;
type SerializedRoadNetworkNode = {
  key: string;
  x: number;
  z: number;
  outDegree?: number;
  neighborCount?: number;
  isIntersection?: boolean;
  isTerminal?: boolean;
};

type SerializedRoadNetworkSegment = {
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

type SerializedRoadNetwork = {
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

type AssetMeta = {
  path: string;
  lastModified: string | null;
  featureCount: number;
};

type SimulationMeta = {
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

type RouteNode = {
  key: string;
  point: THREE.Vector3;
  outDegree?: number;
  neighborCount?: number;
  isIntersection?: boolean;
  isTerminal?: boolean;
};

type SignalData = {
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

type SignalFlow = {
  phase: SignalPhase;
  ns: "green" | "yellow" | "red";
  ew: "green" | "yellow" | "red";
  nsLeft: boolean;
  ewLeft: boolean;
  pedestrian: "walk" | "flash" | "stop";
};

type SignalTurnDemand = {
  left: number;
  straight: number;
  right: number;
};

type SignalApproachDemand = Record<SignalDirection, SignalTurnDemand>;
type SignalApproachDistance = Record<SignalDirection, number>;
type SignalAxisOccupancy = {
  ns: number;
  ew: number;
};
type SignalDirectionalOccupancy = Record<SignalDirection, number>;
type SignalPhaseStep = {
  duration: number;
  flow: SignalFlow;
};
type SignalTimingPlan = {
  sequence: SignalPhaseStep[];
};

type StopMarker = {
  signalId: string;
  signal: SignalData;
  distance: number;
  axis: SignalAxis;
  turn: TurnMovement;
};

type NextStopState = {
  index: number;
  stop: StopMarker | null;
  ahead: number;
};

type RouteSample = {
  position: THREE.Vector3;
  heading: THREE.Vector3;
  segmentIndex: number;
};

type RouteTemplate = {
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

type VehiclePalette = {
  body: number;
  cabin: number;
  sign: number | null;
};

type VehicleKind = "taxi" | "traffic";
type VehiclePlanMode = "traffic" | "pickup" | "dropoff";
type BaseCameraMode = "drive" | "overview" | "follow";
type CameraMode = BaseCameraMode | "ride";
type WeatherMode = "clear" | "cloudy" | "heavy-rain" | "heavy-snow";
type CircumstanceMode = "live" | "specific";

type VehicleMotionState = RouteSample & {
  lanePosition: THREE.Vector3;
  right: THREE.Vector3;
  yaw: number;
  nextStopIndex: number;
};

type Vehicle = {
  id: string;
  kind: VehicleKind;
  route: RouteTemplate;
  group: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
  signMaterial: THREE.MeshStandardMaterial | null;
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

type VehicleSimulationSample = {
  vehicle: Vehicle;
  motion: VehicleMotionState;
  nextStopState: NextStopState;
  proximityCellX: number;
  proximityCellZ: number;
};

type VehicleProximityBuckets = Map<
  number,
  Map<number, VehicleSimulationSample[]>
>;

type Stats = {
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

type FpsMode = "auto" | "fixed60" | "unlimited";

type FpsStats = {
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

type WeatherOption = {
  id: WeatherMode;
  label: string;
  detail: string;
};

type LocalScenarioPreset = {
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

type SceneStatus = "loading" | "rendering" | "ready" | "error";

type SimulationData = {
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

const EMPTY_NON_ROAD_FEATURE_COLLECTION: NonRoadFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const EMPTY_TRAFFIC_SIGNAL_FEATURE_COLLECTION: TrafficSignalFeatureCollection =
{
  type: "FeatureCollection",
  features: [],
};

type Hotspot = {
  id: string;
  nodeKey: string;
  routeId: string;
  distance: number;
  position: THREE.Vector3;
  point: THREE.Vector3;
  label: string;
  roadName: string | null;
};

type SimulationAssetKey = keyof SimulationMeta["assets"];

const SIMULATION_ASSET_LABELS: Array<{
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

function assetFileName(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

// Register additional planners here as you add data-driven dispatch engines.
const DISPATCH_PLANNER_REGISTRY = createDispatchPlannerRegistry(
  [
    createHeuristicDispatchPlanner<RouteTemplate, Hotspot>(),
    createDemandAwareDispatchPlanner<RouteTemplate, Hotspot>(),
  ],
  "demand-aware-v1",
);
const ACTIVE_DISPATCH_PLANNER = DISPATCH_PLANNER_REGISTRY.getPlanner(
  process.env.NEXT_PUBLIC_DISPATCH_PLANNER?.trim() || null,
);
const ACTIVE_DISPATCH_PLANNER_ID = ACTIVE_DISPATCH_PLANNER.id;

type BuildingMass = {
  id: string;
  label: string | null;
  height: number;
  position: THREE.Vector3;
  width: number;
  depth: number;
  rotationY: number;
  color: number;
};

type DongRegion = {
  id: string;
  name: string;
  nameEn: string | null;
  position: THREE.Vector3;
  rings: THREE.Vector3[][];
  color: number;
};

type DongBoundarySegment = {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  center: THREE.Vector3;
  angle: number;
  length: number;
  leftDong: string | null;
  rightDong: string | null;
};

type ProjectedRoadSegment = {
  roadClass: RoadProperties["roadClass"];
  width: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  name: string | null;
};

type RoadSegmentSpatialIndex = {
  cellSize: number;
  columns: Map<number, Map<number, number[]>>;
};

type TransitLandmark = {
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

type CameraFocusTarget = {
  x: number;
  z: number;
  distance: number;
  pitch: number;
  label: string;
  yaw?: number;
};

type NearestRoadContext = {
  closest: THREE.Vector3;
  heading: THREE.Vector3;
  width: number;
  roadClass: RoadProperties["roadClass"];
  name: string | null;
  distance: number;
};

type GraphEdge = {
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

type RoadGraph = {
  nodes: Map<string, RouteNode>;
  adjacency: Map<string, GraphEdge[]>;
  edgeById: Map<string, GraphEdge>;
  turnRestrictionsByViaKey: Map<string, TurnRestriction[]>;
};

type SignalLampVisual = {
  mesh: THREE.Mesh;
  axis: SignalAxis;
};

type SignalVisual = SignalData & {
  group: THREE.Group;
  reds: SignalLampVisual[];
  yellows: SignalLampVisual[];
  greens: SignalLampVisual[];
  leftArrows: SignalLampVisual[];
  pedestrianLamps: SignalLampVisual[];
  lastVisualSignature: string;
};

type PedestrianVisual = {
  signalId: string;
  axis: SignalAxis;
  group: THREE.Group;
  phaseOffset: number;
  speed: number;
  lateralOffset: number;
  direction: 1 | -1;
};

type HotspotMarkerMode = "pickup" | "dropoff" | "idle";
type SceneLabelKind = "district" | "building" | "transit" | "road";
type DispatchHotspotPresentation = {
  accentColor: number;
  badgeLabel: string;
  badgeBorderColor: string;
  badgeBackground: string;
  badgeTextColor: string;
  showsCaller: boolean;
};

type DispatchPlannerPresentation = {
  id: string;
  label: string;
  routingLabel: string;
  routingDetail: string;
  hotspot: Record<HotspotMarkerMode, DispatchHotspotPresentation>;
};

type SceneLabelEntry = {
  label: CSS2DObject;
  kind: SceneLabelKind;
  priority: number;
  name: string | null;
};

type LabelDistanceEntry = {
  entry: SceneLabelEntry;
  distanceSq: number;
};

type HotspotVisual = {
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

const DEFAULT_DISPATCH_PRESENTATION: DispatchPlannerPresentation = {
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

const DISPATCH_PRESENTATIONS = new Map<string, DispatchPlannerPresentation>([
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

function resolveDispatchPlannerPresentation(
  plannerId: string | null | undefined,
) {
  return (
    (plannerId ? DISPATCH_PRESENTATIONS.get(plannerId) : null) ??
    DEFAULT_DISPATCH_PRESENTATION
  );
}

type EnvironmentState = {
  skyColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: THREE.Vector3;
  groundColor: number;
  roadColors: Record<RoadProperties["roadClass"], number>;
  roadRoughness: number;
  roadMetalness: number;
  laneMarkerColor: number;
  laneMarkerEmissive: number;
  laneMarkerIntensity: number;
  crosswalkColor: number;
  crosswalkEmissive: number;
  crosswalkIntensity: number;
  stopLineColor: number;
  stopLineEmissive: number;
  stopLineIntensity: number;
  buildingTint: number;
  buildingEmissive: number;
  buildingEmissiveIntensity: number;
  precipitation: "none" | "rain" | "snow";
  precipitationOpacity: number;
  precipitationIntensity: number;
  vehicleSpeedMultiplier: number;
  exposure: number;
};

const TAXI_PALETTE: VehiclePalette = {
  body: 0xd79a3a,
  cabin: 0xe4c17d,
  sign: 0xf4ebcf,
};

const TRAFFIC_PALETTES: VehiclePalette[] = [
  { body: 0xf4f5f7, cabin: 0xdce7f0, sign: null },
  { body: 0x353c45, cabin: 0xc9d5df, sign: null },
  { body: 0x79889a, cabin: 0xd8e2ea, sign: null },
  { body: 0xc94d3f, cabin: 0xf0d7cf, sign: null },
  { body: 0x4f6478, cabin: 0xd4dfe7, sign: null },
];

// Keep scene styling centralized so future asset or dispatch-layer swaps do
// not require touching simulation logic.
const DONG_REGION_COLORS = [0x667983, 0x728274, 0x8f8068, 0x876f6a, 0x728193];
const HOTSPOT_IDLE_COLORS = [0x7a6b57, 0x62716c, 0x76645c];
const CALLER_TOP_PALETTES = [0x8a7d70, 0x6f7d8a, 0x6d8376, 0x97846a, 0x7a7387];
const CALLER_BOTTOM_PALETTES = [0x25292d, 0x2b3035, 0x31353a, 0x2a2e32];
const SUBWAY_STRUCTURE_ACCENTS = [0x78aaa0, 0x89b9ae, 0x6f978f];
const PANEL_EYEBROW_CLASS =
  "mb-2 text-[11px] uppercase tracking-[0.28em] text-[#99cbbd]";
const PANEL_SECTION_LABEL_CLASS =
  "text-xs uppercase tracking-[0.16em] text-[#99cbbd]/80";
const PANEL_CARD_CLASS =
  "rounded-2xl border border-white/8 bg-white/[0.045] p-4 text-sm";
const PANEL_CARD_COMPACT_CLASS =
  "rounded-2xl border border-white/8 bg-white/[0.045] p-3 text-sm";
const PANEL_ACCENT_CARD_CLASS =
  "rounded-2xl border border-[#87cbb0]/12 bg-[#87cbb0]/[0.06] p-4 text-sm";
const PANEL_INSET_CLASS =
  "rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-2 text-xs leading-5 text-slate-400";
const PANEL_INSET_PADDED_CLASS =
  "rounded-2xl border border-white/8 bg-slate-950/55 px-3 py-3";
const PANEL_TOKEN_CLASS =
  "rounded-full border border-white/8 bg-slate-950/55 px-2 py-1 text-slate-100";
const PANEL_STATUS_TILE_CLASS =
  "rounded-2xl border border-white/8 bg-slate-950/55 p-3";

function panelSelectableClass(selected: boolean) {
  return selected
    ? "border-[#87cbb0]/35 bg-[#87cbb0]/14 text-[#e3f2ed]"
    : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:text-white";
}

function panelBadgeClass(active: boolean) {
  return `rounded-full border px-2 py-1 text-[11px] font-medium ${
    active
      ? "border-[#87cbb0]/22 bg-[#87cbb0]/10 text-[#d7efe6]"
      : "border-white/10 bg-slate-950/70 text-slate-300"
  }`;
}

function panelPillToggleClass(selected: boolean) {
  return `rounded-full border px-2 py-1 transition ${
    selected
      ? "border-[#87cbb0]/28 bg-[#87cbb0]/12 text-[#e1f1eb]"
      : "border-[#87cbb0]/12 bg-[#87cbb0]/[0.06] text-[#c6ddd5] hover:border-[#87cbb0]/22 hover:bg-[#87cbb0]/10"
  }`;
}

const MINUTES_PER_DAY = 24 * 60;
const SIMULATION_TIME_ZONE = "Asia/Seoul";
const KST_UTC_OFFSET_MINUTES = 9 * 60;
const DEG_TO_RAD = Math.PI / 180;
const SOLAR_OBLIQUITY = 23.4397 * DEG_TO_RAD;

const WEATHER_OPTIONS: WeatherOption[] = [
  { id: "clear", label: "맑음", detail: "기본 시야와 표준 주행 속도" },
  { id: "cloudy", label: "흐림", detail: "광량 감소, 가벼운 감속" },
  {
    id: "heavy-rain",
    label: "폭우",
    detail: "빗줄기와 젖은 도로, 시야는 보수적으로 유지",
  },
  {
    id: "heavy-snow",
    label: "폭설",
    detail: "눈발과 차가운 톤, 과한 안개 없이 표현",
  },
];

const TIME_PRESETS = [
  { label: "06:00", minutes: 6 * 60, detail: "새벽" },
  { label: "12:00", minutes: 12 * 60, detail: "한낮" },
  { label: "18:30", minutes: 18 * 60 + 30, detail: "노을" },
  { label: "23:00", minutes: 23 * 60, detail: "심야" },
];
const HYDRATION_SAFE_SIMULATION_CLOCK: {
  dateIso: string;
  minutes: number;
} = {
  dateIso: "2026-01-01",
  minutes: 12 * 60,
};

const LOCAL_SCENARIO_PRESETS: LocalScenarioPreset[] = [
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

function normalizeDayMinutes(minutes: number) {
  return (
    ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
    MINUTES_PER_DAY
  );
}

function format24Hour(minutes: number) {
  const normalized = normalizeDayMinutes(minutes);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function zonedDateTimeParts(date: Date, timeZone = SIMULATION_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const partMap = new Map(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(partMap.get("year") ?? 1970),
    month: Number(partMap.get("month") ?? 1),
    day: Number(partMap.get("day") ?? 1),
    hour: Number(partMap.get("hour") ?? 0),
    minute: Number(partMap.get("minute") ?? 0),
  };
}

function dateIsoFromParts(parts: { year: number; month: number; day: number }) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function currentSimulationClock(date = new Date()) {
  const parts = zonedDateTimeParts(date);
  return {
    dateIso: dateIsoFromParts(parts),
    minutes: parts.hour * 60 + parts.minute,
  };
}

function parseDateIso(dateIso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatDateLabel(dateIso: string) {
  const parsed = parseDateIso(dateIso);
  if (!parsed) {
    return dateIso;
  }
  return `${parsed.year}.${String(parsed.month).padStart(2, "0")}.${String(parsed.day).padStart(2, "0")}`;
}

function kstDateTimeToUtcDate(dateIso: string, minutes: number) {
  const parsed = parseDateIso(dateIso);
  if (!parsed) {
    return new Date();
  }

  const normalizedMinutes = normalizeDayMinutes(minutes);
  const utcMs =
    Date.UTC(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0, 0) +
    normalizedMinutes * 60_000 -
    KST_UTC_OFFSET_MINUTES * 60_000;

  return new Date(utcMs);
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const alpha = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return alpha * alpha * (3 - 2 * alpha);
}

function solarPositionForDateTime(
  dateIso: string,
  minutes: number,
  center: { lat: number; lon: number },
) {
  const date = kstDateTimeToUtcDate(dateIso, minutes);
  const julianDate = date.getTime() / 86400000 - 0.5 + 2440588;
  const days = julianDate - 2451545;
  const meanAnomaly = DEG_TO_RAD * (357.5291 + 0.98560028 * days);
  const equationOfCenter =
    DEG_TO_RAD *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly));
  const perihelion = DEG_TO_RAD * 102.9372;
  const eclipticLongitude =
    meanAnomaly + equationOfCenter + perihelion + Math.PI;
  const declination = Math.asin(
    Math.sin(eclipticLongitude) * Math.sin(SOLAR_OBLIQUITY),
  );
  const rightAscension = Math.atan2(
    Math.sin(eclipticLongitude) * Math.cos(SOLAR_OBLIQUITY),
    Math.cos(eclipticLongitude),
  );
  const longitudeWest = -center.lon * DEG_TO_RAD;
  const siderealTime =
    DEG_TO_RAD * (280.16 + 360.9856235 * days) - longitudeWest;
  const hourAngle = siderealTime - rightAscension;
  const latitudeRad = center.lat * DEG_TO_RAD;
  const altitude = Math.asin(
    Math.sin(latitudeRad) * Math.sin(declination) +
    Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle),
  );
  const azimuthFromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitudeRad) -
    Math.tan(declination) * Math.cos(latitudeRad),
  );
  const azimuthFromNorth = (azimuthFromSouth + Math.PI * 3) % (Math.PI * 2);
  const cosAltitude = Math.cos(altitude);

  return {
    altitude,
    azimuth: azimuthFromNorth,
    direction: new THREE.Vector3(
      Math.sin(azimuthFromNorth) * cosAltitude,
      Math.sin(altitude),
      -Math.cos(azimuthFromNorth) * cosAltitude,
    ).normalize(),
  };
}

function formatKstDateTime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  return `${partMap.get("year")}-${partMap.get("month")}-${partMap.get("day")} ${partMap.get("hour")}:${partMap.get("minute")} KST`;
}

function formatMetricDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0초";
  }
  if (seconds < 60) {
    return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}초`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}분 ${String(remainingSeconds).padStart(2, "0")}초`;
}

function taxiDisplayNumber(vehicleId: string) {
  const matched = vehicleId.match(/(\d+)$/);
  return matched ? Number(matched[1]) + 1 : null;
}

function formatHotspotTaxiBadge(baseLabel: string, taxiNumbers: number[]) {
  if (!taxiNumbers.length) {
    return baseLabel;
  }

  const uniqueTaxiNumbers = [...new Set(taxiNumbers)].sort((left, right) => left - right);
  const visibleTaxiNumbers = uniqueTaxiNumbers.slice(0, 3).join(", ");
  const overflowCount = uniqueTaxiNumbers.length - 3;
  return `${baseLabel} · 택시 ${visibleTaxiNumbers}${overflowCount > 0 ? ` +${overflowCount}` : ""}`;
}

async function fetchJsonAsset<T>(
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

async function fetchGeoJsonAsset<T extends FeatureCollection>(
  path: string,
): Promise<{ data: T; meta: AssetMeta }> {
  return fetchJsonAsset<T>(path, (data) =>
    Array.isArray(data.features) ? data.features.length : 0,
  );
}

async function fetchOptionalGeoJsonAsset<T extends FeatureCollection>(
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

async function fetchRoadNetworkAsset(path: string) {
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

function timeBandLabel(minutes: number) {
  const normalized = normalizeDayMinutes(minutes);
  if (normalized < 300) return "심야";
  if (normalized < 420) return "새벽";
  if (normalized < 720) return "오전";
  if (normalized < 1020) return "오후";
  if (normalized < 1260) return "저녁";
  return "야간";
}

function daylightFactor(
  dateIso: string,
  minutes: number,
  center: { lat: number; lon: number },
) {
  const altitudeDegrees =
    solarPositionForDateTime(dateIso, minutes, center).altitude / DEG_TO_RAD;
  return smoothstep(-3, 24, altitudeDegrees);
}

function twilightFactor(
  dateIso: string,
  minutes: number,
  center: { lat: number; lon: number },
) {
  const altitudeDegrees =
    solarPositionForDateTime(dateIso, minutes, center).altitude / DEG_TO_RAD;
  return Math.exp(-Math.pow(altitudeDegrees / 8, 2));
}

function sunsetFactor(
  dateIso: string,
  minutes: number,
  center: { lat: number; lon: number },
) {
  const altitudeDegrees =
    solarPositionForDateTime(dateIso, minutes, center).altitude / DEG_TO_RAD;
  return THREE.MathUtils.clamp(
    Math.exp(-Math.pow(altitudeDegrees / 6.5, 2)),
    0,
    1,
  );
}

function mixHexColor(start: number, end: number, alpha: number) {
  return new THREE.Color(start)
    .lerp(new THREE.Color(end), THREE.MathUtils.clamp(alpha, 0, 1))
    .getHex();
}

function scaleHexColor(value: number, factor: number) {
  return new THREE.Color(value).multiplyScalar(factor).getHex();
}

function buildEnvironmentState(
  dateIso: string,
  minutes: number,
  weatherMode: WeatherMode,
  center: { lat: number; lon: number },
): EnvironmentState {
  const normalizedMinutes = normalizeDayMinutes(minutes);
  const solarPosition = solarPositionForDateTime(
    dateIso,
    normalizedMinutes,
    center,
  );
  const altitudeDegrees = solarPosition.altitude / DEG_TO_RAD;
  const daylight = smoothstep(-3, 24, altitudeDegrees);
  const twilight = Math.exp(-Math.pow(altitudeDegrees / 8, 2));
  const sunset = THREE.MathUtils.clamp(
    Math.exp(-Math.pow(altitudeDegrees / 6.5, 2)),
    0,
    1,
  );
  const solarDirection = solarPosition.direction.clone();
  const cloudCover =
    weatherMode === "clear"
      ? 0.04
      : weatherMode === "cloudy"
        ? 0.18
        : weatherMode === "heavy-rain"
          ? 0.36
          : 0.28;
  const skyDayColor =
    weatherMode === "clear"
      ? 0x8fc2e5
      : weatherMode === "cloudy"
        ? 0x90a5b7
        : weatherMode === "heavy-rain"
          ? 0x6d8092
          : 0xc9d8e5;
  const skyNightColor =
    weatherMode === "heavy-snow"
      ? 0x263443
      : weatherMode === "heavy-rain"
        ? 0x152130
        : 0x152231;
  const fogDayColor =
    weatherMode === "clear"
      ? 0x9bc4da
      : weatherMode === "cloudy"
        ? 0x97a6b3
        : weatherMode === "heavy-rain"
          ? 0x72818d
          : 0xd3dee8;
  const fogNightColor =
    weatherMode === "heavy-snow"
      ? 0x384959
      : weatherMode === "heavy-rain"
        ? 0x1d2b38
        : 0x1d2b39;
  const weatherSpeedMultiplier =
    weatherMode === "clear"
      ? 1
      : weatherMode === "cloudy"
        ? 0.97
        : weatherMode === "heavy-rain"
          ? 0.9
          : 0.82;
  const nightSpeedMultiplier =
    daylight < 0.12 ? 0.94 : daylight < 0.3 ? 0.97 : 1;
  const sunsetSkyColor = weatherMode === "heavy-snow" ? 0xf0c5ad : 0xf0915d;
  const sunsetFogColor = weatherMode === "heavy-snow" ? 0xf4ddcf : 0xf0bb8e;
  const nightBuildingFactor = THREE.MathUtils.clamp(
    (0.3 - daylight) / 0.3,
    0,
    1,
  );
  const readabilitySkyMix = THREE.MathUtils.clamp(
    daylight * 0.72 + twilight * 0.1 + 0.12,
    0,
    1,
  );
  const readabilityFogMix = THREE.MathUtils.clamp(
    daylight * 0.68 + twilight * 0.1 + 0.18,
    0,
    1,
  );
  const readableNightLight = THREE.MathUtils.clamp(
    daylight * 0.86 + twilight * 0.24 + 0.28,
    0,
    1,
  );

  const baseSkyColor = mixHexColor(
    skyNightColor,
    skyDayColor,
    readabilitySkyMix,
  );
  const baseFogColor = mixHexColor(
    fogNightColor,
    fogDayColor,
    readabilityFogMix,
  );
  const neutralGroundColor =
    weatherMode === "heavy-snow"
      ? 0x4b5057
      : weatherMode === "heavy-rain"
        ? 0x191c20
        : 0x202327;
  const roadBaseColors =
    weatherMode === "heavy-snow"
      ? {
        arterial: 0x646a72,
        connector: 0x5a6068,
        local: 0x51565d,
      }
      : weatherMode === "heavy-rain"
        ? {
          arterial: 0x393d41,
          connector: 0x34383c,
          local: 0x2e3235,
        }
        : {
          arterial: 0x4b5054,
          connector: 0x44494d,
          local: 0x3d4246,
        };
  const lightingPreset =
    weatherMode === "clear"
      ? {
        ambientColor: 0xf4f8ff,
        ambientIntensity: 0.72,
        hemiSkyColor: 0xdce9ff,
        hemiGroundColor: 0x415468,
        hemiIntensity: 0.84,
        sunColor: 0xfffbf2,
        sunIntensity: 0.88,
        fogNear: 144,
        fogFar: 410,
        exposure: 1.04,
      }
      : weatherMode === "cloudy"
        ? {
          ambientColor: 0xe7eef7,
          ambientIntensity: 0.69,
          hemiSkyColor: 0xc8d5e3,
          hemiGroundColor: 0x3d4d60,
          hemiIntensity: 0.78,
          sunColor: 0xf8fbff,
          sunIntensity: 0.8,
          fogNear: 138,
          fogFar: 392,
          exposure: 1.01,
        }
        : weatherMode === "heavy-rain"
          ? {
            ambientColor: 0xe1e9f2,
            ambientIntensity: 0.66,
            hemiSkyColor: 0xbac9db,
            hemiGroundColor: 0x334153,
            hemiIntensity: 0.74,
            sunColor: 0xf0f4fa,
            sunIntensity: 0.72,
            fogNear: 124,
            fogFar: 350,
            exposure: 0.98,
          }
          : {
            ambientColor: 0xf0f6fb,
            ambientIntensity: 0.74,
            hemiSkyColor: 0xdbe6f1,
            hemiGroundColor: 0x47586b,
            hemiIntensity: 0.82,
            sunColor: 0xf8fbff,
            sunIntensity: 0.82,
            fogNear: 132,
            fogFar: 362,
            exposure: 1,
          };

  return {
    skyColor: mixHexColor(baseSkyColor, sunsetSkyColor, sunset * 0.72),
    fogColor: mixHexColor(baseFogColor, sunsetFogColor, sunset * 0.54),
    fogNear: lightingPreset.fogNear,
    fogFar: lightingPreset.fogFar,
    ambientColor: lightingPreset.ambientColor,
    ambientIntensity: lightingPreset.ambientIntensity + (1 - daylight) * 0.05,
    hemiSkyColor: lightingPreset.hemiSkyColor,
    hemiGroundColor: lightingPreset.hemiGroundColor,
    hemiIntensity: lightingPreset.hemiIntensity + (1 - daylight) * 0.04,
    sunColor: lightingPreset.sunColor,
    sunIntensity: THREE.MathUtils.lerp(
      lightingPreset.sunIntensity * 0.42,
      lightingPreset.sunIntensity,
      readableNightLight,
    ),
    sunPosition: solarDirection.multiplyScalar(190),
    groundColor: neutralGroundColor,
    roadColors: {
      arterial: scaleHexColor(roadBaseColors.arterial, 1 - cloudCover * 0.04),
      connector: scaleHexColor(roadBaseColors.connector, 1 - cloudCover * 0.04),
      local: scaleHexColor(roadBaseColors.local, 1 - cloudCover * 0.03),
    },
    roadRoughness:
      weatherMode === "heavy-rain"
        ? 0.84
        : weatherMode === "heavy-snow"
          ? 0.9
          : 0.97,
    roadMetalness:
      weatherMode === "heavy-rain"
        ? 0.08
        : weatherMode === "heavy-snow"
          ? 0.03
          : 0.01,
    laneMarkerColor: weatherMode === "heavy-snow" ? 0xf0f2f4 : 0xd9d1bd,
    laneMarkerEmissive:
      daylight < 0.22
        ? 0x4a4030
        : weatherMode === "heavy-rain"
          ? 0x2f2a22
          : 0x373127,
    laneMarkerIntensity:
      daylight < 0.2 ? 0.12 : weatherMode === "heavy-rain" ? 0.05 : 0.04,
    crosswalkColor: weatherMode === "heavy-snow" ? 0xe8ebee : 0xc6cbd1,
    crosswalkEmissive: daylight < 0.2 ? 0x242a31 : 0x15181c,
    crosswalkIntensity: daylight < 0.2 ? 0.05 : 0.02,
    stopLineColor: weatherMode === "heavy-snow" ? 0xf0f2f4 : 0xd5d9dd,
    stopLineEmissive: daylight < 0.2 ? 0x262d36 : 0x181c22,
    stopLineIntensity: daylight < 0.2 ? 0.08 : 0.03,
    buildingTint:
      weatherMode === "heavy-snow"
        ? 0xd7dbe0
        : weatherMode === "heavy-rain"
          ? 0xc7ccd1
          : 0xd0d4d9,
    buildingEmissive: mixHexColor(
      0x15191d,
      0x2f3a46,
      nightBuildingFactor * 0.22 + twilight * 0.08,
    ),
    buildingEmissiveIntensity:
      0.05 + twilight * 0.03 + nightBuildingFactor * 0.08,
    precipitation:
      weatherMode === "heavy-rain"
        ? "rain"
        : weatherMode === "heavy-snow"
          ? "snow"
          : "none",
    precipitationOpacity:
      weatherMode === "heavy-rain"
        ? 0.24
        : weatherMode === "heavy-snow"
          ? 0.42
          : 0,
    precipitationIntensity:
      weatherMode === "heavy-rain"
        ? 0.55
        : weatherMode === "heavy-snow"
          ? 0.4
          : 0,
    vehicleSpeedMultiplier: weatherSpeedMultiplier * nightSpeedMultiplier,
    exposure: lightingPreset.exposure + (1 - daylight) * 0.05,
  };
}

function renderFpsCapFor(mode: CameraMode) {
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

function nearestRefreshRateBand(refreshRateEstimate: number) {
  return COMMON_REFRESH_RATE_BANDS.reduce<number>(
    (closest, candidate) =>
      Math.abs(candidate - refreshRateEstimate) <
        Math.abs(closest - refreshRateEstimate)
        ? candidate
        : closest,
    COMMON_REFRESH_RATE_BANDS[0],
  );
}

function stabilizeRefreshRateBand(
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

function autoRenderFpsFor(
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

function resolveRenderCap(
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

function renderCapLabel(
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

function fpsModeLabel(fpsMode: FpsMode) {
  switch (fpsMode) {
    case "fixed60":
      return "60 FPS";
    case "unlimited":
      return "무제한";
    default:
      return "자동";
  }
}

function fpsModeSummary(fpsMode: FpsMode) {
  switch (fpsMode) {
    case "fixed60":
      return "보이는 렌더링을 60 FPS에 고정합니다.";
    case "unlimited":
      return "장치 한계에 닿을 때까지 보이는 렌더링 제한을 풀어둡니다.";
    default:
      return "자동 모드는 가장 가까운 주사율 대역에 맞춘 뒤, 100Hz 미만은 전체 주사율, 100Hz 이상은 절반 주사율을 목표로 잡습니다.";
  }
}

function renderPixelRatioFor(mode: CameraMode, isHidden: boolean) {
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

function precipitationDrawRatioFor(mode: CameraMode, isHidden: boolean) {
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

function labelVisibilityBudget(mode: CameraMode) {
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

function geoKey(position: Position) {
  return `${position[0].toFixed(5)}:${position[1].toFixed(5)}`;
}

function visitGeometryPositions(
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

function featureCollectionCenter(
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

function projectPoint(
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

function lineStringsOfRoad(
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

function buildProjectedRoadSegments(
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

function roadSegmentCellCoord(value: number, cellSize: number) {
  return Math.floor(value / cellSize);
}

function buildRoadSegmentSpatialIndex(
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

function collectRoadSegmentCandidateIndices(
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

function outerRingOfBuilding(
  feature: BuildingFeature,
  center: { lat: number; lon: number },
) {
  const ring =
    feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : (feature.geometry.coordinates[0]?.[0] ?? []);

  return ring.map((coordinate) => projectPoint(coordinate, center));
}

function outerRingsOfDong(
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

function shapePointsFromCoordinates(
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

function shapeFromPolygonCoordinates(
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

function shapesOfNonRoadFeature(
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

function distanceXZ(start: THREE.Vector3, end: THREE.Vector3) {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function polygonAreaXZ(points: THREE.Vector3[]) {
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

function buildCumulative(points: THREE.Vector3[]) {
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(
      cumulative[index - 1] + distanceXZ(points[index - 1], points[index]),
    );
  }
  return cumulative;
}

function buildSegmentLengthsFromCumulative(cumulative: number[]) {
  const segmentLengths: number[] = [];
  for (let index = 0; index < cumulative.length - 1; index += 1) {
    segmentLengths.push(cumulative[index + 1]! - cumulative[index]!);
  }
  return segmentLengths;
}

function buildSegmentHeadings(points: THREE.Vector3[]) {
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

function normalizeDistance(value: number, totalLength: number) {
  if (totalLength <= 0) {
    return 0;
  }
  return ((value % totalLength) + totalLength) % totalLength;
}

function clampRouteDistance(route: RouteTemplate, value: number) {
  if (route.isLoop) {
    return normalizeDistance(value, route.totalLength);
  }
  return THREE.MathUtils.clamp(value, 0, route.totalLength);
}

function routeDistanceAhead(
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

function createRouteSample(): RouteSample {
  return {
    position: new THREE.Vector3(),
    heading: new THREE.Vector3(0, 0, 1),
    segmentIndex: 0,
  };
}

function createVehicleMotionState(): VehicleMotionState {
  return {
    ...createRouteSample(),
    lanePosition: new THREE.Vector3(),
    right: new THREE.Vector3(1, 0, 0),
    yaw: 0,
    nextStopIndex: 0,
  };
}

function copyVehicleMotionState(
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

function createNextStopState(): NextStopState {
  return {
    index: -1,
    stop: null,
    ahead: Number.POSITIVE_INFINITY,
  };
}

function createVehicleSimulationSample(
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

function vehicleProximityCellCoord(value: number) {
  return Math.floor(value / VEHICLE_PROXIMITY_CELL_SIZE);
}

function addVehicleSampleToBucket(
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

function clearVehicleSampleBuckets(buckets: VehicleProximityBuckets) {
  buckets.forEach((column) => {
    column.forEach((bucket) => {
      bucket.length = 0;
    });
  });
}

function syncVehicleSampleBucket(
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

function routeSegmentIndexAtDistance(
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

function sampleRouteInto(
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

function writeRightVector(heading: THREE.Vector3, target: THREE.Vector3) {
  target.set(heading.z, 0, -heading.x);
  if (target.lengthSq() < 0.0001) {
    target.set(1, 0, 0);
  } else {
    target.normalize();
  }
  return target;
}

function resolveNextStopInto(
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

function resolveNextStop(
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

function offsetToRight(
  position: THREE.Vector3,
  heading: THREE.Vector3,
  offset: number,
) {
  const right = writeRightVector(heading, new THREE.Vector3());
  return position.clone().addScaledVector(right, offset);
}

function curbsideLaneOffset(route: Pick<RouteTemplate, "roadWidth" | "laneOffset">) {
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

function curbsideApproachBlend(vehicle: Vehicle) {
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

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function dampAngle(
  current: number,
  target: number,
  lambda: number,
  delta: number,
) {
  const gap = wrapAngle(target - current);
  return wrapAngle(current + gap * (1 - Math.exp(-lambda * delta)));
}

function sampleRoute(
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

function dominantAxis(start: THREE.Vector3, end: THREE.Vector3): SignalAxis {
  return Math.abs(end.x - start.x) > Math.abs(end.z - start.z) ? "ew" : "ns";
}

function signalDirectionForVector(vector: THREE.Vector3): SignalDirection {
  if (Math.abs(vector.x) > Math.abs(vector.z)) {
    return vector.x >= 0 ? "east" : "west";
  }
  return vector.z >= 0 ? "south" : "north";
}

function signalAxisForDirection(direction: SignalDirection): SignalAxis {
  return direction === "east" || direction === "west" ? "ew" : "ns";
}

function approachDirectionForHeading(heading: THREE.Vector3): SignalDirection {
  if (Math.abs(heading.x) > Math.abs(heading.z)) {
    return heading.x >= 0 ? "west" : "east";
  }
  return heading.z >= 0 ? "north" : "south";
}

function opposingSignalDirection(direction: SignalDirection): SignalDirection {
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

function dominantAxisForHeading(heading: THREE.Vector3): SignalAxis {
  return Math.abs(heading.x) > Math.abs(heading.z) ? "ew" : "ns";
}

function normalizeSignalOffset(offset: number) {
  return ((offset % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
}

function createSignalTurnDemand(): SignalTurnDemand {
  return {
    left: 0,
    straight: 0,
    right: 0,
  };
}

function createSignalApproachDemand(): SignalApproachDemand {
  return {
    north: createSignalTurnDemand(),
    east: createSignalTurnDemand(),
    south: createSignalTurnDemand(),
    west: createSignalTurnDemand(),
  };
}

function createSignalApproachDistance(): SignalApproachDistance {
  return {
    north: Number.POSITIVE_INFINITY,
    east: Number.POSITIVE_INFINITY,
    south: Number.POSITIVE_INFINITY,
    west: Number.POSITIVE_INFINITY,
  };
}

function resetSignalAxisOccupancy(target: SignalAxisOccupancy) {
  target.ns = 0;
  target.ew = 0;
  return target;
}

function createSignalDirectionalOccupancy(): SignalDirectionalOccupancy {
  return {
    north: 0,
    east: 0,
    south: 0,
    west: 0,
  };
}

function resetSignalDirectionalOccupancy(target: SignalDirectionalOccupancy) {
  target.north = 0;
  target.east = 0;
  target.south = 0;
  target.west = 0;
  return target;
}

function resetSignalTurnDemand(target: SignalTurnDemand) {
  target.left = 0;
  target.straight = 0;
  target.right = 0;
  return target;
}

function resetSignalApproachDemand(target: SignalApproachDemand) {
  resetSignalTurnDemand(target.north);
  resetSignalTurnDemand(target.east);
  resetSignalTurnDemand(target.south);
  resetSignalTurnDemand(target.west);
  return target;
}

function resetSignalApproachDistance(target: SignalApproachDistance) {
  target.north = Number.POSITIVE_INFINITY;
  target.east = Number.POSITIVE_INFINITY;
  target.south = Number.POSITIVE_INFINITY;
  target.west = Number.POSITIVE_INFINITY;
  return target;
}

function createSignalAxisOccupancy(): SignalAxisOccupancy {
  return {
    ns: 0,
    ew: 0,
  };
}

function signalFlowForAxis(
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

function pushSignalPhase(
  sequence: SignalPhaseStep[],
  duration: number,
  flow: SignalFlow,
) {
  if (duration <= 0.001) {
    return;
  }
  sequence.push({ duration, flow });
}

function buildSignalTimingPlan(
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

function createSignalData(
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

function signalAxisPresence(approaches: SignalDirection[]) {
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

function preferredSignalAxisForApproaches(
  approaches: SignalDirection[],
  point: THREE.Vector3,
): SignalAxis {
  const counts = signalAxisPresence(approaches);
  if (counts.ns === counts.ew) {
    return Math.abs(point.z) >= Math.abs(point.x) ? "ns" : "ew";
  }
  return counts.ns > counts.ew ? "ns" : "ew";
}

function assignCoordinatedSignalOffsets(
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

function averagePoint(points: THREE.Vector3[]) {
  if (!points.length) {
    return new THREE.Vector3();
  }

  const total = points.reduce(
    (sum, point) => sum.add(point),
    new THREE.Vector3(),
  );
  return total.multiplyScalar(1 / points.length);
}

function classifyTurn(
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

function colorForBuilding(height: number) {
  if (height >= 45) return 0x8f99a5;
  if (height >= 25) return 0x76808a;
  return 0x5d6670;
}

function buildDongRegions(
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

function pointInDongRing(point: THREE.Vector3, ring: THREE.Vector3[]) {
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

function dongContainsPoint(dong: DongRegion, point: THREE.Vector3) {
  return dong.rings.some(
    (ring) => ring.length >= 3 && pointInDongRing(point, ring),
  );
}

function canonicalBoundaryPoint(point: THREE.Vector3) {
  return `${point.x.toFixed(3)}:${point.z.toFixed(3)}`;
}

function buildDongBoundarySegments(dongRegions: DongRegion[]) {
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

function boundaryHintElement() {
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

function dongShapeFromRing(ring: THREE.Vector3[]) {
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

const nearestRoadDelta = new THREE.Vector3();
const nearestRoadOffset = new THREE.Vector3();
const nearestRoadClosest = new THREE.Vector3();
const nearestRoadHeading = new THREE.Vector3();

function nearestRoadContext(
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

function nearbyRoadSegments(
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

function nearestGraphNode(
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

function filterTransitBySpacing(
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

function buildTransitLandmarks(
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

function roadRank(roadClass: RoadProperties["roadClass"]) {
  switch (roadClass) {
    case "arterial":
      return 3;
    case "connector":
      return 2;
    default:
      return 1;
  }
}

function roadTravelCost(roadClass: RoadProperties["roadClass"]) {
  switch (roadClass) {
    case "arterial":
      return 0.9;
    case "connector":
      return 1;
    default:
      return 1.18;
  }
}

function edgeTravelCost(
  length: number,
  roadClass: RoadProperties["roadClass"],
) {
  return length * roadTravelCost(roadClass);
}

function annotateRoadGraphNodes(
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

type QueueEntry = {
  key: string;
  cost: number;
};

type PathSearchResult = {
  nodeKeys: string[];
  edgeIds: string[];
};

function queuePush(queue: QueueEntry[], entry: QueueEntry) {
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

function queuePop(queue: QueueEntry[]) {
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

function mostCommonLabel(values: Array<string | null | undefined>) {
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

function labelElement(
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

function hotspotCallElement() {
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

function buildBuildingMasses(
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

function createSubwayStationStructure(
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

function buildFallbackSignals(
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

function buildSignalsFromOsm(
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
    if (!anchorNode) {
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

    const point = anchorNode.point.clone();
    const visualShift = clusterPoint.clone().sub(point);
    visualShift.y = 0;
    const visualShiftDistance = visualShift.length();
    if (visualShiftDistance > 0.001) {
      const blendRatio =
        cluster.points.length >= 4
          ? 0.58
          : cluster.points.length === 3
            ? 0.48
            : cluster.points.length === 2
              ? 0.36
              : 0.12;
      const maxShiftDistance =
        cluster.points.length >= 4
          ? 5.6
          : cluster.points.length === 3
            ? 4.8
            : cluster.points.length === 2
              ? 3.8
              : 1.8;
      point.addScaledVector(
        visualShift,
        Math.min(visualShiftDistance * blendRatio, maxShiftDistance) /
          visualShiftDistance,
      );
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
        point,
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

function buildSignals(
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

function indexTurnRestrictionsByViaKey(
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

function buildRoadGraph(
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

function deserializeRoadGraph(data: SerializedRoadNetwork): RoadGraph {
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

function buildRoadNetworkOverlay(graph: RoadGraph) {
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

function disposeObject3DResources(object: THREE.Object3D) {
  object.traverse((child) => {
    const resourceHolder = child as THREE.Object3D & {
      geometry?: { dispose?: () => void };
      material?: { dispose?: () => void } | { dispose?: () => void }[];
    };
    resourceHolder.geometry?.dispose?.();
    if (Array.isArray(resourceHolder.material)) {
      resourceHolder.material.forEach((material) => material.dispose?.());
    } else {
      resourceHolder.material?.dispose?.();
    }
  });
}

function turnStateKey(nodeKey: string, incomingEdgeId: string | null) {
  return `${nodeKey}|${incomingEdgeId ?? ""}`;
}

function parseTurnStateKey(key: string) {
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

function isUTurn(incomingEdge: GraphEdge, outgoingEdge: GraphEdge) {
  return outgoingEdge.to === incomingEdge.from;
}

function isTurnRestricted(
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

function shortestPath(
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

function buildPathRoute(
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

function buildShortestRoute(
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

function compareRoadRouteCandidates(
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

function buildRoadRouteFromNodes(
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

function buildLoopRoutes(
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

function buildTrafficRoutes(
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

function hotspotLabelForRoute(
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

function selectDispatchHotspotNodeIndex(
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

function buildTaxiHotspots(
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

const SIGNAL_FLOW_NS_GREEN: SignalFlow = {
  phase: "ns_flow",
  ns: "green",
  ew: "red",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "stop",
};

const SIGNAL_FLOW_NS_YELLOW: SignalFlow = {
  phase: "ns_yellow",
  ns: "yellow",
  ew: "red",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "stop",
};

const SIGNAL_FLOW_NS_LEFT: SignalFlow = {
  phase: "ns_left",
  ns: "red",
  ew: "red",
  nsLeft: true,
  ewLeft: false,
  pedestrian: "stop",
};

const SIGNAL_FLOW_EW_GREEN: SignalFlow = {
  phase: "ew_flow",
  ns: "red",
  ew: "green",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "stop",
};

const SIGNAL_FLOW_EW_YELLOW: SignalFlow = {
  phase: "ew_yellow",
  ns: "red",
  ew: "yellow",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "stop",
};

const SIGNAL_FLOW_EW_LEFT: SignalFlow = {
  phase: "ew_left",
  ns: "red",
  ew: "red",
  nsLeft: false,
  ewLeft: true,
  pedestrian: "stop",
};

const SIGNAL_FLOW_CLEARANCE: SignalFlow = {
  phase: "clearance",
  ns: "red",
  ew: "red",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "stop",
};

const SIGNAL_FLOW_PED_WALK: SignalFlow = {
  phase: "ped_walk",
  ns: "red",
  ew: "red",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "walk",
};

const SIGNAL_FLOW_PED_FLASH: SignalFlow = {
  phase: "ped_flash",
  ns: "red",
  ew: "red",
  nsLeft: false,
  ewLeft: false,
  pedestrian: "flash",
};

function signalState(signal: SignalData, elapsedTime: number): SignalFlow {
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

function canVehicleProceed(
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

function loadTaxiAssetTemplate(path: string, timeoutMs = ASSET_FETCH_TIMEOUT_MS) {
  const loader = new FBXLoader();

  return new Promise<THREE.Group>((resolve, reject) => {
    const originalWarn = console.warn;
    const restoreWarn = () => {
      console.warn = originalWarn;
    };
    console.warn = (...args: unknown[]) => {
      const first = args[0];
      if (
        typeof first === "string" &&
        first.startsWith("THREE.FBXLoader:")
      ) {
        return;
      }
      originalWarn(...args);
    };
    const timeoutId = window.setTimeout(() => {
      restoreWarn();
      reject(new Error(`Timed out loading taxi asset: ${path}`));
    }, timeoutMs);

    loader.load(
      path,
      (object) => {
        window.clearTimeout(timeoutId);
        restoreWarn();
        resolve(object);
      },
      undefined,
      (error) => {
        window.clearTimeout(timeoutId);
        restoreWarn();
        reject(error);
      },
    );
  });
}

function normalizeTaxiAssetTemplate(source: THREE.Group) {
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
  model.scale.setScalar(TAXI_ASSET_TARGET_LENGTH / length);

  bounds = new THREE.Box3().setFromObject(container);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= bounds.min.y;

  container.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    child.castShadow = true;
    child.receiveShadow = true;
  });

  return container;
}

function vehicleAssetMaterialHint(object: THREE.Object3D) {
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
    return "body" as const;
  }
  if (/glass|screen|window|blue_grass/.test(sourceLabel)) {
    return "glass" as const;
  }
  if (/rubber|tire|wheel|plastic|black|air_duct/.test(sourceLabel)) {
    return "trim" as const;
  }
  if (/silver|metallic|chrome/.test(sourceLabel)) {
    return "metal" as const;
  }
  return "default" as const;
}

function createTaxiAssetGroup(
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

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

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
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 0.72), signMaterial);
  sign.position.set(0, assetBounds.max.y + 0.18, -0.24);
  sign.castShadow = true;
  group.add(sign);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 5),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const clickTarget = new THREE.Mesh(
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

  return { group, bodyMaterial, signMaterial, clickTarget };
}

function createVehicleGroup(
  kind: VehicleKind,
  palette: VehiclePalette,
  taxiAssetTemplate: THREE.Group | null = null,
) {
  if (kind === "taxi" && taxiAssetTemplate) {
    return createTaxiAssetGroup(palette, taxiAssetTemplate);
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
  if (kind === "taxi") {
    signMaterial = new THREE.MeshStandardMaterial({
      color: palette.sign ?? 0xfff9d8,
      emissive: 0x3d2b0c,
      emissiveIntensity: 0.08,
      roughness: 0.72,
      metalness: 0,
    });
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.26, 0.72),
      signMaterial,
    );
    sign.position.set(0, 2.45, -0.25);
    group.add(sign);
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

  return { group, bodyMaterial, signMaterial, clickTarget };
}

function createPedestrianGroup(seed: number) {
  const palette = [0xff8d71, 0x78c4ff, 0x79d58f, 0xffcb44, 0xc6a2ff][seed % 5];
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.82, 0.24),
    new THREE.MeshStandardMaterial({ color: palette, roughness: 0.8 }),
  );
  body.position.y = 0.74;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xf4d9c2, roughness: 0.7 }),
  );
  head.position.y = 1.34;
  group.add(head);

  const feet = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.12, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x1a2331, roughness: 0.92 }),
  );
  feet.position.y = 0.12;
  group.add(feet);

  return group;
}

function createCallerGroup(seed: number) {
  const topPalette = CALLER_TOP_PALETTES[seed % CALLER_TOP_PALETTES.length]!;
  const bottomPalette =
    CALLER_BOTTOM_PALETTES[seed % CALLER_BOTTOM_PALETTES.length]!;
  const group = new THREE.Group();

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.72),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const shoes = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.12, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x161c28, roughness: 0.94 }),
  );
  shoes.position.y = 0.06;
  group.add(shoes);

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.52, 0.22),
    new THREE.MeshStandardMaterial({ color: bottomPalette, roughness: 0.88 }),
  );
  legs.position.y = 0.38;
  group.add(legs);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.62, 0.28),
    new THREE.MeshStandardMaterial({ color: topPalette, roughness: 0.82 }),
  );
  torso.position.y = 0.94;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xf2d7bd, roughness: 0.75 }),
  );
  head.position.y = 1.42;
  group.add(head);

  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.56, 0.14),
    new THREE.MeshStandardMaterial({ color: topPalette, roughness: 0.84 }),
  );
  leftArm.position.set(-0.34, 0.9, 0);
  leftArm.rotation.z = 0.18;
  group.add(leftArm);

  const waveArmPivot = new THREE.Group();
  waveArmPivot.position.set(0.32, 1.16, 0);
  group.add(waveArmPivot);

  const waveArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.6, 0.14),
    new THREE.MeshStandardMaterial({ color: topPalette, roughness: 0.84 }),
  );
  waveArm.position.set(0, -0.28, 0);
  waveArmPivot.add(waveArm);

  const hailCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.24, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0xb8c2c9,
      emissive: 0x21303c,
      emissiveIntensity: 0.08,
      roughness: 0.58,
    }),
  );
  hailCube.position.set(0.12, -0.62, 0.08);
  waveArmPivot.add(hailCube);

  return { group, waveArmPivot, hailCube };
}

function buildMajorRoadNames(roads: RoadFeatureCollection | null) {
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

function setTaxiAppearance(vehicle: Vehicle) {
  if (vehicle.kind !== "taxi") {
    return;
  }
  if (vehicle.isOccupied) {
    vehicle.bodyMaterial.color.setHex(0xf08d1a);
    vehicle.bodyMaterial.emissive.setHex(0x472300);
    vehicle.bodyMaterial.emissiveIntensity = 0.18;
    vehicle.signMaterial?.color.setHex(0xffefcc);
    vehicle.signMaterial?.emissive.setHex(0x8a6314);
    if (vehicle.signMaterial) {
      vehicle.signMaterial.emissiveIntensity = 0.34;
    }
    return;
  }

  vehicle.bodyMaterial.color.setHex(vehicle.palette.body);
  vehicle.bodyMaterial.emissive.setHex(0x321500);
  vehicle.bodyMaterial.emissiveIntensity = 0.1;
  vehicle.signMaterial?.color.setHex(0xffe1aa);
  vehicle.signMaterial?.emissive.setHex(0x7d4800);
  if (vehicle.signMaterial) {
    vehicle.signMaterial.emissiveIntensity = 0.28;
  }
}

function updateVehicleMotionState(vehicle: Vehicle) {
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

function syncVehicleTransform(vehicle: Vehicle, alpha = 1) {
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

function assignVehicleRoute(
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

type MapSimulatorProps = {
  buildVersion: BuildVersionInfo;
};

export default function MapSimulator({ buildVersion }: MapSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SimulationData | null>(null);
  const [status, setStatus] = useState<SceneStatus>("loading");
  const [statusDetail, setStatusDetail] = useState(
    "OSM 지도 데이터 불러오는 중",
  );
  const [showLabels, setShowLabels] = useState(false);
  const [showNonRoad, setShowNonRoad] = useState(true);
  const [showTransit, setShowTransit] = useState(false);
  const [showRoadNetwork, setShowRoadNetwork] = useState(false);
  const [circumstanceMode, setCircumstanceMode] =
    useState<CircumstanceMode>("live");
  const [simulationDate, setSimulationDate] = useState(
    () => HYDRATION_SAFE_SIMULATION_CLOCK.dateIso,
  );
  const [simulationTimeMinutes, setSimulationTimeMinutes] = useState(
    () => HYDRATION_SAFE_SIMULATION_CLOCK.minutes,
  );
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("clear");
  const [cameraMode, setCameraMode] = useState<CameraMode>("drive");
  const [followTaxiId, setFollowTaxiId] = useState("");
  const [selectedSubwayName, setSelectedSubwayName] = useState("");
  const [simulationDensity, setSimulationDensity] = useState(() => ({
    taxis: DEFAULT_TAXI_COUNT,
    traffic: DEFAULT_TRAFFIC_COUNT,
  }));
  const [showFps, setShowFps] = useState(false);
  const [fpsMode, setFpsMode] = useState<FpsMode>("fixed60");
  const [fpsStats, setFpsStats] = useState<FpsStats>({
    fps: 0,
    capLabel: renderCapLabel(renderFpsCapFor("drive"), false, "fixed60"),
    simulationMs: 0,
    signalMs: 0,
    vehicleMs: 0,
    overlayMs: 0,
    renderMs: 0,
    simulationHz: 0,
    vehicles: 0,
  });
  const appliedTaxiCount = simulationDensity.taxis;
  const appliedTrafficCount = simulationDensity.traffic;
  const appliedTaxiCountRef = useRef(appliedTaxiCount);
  const appliedTrafficCountRef = useRef(appliedTrafficCount);
  const simulationDateRef = useRef(HYDRATION_SAFE_SIMULATION_CLOCK.dateIso);
  const simulationTimeRef = useRef(HYDRATION_SAFE_SIMULATION_CLOCK.minutes);
  const weatherModeRef = useRef<WeatherMode>("clear");
  const cameraModeRef = useRef<CameraMode>("drive");
  const followTaxiIdRef = useRef("");
  const rideExitModeRef = useRef<BaseCameraMode>("drive");
  const showLabelsRef = useRef(false);
  const optionalLabelObjectsRef = useRef<CSS2DObject[]>([]);
  const showTransitRef = useRef(false);
  const transitGroupRef = useRef<THREE.Group | null>(null);
  const hoverRefreshRequestRef = useRef(0);
  const labelRefreshRequestRef = useRef(0);
  const showFpsRef = useRef(false);
  const fpsModeRef = useRef<FpsMode>("fixed60");
  const showNonRoadRef = useRef(true);
  const nonRoadGroupRef = useRef<THREE.Group | null>(null);
  const showRoadNetworkRef = useRef(false);
  const roadNetworkGroupRef = useRef<THREE.Group | null>(null);
  const cameraFocusTargetRef = useRef<CameraFocusTarget | null>(null);
  const [stats, setStats] = useState<Stats>({
    taxis: DEFAULT_TAXI_COUNT,
    traffic: DEFAULT_TRAFFIC_COUNT,
    waiting: 0,
    signals: 0,
    activeTrips: 0,
    completedTrips: 0,
    pedestrians: 0,
    pickups: 0,
    dropoffs: 0,
    activeCalls: 0,
    avgPickupWaitSeconds: 0,
    avgRideSeconds: 0,
  });

  function markSceneRendering(detail: string) {
    setStatus("rendering");
    setStatusDetail(detail);
  }

  function markSceneError(detail: string) {
    setStatus("error");
    setStatusDetail(detail);
  }

  useEffect(() => {
    simulationDateRef.current = simulationDate;
  }, [simulationDate]);

  useEffect(() => {
    simulationTimeRef.current = simulationTimeMinutes;
  }, [simulationTimeMinutes]);

  useEffect(() => {
    weatherModeRef.current = weatherMode;
  }, [weatherMode]);

  useEffect(() => {
    if (circumstanceMode !== "live") {
      return;
    }

    const syncClock = () => {
      const clock = currentSimulationClock();
      setSimulationDate((current) =>
        current === clock.dateIso ? current : clock.dateIso,
      );
      setSimulationTimeMinutes((current) =>
        current === clock.minutes ? current : clock.minutes,
      );
    };

    syncClock();
    const intervalId = window.setInterval(syncClock, 15_000);
    return () => window.clearInterval(intervalId);
  }, [circumstanceMode]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    appliedTaxiCountRef.current = appliedTaxiCount;
    appliedTrafficCountRef.current = appliedTrafficCount;
  }, [appliedTaxiCount, appliedTrafficCount]);

  useEffect(() => {
    showLabelsRef.current = showLabels;
    labelRefreshRequestRef.current += 1;
  }, [showLabels]);

  useEffect(() => {
    showTransitRef.current = showTransit;
    if (transitGroupRef.current) {
      transitGroupRef.current.visible = showTransit;
    }
    hoverRefreshRequestRef.current += 1;
    labelRefreshRequestRef.current += 1;
  }, [showTransit]);

  useEffect(() => {
    showFpsRef.current = showFps;
  }, [showFps]);

  useEffect(() => {
    fpsModeRef.current = fpsMode;
  }, [fpsMode]);

  useEffect(() => {
    showNonRoadRef.current = showNonRoad;
    if (nonRoadGroupRef.current) {
      nonRoadGroupRef.current.visible = showNonRoad;
    }
  }, [showNonRoad]);

  useEffect(() => {
    showRoadNetworkRef.current = showRoadNetwork;
    if (roadNetworkGroupRef.current) {
      roadNetworkGroupRef.current.visible = showRoadNetwork;
    }
  }, [showRoadNetwork]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchOptionalGeoJsonAsset<NonRoadFeatureCollection>(
        "/non-road.geojson",
        "non-road",
      ),
      fetchGeoJsonAsset<RoadFeatureCollection>("/roads.geojson"),
      fetchGeoJsonAsset<BuildingFeatureCollection>("/buildings.geojson"),
      fetchGeoJsonAsset<DongFeatureCollection>("/dongs.geojson"),
      fetchGeoJsonAsset<TransitFeatureCollection>("/transit.geojson"),
      fetchOptionalGeoJsonAsset<TrafficSignalFeatureCollection>(
        "/traffic-signals.geojson",
        "traffic-signals",
      ),
      fetchRoadNetworkAsset("/road-network.json"),
    ])
      .then(
        ([
          nonRoadAsset,
          roadsAsset,
          buildingsAsset,
          dongsAsset,
          transitAsset,
          trafficSignalsAsset,
          roadNetworkAsset,
        ]) => {
          if (cancelled) {
            return;
          }
          setStatusDetail("도로 세그먼트와 공간 인덱스 준비 중");
          const nonRoad =
            nonRoadAsset?.data ?? EMPTY_NON_ROAD_FEATURE_COLLECTION;
          const roads = roadsAsset.data;
          const buildings = buildingsAsset.data;
          const dongs = dongsAsset.data;
          const transit = transitAsset.data;
          const trafficSignals =
            trafficSignalsAsset?.data ??
            EMPTY_TRAFFIC_SIGNAL_FEATURE_COLLECTION;
          const roadNetwork = roadNetworkAsset?.data ?? null;
          const assetTimes = [
            nonRoadAsset?.meta.lastModified ?? null,
            roadsAsset.meta.lastModified,
            buildingsAsset.meta.lastModified,
            dongsAsset.meta.lastModified,
            transitAsset.meta.lastModified,
            trafficSignalsAsset?.meta.lastModified ?? null,
            roadNetworkAsset?.meta.lastModified ?? null,
          ]
            .filter(Boolean)
            .sort() as string[];
          const center =
            roadNetwork?.center ??
            (dongs.features.length
              ? featureCollectionCenter(dongs)
              : DEFAULT_MAP_CENTER);
          const projectedRoadSegments = buildProjectedRoadSegments(roads, center);
          const roadSegmentSpatialIndex = buildRoadSegmentSpatialIndex(
            projectedRoadSegments,
          );
          const buildingMasses = buildBuildingMasses(buildings, center);
          const dongRegions = buildDongRegions(dongs, center);
          const dongBoundarySegments = SHOW_DONG_BOUNDARIES
            ? buildDongBoundarySegments(dongRegions)
            : [];
          const transitLandmarks = buildTransitLandmarks(
            transit,
            center,
            projectedRoadSegments,
            roadSegmentSpatialIndex,
          );
          setStatusDetail("도로 그래프와 신호 체계 준비 중");
          const graph = roadNetwork
            ? deserializeRoadGraph(roadNetwork)
            : buildRoadGraph(roads, center);
          const signals = buildSignals(
            roads,
            center,
            graph,
            trafficSignals,
            projectedRoadSegments,
            roadSegmentSpatialIndex,
          );
          const signalByKey = new Map(
            signals.map((signal) => [signal.key, signal] as const),
          );
          const loopRoutes = buildLoopRoutes(roads, center, signalByKey);
          const trafficRoutes = buildTrafficRoutes(roads, center, signalByKey);
          const taxiRoutePool = loopRoutes
            .filter((route) => route.roadClass !== "local")
            .slice(0, Math.max(MAX_TAXI_COUNT, DEFAULT_TAXI_COUNT));
          const trafficRoutePool = trafficRoutes.slice(
            0,
            Math.max(MAX_TRAFFIC_COUNT, 20),
          );
          if (!taxiRoutePool.length || !trafficRoutePool.length) {
            throw new Error("No drivable routes available for vehicle simulation");
          }
          setStatusDetail("배차 경로와 승차 포인트 준비 중");
          const hotspotPool = buildTaxiHotspots(
            taxiRoutePool,
            buildingMasses,
            graph,
            signalByKey,
          );
          if (!hotspotPool.length) {
            throw new Error("No dispatch hotspots available for taxi simulation");
          }
          const nextData = {
            center,
            nonRoad,
            roads,
            projectedRoadSegments,
            roadSegmentSpatialIndex,
            buildings,
            buildingMasses,
            dongs,
            dongRegions,
            dongBoundarySegments,
            transit,
            transitLandmarks,
            trafficSignals,
            roadNetwork,
            graph,
            signals,
            loopRoutes,
            taxiRoutePool,
            trafficRoutePool,
            hotspotPool,
            meta: {
              source:
                "A-Eye Module 1 companion: OpenStreetMap + Overpass -> public/*.geojson + public/road-network.json",
              boundarySource: "OSM administrative relations (admin_level=8)",
              dispatchPlannerId: ACTIVE_DISPATCH_PLANNER_ID,
              latestAssetUpdatedAt: assetTimes.at(-1) ?? null,
              loadedAt: formatKstDateTime(new Date()) ?? "unknown",
              assets: {
                nonRoad: nonRoadAsset?.meta ?? null,
                roads: roadsAsset.meta,
                buildings: buildingsAsset.meta,
                dongs: dongsAsset.meta,
                transit: transitAsset.meta,
                trafficSignals: trafficSignalsAsset?.meta ?? null,
                roadNetwork: roadNetworkAsset?.meta ?? null,
              },
            },
          };
          markSceneRendering("3D 장면과 차량 레이어 구성 중");
          requestAnimationFrame(() => {
            if (!cancelled) {
              setData(nextData);
            }
          });
        },
      )
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          markSceneError("자산 또는 초기 장면 준비에 실패했습니다");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    const overviewMinDistance = THREE.MathUtils.clamp(
      Math.max(size.x, size.z) * 0.94,
      96,
      Math.max(140, maxMapDistance - 34),
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
    const taxiClickTargets: THREE.Object3D[] = [];
    const taxiById = new Map<string, Vehicle>();
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
    let vehicleLayerReady = false;
    let taxiAssetTemplate: THREE.Group | null = null;
    let activeVehicleSpeedMultiplier = 1;
    let activeStarOpacity = 0;
    let vehicleSimulationAccumulator = 0;
    let appliedDateIso: string | null = null;
    let appliedWeatherMode: WeatherMode | null = null;
    let appliedTimeMinutes = -1;
    let hotspotActivityAccumulator = HOTSPOT_ACTIVITY_REFRESH_INTERVAL;
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
          createVehicleGroup("taxi", vehicle.palette, taxiAssetTemplate);

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

    const clearVehicleLayer = () => {
      vehicles.forEach((vehicle) => {
        vehicle.group.removeFromParent();
        disposeObject3DResources(vehicle.group);
      });
      vehicles.length = 0;
      taxiVehicles.length = 0;
      taxiClickTargets.length = 0;
      taxiById.clear();
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

    const rebuildVehicleLayer = (nextTaxiCount: number, nextTrafficCount: number) => {
      if (!dispatchPlanner || !hotspotPool.length || !trafficRoutePool.length) {
        return;
      }
      if (!sceneDisposed) {
        setStatusDetail("차량 레이어 구성 중");
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
          createVehicleGroup("taxi", TAXI_PALETTE, taxiAssetTemplate);
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
      }

      replaceDemandMapContents(activePickupsByHotspot, bootstrapPickupDemandMap);
      replaceDemandMapContents(activeDropoffsByHotspot, bootstrapDropoffDemandMap);
      hotspotDemandMapsDirty = false;
      hotspotActivityAccumulator = 0;
      syncSelectedTaxi();
      hoverNeedsUpdate = true;
      updateVehicleLayerStats(taxiVehicles.length, vehicles.length - taxiVehicles.length);
      if (!sceneDisposed) {
        setStatus("ready");
        setStatusDetail("주행 준비 완료");
      }
    };

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

      rebuildVehicleLayer(nextTaxiCount, nextTrafficCount);
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
        color: 0x4b5054,
        roughness: 0.97,
        metalness: 0.01,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
      connector: new THREE.MeshStandardMaterial({
        color: 0x44494d,
        roughness: 0.97,
        metalness: 0.01,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
      local: new THREE.MeshStandardMaterial({
        color: 0x3d4246,
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
      color: 0xd9d1bd,
      emissive: 0x373127,
      emissiveIntensity: 0.04,
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
        if (!showLabelsRef.current) {
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
        cameraRig.pitch = Math.max(cameraRig.pitch, 0.86);
        cameraRig.distance = Math.max(
          cameraRig.distance,
          overviewMinDistance * 1.04,
        );
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

    const loopRoutes = data.loopRoutes;
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

      const mastDistance = signal.approaches.length >= 4 ? 2.9 : 2.55;
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

    const finalizeVehicleLayerSetup = () => {
      vehicleLayerReady = true;
      rebuildVehicleLayer(
        appliedTaxiCountRef.current,
        appliedTrafficCountRef.current,
      );

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

    let taxiAssetLoadScheduledId = 0;
    let taxiAssetLoadStarted = false;
    const loadTaxiAssetInBackground = () => {
      if (sceneDisposed || taxiAssetTemplate || taxiAssetLoadStarted) {
        return;
      }

      taxiAssetLoadStarted = true;
      void (async () => {
        try {
          const loadedTemplate = await loadTaxiAssetTemplate(KAKAO_TAXI_ASSET_PATH);
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

      activeVehicleSpeedMultiplier = environment.vehicleSpeedMultiplier;
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

    const updateSignalVisuals = (elapsedTime: number) => {
      if (!signalVisuals.length) {
        frameSignalStates.clear();
        return;
      }

      // Pre-allocate signal demands on first frame
      if (intersectionApproachDemand.size === 0 && signalVisuals.length > 0) {
        signalVisuals.forEach((signal) => {
          if (!intersectionApproachDemand.has(signal.id)) {
            intersectionApproachDemand.set(signal.id, createSignalApproachDemand());
          }
          if (!intersectionApproachDistance.has(signal.id)) {
            intersectionApproachDistance.set(signal.id, createSignalApproachDistance());
          }
          if (!intersectionOccupancy.has(signal.id)) {
            intersectionOccupancy.set(signal.id, createSignalAxisOccupancy());
          }
          if (!intersectionExitOccupancy.has(signal.id)) {
            intersectionExitOccupancy.set(
              signal.id,
              createSignalDirectionalOccupancy(),
            );
          }
        });
      }
      frameSignalStates.clear();
      signalVisuals.forEach((signal) => {
        const state = signalState(signal, elapsedTime);
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

    const updateHotspotVisuals = (delta: number, elapsedTime: number) => {
      if (!hotspotVisuals.length) {
        return;
      }

      if (hotspotDemandMapsDirty) {
        syncActiveHotspotDemandMaps();
      }

      hotspotActivityAccumulator += delta;
      if (!vehicles.length) {
        hotspotActivityAccumulator = 0;
        activePickupsByHotspot.clear();
        activeDropoffsByHotspot.clear();
        hotspotDemandMapsDirty = false;
      } else if (hotspotActivityAccumulator >= HOTSPOT_ACTIVITY_REFRESH_INTERVAL) {
        syncActiveHotspotDemandMaps();
      }

      const pickupTaxiNumbersByHotspot = new Map<string, number[]>();
      const dropoffTaxiNumbersByHotspot = new Map<string, number[]>();
      for (let vehicleIndex = 0; vehicleIndex < taxiVehicles.length; vehicleIndex += 1) {
        const vehicle = taxiVehicles[vehicleIndex]!;
        const taxiNumber = taxiDisplayNumber(vehicle.id);
        if (!taxiNumber) {
          continue;
        }

        if (!vehicle.isOccupied && vehicle.pickupHotspot) {
          const activeTaxiNumbers =
            pickupTaxiNumbersByHotspot.get(vehicle.pickupHotspot.id) ?? [];
          activeTaxiNumbers.push(taxiNumber);
          pickupTaxiNumbersByHotspot.set(
            vehicle.pickupHotspot.id,
            activeTaxiNumbers,
          );
        }

        if (vehicle.isOccupied && vehicle.dropoffHotspot) {
          const activeTaxiNumbers =
            dropoffTaxiNumbersByHotspot.get(vehicle.dropoffHotspot.id) ?? [];
          activeTaxiNumbers.push(taxiNumber);
          dropoffTaxiNumbersByHotspot.set(
            vehicle.dropoffHotspot.id,
            activeTaxiNumbers,
          );
        }
      }

      for (let index = 0; index < hotspotVisuals.length; index += 1) {
        const visual = hotspotVisuals[index]!;
        const pickupCalls = activePickupsByHotspot.get(visual.hotspot.id) ?? 0;
        const dropoffCalls =
          activeDropoffsByHotspot.get(visual.hotspot.id) ?? 0;
        const markerMode: HotspotMarkerMode =
          pickupCalls > 0 ? "pickup" : dropoffCalls > 0 ? "dropoff" : "idle";
        const isActive = markerMode !== "idle";
        const markerPresentation = dispatchPresentation.hotspot[markerMode];
        const accentColor = markerPresentation.accentColor;
        const badgeText = formatHotspotTaxiBadge(
          markerPresentation.badgeLabel,
          markerMode === "pickup"
            ? (pickupTaxiNumbersByHotspot.get(visual.hotspot.id) ?? [])
            : markerMode === "dropoff"
              ? (dropoffTaxiNumbersByHotspot.get(visual.hotspot.id) ?? [])
              : [],
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
        const pedestrianFlashVisible =
          state.pedestrian === "flash" &&
          Math.sin(elapsedTime * 14 + pedestrian.phaseOffset) > 0;
        const isVisible =
          state.pedestrian === "walk" || pedestrianFlashVisible;

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
      if (
        nextSimulationDate !== appliedDateIso ||
        nextSimulationTime !== appliedTimeMinutes ||
        nextWeatherMode !== appliedWeatherMode
      ) {
        appliedDateIso = nextSimulationDate;
        appliedTimeMinutes = nextSimulationTime;
        appliedWeatherMode = nextWeatherMode;
        applyEnvironment(
          nextSimulationDate,
          nextSimulationTime,
          nextWeatherMode,
        );
      }
      const currentMode = cameraModeRef.current;
      if (currentMode !== activeCameraMode) {
        activeCameraMode = currentMode;
        applyModePreset(currentMode);
        applyDistrictPresentation(currentMode);
        applyRenderBudget(currentMode);
        markLabelVisibilityDirty();
      }
      syncPrecipitationDensity(currentMode);
      syncVehicleDensity();
      const signalCpuStart = performance.now();
      updateSignalVisuals(elapsedTime);
      signalCpuSampleMs += performance.now() - signalCpuStart;
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
        updateVehicles(VEHICLE_SIMULATION_STEP, elapsedTime);
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
      for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex += 1) {
        syncVehicleTransform(
          vehicles[vehicleIndex]!,
          vehicleInterpolationAlpha,
        );
      }
      simulationStepSampleCount += vehicleSimulationSteps;
      vehicleCpuSampleMs += performance.now() - vehicleCpuStart;

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
        cameraLookLift = 1.8;
        cameraRig.focus.copy(centerPoint);
        cameraRig.focus.y = 0;
        cameraRig.yaw = dampAngle(cameraRig.yaw, overviewYaw, 4.8, delta);
        cameraRig.pitch = THREE.MathUtils.clamp(
          cameraRig.pitch,
          0.82,
          CAMERA_MAX_PITCH,
        );
        cameraRig.distance = THREE.MathUtils.clamp(
          Math.max(cameraRig.distance, overviewMinDistance),
          overviewMinDistance,
          maxMapDistance,
        );
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

      const overlayCpuStart = performance.now();
      updateHotspotVisuals(delta, elapsedTime);
      updatePedestrians(elapsedTime);
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
        if (showFpsRef.current) {
          const nextFps = Math.round(fpsFrameCount / fpsSampleElapsed);
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
            current.capLabel === nextCapLabel
              ? current
              : {
                ...current,
                capLabel: nextCapLabel,
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
    taxiAssetLoadScheduledId = window.setTimeout(loadTaxiAssetInBackground, 900);
    animate();

    return () => {
      sceneDisposed = true;
      if (taxiAssetLoadScheduledId) {
        window.clearTimeout(taxiAssetLoadScheduledId);
      }
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
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
  }, [data]);

  const roadNames = useMemo(
    () => buildMajorRoadNames(data?.roads ?? null),
    [data],
  );
  const dongNames = useMemo(
    () => data?.dongs.features.map((dong) => dong.properties.name) ?? [],
    [data],
  );
  const transitHighlights = useMemo(() => {
    if (!data) {
      return [] as TransitLandmark[];
    }

    return data.transitLandmarks;
  }, [data]);
  const scenarioMapCenter = useMemo(() => {
    const segments = data?.projectedRoadSegments;
    if (!segments?.length) {
      return null;
    }

    const bounds = new THREE.Box3();
    segments.forEach((segment) => {
      bounds.expandByPoint(segment.start);
      bounds.expandByPoint(segment.end);
    });
    return bounds.getCenter(new THREE.Vector3());
  }, [data?.projectedRoadSegments]);
  const transitCounts = useMemo(
    () => ({
      busStops: transitHighlights.filter(
        (feature) => feature.category === "bus_stop",
      ).length,
      subwayStations: transitHighlights.filter(
        (feature) => feature.category === "subway_station",
      ).length,
    }),
    [transitHighlights],
  );
  const dispatchPlannerId =
    data?.meta.dispatchPlannerId ?? ACTIVE_DISPATCH_PLANNER_ID;
  const dispatchPresentation = useMemo(
    () => resolveDispatchPlannerPresentation(dispatchPlannerId),
    [dispatchPlannerId],
  );
  const subwayHubs = useMemo(
    () => {
      const byName = new Map<string, TransitLandmark>();
      transitHighlights
        .filter(
          (feature) => feature.category === "subway_station" && feature.isMajor,
        )
        .forEach((feature) => {
          const name = feature.name;
          if (!name) {
            return;
          }

          const existing = byName.get(name);
          if (!existing || feature.importance > existing.importance) {
            byName.set(name, feature);
          }
        });

      return [...byName.values()]
        .sort((left, right) => right.importance - left.importance)
        .slice(0, 8);
    },
    [transitHighlights],
  );
  const handleSubwayFocus = (
    station: TransitLandmark,
    options?: {
      x?: number;
      z?: number;
      distance?: number;
      pitch?: number;
      yaw?: number;
    },
  ) => {
    const label = station.name ?? "지하철역";
    setSelectedSubwayName(label);
    setShowTransit(true);
    cameraFocusTargetRef.current = {
      x: options?.x ?? station.position.x,
      z: options?.z ?? station.position.z,
      distance: options?.distance ?? SUBWAY_FOCUS_DISTANCE,
      pitch: options?.pitch ?? SUBWAY_FOCUS_PITCH,
      label,
      yaw: options?.yaw,
    };
    if (cameraModeRef.current !== "drive") {
      cameraModeRef.current = "drive";
      setCameraMode("drive");
    }
  };
  const applyLocalScenario = (scenario: LocalScenarioPreset) => {
    const clock = currentSimulationClock();
    const scenarioCamera = scenario.camera;
    const shouldRebuildVehicleLayer =
      appliedTaxiCountRef.current !== scenario.taxis ||
      appliedTrafficCountRef.current !== scenario.traffic;
    const focusStation =
      (scenario.focusStationKeyword
        ? subwayHubs.find((station) =>
          (station.name ?? "").includes(scenario.focusStationKeyword ?? ""),
        )
        : null) ??
      subwayHubs[0] ??
      null;

    if (shouldRebuildVehicleLayer) {
      markSceneRendering("시나리오 기준으로 차량 배치 다시 구성 중");
    }
    setCircumstanceMode("specific");
    setSimulationDate(clock.dateIso);
    setSimulationTimeMinutes(scenario.minutes);
    setWeatherMode(scenario.weather);
    setSimulationDensity({
      taxis: scenario.taxis,
      traffic: scenario.traffic,
    });

    if (focusStation) {
      const focusCenterBlend =
        scenarioCamera?.focusCenterBlend ?? LOCAL_SCENARIO_FOCUS_CENTER_BLEND;
      const scenarioFocusX = scenarioMapCenter
        ? THREE.MathUtils.lerp(
            focusStation.position.x,
            scenarioMapCenter.x,
            focusCenterBlend,
          )
        : focusStation.position.x;
      const scenarioFocusZ = scenarioMapCenter
        ? THREE.MathUtils.lerp(
            focusStation.position.z,
            scenarioMapCenter.z,
            focusCenterBlend,
          )
        : focusStation.position.z;
      const scenarioYaw = scenarioMapCenter
        ? Math.atan2(
            scenarioFocusX - scenarioMapCenter.x,
            scenarioFocusZ - scenarioMapCenter.z,
          )
        : undefined;
      handleSubwayFocus(focusStation, {
        x: scenarioFocusX,
        z: scenarioFocusZ,
        distance:
          scenarioCamera?.distance ?? LOCAL_SCENARIO_FOCUS_DISTANCE,
        pitch: scenarioCamera?.pitch ?? LOCAL_SCENARIO_FOCUS_PITCH,
        yaw:
          scenarioYaw === undefined
            ? undefined
            : scenarioYaw +
              (scenarioCamera?.yawOffset ?? LOCAL_SCENARIO_FOCUS_YAW_OFFSET),
      });
      return;
    }

    if (cameraModeRef.current !== "drive") {
      cameraModeRef.current = "drive";
      setCameraMode("drive");
    }
  };
  const taxiOptions = useMemo(
    () =>
      Array.from({ length: stats.taxis }, (_, index) => ({
        id: `taxi-${index}`,
        label: `택시 ${index + 1}`,
        detail:
          dongNames[index % Math.max(dongNames.length, 1)] ??
          roadNames[index % Math.max(roadNames.length, 1)] ??
          "강남 코어 순환",
      })),
    [stats.taxis, dongNames, roadNames],
  );
  const selectedTaxiId =
    taxiOptions.find((taxi) => taxi.id === followTaxiId)?.id ??
    taxiOptions[0]?.id ??
    "";
  useEffect(() => {
    followTaxiIdRef.current = selectedTaxiId;
  }, [selectedTaxiId]);
  const selectedTaxi = useMemo(
    () =>
      taxiOptions.find((taxi) => taxi.id === selectedTaxiId) ??
      taxiOptions[0] ??
      null,
    [selectedTaxiId, taxiOptions],
  );
  const cameraModeLabel =
    cameraMode === "overview"
      ? "오버뷰"
      : cameraMode === "follow"
        ? "택시 추적"
        : cameraMode === "ride"
          ? "택시 시점"
          : "드라이브";
  const statusLabel =
    status === "loading"
      ? "데이터 불러오는 중"
      : status === "rendering"
        ? "장면 구성 중"
        : status === "ready"
          ? "주행 준비 완료"
          : "불러오기 실패";
  const controlHint =
    cameraMode === "overview"
      ? "오버뷰: 좌클릭 드래그로 도시를 돌려보고 휠로 줌을 조절합니다. 택시를 클릭하면 택시 시점으로 들어갑니다."
      : cameraMode === "follow"
        ? `팔로우: ${selectedTaxi?.label ?? "선택한 택시"}를 자동 추적하고, 드래그로 시점을 살짝 돌릴 수 있습니다. 택시를 클릭하면 더 가까운 택시 시점으로 전환됩니다.`
        : cameraMode === "ride"
          ? `택시 시점: ${selectedTaxi?.label ?? "선택한 택시"} 뒤를 따라가며 이동합니다. Esc를 누르면 이전 시점으로 돌아갑니다.`
          : "드라이브: 좌클릭 드래그로 시점을 돌리고 W/S 또는 ↑/↓로 전후진, A/D 또는 ←/→로 좌우 이동, Q/E로 회전합니다. 택시를 클릭하면 택시 시점으로 들어갑니다.";
  const selectedWeather =
    WEATHER_OPTIONS.find((option) => option.id === weatherMode) ??
    WEATHER_OPTIONS[0];
  const assetVersionDetails = useMemo(() => {
    if (!data) {
      return [];
    }

    return SIMULATION_ASSET_LABELS.flatMap(({ key, label }) => {
      const meta = data.meta.assets[key];
      if (!meta) {
        return [];
      }

      return [
        {
          key,
          label,
          pathLabel: assetFileName(meta.path),
          updatedAt: meta.lastModified ?? "갱신 시각 없음",
          featureCount: meta.featureCount,
        },
      ];
    });
  }, [data]);
  const normalizedSimulationTimeMinutes = normalizeDayMinutes(
    simulationTimeMinutes,
  );
  const activeLocalScenario =
    circumstanceMode === "specific"
      ? LOCAL_SCENARIO_PRESETS.find(
        (scenario) =>
          scenario.minutes === normalizedSimulationTimeMinutes &&
          scenario.weather === weatherMode &&
          scenario.taxis === simulationDensity.taxis &&
          scenario.traffic === simulationDensity.traffic,
      ) ?? null
      : null;
  const solarReferenceCenter = data?.center ?? DEFAULT_MAP_CENTER;
  const formattedSimulationTime = format24Hour(normalizedSimulationTimeMinutes);
  const formattedSimulationDate = formatDateLabel(simulationDate);
  const simulationTimeBand = timeBandLabel(normalizedSimulationTimeMinutes);
  const daylightValue = daylightFactor(
    simulationDate,
    normalizedSimulationTimeMinutes,
    solarReferenceCenter,
  );
  const twilightValue = twilightFactor(
    simulationDate,
    normalizedSimulationTimeMinutes,
    solarReferenceCenter,
  );
  const daylightLabel =
    daylightValue > 0.18 ? "낮" : twilightValue > 0.25 ? "황혼" : "밤";
  const circumstanceModeLabel =
    circumstanceMode === "live" ? "실시간" : "특정 시각";
  const circumstanceOptions: Array<{ id: CircumstanceMode; label: string }> = [
    { id: "live", label: "실시간" },
    { id: "specific", label: "특정 시각" },
  ];
  const fpsModeOptions: Array<{ id: FpsMode; label: string }> = [
    { id: "auto", label: "자동" },
    { id: "fixed60", label: "60 FPS" },
    { id: "unlimited", label: "무제한" },
  ];
  const isDensityApplying =
    status !== "ready" ||
    simulationDensity.taxis !== stats.taxis ||
    simulationDensity.traffic !== stats.traffic;
  const totalVehicles = stats.taxis + stats.traffic;
  const waitingShare = totalVehicles
    ? Math.round((stats.waiting / totalVehicles) * 100)
    : 0;
  const tripVolume = stats.activeTrips + stats.completedTrips;
  const tripCompletionShare = tripVolume
    ? Math.round((stats.completedTrips / tripVolume) * 100)
    : 0;
  const localFlowLabel =
    tripVolume === 0
      ? "대기"
      : waitingShare >= 30
        ? "혼잡"
        : tripCompletionShare >= 50
          ? "안정"
          : "활발";
  const averagePickupWaitLabel =
    stats.pickups > 0 ? formatMetricDuration(stats.avgPickupWaitSeconds) : "-";
  const averageRideDurationLabel =
    stats.dropoffs > 0 ? formatMetricDuration(stats.avgRideSeconds) : "-";
  const scenarioBrief = activeLocalScenario
    ? {
      title: activeLocalScenario.label,
      summary: activeLocalScenario.summary,
      note: activeLocalScenario.presentationNote,
      speakerNotes: activeLocalScenario.speakerNotes,
      focusLabel: activeLocalScenario.focusLabel,
      weatherLabel:
        WEATHER_OPTIONS.find(
          (option) => option.id === activeLocalScenario.weather,
        )?.label ?? selectedWeather.label,
    }
    : {
      title: "수동 조합",
      summary:
        "현재 장면은 프리셋 조합에서 벗어난 수동 상태로, 시간·날씨·밀도를 직접 맞춘 발표용 커스텀 장면입니다.",
      note:
        "슬라이더나 시간/날씨를 개별 조정한 뒤 원하는 설명 흐름에 맞춰 보여줄 때 적합합니다.",
      speakerNotes: [
        "현재 장면은 프리셋이 아니라 발표 의도에 맞춰 직접 조정한 커스텀 상태입니다.",
        "시간, 날씨, 밀도를 개별 조정해 필요한 장면만 골라 설명할 때 적합합니다.",
      ],
      focusLabel: selectedSubwayName || "현재 카메라 기준",
      weatherLabel: selectedWeather.label,
    };
  const recommendedWeatherLabel = activeLocalScenario
    ? WEATHER_OPTIONS.find(
      (option) => option.id === activeLocalScenario.weather,
    )?.label ?? selectedWeather.label
    : selectedWeather.label;
  const timeWeatherControls = (
    <>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {circumstanceOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setCircumstanceMode(option.id);
              setStatusDetail(
                option.id === "live"
                  ? "실시간 기준으로 장면 값을 유지 중"
                  : "특정 시각 기준으로 장면 값을 조정 중",
              );
            }}
            className={`rounded-2xl border px-3 py-2 text-left transition ${panelSelectableClass(
              circumstanceMode === option.id,
            )}`}
          >
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
              기준
            </div>
            <div className="mt-1 text-sm font-medium">{option.label}</div>
          </button>
        ))}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
            시간 + 날씨
          </div>
          <div className="mt-2 flex items-end gap-3">
            <div className="text-[28px] font-semibold tracking-tight tabular-nums text-slate-50">
              {formattedSimulationTime}
            </div>
            <span className={panelBadgeClass(true)}>
              {daylightLabel} / {simulationTimeBand}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {formattedSimulationDate} · {circumstanceModeLabel}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            날씨
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-100">
            {selectedWeather.label}
          </div>
          <div className="text-[11px] text-slate-400">
            {selectedWeather.detail}
          </div>
        </div>
      </div>

      <div className={`mt-3 ${PANEL_ACCENT_CARD_CLASS} px-3 py-3`}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#99cbbd]/80">
            프리셋 추천값
          </div>
          <span className={panelBadgeClass(Boolean(activeLocalScenario))}>
            {activeLocalScenario?.label ?? "수동 조정중"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className={PANEL_TOKEN_CLASS}>
            시간 {activeLocalScenario ? format24Hour(activeLocalScenario.minutes) : formattedSimulationTime}
          </span>
          <span className={PANEL_TOKEN_CLASS}>
            날씨 {recommendedWeatherLabel}
          </span>
          <span className={PANEL_TOKEN_CLASS}>
            밀도 택시 {activeLocalScenario?.taxis ?? simulationDensity.taxis} / 일반 {activeLocalScenario?.traffic ?? simulationDensity.traffic}
          </span>
          <span className={PANEL_TOKEN_CLASS}>
            포커스 {scenarioBrief.focusLabel}
          </span>
        </div>
      </div>

      {circumstanceMode === "specific" ? (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSimulationTimeMinutes(preset.minutes)}
                className={`rounded-2xl border px-2 py-2 text-xs transition ${panelSelectableClass(
                  simulationTimeMinutes === preset.minutes,
                )}`}
              >
                <div className="font-medium tabular-nums">{preset.label}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  {preset.detail}
                </div>
              </button>
            ))}
          </div>

          <div className={`mt-3 ${PANEL_INSET_PADDED_CLASS}`}>
            <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <span>시간 슬라이더</span>
              <span className="tabular-nums text-[#d7efe6]">
                {formattedSimulationTime}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                날짜
              </div>
              <input
                type="date"
                value={simulationDate}
                onChange={(event) => setSimulationDate(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[#87cbb0]/40"
                aria-label="시뮬레이션 날짜"
              />
            </div>
            <input
              type="range"
              min={0}
              max={MINUTES_PER_DAY - 1}
              step={1}
              value={normalizedSimulationTimeMinutes}
              onChange={(event) =>
                setSimulationTimeMinutes(Number(event.target.value))
              }
              className="mt-3 h-2 w-full cursor-pointer accent-[#87cbb0]"
              aria-label="시뮬레이션 시간"
            />
            <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-500">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:30</span>
              <span>23:59</span>
            </div>
            <div className="mt-2 text-[11px] leading-5 text-slate-500">
              특정 시각 모드에서는 날짜와 시간을 직접 고정해 해/달/별과 조명
              변화를 확인할 수 있습니다.
            </div>
          </div>
        </>
      ) : (
        <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
          Live 모드에서는 강남 기준 현재 KST 날짜와 시간을 따라갑니다.
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {WEATHER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setWeatherMode(option.id)}
            className={`rounded-2xl border px-3 py-3 text-left transition ${panelSelectableClass(
              weatherMode === option.id,
            )}`}
          >
            <div className="text-sm font-medium">{option.label}</div>
            <div className="mt-1 text-[11px] leading-5 text-slate-400">
              {option.detail}
            </div>
          </button>
        ))}
      </div>

      <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
        날씨는 현재 수동 지정입니다. 실시간 모드여도 실제 기상 API를 붙이기
        전까지는 시각 연출을 직접 고를 수 있게 유지합니다.
      </div>

      <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
        시간대 연출은 하늘, 해, 달, 별 중심으로 적용되고 도로/건물 표면은 최대한
        고정해 가독성을 유지합니다. 대중교통 구조물은 기본적으로 숨겨두었습니다.
      </div>
    </>
  );

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#060d16]">
      <div ref={containerRef} className="h-full w-full" />

      {showFps ? (
        <div
          data-ui-panel="fps-overlay"
          className="pointer-events-none absolute right-4 top-24 z-20 rounded-2xl border border-lime-300/20 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 shadow-xl backdrop-blur-md"
        >
          <div className="text-[10px] uppercase tracking-[0.18em] text-lime-300/80">
            성능
          </div>
          <div className="mt-1 flex items-end gap-3">
            <div className="text-2xl font-semibold tabular-nums text-lime-100">
              {fpsStats.fps}
            </div>
            <div className="space-y-0.5 pb-1 text-xs text-slate-400">
              <div>모드: {fpsModeLabel(fpsMode)}</div>
              <div>목표: {fpsStats.capLabel}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                시뮬
              </div>
              <div className="tabular-nums text-lime-100">
                {fpsStats.simulationMs.toFixed(2)} ms
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                렌더
              </div>
              <div className="tabular-nums text-lime-100">
                {fpsStats.renderMs.toFixed(2)} ms
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                시뮬 Hz
              </div>
              <div className="tabular-nums text-lime-100">
                {fpsStats.simulationHz}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                차량 수
              </div>
              <div className="tabular-nums text-lime-100">{fpsStats.vehicles}</div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px] text-slate-300">
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                신호
              </div>
              <div className="tabular-nums text-lime-100">
                {fpsStats.signalMs.toFixed(2)} ms
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                차량
              </div>
              <div className="tabular-nums text-lime-100">
                {fpsStats.vehicleMs.toFixed(2)} ms
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                보조
              </div>
              <div className="tabular-nums text-lime-100">
                {fpsStats.overlayMs.toFixed(2)} ms
              </div>
            </div>
          </div>
          <div className="pointer-events-auto mt-3 grid grid-cols-3 gap-1.5">
            {fpsModeOptions.map((option) => {
              const isSelected = fpsMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFpsMode(option.id)}
                  className={`rounded-xl border px-2 py-2 text-left text-[11px] transition ${isSelected
                    ? "border-lime-300/40 bg-lime-400/10 text-lime-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/8"
                    }`}
                >
                  <div className="font-medium">{option.label}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-2 max-w-[240px] text-[11px] leading-4 text-slate-500">
            {fpsModeSummary(fpsMode)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            카메라 {cameraModeLabel} · F로 숨기기
          </div>
        </div>
      ) : null}

      <div
        data-ui-panel="right-sidebar"
        className={`absolute right-4 z-10 hidden max-h-[calc(100vh-2rem)] w-[360px] overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/82 p-5 text-white shadow-2xl backdrop-blur-md lg:block ${showFps ? "top-[22rem]" : "top-4"
          }`}
      >
        {timeWeatherControls}
      </div>

      <div
        data-ui-panel="left-sidebar"
        className="absolute left-2 top-2 z-10 max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[400px] overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/82 p-5 text-white shadow-2xl backdrop-blur-md sm:left-4 sm:top-4 sm:max-h-[calc(100vh-2rem)] sm:w-[400px]"
      >
        <p className={PANEL_EYEBROW_CLASS}>
          A-Eye 모듈 1 보조 레이어
        </p>
        <h1 className="text-[28px] font-semibold leading-tight">
          강남역 마이크로 영역 9개 동 OSM 디지털 트윈
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          이 장면은 `A-Eye`의 단순화된 Yeoksam 3x3 SUMO baseline을 대체하는
          별도 평가계가 아니라, 같은 강남역 마이크로 영역을 9개 실제 행정동과
          OSM 도로 위에서 더 구체적으로 보여주는 Module 1 공간 레이어입니다.
          역삼1·2동을 중심으로 논현, 삼성, 신사, 청담, 대치4동까지 이어지는 9개
          동을 OSM 경계 기준으로 불러와 3D로 다시 렌더링했고, 택시는 우측 차선
          기준으로 주행하며 교차로에서는 보호 좌회전, 황색, 보행 phase를 함께
          반영합니다. 신호등은 OSM `traffic_signals` 노드를 기준으로 묶어 쓰고,
          승하차 위치도 실제 도로 그래프와 curbside 쪽으로 맞추고 있습니다.
        </p>

        <div className={`mt-4 ${PANEL_ACCENT_CARD_CLASS}`}>
          <div className={PANEL_SECTION_LABEL_CLASS}>
            역할
          </div>
          <div className="mt-1 text-sm font-semibold text-[#d7efe6]">
            강남역 마이크로 디지털 트윈 보조 레이어
          </div>
          <div className="mt-2 text-xs leading-5 text-slate-300">
            목표는 강남구 전체나 서울 전체를 그대로 복제하는 것이 아니라,
            A-Eye의 마이크로 영역 수요·배차 스토리를 실제 도로와 행정동 위에서
            읽히게 만드는 것입니다. 즉 3x3는 나중 배차 비교 레이어로 남겨둘 수
            있고, 이 장면은 9개 동 OSM 지오메트리 뼈대 위에서 도로 단위 움직임과
            시각화를 다듬는 역할에 집중합니다.
          </div>
        </div>

        <div className={`mt-5 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                로컬 시나리오
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                외부 수집 없이 바로 쓰는 발표/검증 프리셋
              </div>
            </div>
            <span className={panelBadgeClass(Boolean(activeLocalScenario))}>
              {activeLocalScenario?.label ?? "수동 조합"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {LOCAL_SCENARIO_PRESETS.map((scenario) => {
              const isSelected = activeLocalScenario?.id === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => applyLocalScenario(scenario)}
                  data-local-scenario-button={scenario.id}
                  data-selected={isSelected ? "true" : "false"}
                  aria-label={`${scenario.label} 시나리오 적용`}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${panelSelectableClass(
                    isSelected,
                  )}`}
                >
                  <div className="text-sm font-semibold">{scenario.label}</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-400">
                    {scenario.detail}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    <span>{format24Hour(scenario.minutes)}</span>
                    <span>·</span>
                    <span>택시 {scenario.taxis}</span>
                    <span>·</span>
                    <span>일반 {scenario.traffic}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
            프리셋은 시간, 날씨, 차량 밀도, 주요 지하철역 시점을 함께 맞춥니다.
            실제 수요 API나 외부 데이터 없이도 `A-Eye Module 1` 설명용 장면을
            빠르게 재현하는 용도입니다.
          </div>
        </div>

        <div className={`mt-5 ${PANEL_ACCENT_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>
                시나리오 브리프
              </div>
              <div className="mt-1 text-sm font-semibold text-[#d7efe6]">
                {scenarioBrief.title}
              </div>
            </div>
            <span className={panelBadgeClass(true)}>
              발표용 요약
            </span>
          </div>

          <div className="mt-3 text-sm leading-6 text-slate-200">
            {scenarioBrief.summary}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2">
              <div className="text-slate-500">포커스</div>
              <div className="mt-1 font-medium text-slate-100">
                {scenarioBrief.focusLabel}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2">
              <div className="text-slate-500">현재 조합</div>
              <div className="mt-1 font-medium text-slate-100">
                {formattedSimulationTime} · {scenarioBrief.weatherLabel}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {scenarioBrief.speakerNotes.map((line, index) => (
              <div
                key={`${scenarioBrief.title}-${index}`}
                className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2 text-xs leading-5 text-slate-300"
              >
                멘트 {index + 1}. {line}
              </div>
            ))}
          </div>

          <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
            {scenarioBrief.note}
          </div>
        </div>

        <div className={`mt-5 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                로컬 체크
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                장면 내부 상태만으로 보는 단순 검증 지표
              </div>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[11px] font-medium text-amber-100">
              참고용
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                평균 대기
              </div>
              <div className="mt-1 text-lg font-semibold text-amber-100">
                {averagePickupWaitLabel}
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                평균 이동
              </div>
              <div className="mt-1 text-lg font-semibold text-sky-100">
                {averageRideDurationLabel}
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                활성 호출
              </div>
              <div className="mt-1 text-lg font-semibold text-rose-200">
                {stats.activeCalls}
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                대기 비율
              </div>
              <div className="mt-1 text-lg font-semibold text-rose-200">
                {waitingShare}%
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                누적 승차
              </div>
              <div className="mt-1 text-lg font-semibold text-[#d7efe6]">
                {stats.pickups}
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                누적 하차
              </div>
              <div className="mt-1 text-lg font-semibold text-lime-200">
                {stats.dropoffs}
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                흐름 상태
              </div>
              <div className="mt-1 text-lg font-semibold text-[#d7efe6]">
                {localFlowLabel}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs leading-5 text-slate-500">
            평균 대기와 평균 이동은 로컬 시뮬레이터 안에서 완료된 승차/하차를
            기준으로 누적한 참고값입니다. 운영 KPI라기보다 프리셋 간 상대 비교와
            배차 로직 설명용 지표에 가깝습니다.
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">택시</div>
            <div className="mt-1 text-lg font-semibold text-amber-200">
              {stats.taxis}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">일반 차량</div>
            <div className="mt-1 text-lg font-semibold text-sky-200">
              {stats.traffic}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">신호등</div>
            <div className="mt-1 text-lg font-semibold text-emerald-200">
              {stats.signals}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">대기</div>
            <div className="mt-1 text-lg font-semibold text-rose-200">
              {stats.waiting}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">진행 중 운행</div>
            <div className="mt-1 text-lg font-semibold text-[#d7efe6]">
              {stats.activeTrips}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">완료</div>
            <div className="mt-1 text-lg font-semibold text-lime-200">
              {stats.completedTrips}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">보행자</div>
            <div className="mt-1 text-lg font-semibold text-violet-200">
              {stats.pedestrians}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">버스 정류장</div>
            <div className="mt-1 text-lg font-semibold text-emerald-200">
              {transitCounts.busStops}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">지하철</div>
            <div className="mt-1 text-lg font-semibold text-[#d7efe6]">
              {transitCounts.subwayStations}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">라우팅</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">
              {dispatchPresentation.routingLabel}
            </div>
            <div className="mt-1 text-[11px] leading-5 text-slate-500">
              {dispatchPresentation.routingDetail}
            </div>
          </div>
        </div>

        <div className={`mt-5 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                시뮬레이션 밀도
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                택시와 일반 차량 수 조절
              </div>
            </div>
            <span
              className={`rounded-full border px-2 py-1 text-[11px] font-medium ${isDensityApplying
                ? "border-amber-300/25 bg-amber-300/12 text-amber-100"
                : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                }`}
            >
              {isDensityApplying ? "적용 중" : "반영됨"}
            </span>
          </div>

          <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
            밀도를 바꾸면 실제 차량 배치를 다시 구성합니다. 슬라이더를 움직이는
            동안에는 마지막 안정적인 장면을 유지한 뒤 새 밀도로 자연스럽게
            갈아탑니다.
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
              <span>택시</span>
              <span className="tabular-nums text-amber-200">
                {simulationDensity.taxis}
              </span>
            </div>
            <input
              type="range"
              min={MIN_TAXI_COUNT}
              max={MAX_TAXI_COUNT}
              step={1}
              value={simulationDensity.taxis}
              onChange={(event) => {
                markSceneRendering("택시 배치를 다시 구성 중");
                setSimulationDensity((current) => ({
                  ...current,
                  taxis: Number(event.target.value),
                }));
              }}
              className="mt-3 h-2 w-full cursor-pointer accent-[#ff9f1c]"
              aria-label="택시 밀도"
            />
            <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-500">
              <span>{MIN_TAXI_COUNT}</span>
              <span>{DEFAULT_TAXI_COUNT}</span>
              <span>{MAX_TAXI_COUNT}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
              <span>일반 차량</span>
              <span className="tabular-nums text-sky-200">
                {simulationDensity.traffic}
              </span>
            </div>
            <input
              type="range"
              min={MIN_TRAFFIC_COUNT}
              max={MAX_TRAFFIC_COUNT}
              step={1}
              value={simulationDensity.traffic}
              onChange={(event) => {
                markSceneRendering("일반 차량 배치를 다시 구성 중");
                setSimulationDensity((current) => ({
                  ...current,
                  traffic: Number(event.target.value),
                }));
              }}
              className="mt-3 h-2 w-full cursor-pointer accent-[#87cbb0]"
              aria-label="일반 차량 밀도"
            />
            <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-500">
              <span>{MIN_TRAFFIC_COUNT}</span>
              <span>{DEFAULT_TRAFFIC_COUNT}</span>
              <span>{MAX_TRAFFIC_COUNT}</span>
            </div>
          </div>

          <div className="mt-3 text-xs leading-5 text-slate-500">
            현재 장면 기준: 택시 {stats.taxis}대, 일반 차량 {stats.traffic}대
          </div>
        </div>

        <div
          data-ui-panel="mobile-time-weather"
          className={`mt-5 ${PANEL_CARD_CLASS} lg:hidden`}
        >
          {timeWeatherControls}
        </div>

        <div className={`mt-5 ${PANEL_ACCENT_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>
                데이터 소스
              </div>
              <div className="mt-1 text-sm font-semibold text-[#d7efe6]">
                {data?.meta.source ?? "OpenStreetMap + Overpass"}
              </div>
            </div>
            <span className={panelBadgeClass(true)}>
              {data?.meta.boundarySource ?? "OSM 행정 경계"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2">
              <div className="text-slate-500">최근 에셋 갱신</div>
              <div className="mt-1 font-medium text-slate-100">
                {data?.meta.latestAssetUpdatedAt ?? "갱신 시각 없음"}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2">
              <div className="text-slate-500">뷰어 로드 시각</div>
              <div className="mt-1 font-medium text-slate-100">
                {data?.meta.loadedAt ?? "알 수 없음"}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className={PANEL_TOKEN_CLASS}>
              행정동 {data?.meta.assets.dongs.featureCount ?? 0}
            </span>
            {data?.meta.assets.nonRoad ? (
              <span className={PANEL_TOKEN_CLASS}>
                비도로 {data.meta.assets.nonRoad.featureCount}
              </span>
            ) : null}
            <span className={PANEL_TOKEN_CLASS}>
              도로 {data?.meta.assets.roads.featureCount ?? 0}
            </span>
            <span className={PANEL_TOKEN_CLASS}>
              건물 {data?.meta.assets.buildings.featureCount ?? 0}
            </span>
            <span className={PANEL_TOKEN_CLASS}>
              대중교통 {data?.meta.assets.transit.featureCount ?? 0}
            </span>
            {data?.meta.assets.trafficSignals ? (
              <span className={PANEL_TOKEN_CLASS}>
                신호등 {data.meta.assets.trafficSignals.featureCount}
              </span>
            ) : null}
            {data?.meta.assets.roadNetwork ? (
              <span className={PANEL_TOKEN_CLASS}>
                도로 그래프 {data.meta.assets.roadNetwork.featureCount}
              </span>
            ) : null}
          </div>

          <div className={`mt-3 ${PANEL_INSET_PADDED_CLASS} text-xs`}>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              에셋 버전
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {assetVersionDetails.map((asset) => (
                <div
                  key={asset.key}
                  className="rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-100">{asset.label}</div>
                    <div className="tabular-nums text-[11px] text-slate-400">
                      {asset.featureCount}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {asset.pathLabel}
                  </div>
                  <div className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                    {asset.updatedAt}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
            동 경계는 OSM 행정동 relation 기준이고, 건물과 도로는 OSM
            지오메트리에서 가져옵니다. 이 장면에서 OSM은 단순 배경지도가 아니라
            A-Eye 마이크로 영역 디지털 트윈의 공간 뼈대 역할을 합니다. 신호등
            위치는 OSM traffic_signals 노드를 기준으로 묶어 쓰고, 차량 phase는
            도로 방향을 읽어 좌회전·직진·황색 흐름으로 단순화했습니다. 다만 이
            프로젝트는 아직 도시 전체 복제나 법적 수준의 배차 지도를 주장하지는
            않습니다.
          </div>
        </div>

        <div className={`mt-5 ${PANEL_CARD_CLASS}`}>
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
            카메라
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["overview", "오버뷰"],
                ["drive", "드라이브"],
                ["follow", "택시 추적"],
                ["ride", "택시 시점"],
              ] as Array<[CameraMode, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                data-camera-mode-button={mode}
                onClick={() => {
                  if (mode === "ride" && selectedTaxiId) {
                    rideExitModeRef.current =
                      cameraMode === "overview" || cameraMode === "follow"
                        ? cameraMode
                        : "drive";
                    setFollowTaxiId(selectedTaxiId);
                  }
                  setCameraMode(mode);
                }}
                disabled={mode === "ride" && !selectedTaxiId}
                className={`rounded-2xl border px-3 py-2 text-xs font-medium transition ${cameraMode === mode
                  ? panelSelectableClass(true)
                  : `${panelSelectableClass(false)} disabled:cursor-not-allowed disabled:opacity-45`
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              대상 택시
            </div>
            <select
              value={selectedTaxiId}
              onChange={(event) => {
                setFollowTaxiId(event.target.value);
              }}
              disabled={!taxiOptions.length}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/75 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[#87cbb0]/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {taxiOptions.map((taxi) => (
                <option key={taxi.id} value={taxi.id}>
                  {taxi.label} · {taxi.detail}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              빈차, 승객 탑승 중, 정차 중인 택시와 관계없이 언제든 선택해 시점을
              붙일 수 있습니다.
            </div>
          </div>

          <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
            {controlHint}
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(event) => setShowLabels(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-400"
          />
          도로/건물/지하철 라벨 보기
        </label>

        <label className="mt-3 flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showTransit}
            onChange={(event) => setShowTransit(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-[#87cbb0]"
          />
          지하철 입구 구조물 보기
        </label>
        <div className="mt-2 text-xs leading-5 text-slate-500">
          실제 지하철역 위치를 고정 구조물로 강조합니다. 버스 정류장 시각화는
          우선 보류하고 데이터만 유지합니다.
        </div>

        {data?.meta.assets.nonRoad ? (
          <>
            <label className="mt-3 flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showNonRoad}
                onChange={(event) => setShowNonRoad(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400"
              />
              비도로 영역 보기
            </label>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              공원, 주차장, 광장, 수변, 시설 부지 같은 OSM polygon 기반 non-road
              면을 도로 아래에 따로 보여줍니다.
            </div>
          </>
        ) : null}

        <label className="mt-3 flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showRoadNetwork}
            onChange={(event) => setShowRoadNetwork(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-lime-400"
          />
          도로 네트워크 레이어 보기
        </label>
        <div className="mt-2 text-xs leading-5 text-slate-500">
          라우팅에 쓰는 도로 그래프를 얇은 edge 선과 node 점으로 겹쳐
          보여줍니다.
        </div>

        {subwayHubs.length ? (
          <div className={`mt-5 ${PANEL_CARD_COMPACT_CLASS}`}>
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              지하철 허브
            </div>
            <div className="flex flex-wrap gap-2">
              {subwayHubs.map((station) => {
                const label = station.name ?? "지하철역";
                const isSelected = selectedSubwayName === label;
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => handleSubwayFocus(station)}
                    className={panelPillToggleClass(isSelected)}
                    title={`${label}로 이동`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              역 이름을 누르면 해당 지하철역 주변으로 카메라가 이동합니다.
            </div>
            {selectedSubwayName ? (
              <div className="mt-2 text-xs text-[#d7efe6]">
                현재 선택: {selectedSubwayName}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          data-scene-status={status}
          className={`mt-4 ${PANEL_CARD_CLASS} px-4 py-3 text-xs leading-5 text-slate-400`}
        >
          상태: <span className="text-slate-100">{statusLabel}</span>
          <br />
          단계: <span className="text-slate-100">{statusDetail}</span>
          <br />
          기준: <span className="text-slate-100">{circumstanceModeLabel}</span>
          <br />
          날짜:{" "}
          <span className="text-slate-100 tabular-nums">
            {formattedSimulationDate}
          </span>
          <br />
          시간:{" "}
          <span className="text-slate-100 tabular-nums">
            {formattedSimulationTime}
          </span>
          <br />
          날씨: <span className="text-slate-100">{selectedWeather.label}</span>
          <br />
          카메라: <span className="text-slate-100">{cameraModeLabel}</span>
          <br />
          배차:{" "}
          <span className="text-slate-100">
            {dispatchPresentation.label} · {dispatchPlannerId}
          </span>
          <br />
          환경: <span className="text-slate-100">{buildVersion.environmentLabel}</span>
          <br />
          브랜치: <span className="text-slate-100 tabular-nums">{buildVersion.branch}</span>
          <br />
          빌드:{" "}
          <span className="text-slate-100 tabular-nums">
            {buildVersion.builtAtLabel}
            {buildVersion.commit ? ` · ${buildVersion.commit}` : ""}
          </span>
          <br />
          밀도:{" "}
          <span className="text-slate-100">
            택시 {stats.taxis} / 일반 {stats.traffic}
          </span>
          <br />
          조작: {controlHint}
        </div>
      </div>

      <div
        data-ui-panel="bottom-legend"
        className="absolute bottom-4 left-4 z-10 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-300 shadow-xl backdrop-blur-md"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#76808a]" />
            건물
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3d4349]" />
            주요 도로
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#eef4ff]" />
            횡단보도
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff9f1c]" />
            택시
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#b89662]" />
            콜 포인트
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4ca7ff]" />
            지하철 입구
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f6f7ff]" />
            보행자 신호
          </span>
        </div>
      </div>
    </section>
  );
}
