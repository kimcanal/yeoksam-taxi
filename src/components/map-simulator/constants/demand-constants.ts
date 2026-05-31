import { MAX_TAXI_COUNT } from "@/components/map-simulator/simulation";

export const PRIMARY_SUBWAY_STATION_NAMES = new Set([
  "강남",
  "역삼",
  "선릉",
  "신논현",
]);

export const DEMAND_SLOT_MINUTES = 60; // 백엔드는 시간당(hourly) 예측만 제공 → 1시간 단위 슬롯
export const DEMAND_SLOTS_PER_HOUR = 60 / DEMAND_SLOT_MINUTES; // = 1
export const DEMAND_VISUAL_UNIT_CALLS = 40;
export const DEMAND_VISUAL_MAX_TAXIS = MAX_TAXI_COUNT;
export const DEMAND_TAXI_SCALE_MIN_PERCENT = 0.1;
export const DEMAND_TAXI_SCALE_MAX_PERCENT = 12;
export const DEMAND_TAXI_SCALE_DEFAULT_PERCENT = 0.5;
export const DEMAND_TAXI_SCALE_STEP_PERCENT = 0.1;

export const DEMAND_CHART_WIDTH = 320;
export const DEMAND_CHART_HEIGHT = 164;
export const DEMAND_CHART_PADDING = {
  bottom: 28,
  left: 30,
  right: 12,
  top: 16,
} as const;
export const DEMAND_CHART_ROUNDING_STEP = 50;
export const DEMAND_CHART_X_TICK_HOURS = [0, 6, 12, 18, 23] as const;

export const DEMAND_SCORE_THRESHOLDS = {
  veryHigh: 0.85,
  high: 0.55,
  moderate: 0.25,
  low: 0.04,
} as const;

export const DEMAND_MINI_MAP_VIEWBOX_SIZE = 100;
export const DEMAND_MINI_MAP_PADDING = 5;
export const DEMAND_MINI_MAP_HEADING_LENGTH = 10;
export const DEMAND_MINI_MAP_EDGE_INSET = 4;
export const DEMAND_MINI_MAP_HEADING_EDGE_INSET = 2;
export const DEMAND_MINI_MAP_MAX_POIS = 8;
export const DEMAND_MINI_MAP_POI_LABEL_LEFT_THRESHOLD = 72;
export const DEMAND_MINI_MAP_LANDMARK_LABEL_LEFT_THRESHOLD = 76;

export const DEMAND_CONTEXT_POI_WEIGHTS = {
  roadCorridor: 0.85,
  station: 0.72,
  fallback: 0.58,
} as const;
