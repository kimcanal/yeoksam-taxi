import * as THREE from "three";
import type {
  RouteTemplate,
  SignalData,
  SignalFlow,
  SignalLampVisual,
  SignalVisual,
} from "@/components/map-simulator/types";
import type { SignalSnapshot } from "@/components/map-simulator/simulation";
import {
  CROSSWALK_STEP,
  CROSSWALK_STRIPE_COUNT,
  CROSSWALK_WIDTH,
  ROAD_MARKING_Y,
} from "@/components/map-simulator/scene";
import { signalState } from "@/components/map-simulator/signal";
import {
  offsetToRight,
  sampleRoute,
} from "@/components/map-simulator/road";

type TrafficSignalLayerOptions = {
  signals: SignalData[];
  loopRoutes: RouteTemplate[];
};

export function createTrafficSignalLayer({
  signals,
  loopRoutes,
}: TrafficSignalLayerOptions) {
  const dummy = new THREE.Object3D();
  const group = new THREE.Group();
  group.name = "traffic-signal-layer";

  const signalPoleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3.35, 8);
  const signalPoleMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d98a6,
    roughness: 0.62,
  });
  const signalHeadGeometry = new THREE.BoxGeometry(1.48, 0.42, 0.42);
  const signalHeadMaterial = new THREE.MeshStandardMaterial({
    color: 0x10161f,
    roughness: 0.5,
  });
  const totalMasts = signals.reduce(
    (sum, signal) => sum + signal.approaches.length,
    0,
  );
  const signalPoleMesh = new THREE.InstancedMesh(
    signalPoleGeometry,
    signalPoleMaterial,
    totalMasts,
  );
  const signalHeadMesh = new THREE.InstancedMesh(
    signalHeadGeometry,
    signalHeadMaterial,
    totalMasts,
  );

  let mastIndex = 0;
  const signalVisuals = signals.map((signal) => {
    const signalGroup = new THREE.Group();
    const reds: SignalLampVisual[] = [];
    const yellows: SignalLampVisual[] = [];
    const greens: SignalLampVisual[] = [];
    const leftArrows: SignalLampVisual[] = [];
    const pedestrianLamps: SignalLampVisual[] = [];
    const mastDistance = signal.approaches.length >= 4 ? 4.2 : 3.6;
    const lateral = 2.8;
    const mastLayout = signal.approaches.map((direction) => {
      const yaw = signal.approachYaws[direction] ?? 0;
      switch (direction) {
        case "north":
          return {
            axis: "ns" as const,
            offset: new THREE.Vector3(lateral, 0, -mastDistance),
            yaw,
          };
        case "south":
          return {
            axis: "ns" as const,
            offset: new THREE.Vector3(-lateral, 0, mastDistance),
            yaw,
          };
        case "east":
          return {
            axis: "ew" as const,
            offset: new THREE.Vector3(mastDistance, 0, lateral),
            yaw,
          };
        default:
          return {
            axis: "ew" as const,
            offset: new THREE.Vector3(-mastDistance, 0, -lateral),
            yaw,
          };
      }
    });

    mastLayout.forEach(({ axis, offset, yaw }) => {
      dummy.position.copy(signal.visualPoint).add(offset);
      dummy.position.y = 1.675;
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      signalPoleMesh.setMatrixAt(mastIndex, dummy.matrix);

      const headLocalOffset = new THREE.Vector3(-1.8, 0, 0);
      const headWorldOffset = headLocalOffset.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        yaw,
      );
      dummy.position.add(headWorldOffset);
      dummy.position.y = 2.62;
      dummy.updateMatrix();
      signalHeadMesh.setMatrixAt(mastIndex, dummy.matrix);
      mastIndex += 1;

      const mast = new THREE.Group();
      mast.position.copy(offset).add(headWorldOffset);
      mast.rotation.y = yaw;

      const red = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x431015,
          emissive: 0x230709,
        }),
      );
      red.position.set(-0.48, 2.62, 0.24);
      mast.add(red);
      reds.push({ mesh: red, axis });

      const yellow = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x4a3612,
          emissive: 0x2a1806,
        }),
      );
      yellow.position.set(-0.16, 2.62, 0.24);
      mast.add(yellow);
      yellows.push({ mesh: yellow, axis });

      const leftArrow = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x0f2218,
          emissive: 0x07120b,
        }),
      );
      leftArrow.position.set(0.16, 2.62, 0.24);
      leftArrow.visible = signal.hasProtectedLeft;
      mast.add(leftArrow);
      leftArrows.push({ mesh: leftArrow, axis });

      const green = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x123f22,
          emissive: 0x081a0f,
        }),
      );
      green.position.set(0.48, 2.62, 0.24);
      mast.add(green);
      greens.push({ mesh: green, axis });

      const pedestrianLamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.24, 0.14),
        new THREE.MeshStandardMaterial({
          color: 0x222833,
          emissive: 0x10151d,
        }),
      );
      pedestrianLamp.position.set(-0.36, 2.18, 0.18);
      mast.add(pedestrianLamp);
      pedestrianLamps.push({ mesh: pedestrianLamp, axis });

      signalGroup.add(mast);
    });

    signalGroup.position.copy(signal.visualPoint);
    group.add(signalGroup);

    return {
      ...signal,
      group: signalGroup,
      reds,
      yellows,
      greens,
      leftArrows,
      pedestrianLamps,
      lastVisualSignature: "",
    } satisfies SignalVisual;
  });

  signalPoleMesh.instanceMatrix.needsUpdate = true;
  signalHeadMesh.instanceMatrix.needsUpdate = true;
  group.add(signalPoleMesh);
  group.add(signalHeadMesh);

  const crosswalkMaterial = new THREE.MeshStandardMaterial({
    color: 0xc0392b,
    emissive: 0x7b1a12,
    emissiveIntensity: 0.18,
    roughness: 0.85,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
  const crosswalkStripes = signalVisuals.flatMap((signal) => {
    const stripeOffset = (CROSSWALK_STRIPE_COUNT - 1) * 0.5;
    const nsStripes = Array.from(
      { length: CROSSWALK_STRIPE_COUNT },
      (_, index) => ({
        center: signal.point
          .clone()
          .setY(ROAD_MARKING_Y + 0.006)
          .add(
            new THREE.Vector3(
              0,
              0,
              (index - stripeOffset) * CROSSWALK_STEP,
            ),
          ),
        angle: 0,
        width: CROSSWALK_WIDTH,
        depth: 0.34,
      }),
    );
    const ewStripes = Array.from(
      { length: CROSSWALK_STRIPE_COUNT },
      (_, index) => ({
        center: signal.point
          .clone()
          .setY(ROAD_MARKING_Y + 0.006)
          .add(
            new THREE.Vector3(
              (index - stripeOffset) * CROSSWALK_STEP,
              0,
              0,
            ),
          ),
        angle: Math.PI / 2,
        width: CROSSWALK_WIDTH,
        depth: 0.34,
      }),
    );
    return [...nsStripes, ...ewStripes];
  });
  const crosswalkMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.02, 1),
    crosswalkMaterial,
    crosswalkStripes.length,
  );

  crosswalkStripes.forEach((stripe, index) => {
    dummy.position.copy(stripe.center);
    dummy.rotation.set(0, stripe.angle, 0);
    dummy.scale.set(stripe.width, 1, stripe.depth);
    dummy.updateMatrix();
    crosswalkMesh.setMatrixAt(index, dummy.matrix);
  });
  crosswalkMesh.instanceMatrix.needsUpdate = true;
  group.add(crosswalkMesh);

  const stopLineMaterial = new THREE.MeshStandardMaterial({
    color: 0xd5d9dd,
    emissive: 0x181c22,
    emissiveIntensity: 0.03,
    roughness: 0.82,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
  const stopLineMarkers = loopRoutes
    .filter((route) => route.roadClass !== "local")
    .flatMap((route) => route.stops.map((stop) => ({ route, stop })));
  const stopLineMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.04, 0.32),
    stopLineMaterial,
    stopLineMarkers.length,
  );

  stopLineMarkers.forEach((marker, index) => {
    const sample = sampleRoute(marker.route, marker.stop.distance);
    const lanePosition = offsetToRight(
      sample.position,
      sample.heading,
      marker.route.laneOffset,
    );
    dummy.position.set(lanePosition.x, ROAD_MARKING_Y + 0.012, lanePosition.z);
    dummy.rotation.set(0, Math.atan2(sample.heading.x, sample.heading.z), 0);
    dummy.scale.set(Math.min(marker.route.roadWidth * 0.48, 2.4), 1, 1);
    dummy.updateMatrix();
    stopLineMesh.setMatrixAt(index, dummy.matrix);
  });
  stopLineMesh.instanceMatrix.needsUpdate = true;
  group.add(stopLineMesh);

  return {
    group,
    signalVisuals,
    crosswalkMaterial,
    stopLineMaterial,
  };
}

export function updateTrafficSignalVisuals({
  elapsedTime,
  frameSignalStates,
  signalSnapshots,
  signalVisuals,
}: {
  elapsedTime: number;
  frameSignalStates: Map<string, SignalFlow>;
  signalSnapshots: SignalSnapshot[];
  signalVisuals: SignalVisual[];
}) {
  if (!signalVisuals.length) {
    frameSignalStates.clear();
    return;
  }

  const signalSnapshotById = new globalThis.Map(
    signalSnapshots.map(
      (signalSnapshot) => [signalSnapshot.id, signalSnapshot] as const,
    ),
  );
  frameSignalStates.clear();
  signalVisuals.forEach((signal) => {
    const signalSnapshot = signalSnapshotById.get(signal.id);
    const state = signalSnapshot?.flow ?? signalState(signal, elapsedTime);
    const pedestrianFlashVisible =
      state.pedestrian === "flash" && Math.sin(elapsedTime * 12) > 0;
    frameSignalStates.set(signal.id, state);

    const visualSignature = `${state.phase}:${pedestrianFlashVisible ? "flash-on" : "flash-off"}`;
    if (visualSignature === signal.lastVisualSignature) {
      return;
    }
    signal.lastVisualSignature = visualSignature;

    signal.reds.forEach(({ mesh, axis }) => {
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
        (axis === "ns" ? state.ns : state.ew) === "red" ? 0xff2d55 : 0x240608,
      );
    });
    signal.yellows.forEach(({ mesh, axis }) => {
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
        (axis === "ns" ? state.ns : state.ew) === "yellow"
          ? 0xffc247
          : 0x2a1806,
      );
    });
    signal.greens.forEach(({ mesh, axis }) => {
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
        (axis === "ns" ? state.ns : state.ew) === "green"
          ? 0x3cf07b
          : 0x08190d,
      );
    });
    signal.leftArrows.forEach(({ mesh, axis }) => {
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
        mesh.visible && (axis === "ns" ? state.nsLeft : state.ewLeft)
          ? 0x54f49d
          : 0x08190d,
      );
    });
    signal.pedestrianLamps.forEach(({ mesh }) => {
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(
        state.pedestrian === "walk"
          ? 0xf6f7ff
          : pedestrianFlashVisible
            ? 0xf9c756
            : 0x111721,
      );
    });
  });
}
