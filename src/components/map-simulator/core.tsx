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
import {
  LARGE_LOW_RISE_BUILDING_AREA_M2,
  LARGE_LOW_RISE_BUILDING_MAX_HEIGHT_M,
  ROAD_LAYER_Y,
  ROAD_NETWORK_EDGE_Y_OFFSET,
  ROAD_NETWORK_NODE_Y,
  ROAD_WIDTH_SCALE,
  SIGNAL_CLUSTER_DISTANCE,
  SIGNAL_NODE_SNAP_DISTANCE,
  SIGNAL_ROAD_SNAP_DISTANCE,
  TAXI_ASSET_TARGET_LENGTH,
  BUILDING_HEIGHT_SCALE,
} from "@/components/map-simulator/scene-constants";
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

export type VehicleMaterialHint = "body" | "glass" | "trim" | "metal" | "default";

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
  IMPORTED_TAXI_SIGN_GEOMETRY ??= new THREE.BoxGeometry(0.56, 0.12, 0.34);
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
let PEDESTRIAN_BODY_GEOMETRY: THREE.BoxGeometry | null = null;
let PEDESTRIAN_HEAD_GEOMETRY: THREE.SphereGeometry | null = null;
let PEDESTRIAN_FEET_GEOMETRY: THREE.BoxGeometry | null = null;
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

export function colorForBuilding(height: number, kind?: string | null) {
  if (kind === "apartments" || kind === "residential") return 0xc9c2b4;
  if (kind === "commercial" || kind === "retail") return 0x92aebf;
  if (kind === "school" || kind === "university") return 0xcdb49d;
  if (kind === "hospital" || kind === "clinic") return 0xcee3ec;

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
  element.textContent = "";
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
        color: colorForBuilding(heightMeters, feature.properties.kind),
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

    const approachYaws: Record<SignalDirection, number> = {
      north: 0,
      south: Math.PI,
      east: Math.PI / 2,
      west: -Math.PI / 2,
    };
    nearbySegmentsForSignal.forEach((segment) => {
      const startVector = segment.start.clone().sub(anchorNode.point);
      const endVector = segment.end.clone().sub(anchorNode.point);

      if (startVector.lengthSq() > 9) {
        const dir = signalDirectionForVector(startVector);
        approachYaws[dir] = Math.atan2(startVector.x, startVector.z);
      }
      if (endVector.lengthSq() > 9) {
        const dir = signalDirectionForVector(endVector);
        approachYaws[dir] = Math.atan2(endVector.x, endVector.z);
      }
    });

    const approaches = (Object.keys(approachYaws) as SignalDirection[]).filter(
      (dir) => {
        return nearbySegmentsForSignal.some((s) => {
          const v1 = s.start.clone().sub(anchorNode.point);
          const v2 = s.end.clone().sub(anchorNode.point);
          return (
            (v1.lengthSq() > 9 && signalDirectionForVector(v1) === dir) ||
            (v2.lengthSq() > 9 && signalDirectionForVector(v2) === dir)
          );
        });
      },
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
        clusterPoint.clone(), /* Use actual OSM centroid for visuals */
        approachYaws,
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

  return { group, bodyMaterial, signMaterial, clickTarget };
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

  return { group, bodyMaterial, signMaterial: null, clickTarget: null };
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
    roughness: kind === "taxi" ? 0.58 : 0.9,
    metalness: kind === "taxi" ? 0.22 : 0.12,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x171b20,
    roughness: 0.92,
    metalness: 0.04,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x92a7b5,
    emissive: 0x0d1720,
    emissiveIntensity: 0.06,
    roughness: 0.18,
    metalness: 0.08,
  });
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff6cf,
    emissive: 0xffd27a,
    emissiveIntensity: 0.32,
    roughness: 0.35,
    metalness: 0.02,
  });
  const tailLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4c62,
    emissive: 0xff2038,
    emissiveIntensity: 0.28,
    roughness: 0.42,
    metalness: 0.02,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.74 : 1.62,
      kind === "taxi" ? 0.78 : 1.2,
      kind === "taxi" ? 3.58 : 4.05,
    ),
    bodyMaterial,
  );
  body.position.y = kind === "taxi" ? 0.68 : 0.7;
  group.add(body);

  const lowerTrim = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.88 : 1.7,
      0.22,
      kind === "taxi" ? 4.18 : 3.94,
    ),
    trimMaterial,
  );
  lowerTrim.position.y = 0.2;
  group.add(lowerTrim);

  if (kind === "taxi") {
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(1.58, 0.34, 0.96),
      bodyMaterial,
    );
    hood.position.set(0, 0.92, 1.55);
    group.add(hood);

    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(1.56, 0.32, 0.72),
      bodyMaterial,
    );
    trunk.position.set(0, 0.92, -1.63);
    group.add(trunk);
  }

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(kind === "taxi" ? 1.18 : 1.14, 0.82, 1.62),
    new THREE.MeshStandardMaterial({
      color: palette.cabin,
      roughness: kind === "taxi" ? 0.38 : 0.68,
      metalness: 0.04,
    }),
  );
  cabin.position.set(0, kind === "taxi" ? 1.34 : 1.5, kind === "taxi" ? -0.1 : 0.15);
  group.add(cabin);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(
      kind === "taxi" ? 1.0 : 1.08,
      0.18,
      kind === "taxi" ? 1.06 : 1.46,
    ),
    glassMaterial,
  );
  windshield.position.set(0, kind === "taxi" ? 1.78 : 2.05, kind === "taxi" ? 0.15 : 0.15);
  group.add(windshield);

  if (kind === "taxi") {
    const rearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.16, 0.58),
      glassMaterial,
    );
    rearGlass.position.set(0, 1.72, -0.88);
    group.add(rearGlass);

    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0x252017,
      emissive: 0x2a1700,
      emissiveIntensity: 0.08,
      roughness: 0.74,
      metalness: 0.03,
    });
    [-1, 1].forEach((side) => {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.16, 2.72),
        stripeMaterial,
      );
      stripe.position.set(side * 0.91, 0.78, -0.02);
      group.add(stripe);
    });

    [-1, 1].forEach((side) => {
      const headlight = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.12, 0.06),
        headlightMaterial,
      );
      headlight.position.set(side * 0.46, 0.67, 2.09);
      group.add(headlight);

      const tailLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.12, 0.06),
        tailLightMaterial,
      );
      tailLight.position.set(side * 0.46, 0.66, -2.09);
      group.add(tailLight);
    });

    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x101316,
      roughness: 0.86,
      metalness: 0.08,
    });
    const wheelGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 14);
    [-1, 1].forEach((side) => {
      [-1.34, 1.36].forEach((z) => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.98, 0.36, z);
        group.add(wheel);
      });
    });
  }

  let signMaterial: THREE.MeshStandardMaterial | null = null;
  if (kind === "taxi") {
    signMaterial = new THREE.MeshStandardMaterial({
      color: palette.sign ?? 0xfff9d8,
      emissive: 0x6b4300,
      emissiveIntensity: 0.34,
      roughness: 0.46,
      metalness: 0,
    });
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.16, 0.34),
      signMaterial,
    );
    sign.position.set(0, 1.88, -0.12);
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
  body.position.y = 0.74;
  group.add(body);

  const head = markMeshResourceSharing(
    new THREE.Mesh(sharedPedestrianHeadGeometry(), sharedPedestrianHeadMaterial()),
    { material: true },
  );
  head.position.y = 1.34;
  group.add(head);

  const feet = markMeshResourceSharing(
    new THREE.Mesh(sharedPedestrianFeetGeometry(), sharedPedestrianFeetMaterial()),
    { material: true },
  );
  feet.position.y = 0.12;
  group.add(feet);

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

export function setTaxiAppearance(vehicle: Vehicle) {
  if (vehicle.kind !== "taxi") {
    return;
  }
  if (vehicle.planMode === "dropoff" || vehicle.isOccupied) {
    vehicle.bodyMaterial.color.setHex(0xf08d1a);
    vehicle.bodyMaterial.emissive.setHex(0x472300);
    vehicle.bodyMaterial.emissiveIntensity = 0.18;
    vehicle.signMaterial?.color.setHex(0xc7ffd1);
    vehicle.signMaterial?.emissive.setHex(0x00c853);
    if (vehicle.signMaterial) {
      vehicle.signMaterial.emissiveIntensity = 0.96;
    }
    return;
  }

  vehicle.bodyMaterial.color.setHex(vehicle.palette.body);
  vehicle.bodyMaterial.emissive.setHex(0x321500);
  vehicle.bodyMaterial.emissiveIntensity = 0.1;
  vehicle.signMaterial?.color.setHex(0xffc7cc);
  vehicle.signMaterial?.emissive.setHex(0xff3048);
  if (vehicle.signMaterial) {
    vehicle.signMaterial.emissiveIntensity = 1.02;
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
