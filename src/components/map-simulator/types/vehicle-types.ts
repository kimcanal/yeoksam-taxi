import type * as THREE from "three";
import type { RouteTemplate } from "./road-types";
import type { Hotspot } from "./simulation-types";
import type { NextStopState } from "./signal-types";

export type VehiclePalette = { body: number; cabin: number; sign: number | null; };
export type VehicleKind = "taxi" | "traffic";
export type VehiclePlanMode = "traffic" | "pickup" | "dropoff";
export type RouteSample = { position: THREE.Vector3; heading: THREE.Vector3; segmentIndex: number; };
export type VehicleMotionState = RouteSample & { lanePosition: THREE.Vector3; right: THREE.Vector3; yaw: number; nextStopIndex: number; };

export type Vehicle = {
  id: string; kind: VehicleKind; route: RouteTemplate; group: THREE.Group; bodyMaterial: THREE.MeshStandardMaterial; signMaterial: THREE.MeshStandardMaterial | null;
  baseSpeed: number; speed: number; distance: number; safeGap: number; length: number; currentSignalId: string | null; roadName: string | null; palette: VehiclePalette;
  isOccupied: boolean; pickupHotspot: Hotspot | null; dropoffHotspot: Hotspot | null; jobAssignedAt: number; pickupStartedAt: number | null; serviceTimer: number; planMode: VehiclePlanMode;
  previousMotion: VehicleMotionState; motion: VehicleMotionState; renderMotion: VehicleMotionState;
};

export type VehicleSimulationSample<TVehicle extends { motion: VehicleMotionState } = Vehicle> = { vehicle: TVehicle; motion: VehicleMotionState; nextStopState: NextStopState; proximityCellX: number; proximityCellZ: number; };
export type VehicleProximityBuckets<TVehicle extends { motion: VehicleMotionState } = Vehicle> = Map<number, Map<number, VehicleSimulationSample<TVehicle>[]>>;
