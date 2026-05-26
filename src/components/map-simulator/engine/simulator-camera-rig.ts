import * as THREE from "three";
import {
  CAMERA_LOOK_HEIGHT,
  CAMERA_MAX_PITCH,
  CAMERA_MIN_DISTANCE,
  CAMERA_MIN_PITCH,
} from "@/components/map-simulator/scene";

export type SimulatorCameraDragMode = "pan" | "orbit";

export type SimulatorCameraRig = {
  focus: THREE.Vector3;
  yaw: number;
  pitch: number;
  distance: number;
  dragging: boolean;
  pointerId: number;
  pointerX: number;
  pointerY: number;
  dragMode: SimulatorCameraDragMode;
};

export function createOverviewCameraOffset() {
  return new THREE.Vector3(-120, 135, 150);
}

export function overviewCameraDistance() {
  return createOverviewCameraOffset().length();
}

export function createSimulatorCameraRig({
  centerPoint,
  initialOffset,
  maxMapDistance,
  overviewYaw,
}: {
  centerPoint: THREE.Vector3;
  initialOffset: THREE.Vector3;
  maxMapDistance: number;
  overviewYaw: number;
}): SimulatorCameraRig {
  return {
    focus: centerPoint.clone(),
    yaw: overviewYaw,
    pitch: Math.atan2(
      initialOffset.y,
      Math.hypot(initialOffset.x, initialOffset.z),
    ),
    distance: THREE.MathUtils.clamp(
      initialOffset.length(),
      CAMERA_MIN_DISTANCE,
      maxMapDistance,
    ),
    dragging: false,
    pointerId: -1,
    pointerX: 0,
    pointerY: 0,
    dragMode: "pan",
  };
}

export function syncSimulatorCameraRig({
  camera,
  cameraLookLift = CAMERA_LOOK_HEIGHT,
  cameraOffset,
  cameraRig,
  maxMapDistance,
  movementBounds,
}: {
  camera: THREE.PerspectiveCamera;
  cameraLookLift?: number;
  cameraOffset: THREE.Vector3;
  cameraRig: SimulatorCameraRig;
  maxMapDistance: number;
  movementBounds: THREE.Box3;
}) {
  cameraRig.pitch = THREE.MathUtils.clamp(
    cameraRig.pitch,
    CAMERA_MIN_PITCH,
    CAMERA_MAX_PITCH,
  );
  cameraRig.distance = THREE.MathUtils.clamp(
    cameraRig.distance,
    CAMERA_MIN_DISTANCE,
    maxMapDistance,
  );
  cameraRig.focus.x = THREE.MathUtils.clamp(
    cameraRig.focus.x,
    movementBounds.min.x,
    movementBounds.max.x,
  );
  cameraRig.focus.z = THREE.MathUtils.clamp(
    cameraRig.focus.z,
    movementBounds.min.z,
    movementBounds.max.z,
  );

  cameraOffset
    .set(
      Math.sin(cameraRig.yaw) * Math.cos(cameraRig.pitch),
      Math.sin(cameraRig.pitch),
      Math.cos(cameraRig.yaw) * Math.cos(cameraRig.pitch),
    )
    .multiplyScalar(cameraRig.distance);

  camera.position.copy(cameraRig.focus).add(cameraOffset);
  camera.lookAt(
    cameraRig.focus.x,
    cameraRig.focus.y + cameraLookLift,
    cameraRig.focus.z,
  );
}
