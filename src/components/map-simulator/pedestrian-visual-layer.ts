import * as THREE from "three";
import { createPedestrianGroup } from "@/components/map-simulator/actor-group-factory";
import type {
  PedestrianVisual,
  SignalVisual,
} from "@/components/map-simulator/map-simulator-types";

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
