import * as THREE from "three";
import type {
  CameraMode,
  FpsMode,
} from "@/components/map-simulator/camera-types";
import { HIDDEN_RENDER_FPS } from "@/components/map-simulator/scene-constants";
import {
  resolveRenderCap,
  stabilizeRefreshRateBand,
} from "@/components/map-simulator/render-budget-utils";

const FALLBACK_FRAME_MS = 1000 / 60;
const MAX_RAW_DELTA_MS = 250;
const MIN_REFRESH_SAMPLE_MS = 2;
const MAX_REFRESH_SAMPLE_MS = 40;
const REFRESH_RATE_SMOOTHING = 0.1;
const MIN_VISIBLE_DELTA_MS = 1;
const MAX_FRAME_DELTA_SECONDS = 0.05;

export type SimulatorFrameTiming = {
  delta: number;
  elapsedTime: number;
  frameTimestamp: number;
};

export function createSimulatorLoopClock({ timer }: { timer: THREE.Timer }) {
  let lastRafTimestamp = 0;
  let lastVisibleRenderTimestamp = 0;
  let lastCappedRenderTimestamp = 0;
  let lastCapSignature = "";
  let refreshRateBand: number | null = null;
  let refreshRateEstimate = 0;

  return {
    nextFrame({
      cameraMode,
      fpsMode,
      isPageHidden,
      timestamp,
    }: {
      cameraMode: CameraMode;
      fpsMode: FpsMode;
      isPageHidden: boolean;
      timestamp?: number;
    }): SimulatorFrameTiming | null {
      const frameTimestamp = timestamp ?? performance.now();
      timer.update(frameTimestamp);

      const rawDeltaMs =
        lastRafTimestamp === 0
          ? FALLBACK_FRAME_MS
          : Math.min(frameTimestamp - lastRafTimestamp, MAX_RAW_DELTA_MS);
      lastRafTimestamp = frameTimestamp;

      if (
        !isPageHidden &&
        rawDeltaMs > MIN_REFRESH_SAMPLE_MS &&
        rawDeltaMs < MAX_REFRESH_SAMPLE_MS
      ) {
        const instantRefreshRate = 1000 / rawDeltaMs;
        refreshRateEstimate =
          refreshRateEstimate === 0
            ? instantRefreshRate
            : THREE.MathUtils.lerp(
                refreshRateEstimate,
                instantRefreshRate,
                REFRESH_RATE_SMOOTHING,
              );
        refreshRateBand = stabilizeRefreshRateBand(
          refreshRateEstimate,
          refreshRateBand,
        );
      }

      const activeRenderCap = isPageHidden
        ? HIDDEN_RENDER_FPS
        : resolveRenderCap(
            cameraMode,
            fpsMode,
            refreshRateBand ?? (refreshRateEstimate || null),
          );
      const capSignature = `${activeRenderCap ?? "unlimited"}:${
        isPageHidden ? "hidden" : "visible"
      }`;
      if (capSignature !== lastCapSignature) {
        lastCapSignature = capSignature;
        lastCappedRenderTimestamp = 0;
      }

      const delta = activeRenderCap !== null
        ? nextCappedDeltaSeconds({
            activeRenderCap,
            frameTimestamp,
            getLastCappedRenderTimestamp: () => lastCappedRenderTimestamp,
            getLastVisibleRenderTimestamp: () => lastVisibleRenderTimestamp,
            setLastCappedRenderTimestamp: (nextTimestamp) => {
              lastCappedRenderTimestamp = nextTimestamp;
            },
          })
        : nextUncappedDeltaSeconds({
            frameTimestamp,
            lastVisibleRenderTimestamp,
            rawDeltaMs,
          });
      if (delta === null || delta <= 0) {
        return null;
      }

      lastVisibleRenderTimestamp = frameTimestamp;
      return {
        delta,
        elapsedTime: timer.getElapsed(),
        frameTimestamp,
      };
    },
  };
}

function nextCappedDeltaSeconds({
  activeRenderCap,
  frameTimestamp,
  getLastCappedRenderTimestamp,
  getLastVisibleRenderTimestamp,
  setLastCappedRenderTimestamp,
}: {
  activeRenderCap: number;
  frameTimestamp: number;
  getLastCappedRenderTimestamp: () => number;
  getLastVisibleRenderTimestamp: () => number;
  setLastCappedRenderTimestamp: (timestamp: number) => void;
}) {
  const targetFrameMs = 1000 / activeRenderCap;
  const lastCappedRenderTimestamp = getLastCappedRenderTimestamp();
  if (lastCappedRenderTimestamp === 0) {
    setLastCappedRenderTimestamp(frameTimestamp);
  } else {
    const elapsedSinceCap = frameTimestamp - lastCappedRenderTimestamp;
    if (elapsedSinceCap < targetFrameMs) {
      return null;
    }
    setLastCappedRenderTimestamp(
      frameTimestamp - (elapsedSinceCap % targetFrameMs),
    );
  }

  return clampDeltaSeconds(
    Math.max(
      getLastVisibleRenderTimestamp() === 0
        ? targetFrameMs
        : frameTimestamp - getLastVisibleRenderTimestamp(),
      targetFrameMs,
    ) / 1000,
  );
}

function nextUncappedDeltaSeconds({
  frameTimestamp,
  lastVisibleRenderTimestamp,
  rawDeltaMs,
}: {
  frameTimestamp: number;
  lastVisibleRenderTimestamp: number;
  rawDeltaMs: number;
}) {
  return clampDeltaSeconds(
    Math.max(
      lastVisibleRenderTimestamp === 0
        ? rawDeltaMs
        : frameTimestamp - lastVisibleRenderTimestamp,
      MIN_VISIBLE_DELTA_MS,
    ) / 1000,
  );
}

function clampDeltaSeconds(delta: number) {
  return Math.min(delta, MAX_FRAME_DELTA_SECONDS);
}
