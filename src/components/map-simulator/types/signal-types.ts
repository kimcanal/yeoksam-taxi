import type * as THREE from "three";

export type SignalAxis = "ns" | "ew";
export type SignalDirection = "north" | "east" | "south" | "west";
export type TurnMovement = "straight" | "left" | "right";
export type SignalPhase = "ns_flow" | "ns_yellow" | "ns_left" | "ew_flow" | "ew_yellow" | "ew_left" | "ped_walk" | "ped_flash" | "clearance";
export type SignalData = { id: string; key: string; point: THREE.Vector3; visualPoint: THREE.Vector3; offset: number; approaches: SignalDirection[]; approachYaws: Record<SignalDirection, number>; hasProtectedLeft: boolean; priorityAxis: SignalAxis; timingPlan: SignalTimingPlan; };
export type SignalFlow = { phase: SignalPhase; ns: "green" | "yellow" | "red"; ew: "green" | "yellow" | "red"; nsLeft: boolean; ewLeft: boolean; pedestrian: "walk" | "flash" | "stop"; };
export type SignalTurnDemand = { left: number; straight: number; right: number; };
export type SignalApproachDemand = Record<SignalDirection, SignalTurnDemand>;
export type SignalApproachDistance = Record<SignalDirection, number>;
export type SignalAxisOccupancy = { ns: number; ew: number; };
export type SignalDirectionalOccupancy = Record<SignalDirection, number>;
export type SignalPhaseStep = { duration: number; flow: SignalFlow; };
export type SignalTimingPlan = { sequence: SignalPhaseStep[]; };
export type StopMarker = { signalId: string; signal: SignalData; distance: number; axis: SignalAxis; turn: TurnMovement; };
export type NextStopState = { index: number; stop: StopMarker | null; ahead: number; };
