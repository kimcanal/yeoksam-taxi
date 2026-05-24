import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon,
} from "geojson";
import {
  approachDirectionForHeading,
  assignCoordinatedSignalOffsets,
  buildSignalTimingPlan,
  canVehicleProceed,
  createSignalApproachDemand,
  createSignalApproachDistance,
  createSignalAxisOccupancy,
  createSignalData,
  createSignalDirectionalOccupancy,
  createSignalTurnDemand,
  dominantAxis,
  dominantAxisForHeading,
  normalizeSignalOffset,
  opposingSignalDirection,
  preferredSignalAxisForApproaches,
  pushSignalPhase,
  resetSignalApproachDemand,
  resetSignalApproachDistance,
  resetSignalAxisOccupancy,
  resetSignalDirectionalOccupancy,
  resetSignalTurnDemand,
  signalAxisForDirection,
  signalAxisPresence,
  signalDirectionForVector,
  SIGNAL_FLOW_CLEARANCE,
  SIGNAL_FLOW_EW_GREEN,
  SIGNAL_FLOW_EW_LEFT,
  SIGNAL_FLOW_EW_YELLOW,
  signalFlowForAxis,
  SIGNAL_FLOW_NS_GREEN,
  SIGNAL_FLOW_NS_LEFT,
  SIGNAL_FLOW_NS_YELLOW,
  SIGNAL_FLOW_PED_FLASH,
  SIGNAL_FLOW_PED_WALK,
  signalState,
  signalVectorForDirection,
} from "@/components/map-simulator/signal-controller";
import {
  addVehicleSampleToBucket,
  buildCumulative,
  buildSegmentHeadings,
  buildSegmentLengthsFromCumulative,
  clampRouteDistance,
  clearVehicleSampleBuckets,
  copyVehicleMotionState,
  createNextStopState,
  createRouteSample,
  createVehicleMotionState,
  createVehicleSimulationSample,
  curbsideApproachBlend,
  curbsideLaneOffset,
  dampAngle,
  distanceXZ,
  normalizeDistance,
  offsetToRight,
  polygonAreaXZ,
  resolveNextStop,
  resolveNextStopInto,
  routeDistanceAhead,
  routeSegmentIndexAtDistance,
  sampleRoute,
  sampleRouteInto,
  syncVehicleSampleBucket,
  vehicleProximityCellCoord,
  wrapAngle,
  writeRightVector,
} from "@/components/map-simulator/route-motion-utils";
import { DEFAULT_MAP_CENTER } from "@/components/map-simulator/map-defaults";
import {
  buildProjectedRoadSegments,
  buildRoadSegmentSpatialIndex,
  collectRoadSegmentCandidateIndices,
  featureCollectionCenter,
  geoKey,
  lineStringsOfRoad,
  outerRingOfBuilding,
  outerRingsOfDong,
  projectPoint,
  roadSegmentCellCoord,
  shapeFromPolygonCoordinates,
  shapePointsFromCoordinates,
  shapesOfNonRoadFeature,
  visitGeometryPositions,
} from "@/components/map-simulator/map-geometry-utils";
export { DEFAULT_MAP_CENTER };
export {
  DEFAULT_CAMERA_PITCH_CONTROL_VALUE,
  DEFAULT_CAMERA_YAW_CONTROL_VALUE,
} from "@/components/map-simulator/camera-types";
export type {
  BaseCameraMode,
  CameraFocusTarget,
  CameraMode,
  CameraPitchControlState,
  CameraYawControlState,
  FpsMode,
} from "@/components/map-simulator/camera-types";
export {
  DEFAULT_TAXI_COUNT,
  DEFAULT_TRAFFIC_COUNT,
  MAX_TAXI_COUNT,
  MAX_TRAFFIC_COUNT,
  MIN_TAXI_COUNT,
  MIN_TRAFFIC_COUNT,
} from "@/components/map-simulator/simulation-defaults";
export {
  PANEL_ACCENT_CARD_CLASS,
  PANEL_CARD_CLASS,
  PANEL_CARD_COMPACT_CLASS,
  PANEL_EYEBROW_CLASS,
  PANEL_INSET_CLASS,
  PANEL_INSET_PADDED_CLASS,
  PANEL_SECTION_LABEL_CLASS,
  PANEL_STATUS_TILE_CLASS,
  PANEL_TOKEN_CLASS,
  panelSelectableClass,
} from "@/components/map-simulator/panel-classes";
export {
  approachDirectionForHeading,
  addVehicleSampleToBucket,
  assignCoordinatedSignalOffsets,
  buildCumulative,
  buildSignalTimingPlan,
  buildSegmentHeadings,
  buildSegmentLengthsFromCumulative,
  buildProjectedRoadSegments,
  buildRoadSegmentSpatialIndex,
  canVehicleProceed,
  clampRouteDistance,
  clearVehicleSampleBuckets,
  collectRoadSegmentCandidateIndices,
  copyVehicleMotionState,
  createNextStopState,
  createRouteSample,
  createSignalApproachDemand,
  createSignalApproachDistance,
  createSignalAxisOccupancy,
  createSignalData,
  createSignalDirectionalOccupancy,
  createSignalTurnDemand,
  createVehicleMotionState,
  createVehicleSimulationSample,
  curbsideApproachBlend,
  curbsideLaneOffset,
  dampAngle,
  distanceXZ,
  dominantAxis,
  dominantAxisForHeading,
  featureCollectionCenter,
  geoKey,
  lineStringsOfRoad,
  normalizeDistance,
  normalizeSignalOffset,
  offsetToRight,
  opposingSignalDirection,
  outerRingOfBuilding,
  outerRingsOfDong,
  polygonAreaXZ,
  preferredSignalAxisForApproaches,
  projectPoint,
  pushSignalPhase,
  resolveNextStop,
  resolveNextStopInto,
  resetSignalApproachDemand,
  resetSignalApproachDistance,
  resetSignalAxisOccupancy,
  resetSignalDirectionalOccupancy,
  resetSignalTurnDemand,
  roadSegmentCellCoord,
  routeDistanceAhead,
  routeSegmentIndexAtDistance,
  sampleRoute,
  sampleRouteInto,
  shapeFromPolygonCoordinates,
  shapePointsFromCoordinates,
  shapesOfNonRoadFeature,
  signalAxisForDirection,
  signalAxisPresence,
  signalDirectionForVector,
  SIGNAL_FLOW_CLEARANCE,
  SIGNAL_FLOW_EW_GREEN,
  SIGNAL_FLOW_EW_LEFT,
  SIGNAL_FLOW_EW_YELLOW,
  signalFlowForAxis,
  SIGNAL_FLOW_NS_GREEN,
  SIGNAL_FLOW_NS_LEFT,
  SIGNAL_FLOW_NS_YELLOW,
  SIGNAL_FLOW_PED_FLASH,
  SIGNAL_FLOW_PED_WALK,
  signalState,
  signalVectorForDirection,
  syncVehicleSampleBucket,
  vehicleProximityCellCoord,
  visitGeometryPositions,
  wrapAngle,
  writeRightVector,
};

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

export type TaxiStandProperties = {
  stand_id: string;
  old_id: string;
  jcd_id: string;
  stand_type: string;
  facility_type: string;
  installed_at: string;
  powered: string;
  district: string;
  dong_name: string;
  lot_address: string;
  road_address: string;
  adjacent_road: string;
  location_name: string;
  is_target_dong: boolean;
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
export type TaxiStandFeatureCollection = FeatureCollection<
  Point,
  TaxiStandProperties
>;
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
  latestAssetUpdatedAt: string | null;
  loadedAt: string;
  assets: {
    nonRoad: AssetMeta | null;
    roads: AssetMeta;
    buildings: AssetMeta;
    dongs: AssetMeta;
    transit: AssetMeta;
    taxiStands: AssetMeta | null;
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
  approachYaws: Record<SignalDirection, number>;
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

export type VehicleKind = "taxi" | "traffic";
export type VehiclePlanMode = "traffic" | "pickup" | "dropoff";
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
  taxiStands: TaxiStandFeatureCollection;
  taxiStandLandmarks: TaxiStandLandmark[];
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

export const EMPTY_TAXI_STAND_FEATURE_COLLECTION: TaxiStandFeatureCollection = {
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

export type TaxiStandLandmark = {
  id: string;
  standId: string;
  name: string;
  dongName: string;
  roadAddress: string;
  position: THREE.Vector3;
  heading: THREE.Vector3;
  sideSign: 1 | -1;
  yaw: number;
  isShelter: boolean;
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
  phaseOffset: number;
  speed: number;
  lateralOffset: number;
  direction: 1 | -1;
};

export type HotspotMarkerMode = "pickup" | "dropoff" | "idle";
export type SceneLabelKind = "district" | "building" | "transit" | "road";
export type HotspotPresentation = {
  accentColor: number;
  badgeLabel: string;
  badgeBorderColor: string;
  badgeBackground: string;
  badgeTextColor: string;
  showsCaller: boolean;
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

export const HOTSPOT_PRESENTATION: Record<HotspotMarkerMode, HotspotPresentation> = {
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
    badgeLabel: "대기",
    badgeBorderColor: "rgba(118,126,134,0.26)",
    badgeBackground: "rgba(28,31,35,0.82)",
    badgeTextColor: "#cfd5db",
    showsCaller: false,
  },
};

export const TAXI_PALETTE: VehiclePalette = {
  body: 0xd79a3a,
  cabin: 0xe4c17d,
  sign: 0xf4ebcf,
};

export const TRAFFIC_PALETTES: VehiclePalette[] = [
  { body: 0xf4f5f7, cabin: 0xdce7f0, sign: null },
  { body: 0x353c45, cabin: 0xc9d5df, sign: null },
  { body: 0x79889a, cabin: 0xd8e2ea, sign: null },
  { body: 0xc94d3f, cabin: 0xf0d7cf, sign: null },
  { body: 0x4f6478, cabin: 0xd4dfe7, sign: null },
];

// Keep scene styling centralized so future asset or demand-layer swaps do
// not require touching simulation logic.
export const HOTSPOT_IDLE_COLORS = [0x7a6b57, 0x62716c, 0x76645c];

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

export function buildTaxiStandLandmarks(
  taxiStands: TaxiStandFeatureCollection,
  center: { lat: number; lon: number },
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex,
) {
  const landmarks = taxiStands.features
    .map((feature, index) => {
      if (feature.geometry.type !== "Point" || !feature.properties.is_target_dong) {
        return null;
      }

      const originalPoint = projectPoint(feature.geometry.coordinates, center);
      const nearestRoad = nearestRoadContext(
        originalPoint,
        roadSegments,
        roadSegmentSpatialIndex,
        28,
      );
      if (!nearestRoad || nearestRoad.distance > 28) {
        return null;
      }

      const right = new THREE.Vector3(
        nearestRoad.heading.z,
        0,
        -nearestRoad.heading.x,
      ).normalize();
      const sideSign =
        right.dot(originalPoint.clone().sub(nearestRoad.closest)) >= 0 ? 1 : -1;
      const name =
        feature.properties.location_name ||
        feature.properties.road_address ||
        "택시승차대";

      return {
        id: `taxi-stand-${index}`,
        standId: feature.properties.stand_id,
        name,
        dongName: feature.properties.dong_name,
        roadAddress: feature.properties.road_address,
        position: nearestRoad.closest
          .clone()
          .addScaledVector(right, sideSign * (nearestRoad.width * 0.58 + 1.55))
          .setY(0.14),
        heading: nearestRoad.heading.clone(),
        sideSign,
        yaw: Math.atan2(nearestRoad.heading.x, nearestRoad.heading.z),
        isShelter: /쉘터/.test(feature.properties.stand_type),
      } satisfies TaxiStandLandmark;
    })
    .filter(Boolean) as TaxiStandLandmark[];

  return landmarks
    .sort((left, right) => left.name.localeCompare(right.name, "ko"))
    .slice(0, 24);
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

export function selectTaxiHotspotNodeIndex(
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
      const nodeIndex = selectTaxiHotspotNodeIndex(
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

export function buildTaxiStandHotspots(
  taxiStandLandmarks: TaxiStandLandmark[],
  routes: RouteTemplate[],
) {
  const usedNodeKeys = new Set<string>();

  return taxiStandLandmarks
    .map((stand, standIndex) => {
      let best:
        | {
          route: RouteTemplate;
          nodeIndex: number;
          distanceSq: number;
          reusesNode: boolean;
        }
        | null = null;

      for (const route of routes) {
        for (const [nodeIndex, node] of route.nodes.entries()) {
          const reusesNode = usedNodeKeys.has(node.key);
          const distanceSq = node.point.distanceToSquared(stand.position);
          const score = distanceSq + (reusesNode ? 1600 : 0);
          const bestScore = best
            ? best.distanceSq + (best.reusesNode ? 1600 : 0)
            : Number.POSITIVE_INFINITY;

          if (score < bestScore) {
            best = {
              route,
              nodeIndex,
              distanceSq,
              reusesNode,
            };
          }
        }
      }

      if (!best) {
        return null;
      }

      const node = best.route.nodes[best.nodeIndex]!;
      usedNodeKeys.add(node.key);

      return {
        id: `taxi-stand-hotspot-${stand.standId || standIndex}`,
        nodeKey: node.key,
        routeId: best.route.id,
        distance: best.route.cumulative[best.nodeIndex] ?? 0,
        position: stand.position.clone(),
        point: stand.position.clone(),
        label: stand.name || "택시승차대",
        roadName: stand.roadAddress || best.route.name,
      } satisfies Hotspot;
    })
    .filter(Boolean) as Hotspot[];
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
