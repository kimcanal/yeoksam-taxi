import * as THREE from "three";
import type { WeatherMode } from "@/components/map-simulator/simulation-environment";
import type {
  Hotspot,
  HotspotMarkerMode,
  RoadGraph,
  RouteTemplate,
  SignalApproachDemand,
  SignalApproachDistance,
  SignalAxisOccupancy,
  SignalData,
  SignalDirectionalOccupancy,
  SignalDirection,
  SignalFlow,
  SignalPhase,
  SignalTimingPlan,
  Stats,
  VehicleKind,
  VehiclePalette,
  VehiclePlanMode,
} from "@/components/map-simulator/core";

export type SimulationClock = {
  elapsedTimeSeconds: number;
  dateIso: string;
  minutes: number;
  weatherMode: WeatherMode;
};

export type SceneStaticContext = {
  center: { lat: number; lon: number };
  graph: RoadGraph;
  signals: SignalData[];
  hotspotPool: Hotspot[];
  taxiRoutePool: RouteTemplate[];
  trafficRoutePool: RouteTemplate[];
};

export type SimulationConfig = {
  taxiCount: number;
  trafficCount: number;
  clock: Omit<SimulationClock, "elapsedTimeSeconds">;
  preserveState?: boolean;
};

export type VehiclePoseSnapshot = {
  position: THREE.Vector3;
  lanePosition: THREE.Vector3;
  heading: THREE.Vector3;
  right: THREE.Vector3;
  yaw: number;
  segmentIndex: number;
  nextStopIndex: number;
};

export type VehicleSnapshot = {
  id: string;
  kind: VehicleKind;
  routeId: string;
  roadName: string | null;
  baseSpeed: number;
  speed: number;
  length: number;
  safeGap: number;
  palette: VehiclePalette;
  planMode: VehiclePlanMode;
  isOccupied: boolean;
  pickupHotspotId: string | null;
  dropoffHotspotId: string | null;
  renderSeed: number;
  previousPose: VehiclePoseSnapshot;
  pose: VehiclePoseSnapshot;
};

export type SignalApproachStateSnapshot = {
  occupancy: SignalAxisOccupancy;
  demand: SignalApproachDemand;
  distance: SignalApproachDistance;
  exitOccupancy: SignalDirectionalOccupancy;
};

export type SignalSnapshot = {
  id: string;
  key: string;
  point: THREE.Vector3;
  visualPoint: THREE.Vector3;
  approaches: SignalDirection[];
  phase: SignalPhase;
  flow: SignalFlow;
  timings: SignalTimingPlan;
  approachState: SignalApproachStateSnapshot;
};

export type HotspotSnapshot = {
  id: string;
  label: string;
  roadName: string | null;
  position: THREE.Vector3;
  mode: HotspotMarkerMode;
  pickupCalls: number;
  dropoffCalls: number;
  assignedTaxiNumbers: number[];
};

export type SimulationSnapshot = {
  clock: SimulationClock;
  vehicles: VehicleSnapshot[];
  signals: SignalSnapshot[];
  hotspots: HotspotSnapshot[];
  stats: Stats;
};

export interface SimulationSource {
  readonly id: string;
  reset(config: SimulationConfig, staticContext: SceneStaticContext): void;
  step(deltaSeconds: number): void;
  getSnapshot(): SimulationSnapshot;
}
