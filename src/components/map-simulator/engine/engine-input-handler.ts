import * as THREE from "three";
import type { EngineSceneContext } from "@/components/map-simulator/engine/engine-scene-setup";
import type { Vehicle } from "@/components/map-simulator/types";
import type { CameraMode } from "@/components/map-simulator/camera";
import {
  CAMERA_DRAG_SENSITIVITY,
  CAMERA_MAX_PITCH,
  CAMERA_MIN_DISTANCE,
  CAMERA_MIN_PITCH,
  CAMERA_TOUCH_ANCHOR_RADIUS,
  CAMERA_TOUCH_PITCH_LOCK_DISTANCE,
  CAMERA_TOUCH_PITCH_SENSITIVITY,
  CAMERA_TOUCH_PITCH_VERTICAL_RATIO,
  TAXI_CLICK_MOVE_THRESHOLD,
} from "@/components/map-simulator/scene";
import {
  anchoredPitchTouchIndex,
  createCameraTouchGestureState,
  isInteractiveTarget,
  firstTwoTouchPoints as readFirstTwoTouchPoints,
  rememberCurrentTouchGesture,
  setCameraTouchGestureBasis,
  type CameraTouchPoint,
} from "@/components/map-simulator/camera";
import { wrapAngle } from "@/components/map-simulator/road";

export type InputHandlerCallbacks = {
  syncCamera: () => void;
  markHoverDirty: () => void;
  markLabelVisibilityDirty: () => void;
  enterRideMode: (vehicle: Vehicle) => void;
  applyDistrictPresentation: (mode: CameraMode) => void;
  applyRenderBudget: (mode: CameraMode) => void;
};

export function createEngineInputHandler(
  ctx: EngineSceneContext,
  callbacks: InputHandlerCallbacks,
) {
  const {
    container,
    camera,
    renderer,
    cameraRig,
    maxMapDistance,
    pointerNdc,
    props,
  } = ctx;

  const {
    cameraModeRef,
    followTaxiIdRef,
    rideExitModeRef,
    cameraFocusTargetRef,
    setFollowTaxiId,
    setCameraMode,
    onPoiSelect,
    onDongSelect,
  } = props;

  let pointerInside = false;
  let pointerClientX = 0;
  let pointerClientY = 0;
  let pointerDownClientX = 0;
  let pointerDownClientY = 0;
  let pointerDragged = false;
  const activeTouchPointers = new globalThis.Map<number, CameraTouchPoint>();
  const touchGestureState = createCameraTouchGestureState();
  const touchPanForwardDirection = new THREE.Vector3();
  const touchPanRightDirection = new THREE.Vector3();
  const followOrbit = { yawOffset: 0.22 };

  const getPointerClient = () => ({ x: pointerClientX, y: pointerClientY });
  const getIsPointerInside = () => pointerInside;
  const getFollowOrbit = () => followOrbit;

  const stopDragging = () => {
    cameraRig.dragging = false;
    cameraRig.pointerId = -1;
    cameraRig.dragMode = "pan";
    renderer.domElement.style.cursor = "grab";
    container.style.cursor = "grab";
  };

  const enterTouchMapMode = (): boolean => {
    if (cameraModeRef.current === "ride") {
      return false;
    }
    cameraFocusTargetRef.current = null;
    if (followTaxiIdRef.current) {
      followTaxiIdRef.current = "";
      setFollowTaxiId("");
    }
    if (cameraModeRef.current !== "drive") {
      cameraModeRef.current = "drive";
      setCameraMode("drive");
      callbacks.applyDistrictPresentation("drive");
      callbacks.applyRenderBudget("drive");
      callbacks.markLabelVisibilityDirty();
    }
    return true;
  };

  const currentTouchPoints = () =>
    readFirstTwoTouchPoints(activeTouchPointers);

  const setTouchGestureBasis = () => {
    setCameraTouchGestureBasis(touchGestureState, currentTouchPoints());
  };

  const panCameraByScreenDelta = (deltaX: number, deltaY: number) => {
    if (!enterTouchMapMode()) {
      return;
    }
    touchPanForwardDirection.copy(cameraRig.focus).sub(camera.position).setY(0);
    if (touchPanForwardDirection.lengthSq() < 0.0001) {
      touchPanForwardDirection.set(
        -Math.sin(cameraRig.yaw),
        0,
        -Math.cos(cameraRig.yaw),
      );
    }
    touchPanForwardDirection.normalize();
    touchPanRightDirection
      .set(-touchPanForwardDirection.z, 0, touchPanForwardDirection.x)
      .normalize();

    const panScale = Math.max(18, cameraRig.distance) * 0.0024;
    cameraRig.focus.addScaledVector(touchPanRightDirection, -deltaX * panScale);
    cameraRig.focus.addScaledVector(touchPanForwardDirection, deltaY * panScale);
  };

  const tiltCameraByScreenDelta = (deltaY: number) => {
    if (!enterTouchMapMode()) {
      return;
    }
    cameraRig.pitch = THREE.MathUtils.clamp(
      cameraRig.pitch - deltaY * CAMERA_TOUCH_PITCH_SENSITIVITY,
      CAMERA_MIN_PITCH,
      CAMERA_MAX_PITCH,
    );
  };

  const applyTouchGestureMove = () => {
    const [firstTouch, secondTouch] = currentTouchPoints();
    if (!firstTouch) {
      return;
    }

    if (!secondTouch) {
      const deltaX = firstTouch.x - touchGestureState.lastCenterX;
      const deltaY = firstTouch.y - touchGestureState.lastCenterY;
      panCameraByScreenDelta(deltaX, deltaY);
      touchGestureState.lastCenterX = firstTouch.x;
      touchGestureState.lastCenterY = firstTouch.y;
      touchGestureState.lastFirstX = firstTouch.x;
      touchGestureState.lastFirstY = firstTouch.y;
      callbacks.syncCamera();
      return;
    }

    touchGestureState.usedMultiTouch = true;
    const centerX = (firstTouch.x + secondTouch.x) / 2;
    const centerY = (firstTouch.y + secondTouch.y) / 2;
    const distance = Math.max(
      1,
      Math.hypot(secondTouch.x - firstTouch.x, secondTouch.y - firstTouch.y),
    );
    const angle = Math.atan2(
      secondTouch.y - firstTouch.y,
      secondTouch.x - firstTouch.x,
    );
    const deltaX = centerX - touchGestureState.lastCenterX;
    const deltaY = centerY - touchGestureState.lastCenterY;

    if (touchGestureState.multiTouchMode !== "pitch") {
      const nextPitchTouchIndex = anchoredPitchTouchIndex(
        firstTouch,
        secondTouch,
        {
          anchorRadius: CAMERA_TOUCH_ANCHOR_RADIUS,
          pitchLockDistance: CAMERA_TOUCH_PITCH_LOCK_DISTANCE,
          verticalRatio: CAMERA_TOUCH_PITCH_VERTICAL_RATIO,
        },
      );
      if (nextPitchTouchIndex !== -1) {
        touchGestureState.multiTouchMode = "pitch";
        touchGestureState.pitchTouchIndex = nextPitchTouchIndex;
      }
    }

    if (touchGestureState.multiTouchMode === "pitch") {
      const pitchDeltaY =
        touchGestureState.pitchTouchIndex === 0
          ? firstTouch.y - touchGestureState.lastFirstY
          : secondTouch.y - touchGestureState.lastSecondY;
      tiltCameraByScreenDelta(pitchDeltaY);
      rememberCurrentTouchGesture(
        touchGestureState,
        firstTouch,
        secondTouch,
        distance,
        angle,
      );
      callbacks.syncCamera();
      return;
    }

    panCameraByScreenDelta(deltaX, deltaY);
    if (touchGestureState.lastDistance > 0) {
      cameraRig.distance = THREE.MathUtils.clamp(
        cameraRig.distance * (touchGestureState.lastDistance / distance),
        CAMERA_MIN_DISTANCE,
        maxMapDistance,
      );
    }
    if (touchGestureState.lastDistance > 0) {
      cameraRig.yaw -= wrapAngle(angle - touchGestureState.lastAngle);
    }

    rememberCurrentTouchGesture(
      touchGestureState,
      firstTouch,
      secondTouch,
      distance,
      angle,
    );
    callbacks.syncCamera();
  };

  // --- Event handlers ---

  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (
      event.pointerType !== "touch" &&
      event.button !== 0 &&
      event.button !== 2
    ) {
      return;
    }
    const rect = container.getBoundingClientRect();
    pointerInside = true;
    pointerClientX = event.clientX - rect.left;
    pointerClientY = event.clientY - rect.top;
    pointerNdc.set(
      (pointerClientX / rect.width) * 2 - 1,
      -(pointerClientY / rect.height) * 2 + 1,
    );
    if (cameraModeRef.current === "ride") {
      event.preventDefault();
      pointerDragged = false;
      activeTouchPointers.clear();
      stopDragging();
      callbacks.markHoverDirty();
      return;
    }
    if (event.pointerType === "touch") {
      event.preventDefault();
      activeTouchPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
      });
      pointerDownClientX = event.clientX;
      pointerDownClientY = event.clientY;
      pointerDragged = false;
      if (activeTouchPointers.size >= 2) {
        touchGestureState.usedMultiTouch = true;
        pointerDragged = true;
      }
      setTouchGestureBasis();
      stopDragging();
      callbacks.markHoverDirty();
      return;
    }
    event.preventDefault();
    cameraRig.dragging = true;
    cameraRig.pointerId = event.pointerId;
    cameraRig.pointerX = event.clientX;
    cameraRig.pointerY = event.clientY;
    cameraRig.dragMode = event.button === 2 ? "orbit" : "pan";
    pointerDownClientX = event.clientX;
    pointerDownClientY = event.clientY;
    pointerDragged = event.button === 2;
    renderer.domElement.style.cursor = "grabbing";
    container.style.cursor = "grabbing";
    callbacks.markHoverDirty();
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    const withinBounds =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    pointerInside = withinBounds;
    if (withinBounds) {
      pointerClientX = event.clientX - rect.left;
      pointerClientY = event.clientY - rect.top;
      pointerNdc.set(
        (pointerClientX / rect.width) * 2 - 1,
        -(pointerClientY / rect.height) * 2 + 1,
      );
    } else {
      pointerNdc.set(2, 2);
    }
    callbacks.markHoverDirty();

    if (cameraModeRef.current === "ride") {
      if (event.pointerType === "touch") {
        event.preventDefault();
      }
      return;
    }

    if (event.pointerType === "touch") {
      const touchPoint = activeTouchPointers.get(event.pointerId);
      if (!touchPoint) {
        return;
      }
      event.preventDefault();
      touchPoint.x = event.clientX;
      touchPoint.y = event.clientY;
      if (
        Math.hypot(
          event.clientX - pointerDownClientX,
          event.clientY - pointerDownClientY,
        ) > TAXI_CLICK_MOVE_THRESHOLD
      ) {
        pointerDragged = true;
      }
      applyTouchGestureMove();
      return;
    }

    if (!cameraRig.dragging || event.pointerId !== cameraRig.pointerId) {
      return;
    }

    const deltaX = event.clientX - cameraRig.pointerX;
    const deltaY = event.clientY - cameraRig.pointerY;
    cameraRig.pointerX = event.clientX;
    cameraRig.pointerY = event.clientY;
    if (
      Math.hypot(
        event.clientX - pointerDownClientX,
        event.clientY - pointerDownClientY,
      ) > TAXI_CLICK_MOVE_THRESHOLD
    ) {
      pointerDragged = true;
    }
    if (cameraRig.dragMode === "pan") {
      panCameraByScreenDelta(deltaX, deltaY);
      callbacks.syncCamera();
      return;
    }

    if (cameraModeRef.current === "follow") {
      followOrbit.yawOffset = wrapAngle(
        followOrbit.yawOffset - deltaX * CAMERA_DRAG_SENSITIVITY,
      );
    } else {
      enterTouchMapMode();
      cameraRig.yaw -= deltaX * CAMERA_DRAG_SENSITIVITY;
    }
    cameraRig.pitch = THREE.MathUtils.clamp(
      cameraRig.pitch - deltaY * CAMERA_DRAG_SENSITIVITY,
      CAMERA_MIN_PITCH,
      CAMERA_MAX_PITCH,
    );
    callbacks.syncCamera();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (cameraModeRef.current === "ride") {
      if (event.pointerType === "touch") {
        event.preventDefault();
      }
      activeTouchPointers.delete(event.pointerId);
      stopDragging();
      callbacks.markHoverDirty();
      return;
    }

    if (event.pointerType === "touch") {
      const hadTouchPointer = activeTouchPointers.has(event.pointerId);
      if (!hadTouchPointer) {
        return;
      }
      event.preventDefault();
      const shouldTreatAsClick =
        activeTouchPointers.size === 1 &&
        !pointerDragged &&
        !touchGestureState.usedMultiTouch;
      activeTouchPointers.delete(event.pointerId);
      callbacks.markHoverDirty();

      if (activeTouchPointers.size > 0) {
        pointerDragged = true;
        setTouchGestureBasis();
        return;
      }

      touchGestureState.usedMultiTouch = false;
      setTouchGestureBasis();
      if (shouldTreatAsClick) {
        const clickedPoiCode = ctx.pointerPickController.findPoiCodeFromPointer();
        if (clickedPoiCode) {
          onPoiSelect?.(clickedPoiCode);
          return;
        }

        const clickedTaxi = ctx.pointerPickController.findTaxiFromPointer();
        if (clickedTaxi) {
          callbacks.enterRideMode(clickedTaxi);
          return;
        }

        const clickedDong = ctx.pointerPickController.findDongFromPointer();
        if (clickedDong) {
          onDongSelect?.(clickedDong);
        }
      }
      return;
    }

    if (event.pointerId !== cameraRig.pointerId) {
      return;
    }
    const shouldTreatAsClick = cameraRig.dragMode === "pan" && !pointerDragged;
    stopDragging();
    callbacks.markHoverDirty();
    if (shouldTreatAsClick) {
      const clickedPoiCode = ctx.pointerPickController.findPoiCodeFromPointer();
      if (clickedPoiCode) {
        onPoiSelect?.(clickedPoiCode);
        return;
      }

      const clickedTaxi = ctx.pointerPickController.findTaxiFromPointer();
      if (clickedTaxi) {
        callbacks.enterRideMode(clickedTaxi);
        return;
      }

      const clickedDong = ctx.pointerPickController.findDongFromPointer();
      if (clickedDong) {
        onDongSelect?.(clickedDong);
      }
    }
  };

  const onWheel = (event: WheelEvent) => {
    if (cameraModeRef.current === "ride") {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    cameraRig.distance = THREE.MathUtils.clamp(
      cameraRig.distance + event.deltaY * 0.08,
      CAMERA_MIN_DISTANCE,
      maxMapDistance,
    );
    callbacks.syncCamera();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Escape" && cameraModeRef.current === "ride") {
      if (!isInteractiveTarget(event.target)) {
        event.preventDefault();
      }
      setCameraMode(rideExitModeRef.current);
    }
  };

  const onWindowBlur = () => {
    pointerInside = false;
    pointerDragged = false;
    activeTouchPointers.clear();
    touchGestureState.usedMultiTouch = false;
    setTouchGestureBasis();
    pointerNdc.set(2, 2);
    ctx.hoverHintController.clear();
    stopDragging();
  };

  const onVisibilityChange = () => {
    ctx.isPageHidden = document.visibilityState === "hidden";
    callbacks.applyRenderBudget(cameraModeRef.current);
    callbacks.markLabelVisibilityDirty();
  };

  const onPointerLeave = () => {
    pointerInside = false;
    pointerNdc.set(2, 2);
    ctx.hoverHintController.clear();
  };

  const attach = () => {
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { passive: false });
    window.addEventListener("pointercancel", onPointerUp, { passive: false });
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown);
    container.addEventListener("contextmenu", onContextMenu);
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("wheel", onWheel, { passive: false });
  };

  const detach = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("blur", onWindowBlur);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("keydown", onKeyDown);
    container.removeEventListener("contextmenu", onContextMenu);
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("pointerleave", onPointerLeave);
    container.removeEventListener("wheel", onWheel);
  };

  return {
    attach,
    detach,
    getPointerClient,
    getIsPointerInside,
    getFollowOrbit,
    enterTouchMapMode,
  };
}
