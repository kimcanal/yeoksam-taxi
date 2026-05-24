import type * as THREE from "three";
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
  VehicleMotionState,
  VehiclePalette,
  VehiclePlanMode,
} from "@/components/map-simulator/map-simulator-types";

export const DEFAULT_SIMULATION_CLOCK = {
  dateIso: "2026-01-01",
  minutes: 12 * 60,
  weatherMode: "clear" as WeatherMode,
};

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

export function cloneVehiclePoseSnapshot(
  source: VehicleMotionState,
): VehiclePoseSnapshot {
  return {
    position: source.position.clone(),
    lanePosition: source.lanePosition.clone(),
    heading: source.heading.clone(),
    right: source.right.clone(),
    yaw: source.yaw,
    segmentIndex: source.segmentIndex,
    nextStopIndex: source.nextStopIndex,
  };
}

export function createEmptySimulationSnapshot(): SimulationSnapshot {
  return {
    clock: {
      elapsedTimeSeconds: 0,
      ...DEFAULT_SIMULATION_CLOCK,
    },
    vehicles: [],
    signals: [],
    hotspots: [],
    stats: {
      taxis: 0,
      traffic: 0,
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
    },
  };
}

export interface SimulationSource {
  readonly id: string;
  reset(config: SimulationConfig, staticContext: SceneStaticContext): void;
  step(deltaSeconds: number): void;
  getSnapshot(): SimulationSnapshot;
}
