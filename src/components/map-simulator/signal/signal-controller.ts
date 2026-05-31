import * as THREE from "three";
import {
  INTERSECTION_LEFT_TURN_GAP_DISTANCE,
  SIGNAL_COORDINATION_BAND_SIZE,
  SIGNAL_COORDINATION_PHASE_STEP,
  SIGNAL_CYCLE,
  SIGNAL_WAVE_TRAVEL_SPEED,
} from "@/components/map-simulator/scene/scene-constants";
import type {
  SignalApproachDemand,
  SignalApproachDistance,
  SignalAxis,
  SignalAxisOccupancy,
  SignalData,
  SignalDirection,
  SignalDirectionalOccupancy,
  SignalFlow,
  SignalPhaseStep,
  SignalTimingPlan,
  SignalTurnDemand,
  StopMarker,
} from "@/components/map-simulator/types";

export function signalVectorForDirection(direction: SignalDirection) {
  switch (direction) {
    case "north":
      return new THREE.Vector3(0, 0, -1);
    case "south":
      return new THREE.Vector3(0, 0, 1);
    case "east":
      return new THREE.Vector3(1, 0, 0);
    default:
      return new THREE.Vector3(-1, 0, 0);
  }
}

export function dominantAxis(
  start: THREE.Vector3,
  end: THREE.Vector3,
): SignalAxis {
  return Math.abs(end.x - start.x) > Math.abs(end.z - start.z) ? "ew" : "ns";
}

export function signalDirectionForVector(
  vector: THREE.Vector3,
): SignalDirection {
  if (Math.abs(vector.x) > Math.abs(vector.z)) {
    return vector.x >= 0 ? "east" : "west";
  }
  return vector.z >= 0 ? "south" : "north";
}

export function signalAxisForDirection(direction: SignalDirection): SignalAxis {
  return direction === "east" || direction === "west" ? "ew" : "ns";
}

export function approachDirectionForHeading(
  heading: THREE.Vector3,
): SignalDirection {
  if (Math.abs(heading.x) > Math.abs(heading.z)) {
    return heading.x >= 0 ? "west" : "east";
  }
  return heading.z >= 0 ? "north" : "south";
}

export function opposingSignalDirection(
  direction: SignalDirection,
): SignalDirection {
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

export function resetSignalDirectionalOccupancy(
  target: SignalDirectionalOccupancy,
) {
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
  approachYaws: Record<SignalDirection, number> = {
    north: 0,
    south: Math.PI,
    east: Math.PI / 2,
    west: -Math.PI / 2,
  },
): Omit<SignalData, "offset"> {
  const priorityAxis = preferredSignalAxisForApproaches(approaches, point);
  return {
    id,
    key,
    point,
    visualPoint,
    approaches,
    approachYaws,
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
