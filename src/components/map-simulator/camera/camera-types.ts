export const DEFAULT_CAMERA_PITCH_CONTROL_VALUE = 44;
export const DEFAULT_CAMERA_YAW_CONTROL_VALUE = 321;

export type CameraPitchControlState = {
  value: number;
  version: number;
};

export type CameraYawControlState = {
  value: number;
  version: number;
};

export type BaseCameraMode = "drive" | "overview" | "follow";
export type CameraMode = BaseCameraMode | "ride";
export type FpsMode = "auto" | "fixed60" | "unlimited";

export type CameraFocusTarget = {
  x: number;
  z: number;
  distance: number;
  pitch: number;
  label: string;
  yaw?: number;
};
