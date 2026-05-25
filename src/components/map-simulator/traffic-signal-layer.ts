import * as THREE from "three";
import type {
  RouteTemplate,
  SignalData,
  SignalLampVisual,
  SignalVisual,
} from "@/components/map-simulator/map-simulator-types";
import {
  CROSSWALK_STEP,
  CROSSWALK_STRIPE_COUNT,
  CROSSWALK_WIDTH,
} from "@/components/map-simulator/scene-constants";
import {
  offsetToRight,
  sampleRoute,
} from "@/components/map-simulator/route-motion-utils";

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
    color: 0xc6cbd1,
    emissive: 0x15181c,
    emissiveIntensity: 0.02,
    roughness: 0.9,
  });
  const crosswalkStripes = signalVisuals.flatMap((signal) => {
    const stripeOffset = (CROSSWALK_STRIPE_COUNT - 1) * 0.5;
    const nsStripes = Array.from(
      { length: CROSSWALK_STRIPE_COUNT },
      (_, index) => ({
        center: signal.point
          .clone()
          .add(new THREE.Vector3(0, 0.03, (index - stripeOffset) * CROSSWALK_STEP)),
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
          .add(new THREE.Vector3((index - stripeOffset) * CROSSWALK_STEP, 0.03, 0)),
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
    dummy.position.set(lanePosition.x, 0.18, lanePosition.z);
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
