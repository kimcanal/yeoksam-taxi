import type { SimulationData } from "@/components/map-simulator/core";

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

export const DEMAND_WEEKDAYS = [
  { id: "monday", label: "월" },
  { id: "tuesday", label: "화" },
  { id: "wednesday", label: "수" },
  { id: "thursday", label: "목" },
  { id: "friday", label: "금" },
  { id: "saturday", label: "토" },
  { id: "sunday", label: "일" },
] as const;

export type DemandWeekdayId = (typeof DEMAND_WEEKDAYS)[number]["id"];

export type HourlyDemandPoint = {
  hour: number;
  populationPred: number | null;
  demandPred: number;
  trendDemandPred: number;
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
  trendPath: string;
  areaPath: string;
  peakPoint: HourlyDemandPoint;
  peakX: number;
  peakY: number;
  xTicks: { hour: number; x: number }[];
  yTicks: { value: number; y: number }[];
};

export type TransitFeature = SimulationData["transit"]["features"][number];
