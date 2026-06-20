import type { SimulationData } from "@/components/map-simulator/types";

export type MapPoiFeatureRow = {
  poi_code: string;
  poi_name: string;
  coverage_dong: string | null;
  category: string | null;
  lon: number | null;
  lat: number | null;
  context_score: number;
};

export type IndexedMapPoiFeatureRow = MapPoiFeatureRow & {
  projectedX: number;
  projectedZ: number;
};

export const TARGET_DONGS = [
  "역삼1동",
  "역삼2동",
  "논현1동",
  "논현2동",
  "삼성1동",
  "삼성2동",
  "신사동",
  "청담동",
  "대치4동",
] as const;

export type HourlyDemandPoint = {
  hour: number;
  populationPred: number | null;
  demandPred: number;
  actualDemand: number | null;
  trendDemandPred: number;
  isBackendMissing?: boolean;
};

export type DemandChartPointMarker = {
  hour: number;
  x: number;
  y: number;
  value: number;
  isBackendMissing?: boolean;
};

export type FiveMinuteDemandPoint = {
  minuteOfDay: number;
  hour: number;
  slot: number;
  demand: number;
  visualUnits: number;
};

export type DemandFetchStatus = "idle" | "loading" | "ready" | "error";

export type DemandMiniMapRegion = {
  name: string;
  path: string;
  labelX: number;
  labelY: number;
  score: number | null;
  demandCount: number | null;
  isSelected?: boolean;
};

export type DemandMiniMapLandmark = {
  name: string;
  label: string;
  isPrimary: boolean;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  textAnchor: "start" | "end";
};

export type DemandMiniMapPoi = {
  code: string;
  name: string;
  label: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  contextScore: number;
  isSelected: boolean;
  textAnchor: "start" | "end";
};

export type DemandMiniMapData = {
  regions: DemandMiniMapRegion[];
  landmarks: DemandMiniMapLandmark[];
  pois: DemandMiniMapPoi[];
  focus: { x: number; y: number } | null;
  focusHeading: { x1: number; y1: number; x2: number; y2: number } | null;
  focusLabel: string;
};

export type DemandChartGeometry = {
  width: number;
  height: number;
  paddingLeft: number;
  baseY: number;
  yMax: number;
  linePath: string;
  actualLinePath: string;
  trendPath: string;
  areaPath: string;
  hasActualDemand: boolean;
  peakPoint: HourlyDemandPoint;
  peakX: number;
  peakY: number;
  xTicks: { hour: number; x: number }[];
  yTicks: { value: number; y: number }[];
  demandPointMarkers: DemandChartPointMarker[];
  missingDemandHours: number[];

  // 공급 추정 통합 필드
  supplyLinePath: string;
  hasSupplyData: boolean;
  peakSupplyPoint: HourlySupplyPoint | null;
  peakSupplyX: number;
  peakSupplyY: number;
};

export type PricingChartGeometry = {
  width: number;
  height: number;
  paddingLeft: number;
  baseY: number;
  yMax: number;
  yMin: number;
  linePath: string;
  areaPath: string;
  peakPoint: HourlyPricingPoint;
  peakX: number;
  peakY: number;
  xTicks: { hour: number; x: number }[];
  yTicks: { value: number; y: number }[];
};

export type TransitFeature = SimulationData["transit"]["features"][number];

export type HourlySupplyPoint = {
  hour: number;
  supplyPred: number;
};

export type HourlyPricingPoint = {
  hour: number;
  demand: number;
  supplyProxy: number;
  shortage: number;
  shortageRatio: number;
  pricingTier: string;
  surgeMultiplier: number;
  suggestedDriverIncentiveKrw: number;
  expectedSupplyIncrease: number;
  postIncentiveSupplyProxy: number;
  postIncentiveShortage: number;
};
