import type {
  CameraMode,
  FpsMode,
} from "@/components/map-simulator/camera";
import {
  AUTO_REFRESH_BAND_HYSTERESIS_RATIO,
  AUTO_RENDER_HALF_REFRESH_THRESHOLD,
  COMMON_REFRESH_RATE_BANDS,
  DRIVE_PIXEL_RATIO,
  DRIVE_RENDER_FPS,
  ENABLE_HARDWARE_ANTIALIAS,
  FOLLOW_PIXEL_RATIO,
  FOLLOW_RENDER_FPS,
  HIDDEN_PIXEL_RATIO,
  MAX_RENDER_DEVICE_PIXEL_RATIO,
  OVERVIEW_PIXEL_RATIO,
  OVERVIEW_RENDER_FPS,
} from "@/components/map-simulator/scene";

export function renderFpsCapFor(mode: CameraMode) {
  switch (mode) {
    case "overview":
      return OVERVIEW_RENDER_FPS;
    case "follow":
    case "ride":
      return FOLLOW_RENDER_FPS;
    default:
      return DRIVE_RENDER_FPS;
  }
}

export function nearestRefreshRateBand(refreshRateEstimate: number) {
  return COMMON_REFRESH_RATE_BANDS.reduce<number>(
    (closest, candidate) =>
      Math.abs(candidate - refreshRateEstimate) <
      Math.abs(closest - refreshRateEstimate)
        ? candidate
        : closest,
    COMMON_REFRESH_RATE_BANDS[0],
  );
}

export function stabilizeRefreshRateBand(
  refreshRateEstimate: number,
  currentBand: number | null,
) {
  if (currentBand !== null) {
    const keepTolerance = Math.max(
      4,
      currentBand * AUTO_REFRESH_BAND_HYSTERESIS_RATIO,
    );
    if (Math.abs(refreshRateEstimate - currentBand) <= keepTolerance) {
      return currentBand;
    }
  }

  return nearestRefreshRateBand(refreshRateEstimate);
}

export function autoRenderFpsFor(
  mode: CameraMode,
  refreshRateEstimate: number | null,
) {
  const baseCap = renderFpsCapFor(mode);
  if (refreshRateEstimate === null) {
    return baseCap;
  }

  if (refreshRateEstimate >= AUTO_RENDER_HALF_REFRESH_THRESHOLD) {
    return Math.round(refreshRateEstimate / 2);
  }

  return Math.round(refreshRateEstimate);
}

export function resolveRenderCap(
  mode: CameraMode,
  fpsMode: FpsMode,
  refreshRateEstimate: number | null,
) {
  switch (fpsMode) {
    case "unlimited":
      return null;
    case "fixed60":
      return 60;
    default:
      return autoRenderFpsFor(mode, refreshRateEstimate);
  }
}

export function renderPixelRatioFor(mode: CameraMode, isHidden: boolean) {
  if (isHidden) {
    return HIDDEN_PIXEL_RATIO;
  }

  switch (mode) {
    case "overview":
      return OVERVIEW_PIXEL_RATIO;
    case "follow":
    case "ride":
      return FOLLOW_PIXEL_RATIO;
    default:
      return DRIVE_PIXEL_RATIO;
  }
}

export function resolvedRendererPixelRatioFor(
  mode: CameraMode,
  isHidden: boolean,
  devicePixelRatio: number,
) {
  return Math.min(
    Math.max(devicePixelRatio, 1),
    MAX_RENDER_DEVICE_PIXEL_RATIO,
    renderPixelRatioFor(mode, isHidden),
  );
}

export function shouldUseHardwareAntialias({
  devicePixelRatio,
  viewportPixels,
}: {
  devicePixelRatio: number;
  viewportPixels: number;
}) {
  return (
    ENABLE_HARDWARE_ANTIALIAS &&
    devicePixelRatio <= 1.1 &&
    viewportPixels <= 1_300_000
  );
}

export function precipitationDrawRatioFor(
  mode: CameraMode,
  isHidden: boolean,
) {
  if (isHidden) {
    return 0.35;
  }

  switch (mode) {
    case "overview":
      return 0.58;
    case "drive":
      return 0.82;
    case "ride":
      return 0.9;
    default:
      return 1;
  }
}

export function labelVisibilityBudget(mode: CameraMode) {
  switch (mode) {
    case "overview":
      return {
        districtLimit: 9,
        districtDistanceSq: 420 * 420,
        optionalLimit: 16,
        optionalDistanceSq: 250 * 250,
      };
    case "follow":
      return {
        districtLimit: 5,
        districtDistanceSq: 250 * 250,
        optionalLimit: 10,
        optionalDistanceSq: 190 * 190,
      };
    case "ride":
      return {
        districtLimit: 3,
        districtDistanceSq: 170 * 170,
        optionalLimit: 5,
        optionalDistanceSq: 130 * 130,
      };
    default:
      return {
        districtLimit: 4,
        districtDistanceSq: 220 * 220,
        optionalLimit: 8,
        optionalDistanceSq: 170 * 170,
      };
  }
}
