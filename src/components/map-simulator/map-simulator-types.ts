import type * as THREE from "three";
import type { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon,
} from "geojson";

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

export type VehicleSimulationSample<
  TVehicle extends { motion: VehicleMotionState } = Vehicle,
> = {
  vehicle: TVehicle;
  motion: VehicleMotionState;
  nextStopState: NextStopState;
  proximityCellX: number;
  proximityCellZ: number;
};

export type VehicleProximityBuckets<
  TVehicle extends { motion: VehicleMotionState } = Vehicle,
> = Map<
  number,
  Map<number, VehicleSimulationSample<TVehicle>[]>
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

export type Hotspot = {
  id: string;
  nodeKey: string;
  routeId: string;
  distance: number;
  sideSign?: number;
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
