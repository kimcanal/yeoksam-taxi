import type { WeatherMode } from "@/components/map-simulator/environment";
import type { VehicleMotionState } from "@/components/map-simulator/types";
import type {
  SimulationSnapshot,
  VehiclePoseSnapshot,
} from "@/components/map-simulator/simulation";

export const DEFAULT_SIMULATION_CLOCK = {
  dateIso: "2026-01-01",
  minutes: 12 * 60,
  weatherMode: "clear" as WeatherMode,
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
