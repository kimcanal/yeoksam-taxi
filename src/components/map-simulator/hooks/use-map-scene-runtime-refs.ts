import { useCallback, useEffect, useRef } from "react";
import type * as THREE from "three";
import type { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  DEFAULT_CAMERA_PITCH_CONTROL_VALUE,
  DEFAULT_CAMERA_YAW_CONTROL_VALUE,
  type BaseCameraMode,
  type CameraFocusTarget,
  type CameraMode,
  type CameraPitchControlState,
  type CameraYawControlState,
  type FpsMode,
} from "@/components/map-simulator/camera";
import type { WeatherMode } from "@/components/map-simulator/environment";
import { useSyncRef } from "@/components/map-simulator/hooks/use-sync-ref";

type UseMapSceneRuntimeRefsParams = {
  appliedTaxiCount: number;
  appliedTrafficCount: number;
  cameraMode: CameraMode;
  followTaxiId: string;
  fpsMode: FpsMode;
  showLabels: boolean;
  showNonRoad: boolean;
  showRoadNetwork: boolean;
  showTransit: boolean;
  simulationDate: string;
  simulationTimeMinutes: number;
  weatherMode: WeatherMode;
};

export function useMapSceneRuntimeRefs({
  appliedTaxiCount,
  appliedTrafficCount,
  cameraMode,
  followTaxiId,
  fpsMode,
  showLabels,
  showNonRoad,
  showRoadNetwork,
  showTransit,
  simulationDate,
  simulationTimeMinutes,
  weatherMode,
}: UseMapSceneRuntimeRefsParams) {
  const appliedTaxiCountRef = useSyncRef(appliedTaxiCount);
  const appliedTrafficCountRef = useSyncRef(appliedTrafficCount);
  const simulationDateRef = useSyncRef(simulationDate);
  const simulationTimeRef = useSyncRef(simulationTimeMinutes);
  const weatherModeRef = useSyncRef<WeatherMode>(weatherMode);
  const cameraModeRef = useSyncRef<CameraMode>(cameraMode);
  const followTaxiIdRef = useSyncRef(followTaxiId);
  const rideExitModeRef = useRef<BaseCameraMode>("drive");
  const cameraPitchControlRef = useRef<CameraPitchControlState>({
    value: DEFAULT_CAMERA_PITCH_CONTROL_VALUE,
    version: 0,
  });
  const cameraYawControlRef = useRef<CameraYawControlState>({
    value: DEFAULT_CAMERA_YAW_CONTROL_VALUE,
    version: 0,
  });
  const showLabelsRef = useSyncRef(showLabels);
  const optionalLabelObjectsRef = useRef<CSS2DObject[]>([]);
  const showTransitRef = useSyncRef(showTransit);
  const transitGroupRef = useRef<THREE.Group | null>(null);
  const hoverRefreshRequestRef = useRef(0);
  const labelRefreshRequestRef = useRef(0);
  const fpsModeRef = useSyncRef<FpsMode>(fpsMode);
  const showNonRoadRef = useSyncRef(showNonRoad);
  const nonRoadGroupRef = useRef<THREE.Group | null>(null);
  const showRoadNetworkRef = useSyncRef(showRoadNetwork);
  const roadNetworkGroupRef = useRef<THREE.Group | null>(null);
  const cameraFocusTargetRef = useRef<CameraFocusTarget | null>(null);
  const setCameraFocusTarget = useCallback((target: CameraFocusTarget | null) => {
    cameraFocusTargetRef.current = target;
  }, []);
  const setCameraControlValues = useCallback(
    ({
      pitchControlValue,
      yawControlValue,
    }: {
      pitchControlValue: number;
      yawControlValue: number;
    }) => {
      cameraPitchControlRef.current.value = Math.round(pitchControlValue);
      cameraYawControlRef.current.value = Math.round(yawControlValue);
    },
    [],
  );

  useEffect(() => {
    labelRefreshRequestRef.current += 1;
  }, [showLabels]);

  useEffect(() => {
    if (transitGroupRef.current) {
      transitGroupRef.current.visible = showTransit;
    }
    hoverRefreshRequestRef.current += 1;
    labelRefreshRequestRef.current += 1;
  }, [showTransit]);

  useEffect(() => {
    if (nonRoadGroupRef.current) {
      nonRoadGroupRef.current.visible = showNonRoad;
    }
  }, [showNonRoad]);

  useEffect(() => {
    if (roadNetworkGroupRef.current) {
      roadNetworkGroupRef.current.visible = showRoadNetwork;
    }
  }, [showRoadNetwork]);

  return {
    appliedTaxiCountRef,
    appliedTrafficCountRef,
    cameraFocusTargetRef,
    cameraModeRef,
    cameraPitchControlRef,
    cameraYawControlRef,
    followTaxiIdRef,
    fpsModeRef,
    hoverRefreshRequestRef,
    labelRefreshRequestRef,
    nonRoadGroupRef,
    optionalLabelObjectsRef,
    rideExitModeRef,
    roadNetworkGroupRef,
    setCameraControlValues,
    setCameraFocusTarget,
    showLabelsRef,
    showNonRoadRef,
    showRoadNetworkRef,
    showTransitRef,
    simulationDateRef,
    simulationTimeRef,
    transitGroupRef,
    weatherModeRef,
  };
}
