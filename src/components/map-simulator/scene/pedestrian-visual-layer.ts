import * as THREE from "three";
import { createPedestrianGroup } from "@/components/map-simulator/vehicle";
import type {
  PedestrianVisual,
  SignalData,
  SignalFlow,
  SignalVisual,
} from "@/components/map-simulator/types";
import {
  PEDESTRIAN_SPAN,
  ROAD_MARKING_Y,
  SIGNAL_CYCLE,
} from "@/components/map-simulator/scene";
import { signalState } from "@/components/map-simulator/signal";

export function createPedestrianVisualLayer(signalVisuals: SignalVisual[]) {
  const layer = new THREE.Group();
  layer.name = "pedestrian-visual-layer";

  const pedestrianVisuals: PedestrianVisual[] = signalVisuals.flatMap(
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

  pedestrianVisuals.forEach((pedestrian) => {
    pedestrian.group.visible = false;
    layer.add(pedestrian.group);
  });

  return { group: layer, pedestrianVisuals };
}

export function updatePedestrianVisualLayer({
  elapsedTime,
  frameSignalStates,
  pedestrianVisuals,
  signalById,
}: {
  elapsedTime: number;
  frameSignalStates: ReadonlyMap<string, SignalFlow>;
  pedestrianVisuals: PedestrianVisual[];
  signalById: ReadonlyMap<string, SignalData>;
}) {
  if (!pedestrianVisuals.length) {
    return 0;
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
    const cycleNumber = Math.floor(elapsedTime / SIGNAL_CYCLE);
    const signalSeed = Math.round(signal.offset * 100);
    const skipThisCycle = ((cycleNumber * 7 + signalSeed) % 5) < 2;
    const pedestrianFlashVisible =
      !skipThisCycle &&
      state.pedestrian === "flash" &&
      Math.sin(elapsedTime * 14 + pedestrian.phaseOffset) > 0;
    const isVisible =
      !skipThisCycle &&
      (state.pedestrian === "walk" || pedestrianFlashVisible);

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
    const bob = Math.sin(elapsedTime * 9 + pedestrian.phaseOffset * 11) * 0.05;

    if (pedestrian.axis === "ns") {
      pedestrian.group.position.set(
        signal.visualPoint.x + pedestrian.lateralOffset,
        ROAD_MARKING_Y + 0.006 + bob,
        signal.visualPoint.z + travel,
      );
      pedestrian.group.rotation.y = 0;
    } else {
      pedestrian.group.position.set(
        signal.visualPoint.x + travel,
        ROAD_MARKING_Y + 0.006 + bob,
        signal.visualPoint.z + pedestrian.lateralOffset,
      );
      pedestrian.group.rotation.y = Math.PI / 2;
    }
  });

  return visibleCount;
}
