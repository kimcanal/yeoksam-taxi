import * as THREE from "three";
import type { EngineSceneContext } from "@/components/map-simulator/engine/engine-scene-setup";
import type { Vehicle } from "@/components/map-simulator/types";
import type { CameraMode } from "@/components/map-simulator/camera";
import {
  CAMERA_LOOK_HEIGHT,
  CAMERA_MIN_DISTANCE,
  TAXI_VIEW_CAMERA_BACK_OFFSET,
  TAXI_VIEW_CAMERA_HEIGHT,
  TAXI_VIEW_CAMERA_SIDE_OFFSET,
  TAXI_VIEW_LOOK_AHEAD,
} from "@/components/map-simulator/scene";
import {
  syncSimulatorCameraRig,
} from "@/components/map-simulator/engine/simulator-camera-rig";
import {
  dampAngle,
  wrapAngle,
} from "@/components/map-simulator/road";
import {
  pitchControlValueFromPitch,
  yawControlValueFromYaw,
} from "@/components/map-simulator/camera";

export function createEngineCameraController(
  ctx: EngineSceneContext,
  getFollowOrbit: () => { yawOffset: number },
) {
  const {
    camera,
    cameraRig,
    centerPoint,
    maxMapDistance,
    movementBounds,
    overviewYaw,
    overviewDistance,
    cameraOffset,
    taxiById,
    taxiVehicles,
    props,
  } = ctx;

  const {
    cameraModeRef,
    followTaxiIdRef,
    cameraFocusTargetRef,
    onCameraFocusChange,
  } = props;

  let activeCameraMode: CameraMode = cameraModeRef.current;
  let activeFollowTaxiId = followTaxiIdRef.current;
  let activeFollowTaxiInstance: Vehicle | null = null;
  let cameraLookLift = CAMERA_LOOK_HEIGHT;
  let rideLookInitialized = false;

  const rideCameraPosition = new THREE.Vector3();
  const rideHeading = new THREE.Vector3();
  const rideLookTarget = new THREE.Vector3();
  const rideDesiredLookTarget = new THREE.Vector3();
  const followFocusTarget = new THREE.Vector3();
  const miniMapCameraDirection = new THREE.Vector3();
  const overviewFocusTarget = new THREE.Vector3(centerPoint.x, 0, centerPoint.z);
  const lastRidePosition = new THREE.Vector3();
  const lastRideHeading = new THREE.Vector3(0, 0, 1);

  // Mini map focus report throttling
  let lastMiniMapFocusReportTimestamp = 0;
  let lastMiniMapFocusReportX = Number.POSITIVE_INFINITY;
  let lastMiniMapFocusReportZ = Number.POSITIVE_INFINITY;
  let lastMiniMapFocusReportHeadingX = Number.POSITIVE_INFINITY;
  let lastMiniMapFocusReportHeadingZ = Number.POSITIVE_INFINITY;
  let lastMiniMapFocusReportPitchValue = Number.POSITIVE_INFINITY;
  let lastMiniMapFocusReportYawValue = Number.POSITIVE_INFINITY;
  let lastMiniMapFocusReportLabel = "";

  const resolveFollowTaxi = (): Vehicle | null =>
    taxiById.get(followTaxiIdRef.current) ?? null;

  const taxiHeading = (vehicle: Vehicle) => vehicle.renderMotion.yaw;

  const syncCamera = () => {
    syncSimulatorCameraRig({
      camera,
      cameraLookLift,
      cameraOffset,
      cameraRig,
      maxMapDistance,
      movementBounds,
    });
  };

  const applyModePreset = (mode: CameraMode) => {
    if (mode === "overview") {
      cameraFocusTargetRef.current = null;
      cameraRig.focus.copy(centerPoint);
      cameraRig.focus.y = 0;
      cameraRig.yaw = overviewYaw;
      cameraRig.pitch = 0.7;
      cameraRig.distance = overviewDistance;
      return;
    }

    if (mode === "follow") {
      const followedTaxi = resolveFollowTaxi();
      cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch, 0.46, 0.9);
      cameraRig.distance = THREE.MathUtils.clamp(cameraRig.distance, 20, 58);
      if (followedTaxi) {
        const baseYaw = taxiHeading(followedTaxi) + Math.PI;
        const nextOffset = wrapAngle(cameraRig.yaw - baseYaw);
        getFollowOrbit().yawOffset =
          Math.abs(nextOffset) < 1.25 ? nextOffset : 0.22;
      }
      return;
    }

    if (mode === "ride") {
      rideLookInitialized = false;
      return;
    }

    cameraRig.focus.y = 0;
  };

  const applyDistrictPresentation = (mode: CameraMode) => {
    const isOverview = mode === "overview";
    ctx.dongBoundaryLayer.glowMaterial.opacity = isOverview ? 0.28 : 0.18;
    ctx.dongBoundaryLayer.lineMaterial.color.setHex(isOverview ? 0x93d7b7 : 0x7fc8a9);
    ctx.dongBoundaryLayer.lineMaterial.opacity = isOverview ? 0.88 : 0.74;
    ctx.dongBoundaryLayer.wallMaterial.opacity = 0.001;
  };

  /** Handle camera mode transitions. Returns the current mode. */
  const handleModeChange = (): CameraMode => {
    const currentMode = cameraModeRef.current;
    if (currentMode !== activeCameraMode) {
      if (activeCameraMode === "ride" && (currentMode === "drive" || currentMode === "follow")) {
        cameraRig.focus.copy(lastRidePosition);
        cameraRig.focus.y = 0;
        const taxiYaw = Math.atan2(lastRideHeading.x, lastRideHeading.z);
        cameraRig.yaw = taxiYaw + Math.PI;
        cameraRig.pitch = 0.52;
        cameraRig.distance = 90;
      }
      activeCameraMode = currentMode;
      applyModePreset(currentMode);
      applyDistrictPresentation(currentMode);
      ctx.rendererController.applyRenderBudget(currentMode);
      return currentMode;
    }
    if (currentMode === "overview") {
      applyModePreset(currentMode);
    }
    return currentMode;
  };

  /** Per-frame camera update based on mode. */
  const updateCameraForMode = (mode: CameraMode, delta: number) => {
    if (mode === "drive") {
      cameraLookLift = CAMERA_LOOK_HEIGHT;
      cameraRig.focus.y = THREE.MathUtils.damp(
        cameraRig.focus.y,
        0,
        4.6,
        delta,
      );
      if (cameraRig.dragging) {
        cameraFocusTargetRef.current = null;
      } else if (cameraFocusTargetRef.current) {
        const focusTarget = cameraFocusTargetRef.current;
        const targetDistance = THREE.MathUtils.clamp(
          focusTarget.distance,
          CAMERA_MIN_DISTANCE,
          maxMapDistance,
        );
        cameraRig.focus.x = THREE.MathUtils.damp(
          cameraRig.focus.x,
          focusTarget.x,
          5.6,
          delta,
        );
        cameraRig.focus.z = THREE.MathUtils.damp(
          cameraRig.focus.z,
          focusTarget.z,
          5.6,
          delta,
        );
        cameraRig.pitch = THREE.MathUtils.damp(
          cameraRig.pitch,
          focusTarget.pitch,
          5.2,
          delta,
        );
        cameraRig.distance = THREE.MathUtils.damp(
          cameraRig.distance,
          targetDistance,
          5.2,
          delta,
        );
        if (focusTarget.yaw !== undefined) {
          cameraRig.yaw = dampAngle(cameraRig.yaw, focusTarget.yaw, 5.2, delta);
        }

        if (
          Math.abs(cameraRig.focus.x - focusTarget.x) < 0.45 &&
          Math.abs(cameraRig.focus.z - focusTarget.z) < 0.45 &&
          Math.abs(cameraRig.pitch - focusTarget.pitch) < 0.02 &&
          Math.abs(cameraRig.distance - targetDistance) < 0.7 &&
          (focusTarget.yaw === undefined ||
            Math.abs(wrapAngle(cameraRig.yaw - focusTarget.yaw)) < 0.03)
        ) {
          cameraFocusTargetRef.current = null;
        }
      }
    } else if (mode === "overview") {
      cameraLookLift = CAMERA_LOOK_HEIGHT;
      const lerpAlpha = 1 - Math.exp(-delta * 3.8);
      cameraRig.focus.lerp(overviewFocusTarget, lerpAlpha);
      cameraRig.yaw = dampAngle(cameraRig.yaw, overviewYaw, 3.8, delta);
      cameraRig.pitch = THREE.MathUtils.damp(cameraRig.pitch, 0.7, 3.8, delta);
      cameraRig.distance = THREE.MathUtils.damp(cameraRig.distance, overviewDistance, 3.8, delta);
    } else if (mode === "follow") {
      if (followTaxiIdRef.current !== activeFollowTaxiId) {
        activeFollowTaxiId = followTaxiIdRef.current;
        getFollowOrbit().yawOffset = 0.22;
      }
      const followedTaxi = resolveFollowTaxi();
      cameraLookLift = 0.8;
      if (followedTaxi) {
        const followBlend = 1 - Math.exp(-delta * 4.8);
        followFocusTarget.copy(followedTaxi.group.position);
        followFocusTarget.y = 1.8;
        cameraRig.focus.lerp(followFocusTarget, followBlend);
        const desiredYaw =
          taxiHeading(followedTaxi) + Math.PI + getFollowOrbit().yawOffset;
        cameraRig.yaw = dampAngle(cameraRig.yaw, desiredYaw, 5.4, delta);
        cameraRig.pitch = THREE.MathUtils.clamp(cameraRig.pitch, 0.46, 0.9);
        cameraRig.distance = THREE.MathUtils.clamp(
          cameraRig.distance,
          20,
          58,
        );
      } else {
        cameraRig.focus.lerp(centerPoint, 1 - Math.exp(-delta * 2.8));
        cameraRig.focus.y = THREE.MathUtils.damp(
          cameraRig.focus.y,
          0,
          4.2,
          delta,
        );
      }
      syncCamera();
    } else {
      // ride mode
      const viewedTaxi = resolveFollowTaxi();
      if (
        followTaxiIdRef.current !== activeFollowTaxiId ||
        viewedTaxi !== activeFollowTaxiInstance
      ) {
        activeFollowTaxiId = followTaxiIdRef.current;
        activeFollowTaxiInstance = viewedTaxi;
        rideLookInitialized = false;
      }
      if (viewedTaxi) {
        rideHeading.copy(viewedTaxi.renderMotion.heading);
        if (rideHeading.lengthSq() < 0.0001) {
          rideHeading.set(0, 0, 1);
        } else {
          rideHeading.normalize();
        }

        // Cache latest valid position and heading for exit transition
        lastRidePosition.copy(viewedTaxi.renderMotion.lanePosition);
        lastRideHeading.copy(rideHeading);

        const rideBlend = 1 - Math.exp(-delta * 7.2);
        rideCameraPosition
          .copy(viewedTaxi.renderMotion.lanePosition)
          .addScaledVector(rideHeading, TAXI_VIEW_CAMERA_BACK_OFFSET)
          .addScaledVector(
            viewedTaxi.renderMotion.right,
            TAXI_VIEW_CAMERA_SIDE_OFFSET,
          );
        rideCameraPosition.y += TAXI_VIEW_CAMERA_HEIGHT;

        rideDesiredLookTarget
          .copy(viewedTaxi.renderMotion.lanePosition)
          .addScaledVector(rideHeading, TAXI_VIEW_LOOK_AHEAD);
        rideDesiredLookTarget.y = viewedTaxi.group.position.y + 1.6;

        if (!rideLookInitialized) {
          camera.position.copy(rideCameraPosition);
          rideLookTarget.copy(rideDesiredLookTarget);
          rideLookInitialized = true;
        } else {
          camera.position.lerp(rideCameraPosition, rideBlend);
          rideLookTarget.lerp(rideDesiredLookTarget, rideBlend);
        }
        camera.lookAt(rideLookTarget);
      } else {
        if (rideLookInitialized) {
          camera.lookAt(rideLookTarget);
        } else {
          rideCameraPosition
            .copy(lastRidePosition)
            .addScaledVector(lastRideHeading, TAXI_VIEW_CAMERA_BACK_OFFSET);
          rideCameraPosition.y += TAXI_VIEW_CAMERA_HEIGHT;
          rideLookTarget
            .copy(lastRidePosition)
            .addScaledVector(lastRideHeading, TAXI_VIEW_LOOK_AHEAD);
          rideLookTarget.y = lastRidePosition.y + 1.6;
          camera.position.copy(rideCameraPosition);
          camera.lookAt(rideLookTarget);
          rideLookInitialized = true;
        }
      }
    }

    if (mode !== "follow" && mode !== "ride") {
      syncCamera();
    }
  };

  /** Report camera focus to minimap at throttled rate. */
  const reportMiniMapFocus = (mode: CameraMode, frameTimestamp: number) => {
    if (!onCameraFocusChange) {
      return;
    }

    const nextMiniMapFocus =
      mode === "ride"
        ? rideLookTarget
        : cameraRig.focus;
    camera.getWorldDirection(miniMapCameraDirection);
    miniMapCameraDirection.y = 0;
    if (miniMapCameraDirection.lengthSq() < 0.0001) {
      miniMapCameraDirection.set(
        -Math.sin(cameraRig.yaw),
        0,
        -Math.cos(cameraRig.yaw),
      );
    }
    miniMapCameraDirection.normalize();
    const nextMiniMapFocusLabel =
      mode === "ride"
        ? "차량 시점"
        : mode === "follow"
          ? "차량 추적 위치"
          : "현재 보고 있는 위치";
    const focusDeltaSq =
      (nextMiniMapFocus.x - lastMiniMapFocusReportX) ** 2 +
      (nextMiniMapFocus.z - lastMiniMapFocusReportZ) ** 2;
    const headingDeltaSq =
      (miniMapCameraDirection.x - lastMiniMapFocusReportHeadingX) ** 2 +
      (miniMapCameraDirection.z - lastMiniMapFocusReportHeadingZ) ** 2;
    const nextPitchControlValue = pitchControlValueFromPitch(cameraRig.pitch);
    const nextYawControlValue = yawControlValueFromYaw(cameraRig.yaw);
    const pitchValueDelta = Math.abs(
      nextPitchControlValue - lastMiniMapFocusReportPitchValue,
    );
    const yawValueDelta = Math.abs(
      nextYawControlValue - lastMiniMapFocusReportYawValue,
    );
    if (
      frameTimestamp - lastMiniMapFocusReportTimestamp > 240 &&
      (focusDeltaSq > 1.6 ||
        headingDeltaSq > 0.006 ||
        pitchValueDelta > 0.5 ||
        yawValueDelta > 0.5 ||
        nextMiniMapFocusLabel !== lastMiniMapFocusReportLabel)
    ) {
      lastMiniMapFocusReportTimestamp = frameTimestamp;
      lastMiniMapFocusReportX = nextMiniMapFocus.x;
      lastMiniMapFocusReportZ = nextMiniMapFocus.z;
      lastMiniMapFocusReportHeadingX = miniMapCameraDirection.x;
      lastMiniMapFocusReportHeadingZ = miniMapCameraDirection.z;
      lastMiniMapFocusReportPitchValue = nextPitchControlValue;
      lastMiniMapFocusReportYawValue = nextYawControlValue;
      lastMiniMapFocusReportLabel = nextMiniMapFocusLabel;
      onCameraFocusChange({
        x: nextMiniMapFocus.x,
        z: nextMiniMapFocus.z,
        label: nextMiniMapFocusLabel,
        headingX: miniMapCameraDirection.x,
        headingZ: miniMapCameraDirection.z,
        pitchControlValue: nextPitchControlValue,
        yawControlValue: nextYawControlValue,
      });
    }
  };

  return {
    syncCamera,
    applyModePreset,
    applyDistrictPresentation,
    handleModeChange,
    updateCameraForMode,
    reportMiniMapFocus,
    getActiveCameraMode: () => activeCameraMode,
  };
}
