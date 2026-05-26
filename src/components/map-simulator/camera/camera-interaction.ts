export { createMapPointerPickController } from "@/components/map-simulator/scene";

export type CameraTouchPoint = {
  x: number;
  y: number;
  startX: number;
  startY: number;
};

export type CameraTouchGestureState = {
  lastCenterX: number;
  lastCenterY: number;
  lastDistance: number;
  lastAngle: number;
  lastFirstX: number;
  lastFirstY: number;
  lastSecondX: number;
  lastSecondY: number;
  multiTouchMode: "map" | "pitch";
  pitchTouchIndex: number;
  usedMultiTouch: boolean;
};

export function createCameraTouchGestureState(): CameraTouchGestureState {
  return {
    lastCenterX: 0,
    lastCenterY: 0,
    lastDistance: 0,
    lastAngle: 0,
    lastFirstX: 0,
    lastFirstY: 0,
    lastSecondX: 0,
    lastSecondY: 0,
    multiTouchMode: "map",
    pitchTouchIndex: -1,
    usedMultiTouch: false,
  };
}

export function firstTwoTouchPoints(
  activeTouchPointers: ReadonlyMap<number, CameraTouchPoint>,
) {
  return [...activeTouchPointers.values()].slice(0, 2);
}

export function setCameraTouchGestureBasis(
  state: CameraTouchGestureState,
  [firstTouch, secondTouch]: CameraTouchPoint[],
) {
  if (!firstTouch) {
    state.lastCenterX = 0;
    state.lastCenterY = 0;
    state.lastDistance = 0;
    state.lastAngle = 0;
    state.lastFirstX = 0;
    state.lastFirstY = 0;
    state.lastSecondX = 0;
    state.lastSecondY = 0;
    state.multiTouchMode = "map";
    state.pitchTouchIndex = -1;
    return;
  }

  if (!secondTouch) {
    state.lastCenterX = firstTouch.x;
    state.lastCenterY = firstTouch.y;
    state.lastDistance = 0;
    state.lastAngle = 0;
    state.lastFirstX = firstTouch.x;
    state.lastFirstY = firstTouch.y;
    state.lastSecondX = 0;
    state.lastSecondY = 0;
    state.multiTouchMode = "map";
    state.pitchTouchIndex = -1;
    return;
  }

  state.lastCenterX = (firstTouch.x + secondTouch.x) / 2;
  state.lastCenterY = (firstTouch.y + secondTouch.y) / 2;
  state.lastDistance = Math.max(
    1,
    Math.hypot(secondTouch.x - firstTouch.x, secondTouch.y - firstTouch.y),
  );
  state.lastAngle = Math.atan2(
    secondTouch.y - firstTouch.y,
    secondTouch.x - firstTouch.x,
  );
  state.lastFirstX = firstTouch.x;
  state.lastFirstY = firstTouch.y;
  state.lastSecondX = secondTouch.x;
  state.lastSecondY = secondTouch.y;
  state.multiTouchMode = "map";
  state.pitchTouchIndex = -1;
}

export function anchoredPitchTouchIndex(
  firstTouch: CameraTouchPoint,
  secondTouch: CameraTouchPoint,
  {
    anchorRadius,
    pitchLockDistance,
    verticalRatio,
  }: {
    anchorRadius: number;
    pitchLockDistance: number;
    verticalRatio: number;
  },
) {
  const firstDeltaX = firstTouch.x - firstTouch.startX;
  const firstDeltaY = firstTouch.y - firstTouch.startY;
  const secondDeltaX = secondTouch.x - secondTouch.startX;
  const secondDeltaY = secondTouch.y - secondTouch.startY;
  const firstTravel = Math.hypot(firstDeltaX, firstDeltaY);
  const secondTravel = Math.hypot(secondDeltaX, secondDeltaY);
  const firstAnchored = firstTravel <= anchorRadius;
  const secondAnchored = secondTravel <= anchorRadius;
  const firstVertical =
    Math.abs(firstDeltaY) >= pitchLockDistance &&
    Math.abs(firstDeltaY) > Math.abs(firstDeltaX) * verticalRatio;
  const secondVertical =
    Math.abs(secondDeltaY) >= pitchLockDistance &&
    Math.abs(secondDeltaY) > Math.abs(secondDeltaX) * verticalRatio;

  if (firstAnchored && secondVertical) {
    return 1;
  }
  if (secondAnchored && firstVertical) {
    return 0;
  }
  return -1;
}

export function rememberCurrentTouchGesture(
  state: CameraTouchGestureState,
  firstTouch: Pick<CameraTouchPoint, "x" | "y">,
  secondTouch: Pick<CameraTouchPoint, "x" | "y">,
  distance: number,
  angle: number,
) {
  state.lastCenterX = (firstTouch.x + secondTouch.x) / 2;
  state.lastCenterY = (firstTouch.y + secondTouch.y) / 2;
  state.lastDistance = distance;
  state.lastAngle = angle;
  state.lastFirstX = firstTouch.x;
  state.lastFirstY = firstTouch.y;
  state.lastSecondX = secondTouch.x;
  state.lastSecondY = secondTouch.y;
}

export function isInteractiveTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }
  const tagName = element.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    tagName === "BUTTON" ||
    element.isContentEditable
  );
}
