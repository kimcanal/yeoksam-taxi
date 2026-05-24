import * as THREE from "three";
import {
  CAMERA_MAX_PITCH,
  CAMERA_MIN_PITCH,
} from "@/components/map-simulator/scene-constants";

export function pitchControlValueFromPitch(pitch: number) {
  return THREE.MathUtils.clamp(
    ((pitch - CAMERA_MIN_PITCH) / (CAMERA_MAX_PITCH - CAMERA_MIN_PITCH)) * 100,
    0,
    100,
  );
}

export function pitchFromControlValue(value: number) {
  return THREE.MathUtils.lerp(
    CAMERA_MIN_PITCH,
    CAMERA_MAX_PITCH,
    THREE.MathUtils.clamp(value / 100, 0, 1),
  );
}

export function yawControlValueFromYaw(yaw: number) {
  const fullTurn = Math.PI * 2;
  const normalizedYaw = ((yaw % fullTurn) + fullTurn) % fullTurn;
  return THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(normalizedYaw), 0, 359);
}

export function yawFromControlValue(value: number) {
  return THREE.MathUtils.degToRad(THREE.MathUtils.clamp(value, 0, 359));
}
