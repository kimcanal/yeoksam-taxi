"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Gauge,
  Map as MapIcon,
  Maximize2,
  Menu,
  Minimize2,
  Navigation,
  X,
} from "lucide-react";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";
import { MapSimulatorErrorBoundary } from "@/components/MapSimulatorErrorBoundary";
import mapGroundingConfig from "../../data/config/gangnam-map-grounding.json";
import poiConfig from "../../data/config/gangnam-pois.json";
import {
  WEATHER_OPTIONS,
  currentSimulationClock,
  format24Hour,
  formatDateLabel,
  normalizeDayMinutes,
  timeBandLabel,
  type WeatherMode,
} from "@/components/map-simulator/simulation-environment";
import { loadSimulationData } from "@/components/map-simulator/load-simulation-data";
import { createLocalSimulationSource } from "@/components/map-simulator/local-simulation-source";
import MapSimulatorSceneRuntime from "@/components/map-simulator/MapSimulatorSceneRuntime";
import { useSyncRef } from "@/components/map-simulator/use-sync-ref";
import { useLiveData } from "@/components/map-simulator/use-live-data";
import type { LiveArea, LiveData } from "@/components/map-simulator/use-live-data";
import { useVehicleTelemetry } from "@/components/map-simulator/use-vehicle-telemetry";
import {
  conditionDemandForecast,
  DEMAND_FORECAST_SNAPSHOTS,
  type DemandForecastDong,
} from "@/components/map-simulator/demand-forecast";
import { useForecastResult } from "@/components/map-simulator/use-forecast-result";
import {
  analysisStore,
  sceneSetters,
  sceneStore,
  uiSetters,
  uiStore,
} from "@/components/map-simulator/simulator-stores";
import { QuadTree } from "@/components/map-simulator/spatial-quadtree";
import type { ForecastSource } from "@/components/map-simulator/forecast-contract";
import {
  BaseCameraMode,
  CameraFocusTarget,
  CameraMode,
  CircumstanceMode,
  DEFAULT_TAXI_COUNT,
  FpsMode,
  PANEL_ACCENT_CARD_CLASS,
  PANEL_CARD_CLASS,
  PANEL_EYEBROW_CLASS,
  PANEL_SECTION_LABEL_CLASS,
  PANEL_TOKEN_CLASS,
  SimulationData,
  panelBadgeClass,
  panelSelectableClass,
  projectPoint,
} from "@/components/map-simulator/core";
type MapSimulatorProps = {
  buildVersion: BuildVersionInfo;
};

type MapPoiFeatureRow = {
  source_status: string;
  poi_code: string;
  poi_name: string;
  coverage_dong: string | null;
  category: string | null;
  lon: number | null;
  lat: number | null;
  observed_at?: string | null;
  current_population_min?: number | null;
  current_population_max?: number | null;
  current_population_mid: number | null;
  current_congestion_level: string | null;
  current_congestion_score?: number | null;
  current_traffic_index?: string | null;
  current_traffic_speed_kmh: number | null;
  current_weather_temp_c?: number | null;
  current_precipitation_type?: string | null;
  demand_proxy_score?: number | null;
  poi_pressure_score: number | null;
  population_forecast_1h: {
    forecast_time?: string | null;
    population_min?: number | null;
    population_max?: number | null;
    population_mid: number | null;
    congestion_level: string | null;
    congestion_score?: number | null;
  } | null;
  forecast_population_delta: number | null;
  forecast_population_delta_pct?: number | null;
};

type IndexedMapPoiFeatureRow = MapPoiFeatureRow & {
  projectedX: number;
  projectedZ: number;
};

const MAP_SCOPE_LABEL = "역삼동 주변 9개 동";
const TARGET_DONGS = [
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
const PRIMARY_SUBWAY_STATION_NAMES = new Set(["강남", "역삼", "선릉", "신논현"]);
const LIVE_CONGESTION_SCORE: Record<string, number> = {
  "매우 붐빔": 5,
  "붐빔": 4,
  "약간 붐빔": 3,
  "보통": 2,
  "여유": 1,
};
const LIVE_TRAFFIC_SCORE: Record<string, number> = {
  "정체": 3,
  "서행": 2,
  "원활": 1,
};
const MAP_GROUNDING_SOURCE_LABEL =
  "서울시 택시승차대 현황 + 서울시/카카오 심야 택시 리포트";

type DemandMiniMapRegion = {
  name: string;
  path: string;
  labelX: number;
  labelY: number;
  score: number;
  dispatchActionLevel?: string;
};

type DemandMiniMapLandmark = {
  name: string;
  label: string;
  isPrimary: boolean;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  textAnchor: "start" | "end";
};

type DemandMiniMapPoi = {
  code: string;
  name: string;
  label: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  score: number;
  isSelected: boolean;
  textAnchor: "start" | "end";
};

type DongGroundingInfo = {
  dongName: string;
  taxiStandCount: number;
  supplyGroundingScore: number;
  contextPoiCount: number;
  contextPoiScore: number;
  reportHotspotTier: string;
  reportDemandPrior: number;
  demandGroundingScore: number;
  groundingNote: string;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function contextPoiWeight(category: string | null | undefined, hasCitydataCode: boolean) {
  if (category === "road_corridor_context") {
    return 0.85;
  }
  if (category === "station_context") {
    return 0.72;
  }
  if (hasCitydataCode) {
    return 1;
  }
  return 0.58;
}

function hotspotTierLabel(tier: string | null | undefined) {
  switch (tier) {
    case "primary":
      return "핵심 수요지";
    case "secondary":
      return "보조 수요지";
    default:
      return "정적 기준";
  }
}

function isSubwayStationFeature(feature: SimulationData["transit"]["features"][number]) {
  return (
    feature.properties.category === "subway_station" &&
    feature.properties.sourceType === "station"
  );
}

function AnalysisStatusBadge() {
  const externalPatternId = analysisStore.useStore((s) => s.externalPatternId);
  const isActive = externalPatternId !== "none";

  return (
    <div className={`mt-3 rounded-2xl border p-3 transition-all duration-500 ${
      isActive 
        ? "border-cyan-500/30 bg-cyan-500/[0.08] shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)]" 
        : "border-white/5 bg-white/[0.02]"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${isActive ? "animate-pulse bg-cyan-400" : "bg-slate-600"}`} />
          <span className="text-[11px] font-medium text-slate-400">패턴 분석 엔진</span>
        </div>
        <span className={`text-[10px] font-bold tracking-tight ${isActive ? "text-cyan-300" : "text-slate-600"}`}>
          {isActive ? "NYC PATTERN ACTIVE" : "IDLE"}
        </span>
      </div>
      {isActive && (
        <div className="mt-2 text-[10px] leading-relaxed text-slate-400">
          뉴욕 이동 패턴 분석 데이터가 현재 역삼권 시뮬레이션에 반영되고 있습니다.
        </div>
      )}
    </div>
  );
}


function projectedRingArea(ring: THREE.Vector3[]) {
  if (ring.length < 3) {
    return 0;
  }
  let area = 0;
  ring.forEach((point, index) => {
    const next = ring[(index + 1) % ring.length]!;
    area += point.x * next.z - next.x * point.z;
  });
  return Math.abs(area) / 2;
}

function displayRingsForHeatmap(rings: THREE.Vector3[][]) {
  const validRings = rings.filter((ring) => ring.length >= 3);
  if (validRings.length <= 1) {
    return validRings;
  }

  return [
    validRings.reduce((largest, ring) =>
      projectedRingArea(ring) > projectedRingArea(largest) ? ring : largest,
    ),
  ];
}

function centerOfRings(rings: THREE.Vector3[][]) {
  const bounds = new THREE.Box3();
  rings.forEach((ring) =>
    ring.forEach((point) => bounds.expandByPoint(point)),
  );
  return bounds.getCenter(new THREE.Vector3());
}

function demandFillForScore(score: number) {
  if (score >= 0.85) return "rgba(244, 63, 94, 0.78)";
  if (score >= 0.55) return "rgba(249, 115, 22, 0.68)";
  if (score >= 0.25) return "rgba(234, 179, 8, 0.58)";
  if (score >= 0.04) return "rgba(45, 212, 191, 0.38)";
  return "rgba(148, 163, 184, 0.18)";
}

function demandStrokeForScore(score: number) {
  if (score >= 0.85) return "rgba(251, 113, 133, 0.92)";
  if (score >= 0.55) return "rgba(251, 146, 60, 0.82)";
  if (score >= 0.25) return "rgba(250, 204, 21, 0.72)";
  if (score >= 0.04) return "rgba(94, 234, 212, 0.62)";
  return "rgba(148, 163, 184, 0.34)";
}

function demandLevelLabel(score: number) {
  if (score >= 0.85) return "매우 높음";
  if (score >= 0.55) return "높음";
  if (score >= 0.25) return "중간";
  if (score >= 0.04) return "낮음";
  return "매우 낮음";
}

function categoryLabel(category: string | null | undefined): string {
  if (!category) return "장소";
  const map: Record<string, string> = {
    station_commercial: "역세권 상권",
    tourism_business: "관광·비즈니스",
    office_district: "업무지구",
    residential_commercial: "주거·상가 복합",
    entertainment: "유흥·연효",
    park_recreation: "공원·여가",
    hospital: "의료시설",
    edu_culture: "교육·문화",
  };
  return map[category] ?? category;
}

function compactPoiLabel(name: string) {
  const normalized = name.replace(/\s+/g, " ").trim();
  return normalized.length > 8 ? normalized.slice(0, 8) : normalized;
}

function demandReasonsFor(dong: DemandForecastDong) {
  const reasons = [];
  if (dong.publicTransitSignal >= 0.5) {
    reasons.push("대중교통 압력");
  }
  if (dong.contextMultiplier >= 1.14) {
    reasons.push("상권·교통 맥락 가중");
  }
  if (dong.contextPrior >= 0.008) {
    reasons.push("시간대 prior");
  }
  if (!reasons.length) {
    reasons.push("기저 패턴");
  }
  return reasons.slice(0, 2);
}

function parseTimeInput(value: string) {
  const [hourValue, minuteValue] = value.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  return normalizeDayMinutes(hour * 60 + minute);
}

function formatLivePopulation(area: LiveArea) {
  if (area.populationMax <= 0) {
    return "정보 없음";
  }
  if (area.populationMin > 0 && area.populationMin !== area.populationMax) {
    return `${area.populationMin.toLocaleString("ko-KR")}-${area.populationMax.toLocaleString("ko-KR")}`;
  }
  return area.populationMax.toLocaleString("ko-KR");
}

function formatLiveWeather(tempC: number, precipitationType: string) {
  const tempLabel = Number.isFinite(tempC) && tempC !== 0
    ? `${Math.round(tempC * 10) / 10}도`
    : "기온 미제공";
  const precipLabel = precipitationType && precipitationType !== "없음"
    ? precipitationType
    : "강수 없음";
  return `${tempLabel} · ${precipLabel}`;
}

function formatKstClock(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value.slice(0, 16).replace("T", " ");
  }
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function formatKstDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value.slice(0, 16).replace("T", " ");
  }
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function formatKstFullDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value.slice(0, 16).replace("T", " ");
  }
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(parsed);
  const partMap = new globalThis.Map(
    parts.map((part) => [part.type, part.value]),
  );

  return [
    partMap.get("year"),
    partMap.get("month"),
    partMap.get("day"),
  ].join("-") + ` ${partMap.get("hour")}:${partMap.get("minute")}`;
}

function parseDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function hoursSince(value: string | null | undefined) {
  const parsed = parseDateTime(value);
  if (!parsed) {
    return null;
  }
  return (Date.now() - parsed.getTime()) / (1000 * 60 * 60);
}

function forecastStrategyLabel(strategy: string | null | undefined) {
  if (strategy === "pattern") return "통계 기반";
  if (strategy === "exact") return "관측값 기반";
  return strategy ? strategy : "예측 모델";
}

function formatPoiPopulationRange(poi: MapPoiFeatureRow | null) {
  if (!poi) return "-";
  if (
    typeof poi.current_population_min === "number" &&
    typeof poi.current_population_max === "number" &&
    poi.current_population_min !== poi.current_population_max
  ) {
    return `${poi.current_population_min.toLocaleString("ko-KR")}-${poi.current_population_max.toLocaleString("ko-KR")}`;
  }
  if (typeof poi.current_population_mid === "number") {
    return poi.current_population_mid.toLocaleString("ko-KR");
  }
  return "-";
}

function livePopulationMid(area: LiveArea) {
  if (area.populationMax <= 0 && area.populationMin <= 0) {
    return 0;
  }
  if (area.populationMin > 0 && area.populationMax > 0) {
    return Math.round((area.populationMin + area.populationMax) / 2);
  }
  return Math.max(area.populationMin, area.populationMax, 0);
}

function buildLivePoiFeatureRows(liveData: LiveData | null) {
  if (!liveData?.areas.length) {
    return [];
  }

  const rawScores = liveData.areas.map((area) => liveAreaScore(area));
  const maxScore = Math.max(...rawScores, 1);

  return liveData.areas
    .map((area, index) => {
      const rawScore = rawScores[index] ?? 0;
      const pressureScore = Math.round((rawScore / maxScore) * 1000) / 1000;
      return {
        source_status: "citydata_live",
        poi_code: area.areaCode,
        poi_name: area.areaName,
        coverage_dong: area.coverageDong,
        category: area.category,
        lon: area.lon,
        lat: area.lat,
        observed_at: area.observedAt,
        current_population_min: area.populationMin,
        current_population_max: area.populationMax,
        current_population_mid: livePopulationMid(area),
        current_congestion_level: area.congestionLevel,
        current_congestion_score: LIVE_CONGESTION_SCORE[area.congestionLevel] ?? null,
        current_traffic_index: area.trafficIndex,
        current_traffic_speed_kmh: area.speedKmh,
        current_weather_temp_c: liveData.weather.tempC,
        current_precipitation_type: liveData.weather.precipitationType,
        demand_proxy_score: pressureScore,
        poi_pressure_score: pressureScore,
        population_forecast_1h: null,
        forecast_population_delta: null,
        forecast_population_delta_pct: null,
      } satisfies MapPoiFeatureRow;
    })
    .sort((left, right) => (right.poi_pressure_score ?? 0) - (left.poi_pressure_score ?? 0));
}

function monitoringActionLabel(action: string | null | undefined, level?: string | null) {
  if (action === "선제 이동" || level === "high") return "수급 불균형 심각 (Surge 발동)";
  if (action === "커버 보강" || level === "medium") return "택시 공급 부족 (배차 유도)";
  if (action === "관찰" || level === "watch") return "국지적 수요 증가 (관찰)";
  if (action === "유지" || level === "low") return "수급 안정 (Normal)";
  return action ?? "-";
}

function monitoringStatusGrade(level: string | null | undefined) {
  if (level === "high") return "높음";
  if (level === "medium") return "보통";
  if (level === "watch") return "확인";
  return "안정";
}

function dispatchActionTextClass(level: string | null | undefined) {
  if (level === "high") return "text-red-400";
  if (level === "medium") return "text-yellow-300";
  if (level === "watch") return "text-blue-300";
  return "text-slate-400";
}

function dispatchActionBadgeClass(level: string | null | undefined) {
  if (level === "high") return "border-red-400/25 bg-red-400/[0.08] text-red-300";
  if (level === "medium") return "border-yellow-300/25 bg-yellow-300/[0.08] text-yellow-200";
  if (level === "watch") return "border-blue-300/25 bg-blue-300/[0.08] text-blue-200";
  return "border-white/10 bg-white/[0.05] text-slate-400";
}

function dispatchMiniMapIcon(level: string | null | undefined) {
  if (level === "high") return "▲";
  if (level === "medium") return "◆";
  if (level === "watch") return "●";
  return "";
}

function dispatchMiniMapIconColor(level: string | null | undefined) {
  if (level === "high") return "#fb7185";
  if (level === "medium") return "#fde047";
  if (level === "watch") return "#7dd3fc";
  return "#94a3b8";
}

function monitoringLevelForScore(score: number) {
  if (score >= 0.72) return "high";
  if (score >= 0.52) return "medium";
  if (score >= 0.28) return "watch";
  return "low";
}

function monitoringActionForLevel(level: string) {
  if (level === "high") return "선제 이동";
  if (level === "medium") return "커버 보강";
  if (level === "watch") return "관찰";
  return "유지";
}

function mapToolButtonClass(active: boolean) {
  return `inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/45 ${
    active
      ? "border-cyan-300/35 bg-cyan-300/14 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.12)]"
      : "border-white/10 bg-slate-950/82 text-slate-300 hover:border-white/20 hover:bg-slate-900/86 hover:text-white"
  }`;
}

function liveAreaScore(area: LiveArea) {
  const congestion = LIVE_CONGESTION_SCORE[area.congestionLevel] ?? 0;
  const traffic = LIVE_TRAFFIC_SCORE[area.trafficIndex] ?? 0;
  return area.populationMax + congestion * 5_000 + traffic * 2_000;
}

function poiRenderRadius(cameraMode: CameraMode) {
  if (cameraMode === "overview") return 320;
  if (cameraMode === "follow") return 180;
  if (cameraMode === "ride") return 140;
  return 220;
}


function calculateLatencyMinutes(observedAt: string | undefined) {
  if (!observedAt) return null;
  const observedTimestamp = new Date(observedAt).getTime();
  if (!Number.isFinite(observedTimestamp)) {
    return null;
  }
  return Math.max(0, Math.round((Date.now() - observedTimestamp) / 60000));
}

function formatLatencyLabel(minutes: number | null) {
  if (minutes == null) {
    return null;
  }
  if (minutes < 60) {
    return `반영 시차 약 ${minutes}분`;
  }
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes > 0
    ? `반영 시차 약 ${hours}시간 ${remainMinutes}분`
    : `반영 시차 약 ${hours}시간`;
}

export default function MapSimulator({ buildVersion }: MapSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationSource = useMemo(() => createLocalSimulationSource(), []);
  const data = sceneStore.useStore((state) => state.data);
  const status = sceneStore.useStore((state) => state.status);
  const statusDetail = sceneStore.useStore((state) => state.statusDetail);
  const loadingProgress = sceneStore.useStore((state) => state.loadingProgress);
  const circumstanceMode = sceneStore.useStore((state) => state.circumstanceMode);
  const simulationDate = sceneStore.useStore((state) => state.simulationDate);
  const simulationTimeMinutes = sceneStore.useStore(
    (state) => state.simulationTimeMinutes,
  );
  const weatherMode = sceneStore.useStore((state) => state.weatherMode);
  const cameraMode = sceneStore.useStore((state) => state.cameraMode);
  const miniMapFocus = sceneStore.useStore((state) => state.miniMapFocus);
  const followTaxiId = sceneStore.useStore((state) => state.followTaxiId);
  const showFps = sceneStore.useStore((state) => state.showFps);
  const fpsStats = sceneStore.useStore((state) => state.fpsStats);
  const selectedPoiCode = uiStore.useStore((state) => state.selectedPoiCode);
  const isSidebarCollapsed = uiStore.useStore(
    (state) => state.isSidebarCollapsed,
  );
  const isMapFocusMode = uiStore.useStore((state) => state.isMapFocusMode);
  const isScenarioControlsExpanded = uiStore.useStore(
    (state) => state.isScenarioControlsExpanded,
  );
  const {
    setData,
    setStatus,
    setStatusDetail,
    setLoadingProgress,
    setCircumstanceMode,
    setSimulationDate,
    setSimulationTimeMinutes,
    setWeatherMode,
    setCameraMode,
    setMiniMapFocus,
    setFollowTaxiId,
    setShowFps,
    setFpsStats,
    setStats,
  } = sceneSetters;
  const {
    setSelectedPoiCode,
    setIsSidebarCollapsed,
    setIsMapFocusMode,
    setIsScenarioControlsExpanded,
  } = uiSetters;
  const showLabels = false;
  const showNonRoad = false;
  const showTransit = true;
  const showRoadNetwork = false;
  const forecastOffsetMinutes = 15;
  const fpsMode: FpsMode = "fixed60";
  const appliedTaxiCount = DEFAULT_TAXI_COUNT;
  // Keep the map focused on taxi operations until backend traffic markers land.
  const appliedTrafficCount = 0;
  const appliedTaxiCountRef = useSyncRef(appliedTaxiCount);
  const appliedTrafficCountRef = useSyncRef(appliedTrafficCount);
  const simulationDateRef = useSyncRef(simulationDate);
  const simulationTimeRef = useSyncRef(simulationTimeMinutes);
  const weatherModeRef = useSyncRef<WeatherMode>(weatherMode);
  const congestionSpeedMultiplierRef = useRef<number>(1.0);
  const cameraModeRef = useSyncRef<CameraMode>(cameraMode);
  const followTaxiIdRef = useSyncRef(followTaxiId);
  const rideExitModeRef = useRef<BaseCameraMode>("drive");
  const showLabelsRef = useSyncRef(showLabels);
  const optionalLabelObjectsRef = useRef<CSS2DObject[]>([]);
  const showTransitRef = useSyncRef(showTransit);
  const transitGroupRef = useRef<THREE.Group | null>(null);
  const hoverRefreshRequestRef = useRef(0);
  const labelRefreshRequestRef = useRef(0);
  const showFpsRef = useSyncRef(showFps);
  const fpsModeRef = useSyncRef<FpsMode>(fpsMode);
  const showNonRoadRef = useSyncRef(showNonRoad);
  const nonRoadGroupRef = useRef<THREE.Group | null>(null);
  const showRoadNetworkRef = useSyncRef(showRoadNetwork);
  const roadNetworkGroupRef = useRef<THREE.Group | null>(null);
  const cameraFocusTargetRef = useRef<CameraFocusTarget | null>(null);

  const { liveData, status: liveDataStatus } = useLiveData();
  const {
    telemetryFrame,
    status: telemetryStatus,
    errorMessage: telemetryErrorMessage,
  } = useVehicleTelemetry();
  const telemetryFrameRef = useSyncRef(telemetryFrame);
  const mapPoiFeatureRows = useMemo(
    () => buildLivePoiFeatureRows(liveData),
    [liveData],
  );
  const dongGroundingByName = useMemo(() => {
    const taxiStandCounts = new globalThis.Map<string, number>();
    data?.taxiStands.features.forEach((feature) => {
      const dongName = feature.properties.dong_name;
      if (!feature.properties.is_target_dong || !dongName) {
        return;
      }
      taxiStandCounts.set(dongName, (taxiStandCounts.get(dongName) ?? 0) + 1);
    });

    const contextPoiScores = new globalThis.Map<string, number>();
    const contextPoiCounts = new globalThis.Map<string, number>();
    [...poiConfig.citydata_collection, ...poiConfig.supplemental_watchlist].forEach((poi) => {
      const dongName = poi.coverage_dong;
      if (!dongName || !TARGET_DONGS.includes(dongName as (typeof TARGET_DONGS)[number])) {
        return;
      }
      contextPoiCounts.set(dongName, (contextPoiCounts.get(dongName) ?? 0) + 1);
      contextPoiScores.set(
        dongName,
        (contextPoiScores.get(dongName) ?? 0) +
          contextPoiWeight(poi.category, "code" in poi && Boolean(poi.code)),
      );
    });

    const maxTaxiStandCount = Math.max(...taxiStandCounts.values(), 1);
    const maxContextPoiScore = Math.max(...contextPoiScores.values(), 1);

    return new globalThis.Map<string, DongGroundingInfo>(
      TARGET_DONGS.map((dongName) => {
        const grounding =
          mapGroundingConfig.dongs.find((entry) => entry.dong_name === dongName) ?? null;
        const taxiStandCount = taxiStandCounts.get(dongName) ?? 0;
        const supplyGroundingScore = taxiStandCount / maxTaxiStandCount;
        const contextPoiCount = contextPoiCounts.get(dongName) ?? 0;
        const contextPoiScore = (contextPoiScores.get(dongName) ?? 0) / maxContextPoiScore;
        const reportDemandPrior = grounding?.report_demand_prior ?? 0.45;
        const demandGroundingScore = clamp01(
          reportDemandPrior * 0.72 + contextPoiScore * 0.28,
        );

        return [
          dongName,
          {
            dongName,
            taxiStandCount,
            supplyGroundingScore,
            contextPoiCount,
            contextPoiScore,
            reportHotspotTier: grounding?.report_hotspot_tier ?? "context",
            reportDemandPrior,
            demandGroundingScore,
            groundingNote:
              grounding?.note ??
              "정적 기준점이 부족해 교통·상권 컨텍스트만 반영합니다.",
          } satisfies DongGroundingInfo,
        ] as const;
      }),
    );
  }, [data]);
  const poiSpatialIndex = useMemo(() => {
    if (!data) {
      return null;
    }

    const indexedRows = mapPoiFeatureRows
      .filter((poi) => Number.isFinite(poi.lon) && Number.isFinite(poi.lat))
      .map((poi) => {
        const projected = projectPoint(
          [poi.lon as number, poi.lat as number],
          data.center,
        );
        return {
          ...poi,
          projectedX: projected.x,
          projectedZ: projected.z,
        } satisfies IndexedMapPoiFeatureRow;
      });

    if (!indexedRows.length) {
      return null;
    }

    const minX = Math.min(...indexedRows.map((poi) => poi.projectedX));
    const maxX = Math.max(...indexedRows.map((poi) => poi.projectedX));
    const minY = Math.min(...indexedRows.map((poi) => poi.projectedZ));
    const maxY = Math.max(...indexedRows.map((poi) => poi.projectedZ));
    const tree = new QuadTree<IndexedMapPoiFeatureRow>({
      minX: minX - 1,
      minY: minY - 1,
      maxX: maxX + 1,
      maxY: maxY + 1,
    });
    indexedRows.forEach((poi) => {
      tree.insert({
        x: poi.projectedX,
        y: poi.projectedZ,
        value: poi,
      });
    });

    return {
      tree,
      byCode: new Map(indexedRows.map((poi) => [poi.poi_code, poi] as const)),
    };
  }, [data, mapPoiFeatureRows]);
  const activePoiCode = mapPoiFeatureRows.some(
    (poi) => poi.poi_code === selectedPoiCode,
  )
    ? selectedPoiCode
    : mapPoiFeatureRows[0]?.poi_code ?? "";
  const scenePoiFeatureRows = useMemo(() => {
    if (!poiSpatialIndex) {
      return mapPoiFeatureRows;
    }

    const radius = poiRenderRadius(cameraMode);
    const focus = miniMapFocus ?? {
      x: 0,
      z: 0,
      label: "",
      headingX: 0,
      headingZ: 0,
    };
    const nearbyRows = poiSpatialIndex.tree
      .query({
        minX: focus.x - radius,
        minY: focus.z - radius,
        maxX: focus.x + radius,
        maxY: focus.z + radius,
      })
      .map((entry) => entry.value);
    const selectedPoi = poiSpatialIndex.byCode.get(activePoiCode);
    const deduped = new Map<string, MapPoiFeatureRow>();
    nearbyRows.forEach((poi) => deduped.set(poi.poi_code, poi));
    if (selectedPoi) {
      deduped.set(selectedPoi.poi_code, selectedPoi);
    }

    return [...deduped.values()]
      .sort(
        (left, right) =>
          (right.poi_pressure_score ?? 0) - (left.poi_pressure_score ?? 0),
      )
      .slice(0, 24);
  }, [activePoiCode, cameraMode, mapPoiFeatureRows, miniMapFocus, poiSpatialIndex]);
  const scenePoiFeatureRowsRef = useSyncRef(scenePoiFeatureRows);

  // Live mode: auto-apply weather from Seoul citydata (스냅샷이 3시간 이상 오래되면 적용 안 함)
  useEffect(() => {
    if (circumstanceMode !== "live" || !liveData || liveData.isStale) {
      return;
    }
    const nextWeatherMode = liveData.weather.weatherMode;
    const timeoutId = window.setTimeout(() => {
      setWeatherMode(nextWeatherMode);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [circumstanceMode, liveData, setWeatherMode]);

  // Live mode: 도로 실측 속도 → 차량 속도 반영 (40km/h 기준, 최소 0.35)
  useEffect(() => {
    if (circumstanceMode !== "live" || !liveData || liveData.isStale) {
      congestionSpeedMultiplierRef.current = 1.0;
      return;
    }
    const validSpeeds = liveData.areas.map((a) => a.speedKmh).filter((s) => s > 0);
    if (!validSpeeds.length) {
      congestionSpeedMultiplierRef.current = 1.0;
      return;
    }
    const avg = validSpeeds.reduce((s, v) => s + v, 0) / validSpeeds.length;
    congestionSpeedMultiplierRef.current = Math.min(1.0, Math.max(0.35, avg / 40));
  }, [circumstanceMode, liveData]);

  const markSceneRendering = useCallback((detail: string) => {
    setStatus("rendering");
    setStatusDetail(detail);
  }, [setStatus, setStatusDetail]);

  const markSceneError = useCallback((detail: string) => {
    setStatus("error");
    setStatusDetail(detail);
  }, [setStatus, setStatusDetail]);

  useEffect(() => {
    if (circumstanceMode !== "live") {
      return;
    }

    const syncClock = () => {
      const clock = currentSimulationClock();
      setSimulationDate((current) =>
        current === clock.dateIso ? current : clock.dateIso,
      );
      setSimulationTimeMinutes((current) =>
        current === clock.minutes ? current : clock.minutes,
      );
    };

    syncClock();
    const intervalId = window.setInterval(syncClock, 15_000);
    return () => window.clearInterval(intervalId);
  }, [circumstanceMode, setSimulationDate, setSimulationTimeMinutes]);

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

  useEffect(() => {
    let cancelled = false;

    void loadSimulationData({
      onAssetProgress: (loaded, total) => {
        if (!cancelled) {
          setLoadingProgress(Math.round((loaded / total) * 42));
        }
      },
      onStageChange: (detail, progress) => {
        if (!cancelled) {
          setStatusDetail(detail);
          setLoadingProgress(progress);
        }
      },
    })
      .then((nextData) => {
        if (cancelled) {
          return;
        }

        setLoadingProgress(72);
        markSceneRendering("3D 장면과 차량 레이어 구성 중");
        requestAnimationFrame(() => {
          if (!cancelled) {
            startTransition(() => {
              setData(nextData);
            });
          }
        });
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          markSceneError("자산 또는 초기 장면 준비에 실패했습니다");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    markSceneError,
    markSceneRendering,
    setData,
    setLoadingProgress,
    setStatusDetail,
  ]);

  const scenarioMapCenter = useMemo(() => {
    const segments = data?.projectedRoadSegments;
    if (!segments?.length) {
      return null;
    }

    const bounds = new THREE.Box3();
    segments.forEach((segment) => {
      bounds.expandByPoint(segment.start);
      bounds.expandByPoint(segment.end);
    });
    return bounds.getCenter(new THREE.Vector3());
  }, [data?.projectedRoadSegments]);
  const statusLabel =
    status === "loading"
      ? "데이터 불러오는 중"
      : status === "rendering"
        ? "장면 구성 중"
        : status === "ready"
          ? "주행 준비 완료"
          : "불러오기 실패";
  const isSceneBusy = status === "loading" || status === "rendering";
  const loadingHint =
    status === "loading"
      ? "지도 자산과 도로 그래프를 읽는 중입니다."
      : "3D 장면과 차량 레이어를 맞추는 중입니다.";
  const selectedWeather =
    WEATHER_OPTIONS.find((option) => option.id === weatherMode) ??
    WEATHER_OPTIONS[0];
  const normalizedSimulationTimeMinutes = normalizeDayMinutes(
    simulationTimeMinutes,
  );
  const conditionedForecastDongs = useMemo(
    () => {
      const snapshot =
        DEMAND_FORECAST_SNAPSHOTS.find(
          (forecast) => forecast.offsetMinutes === forecastOffsetMinutes,
        ) ?? DEMAND_FORECAST_SNAPSHOTS[0];
      return conditionDemandForecast(
        snapshot,
        normalizeDayMinutes(
          normalizedSimulationTimeMinutes + snapshot.offsetMinutes,
        ),
        weatherMode,
      );
    },
    [forecastOffsetMinutes, normalizedSimulationTimeMinutes, weatherMode],
  );
  const forecastResult = useForecastResult();
  const forecastSource: ForecastSource =
    forecastResult?.regions?.length ? "model" : "sample";
  const forecastStrategyText = forecastStrategyLabel(
    forecastResult?.strategy,
  );
  const forecastAverageConfidence = useMemo(() => {
    if (!forecastResult?.regions?.length) return null;
    const confidenceValues = forecastResult.regions
      .map((region) => region.confidence)
      .filter((value): value is number => typeof value === "number");
    if (!confidenceValues.length) return null;
    const sum = confidenceValues.reduce((acc, value) => acc + value, 0);
    return sum / confidenceValues.length;
  }, [forecastResult]);
  const isForecastLowConfidence =
    forecastAverageConfidence != null && forecastAverageConfidence < 0.6;
  const forecastTargetAgeHours = useMemo(
    () => hoursSince(forecastResult?.target_datetime),
    [forecastResult?.target_datetime],
  );
  const isForecastSnapshotStale =
    forecastSource === "model" &&
    forecastTargetAgeHours != null &&
    forecastTargetAgeHours > 2;
  const forecastSourceTokenClass =
    forecastSource === "model"
      ? `${PANEL_TOKEN_CLASS} border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200`
      : `${PANEL_TOKEN_CLASS} border-amber-300/25 bg-amber-300/[0.08] text-amber-200`;
  const forecastSourceTokenText = (() => {
    if (!(forecastSource === "model" && forecastResult)) return "기준 시나리오";
    const targetLabel = formatKstFullDateTime(forecastResult.target_datetime);
    const tokenPrefix = isForecastSnapshotStale ? "저장 스냅샷" : "운영 전망";
    return `${tokenPrefix} · ${forecastStrategyText} · ${targetLabel}`;
  })();

  // effectiveDongs is what the heatmap actually renders.
  // Prefer live citydata-derived scores. Fall back to model output only when
  // it is fresh, otherwise fall back to the local scenario snapshot.
  type OperationalSource = "live" | ForecastSource;
  type EffectiveDong = DemandForecastDong & {
    confidence?: number;
    source: OperationalSource;
    livePoiCount?: number;
    livePopulationMid?: number;
    liveCongestionLevel?: string | null;
    liveTrafficIndex?: string | null;
    taxiStandCount?: number;
    supplyGroundingScore?: number;
    demandGroundingScore?: number;
    reportHotspotTier?: string;
    groundingNote?: string;
  };
  const liveDemandDongs = useMemo((): EffectiveDong[] => {
    const grouped = new globalThis.Map<string, MapPoiFeatureRow[]>();
    mapPoiFeatureRows.forEach((poi) => {
      if (!poi.coverage_dong) {
        return;
      }
      const rows = grouped.get(poi.coverage_dong) ?? [];
      rows.push(poi);
      grouped.set(poi.coverage_dong, rows);
    });

    const scoredDongs = TARGET_DONGS.map((dongName) => {
      const rows = grouped.get(dongName) ?? [];
      const averagePressure = rows.length
        ? rows.reduce((sum, row) => sum + (row.poi_pressure_score ?? 0), 0) / rows.length
        : 0;
      const coverageBoost = rows.length > 1 ? 1 + Math.min(0.12, (rows.length - 1) * 0.06) : 1;
      const rawScore = averagePressure * coverageBoost;
      const livePopulationMid = rows.length
        ? Math.round(
          rows.reduce((sum, row) => sum + (row.current_population_mid ?? 0), 0) / rows.length,
        )
        : 0;
      const liveCongestionLevel = rows[0]?.current_congestion_level ?? null;
      const liveTrafficIndex = rows[0]?.current_traffic_index ?? null;
      const grounding = dongGroundingByName.get(dongName);
      return {
        dongName,
        rawScore,
        livePoiCount: rows.length,
        livePopulationMid,
        liveCongestionLevel,
        liveTrafficIndex,
        grounding,
      };
    });

    const maxRawScore = Math.max(
      ...scoredDongs.map((dong) => dong.rawScore),
      1,
    );

    return scoredDongs.map((dong) => ({
      dongName: dong.dongName,
      relativeScore: clamp01(
        (dong.rawScore > 0 ? (dong.rawScore / maxRawScore) * 0.88 : 0) +
          (dong.grounding?.demandGroundingScore ?? 0) * 0.12,
      ),
      contextPrior: dong.grounding?.demandGroundingScore ?? 0,
      publicTransitSignal: 0,
      contextMultiplier: 1,
      source: "live" as const,
      livePoiCount: dong.livePoiCount,
      livePopulationMid: dong.livePopulationMid,
      liveCongestionLevel: dong.liveCongestionLevel,
      liveTrafficIndex: dong.liveTrafficIndex,
      taxiStandCount: dong.grounding?.taxiStandCount ?? 0,
      supplyGroundingScore: dong.grounding?.supplyGroundingScore ?? 0,
      demandGroundingScore: dong.grounding?.demandGroundingScore ?? 0,
      reportHotspotTier: dong.grounding?.reportHotspotTier ?? "context",
      groundingNote: dong.grounding?.groundingNote,
    }));
  }, [dongGroundingByName, mapPoiFeatureRows]);
  const hasLiveOperationalSignal = liveDemandDongs.some(
    (dong) => (dong.livePoiCount ?? 0) > 0 && dong.relativeScore > 0,
  );
  const effectiveDongs = useMemo((): EffectiveDong[] => {
    if (hasLiveOperationalSignal) {
      return liveDemandDongs;
    }
    if (forecastSource === "model" && forecastResult && !isForecastSnapshotStale) {
      return forecastResult.regions.map((r) => {
        const grounding = dongGroundingByName.get(r.dong_name);
        return {
          dongName: r.dong_name,
          relativeScore: clamp01(
            r.score * 0.9 + (grounding?.demandGroundingScore ?? 0) * 0.1,
          ),
          contextPrior: grounding?.demandGroundingScore ?? 0,
          publicTransitSignal: 0,
          contextMultiplier: 1,
          confidence: r.confidence ?? undefined,
          source: "model" as const,
          taxiStandCount: grounding?.taxiStandCount ?? 0,
          supplyGroundingScore: grounding?.supplyGroundingScore ?? 0,
          demandGroundingScore: grounding?.demandGroundingScore ?? 0,
          reportHotspotTier: grounding?.reportHotspotTier ?? "context",
          groundingNote: grounding?.groundingNote,
        };
      });
    }
    return conditionedForecastDongs.map((d) => ({
      ...d,
      relativeScore: clamp01(
        d.relativeScore * 0.9 +
          (dongGroundingByName.get(d.dongName)?.demandGroundingScore ?? 0) * 0.1,
      ),
      contextPrior: dongGroundingByName.get(d.dongName)?.demandGroundingScore ?? d.contextPrior,
      source: "sample" as const,
      taxiStandCount: dongGroundingByName.get(d.dongName)?.taxiStandCount ?? 0,
      supplyGroundingScore: dongGroundingByName.get(d.dongName)?.supplyGroundingScore ?? 0,
      demandGroundingScore: dongGroundingByName.get(d.dongName)?.demandGroundingScore ?? 0,
      reportHotspotTier: dongGroundingByName.get(d.dongName)?.reportHotspotTier ?? "context",
      groundingNote: dongGroundingByName.get(d.dongName)?.groundingNote,
    }));
  }, [
    conditionedForecastDongs,
    dongGroundingByName,
    forecastResult,
    forecastSource,
    hasLiveOperationalSignal,
    isForecastSnapshotStale,
    liveDemandDongs,
  ]);

  const sortedDispatchDecisions = useMemo(
    () =>
      [...effectiveDongs]
        .map((dong) => {
          const groundedDemandScore = clamp01(
            dong.relativeScore * 0.82 + (dong.demandGroundingScore ?? 0) * 0.18,
          );
          const supplyProxyScore = dong.supplyGroundingScore ?? 0;
          const congestionPenalty =
            dong.liveTrafficIndex === "정체" ? 0.08 : dong.liveTrafficIndex === "서행" ? 0.04 : 0;
          // supplyProxyScore는 택시승차대 수 기반이므로 패널티를 낮게 유지.
          // 역삼1동처럼 승차대가 많아도 심야 초과수요가 최고인 경우를 반영.
          const imbalanceScore = clamp01(
            groundedDemandScore + congestionPenalty - supplyProxyScore * 0.12,
          );
          const actionLevel = monitoringLevelForScore(imbalanceScore);
          return {
            dong_name: dong.dongName,
            predicted_demand_score: groundedDemandScore,
            supply_proxy_score: supplyProxyScore,
            imbalance_score: imbalanceScore,
            action_level: actionLevel,
            action: monitoringActionForLevel(actionLevel),
            coverage_units: dong.livePoiCount ?? 0,
            recommended_taxis: Math.max(
              1,
              Math.round(
                imbalanceScore * 8 +
                  (dong.reportHotspotTier === "primary"
                    ? 1
                    : dong.reportHotspotTier === "secondary"
                      ? 0.5
                      : 0),
              ),
            ),
            incentive_multiplier: 1,
            congestion_score: dong.liveCongestionLevel ?? null,
            avg_speed_kmh: null,
            live_population_mid: dong.livePopulationMid ?? null,
            live_traffic_index: dong.liveTrafficIndex ?? null,
            taxi_stand_count: dong.taxiStandCount ?? 0,
            hotspot_tier: dong.reportHotspotTier ?? "context",
            grounding_note: dong.groundingNote ?? null,
          };
        })
        .sort((left, right) => right.imbalance_score - left.imbalance_score),
    [effectiveDongs],
  );
  const dispatchByDong = useMemo(
    () =>
      new globalThis.Map(
        sortedDispatchDecisions.map(
          (decision) => [decision.dong_name, decision] as const,
        ),
      ),
    [sortedDispatchDecisions],
  );

  const demandByDong = useMemo(
    () =>
      new globalThis.Map(
        effectiveDongs.map(
          (dong) => [dong.dongName, dong] as const,
        ),
      ),
    [effectiveDongs],
  );
  const rankedForecastDongs = useMemo(
    () =>
      [...effectiveDongs].sort(
        (left, right) => right.relativeScore - left.relativeScore,
      ),
    [effectiveDongs],
  );
  const demandMiniMap = useMemo(() => {
    const dongRegions = data?.dongRegions;
    if (!data || !dongRegions?.length) {
      return null;
    }

    const displayDongs = dongRegions
      .map((dong) => ({
        ...dong,
        rings: displayRingsForHeatmap(dong.rings),
      }))
      .filter((dong) => dong.rings.length > 0);

    const bounds = new THREE.Box3();
    displayDongs.forEach((dong) => {
      dong.rings.forEach((ring) => {
        ring.forEach((point) => bounds.expandByPoint(point));
      });
    });

    const min = bounds.min;
    const size = bounds.getSize(new THREE.Vector3());
    const width = Math.max(size.x, 1);
    const depth = Math.max(size.z, 1);
    const padding = 5;
    const drawWidth = 100 - padding * 2;
    const drawHeight = 100 - padding * 2;
    const mapPoint = (point: THREE.Vector3) => ({
      x: padding + ((point.x - min.x) / width) * drawWidth,
      y: padding + ((point.z - min.z) / depth) * drawHeight,
    });
    const focusPoint = miniMapFocus
      ? new THREE.Vector3(miniMapFocus.x, 0, miniMapFocus.z)
      : scenarioMapCenter;
    const focus = focusPoint ? mapPoint(focusPoint) : null;
    const focusHeading =
      focus && miniMapFocus
        ? {
            x1: focus.x,
            y1: focus.y,
            x2: THREE.MathUtils.clamp(
              focus.x + miniMapFocus.headingX * 10,
              2,
              98,
            ),
            y2: THREE.MathUtils.clamp(
              focus.y + miniMapFocus.headingZ * 10,
              2,
              98,
            ),
          }
        : null;

    return {
      regions: displayDongs.map((dong) => {
        const path = dong.rings
          .map((ring) =>
            ring
              .map((point, index) => {
                const mapped = mapPoint(point);
                return `${index === 0 ? "M" : "L"} ${mapped.x.toFixed(2)} ${mapped.y.toFixed(2)}`;
              })
              .join(" ")
              .concat(" Z"),
          )
          .join(" ");
        const labelPoint = mapPoint(centerOfRings(dong.rings));
        const dispatchDecision = dispatchByDong.get(dong.name);
        return {
          name: dong.name,
          path,
          labelX: labelPoint.x,
          labelY: labelPoint.y,
          score: demandByDong.get(dong.name)?.relativeScore ?? 0,
          dispatchActionLevel: dispatchDecision?.action_level,
        } satisfies DemandMiniMapRegion;
      }),
      landmarks: data.transit.features
        .filter(isSubwayStationFeature)
        .flatMap((feature) => {
          const name = feature.properties.name ?? "";
          if (!name) {
            return [];
          }
          const isPrimary = PRIMARY_SUBWAY_STATION_NAMES.has(name);
          const projected = projectPoint(feature.geometry.coordinates, data.center);
          const point = mapPoint(projected);
          const x = THREE.MathUtils.clamp(point.x, 4, 96);
          const y = THREE.MathUtils.clamp(point.y, 4, 96);
          const labelOnLeft = x > 76;
          return [
            {
              name: `${name}역`,
              label: name,
              isPrimary,
              x,
              y,
              labelX: labelOnLeft ? x - 2.1 : x + 2.1,
              labelY: y - 1.2,
              textAnchor: labelOnLeft ? "end" : "start",
            } satisfies DemandMiniMapLandmark,
          ];
        })
        .sort((left, right) => {
          if (left.isPrimary !== right.isPrimary) {
            return left.isPrimary ? 1 : -1;
          }
          return left.label.localeCompare(right.label, "ko");
        }),
      pois: [...mapPoiFeatureRows]
        .filter(
          (poi) =>
            poi.source_status === "citydata_live" &&
            Number.isFinite(poi.lon) &&
            Number.isFinite(poi.lat),
        )
        .sort(
          (left, right) =>
            (right.poi_pressure_score ?? 0) - (left.poi_pressure_score ?? 0),
        )
        .slice(0, 8)
        .map((poi, index) => {
          const projected = projectPoint(
            [poi.lon as number, poi.lat as number],
            data.center,
          );
          const point = mapPoint(projected);
          const x = THREE.MathUtils.clamp(point.x, 4, 96);
          const y = THREE.MathUtils.clamp(point.y, 4, 96);
          const labelOnLeft = x > 72;
          return {
            code: poi.poi_code,
            name: poi.poi_name,
            label: compactPoiLabel(poi.poi_name),
            x,
            y,
            labelX: labelOnLeft ? x - 2.6 : x + 2.6,
            labelY: y + (index % 2 === 0 ? -1.8 : 3),
            score: poi.poi_pressure_score ?? 0,
            isSelected: poi.poi_code === activePoiCode,
            textAnchor: labelOnLeft ? "end" : "start",
          } satisfies DemandMiniMapPoi;
        }),
      focus,
      focusHeading,
      focusLabel: miniMapFocus?.label ?? "현재 지도 중심",
    };
  }, [
    data,
    demandByDong,
    dispatchByDong,
    mapPoiFeatureRows,
    miniMapFocus,
    scenarioMapCenter,
    activePoiCode,
  ]);
  const mapEvidenceMetrics = useMemo(() => {
    if (!data) {
      return [
        { label: "행정동", value: "-", detail: "OSM 경계" },
        { label: "도로", value: "-", detail: "OSM road" },
        { label: "건물", value: "-", detail: "OSM building" },
        { label: "그래프", value: "-", detail: "경로 세그먼트" },
      ];
    }
    return [
      {
        label: "행정동",
        value: `${data.dongs.features.length}개`,
        detail: "OSM 경계",
      },
      {
        label: "도로",
        value: data.roads.features.length.toLocaleString("ko-KR"),
        detail: "OSM road",
      },
      {
        label: "건물",
        value: data.buildings.features.length.toLocaleString("ko-KR"),
        detail: "OSM building",
      },
      {
        label: "그래프",
        value: (data.roadNetwork?.stats.segmentCount ?? data.graph.edgeById.size)
          .toLocaleString("ko-KR"),
        detail: "경로 세그먼트",
      },
    ];
  }, [data]);
  const sortedMapPoiRows = useMemo(
    () =>
      [...mapPoiFeatureRows]
        .filter((poi) => poi.source_status === "citydata_live")
        .sort(
          (left, right) =>
            (right.poi_pressure_score ?? 0) - (left.poi_pressure_score ?? 0),
        ),
    [mapPoiFeatureRows],
  );
  const selectedPoi =
    sortedMapPoiRows.find((poi) => poi.poi_code === activePoiCode) ??
    sortedMapPoiRows[0] ??
    null;
  const selectedPoiGrounding = selectedPoi?.coverage_dong
    ? dongGroundingByName.get(selectedPoi.coverage_dong) ?? null
    : null;
  const handlePoiSelect = useCallback((poiCode: string) => {
    const poi = mapPoiFeatureRows.find((row) => row.poi_code === poiCode);
    setSelectedPoiCode(poiCode);
    setIsSidebarCollapsed(false);
    setIsMapFocusMode(false);
    if (
      data &&
      poi &&
      Number.isFinite(poi.lon) &&
      Number.isFinite(poi.lat)
    ) {
      const projected = projectPoint(
        [poi.lon as number, poi.lat as number],
        data.center,
      );
      cameraFocusTargetRef.current = {
        x: projected.x,
        z: projected.z,
        distance: 78,
        pitch: 0.68,
        label: poi.poi_name,
      };
      setCameraMode("drive");
    }
  }, [
    data,
    mapPoiFeatureRows,
    setCameraMode,
    setIsMapFocusMode,
    setIsSidebarCollapsed,
    setSelectedPoiCode,
  ]);
  const topLiveAreas = useMemo(() => {
    if (!liveData?.areas.length) {
      return [];
    }
    return [...liveData.areas]
      .sort((left, right) => liveAreaScore(right) - liveAreaScore(left))
      .slice(0, 3);
  }, [liveData]);
  const primaryLiveArea = topLiveAreas[0] ?? null;
  const liveStatusLabel =
    primaryLiveArea && liveDataStatus === "loading"
      ? "업데이트 중"
      : primaryLiveArea && liveData && liveDataStatus !== "error"
        ? liveData.isStale
          ? "스냅샷"
          : liveData.meta.isPartial
            ? "부분 반영"
            : "실시간 연결"
        : liveDataStatus === "loading"
          ? "연결 중"
          : liveDataStatus === "error"
          ? "연결 실패"
            : "대기";
  const telemetryVehicleCount = telemetryFrame?.vehicles.length ?? 0;
  const telemetryStatusLabel =
    telemetryFrame
      ? telemetryFrame.is_demo
        ? "데모 스트림"
        : "위치 스트림 연결"
      : telemetryStatus === "loading"
        ? "위치 스트림 연결 중"
        : telemetryStatus === "error"
          ? "위치 스트림 재연결"
          : "위치 스트림 대기";
  const telemetryStatusDetail = telemetryFrame
    ? `${telemetryVehicleCount.toLocaleString("ko-KR")}대 · ${telemetryFrame.source}`
    : telemetryStatus === "error"
      ? (telemetryErrorMessage ?? "스트림 재시도 중")
      : "외부 SSE 피드 연결 전";
  const isLiveFresh =
    Boolean(primaryLiveArea && liveData && !liveData.isStale && liveDataStatus !== "error");
  const liveObservedAt = primaryLiveArea?.observedAt
    || liveData?.weather.observedAt
    || liveData?.fetchedAt
    || "";
  const liveLatencyMinutes = calculateLatencyMinutes(liveObservedAt || undefined);
  const liveLatencyLabel = formatLatencyLabel(liveLatencyMinutes);
  const liveCoverageLabel = liveData
    ? `${liveData.meta.returnedPlaceCount}/${liveData.meta.expectedPlaceCount}개 반영`
    : null;
  const liveCoverageTitle = liveData?.meta.failedPlaceCodes.length
    ? `누락 코드: ${liveData.meta.failedPlaceCodes.join(", ")}`
    : undefined;
  const liveSourceTokenClass = liveData
    ? liveData.isStale
      ? `${PANEL_TOKEN_CLASS} border-amber-300/25 bg-amber-300/[0.08] text-amber-200`
      : liveData.meta.isPartial
        ? `${PANEL_TOKEN_CLASS} border-amber-300/25 bg-amber-300/[0.08] text-amber-200`
        : `${PANEL_TOKEN_CLASS} border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100`
    : forecastSourceTokenClass;
  const liveSourceTokenText = (() => {
    if (!liveData) {
      return forecastSourceTokenText;
    }
    const statusLabel = liveData.isStale
      ? "서울 공개데이터 스냅샷"
      : liveData.meta.isPartial
        ? "서울 공개데이터 일부 수신"
        : "서울 공개데이터 실시간";
    const observedLabel = formatKstFullDateTime(liveObservedAt || liveData.fetchedAt);
    const coverageLabel = liveCoverageLabel ?? "반영 수 확인 중";
    return [statusLabel, coverageLabel, observedLabel].filter(Boolean).join(" · ");
  })();
  const liveInputTitle = liveData
    ? liveData.isStale
      ? "서울 공개데이터 스냅샷"
      : liveData.meta.isPartial
        ? "서울 공개데이터 (일부 수신)"
        : "서울 공개데이터 실시간 입력"
    : "서울 공개데이터 연결 준비";
  const liveInputSummary = [
    liveCoverageLabel,
    telemetryFrame ? `${telemetryVehicleCount.toLocaleString("ko-KR")}대 차량 스트림` : null,
    liveObservedAt ? `최근 관측 ${formatKstDateTime(liveObservedAt)}` : null,
    primaryLiveArea?.areaName ?? null,
  ].filter((value): value is string => Boolean(value)).join(" · ");
  const liveWeatherSummary = liveData
    ? formatLiveWeather(
      liveData.weather.tempC,
      liveData.weather.precipitationType,
    )
    : selectedWeather.label;
  const forecastResultLabel =
    forecastResult?.source === "demo" ? "대체 시나리오" : "공개데이터 전망";
  const operationalSignalSource: "live" | "model" | "sample" =
    hasLiveOperationalSignal
      ? "live"
      : forecastSource === "model" && forecastResult && !isForecastSnapshotStale
        ? "model"
        : "sample";
  const operationalBadgeText =
    operationalSignalSource === "live"
      ? liveData?.isStale
        ? "공개데이터 스냅샷"
        : liveData?.meta.isPartial
          ? "공개데이터 (일부 수신)"
          : "공개데이터 실시간"
      : operationalSignalSource === "model"
        ? [forecastResultLabel, forecastStrategyText, isForecastLowConfidence ? "신뢰도 낮음" : null]
          .filter((value): value is string => Boolean(value))
          .join(" · ")
        : "기준 시나리오";
  const operationalBadgeClass =
    operationalSignalSource === "live"
      ? liveData?.isStale || liveData?.meta.isPartial
        ? "border-amber-300/25 bg-amber-300/[0.08] text-amber-200"
        : "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100"
      : operationalSignalSource === "model"
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
        : "border-white/10 bg-white/[0.06] text-slate-400";
  const forecastSnapshotSummary =
    operationalSignalSource === "model" && forecastResult
      ? [
        `예측 ${formatKstDateTime(forecastResult.target_datetime)}`,
        forecastStrategyText,
        forecastResultLabel,
      ].filter((value): value is string => Boolean(value)).join(" · ")
      : null;
  const liveObservationLabel = liveObservedAt
    ? `관측 기준 ${formatKstDateTime(liveObservedAt)}`
    : null;
  const liveMetaSummary = [
    "서울 공개데이터",
    liveCoverageLabel ? `실시간 반영 ${liveCoverageLabel}` : null,
    liveData?.meta.fetchedAt
      ? `서버 수신 ${formatKstClock(liveData.meta.fetchedAt)}`
      : null,
  ].filter((value): value is string => Boolean(value));
  const liveLatencyBadgeClass = liveLatencyMinutes != null && liveLatencyMinutes >= 120
    ? "border-amber-300/25 bg-amber-300/[0.08] text-amber-200"
    : "border-white/10 bg-white/[0.05] text-slate-300";
  const topDemandDong = rankedForecastDongs[0] ?? null;
  const topDemandScoreLabel = topDemandDong
    ? Math.round(topDemandDong.relativeScore * 100)
    : 0;
  const formattedSimulationTime = format24Hour(normalizedSimulationTimeMinutes);
  const formattedSimulationDate = formatDateLabel(simulationDate);
  const simulationTimeBand = timeBandLabel(normalizedSimulationTimeMinutes);
  const circumstanceOptions: Array<{ id: CircumstanceMode; label: string }> = [
    { id: "live", label: "실시간" },
    { id: "specific", label: "특정 시각" },
  ];
  const isSidebarVisible = !isSidebarCollapsed && !isMapFocusMode;
  const mapCanvasClass = isSidebarVisible
    ? "h-full w-full border-r border-white/10 lg:w-[62vw] xl:w-[calc(100%-500px)]"
    : "h-full w-full";
  const floatingControlOffsetClass = isSidebarVisible
    ? "lg:right-[calc(min(38vw,500px)+1rem)]"
    : "lg:right-4";

  function toggleMapFocusMode() {
    setIsMapFocusMode((current) => {
      const next = !current;
      if (next) {
        setIsSidebarCollapsed(true);
        setCameraMode("overview");
      }
      return next;
    });
  }

  function toggleOverviewCamera() {
    setCameraMode((current) => {
      const next = current === "overview" ? "drive" : "overview";
      if (next === "overview") {
        setIsSidebarCollapsed(true);
      }
      return next;
    });
  }

  function toggleSidebar() {
    if (isSidebarVisible) {
      setIsSidebarCollapsed(true);
      return;
    }
    setIsMapFocusMode(false);
    setIsSidebarCollapsed(false);
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#060d16]">
      <header
        data-ui-panel="map-header"
        className="flex-none border-b border-white/10 bg-slate-950/88 backdrop-blur-xl"
      >
        <div className="flex h-16 w-full items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
          <div className="min-w-0 flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <div className="absolute -inset-1 rounded-full bg-emerald-400/30 blur-sm" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-slate-50">
                강남 교통 운영
              </div>
              <div className="hidden truncate text-[11px] text-slate-400 sm:block">
                모빌리티 디지털 트윈 : 택시 수요 예측 및 동적 배차
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-cyan-300/30 bg-cyan-300/12 px-3 py-1.5 text-xs font-semibold text-cyan-50 md:inline-flex">
              지도
            </span>
            <button
              type="button"
              data-ui-control="header-sidebar-toggle"
              aria-label={isSidebarVisible ? "운영 패널 닫기" : "운영 패널 열기"}
              aria-expanded={isSidebarVisible}
              onClick={toggleSidebar}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/[0.1]"
            >
              {isSidebarVisible ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {isSidebarVisible ? "패널 닫기" : "운영 패널"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <section className="relative flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className={mapCanvasClass}
        />
        <MapSimulatorErrorBoundary>
          <MapSimulatorSceneRuntime
            containerRef={containerRef}
            data={data}
            poiFeatureRowsRef={scenePoiFeatureRowsRef}
            telemetryFrameRef={telemetryFrameRef}
            onPoiSelect={handlePoiSelect}
            simulationSource={simulationSource}
            appliedTaxiCountRef={appliedTaxiCountRef}
            appliedTrafficCountRef={appliedTrafficCountRef}
            cameraModeRef={cameraModeRef}
            followTaxiIdRef={followTaxiIdRef}
            rideExitModeRef={rideExitModeRef}
            showLabelsRef={showLabelsRef}
            optionalLabelObjectsRef={optionalLabelObjectsRef}
            showTransitRef={showTransitRef}
            transitGroupRef={transitGroupRef}
            hoverRefreshRequestRef={hoverRefreshRequestRef}
            labelRefreshRequestRef={labelRefreshRequestRef}
            showFpsRef={showFpsRef}
            fpsModeRef={fpsModeRef}
            showNonRoadRef={showNonRoadRef}
            nonRoadGroupRef={nonRoadGroupRef}
            showRoadNetworkRef={showRoadNetworkRef}
            roadNetworkGroupRef={roadNetworkGroupRef}
            cameraFocusTargetRef={cameraFocusTargetRef}
            simulationDateRef={simulationDateRef}
            simulationTimeRef={simulationTimeRef}
            weatherModeRef={weatherModeRef}
            congestionSpeedMultiplierRef={congestionSpeedMultiplierRef}
            setStatus={setStatus}
            setStatusDetail={setStatusDetail}
            setLoadingProgress={setLoadingProgress}
            setStats={setStats}
            setFpsStats={setFpsStats}
            setShowFps={setShowFps}
            setFollowTaxiId={setFollowTaxiId}
            setCameraMode={setCameraMode}
            onCameraFocusChange={setMiniMapFocus}
          />
        </MapSimulatorErrorBoundary>

      {isSceneBusy ? (
        <div
          data-ui-panel="scene-loading"
          className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/46 px-6 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-[420px] rounded-[24px] border border-white/12 bg-slate-950/88 p-5 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full border-2 border-white/15 border-t-cyan-400 animate-spin" />
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  지도 불러오는 중
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-50">
                  {statusLabel}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
                <span>현재 단계</span>
                <span className="tabular-nums text-cyan-100">
                  {loadingProgress}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-[width] duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="mt-3 text-sm text-slate-100">{statusDetail}</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                {loadingHint}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className={PANEL_TOKEN_CLASS}>
                환경 {buildVersion.environmentLabel}
              </span>
              <span className={PANEL_TOKEN_CLASS}>
                브랜치 {buildVersion.branch}
              </span>
            </div>

            <div className="mt-4 text-xs leading-5 text-slate-500">
              처음 접속 시 잠시 더 걸릴 수 있습니다.
            </div>
          </div>
        </div>
      ) : null}

      <div
        data-ui-panel="map-toolbar"
        className={`absolute bottom-4 z-20 hidden items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/82 p-2 text-white shadow-2xl shadow-black/30 backdrop-blur-md transition-[right] duration-300 lg:flex ${floatingControlOffsetClass}`}
      >
        <button
          type="button"
          data-ui-control="map-focus-toggle"
          aria-label={isMapFocusMode ? "지도 집중 모드 해제" : "지도 집중 모드"}
          aria-pressed={isMapFocusMode}
          title={isMapFocusMode ? "지도 집중 모드 해제" : "지도 집중 모드"}
          onClick={toggleMapFocusMode}
          className={mapToolButtonClass(isMapFocusMode)}
        >
          {isMapFocusMode ? (
            <Minimize2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{isMapFocusMode ? "해제" : "집중"}</span>
        </button>
        <button
          type="button"
          data-ui-control="camera-mode-toggle"
          aria-label={cameraMode === "overview" ? "주행 모드로 전환" : "조감 모드로 전환"}
          onClick={toggleOverviewCamera}
          className={mapToolButtonClass(cameraMode === "overview")}
        >
          {cameraMode === "overview" ? (
            <MapIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Navigation className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{cameraMode === "overview" ? "조감 모드" : "주행 모드"}</span>
        </button>
        <button
          type="button"
          data-ui-control="render-diagnostics-toggle"
          aria-label={showFps ? "렌더 상태 숨기기" : "렌더 상태 보기"}
          aria-pressed={showFps}
          title={showFps ? "렌더 상태 숨기기" : "렌더 상태 보기"}
          onClick={() => setShowFps((current) => !current)}
          className={mapToolButtonClass(showFps)}
        >
          <Gauge className="h-4 w-4" aria-hidden="true" />
          <span>FPS</span>
        </button>
      </div>

      {!isSidebarVisible ? (
        <div
          data-ui-panel="mobile-map-toolbar"
          className="absolute bottom-3 left-3 right-3 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/88 p-2 text-white shadow-2xl shadow-black/30 backdrop-blur-md lg:hidden"
        >
          <button
            type="button"
            data-ui-control="mobile-map-focus-toggle"
            aria-label={isMapFocusMode ? "지도 집중 모드 해제" : "지도 집중 모드"}
            aria-pressed={isMapFocusMode}
            onClick={toggleMapFocusMode}
            className={`${mapToolButtonClass(isMapFocusMode)} flex-1 justify-center`}
          >
            {isMapFocusMode ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{isMapFocusMode ? "해제" : "집중"}</span>
          </button>
          <button
            type="button"
            data-ui-control="mobile-camera-mode-toggle"
            aria-label={cameraMode === "overview" ? "주행 모드로 전환" : "조감 모드로 전환"}
            aria-pressed={cameraMode === "overview"}
            onClick={toggleOverviewCamera}
            className={`${mapToolButtonClass(cameraMode === "overview")} flex-1 justify-center`}
          >
            {cameraMode === "overview" ? (
              <MapIcon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Navigation className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{cameraMode === "overview" ? "조감" : "주행"}</span>
          </button>
          <button
            type="button"
            data-ui-control="mobile-sidebar-toggle"
            aria-label="운영 패널 열기"
            onClick={toggleSidebar}
            className={`${mapToolButtonClass(false)} flex-1 justify-center`}
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
            <span>운영</span>
          </button>
        </div>
      ) : null}

      {/* Compass Widget */}
      {miniMapFocus && (() => {
        const bearingRad = Math.atan2(miniMapFocus.headingX, miniMapFocus.headingZ);
        const bearingDeg = bearingRad * (180 / Math.PI);
        const cardinalDirections = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const cardinalIndex = Math.round(((bearingDeg % 360) + 360) % 360 / 45) % 8;
        const cardinal = cardinalDirections[cardinalIndex];
        return (
          <div
            data-ui-panel="compass"
            className={`absolute bottom-16 z-20 hidden flex-col items-center gap-1 transition-[right] duration-300 lg:flex ${floatingControlOffsetClass}`}
            aria-label="나침반"
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 44 44"
              className="drop-shadow-lg"
              style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.5))" }}
            >
              {/* Outer ring */}
              <circle cx="22" cy="22" r="20" fill="rgba(15,23,42,0.82)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              {/* Cardinal ticks */}
              {[0, 90, 180, 270].map((angle) => (
                <line
                  key={angle}
                  x1="22"
                  y1="4"
                  x2="22"
                  y2="8"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1.2"
                  transform={`rotate(${angle},22,22)`}
                />
              ))}
              {/* Needle group – rotates by negative bearing so N always points up */}
              <g transform={`rotate(${-bearingDeg},22,22)`}>
                {/* North tip – red */}
                <polygon points="22,6 20,22 24,22" fill="#ef4444" opacity="0.9" />
                {/* South tip – slate */}
                <polygon points="22,38 20,22 24,22" fill="#64748b" opacity="0.7" />
              </g>
              {/* Center dot */}
              <circle cx="22" cy="22" r="2.4" fill="#f8fafc" />
            </svg>
            <span className="rounded-full border border-white/10 bg-slate-950/82 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-slate-300">
              {cardinal}
            </span>
          </div>
        );
      })()}

      {showFps ? (
        <div
          data-ui-panel="render-diagnostics"
          className={`absolute bottom-20 z-20 hidden w-[260px] rounded-2xl border border-cyan-300/15 bg-slate-950/88 p-3 text-xs text-slate-300 shadow-2xl shadow-black/30 backdrop-blur-md transition-[right] duration-300 lg:block ${floatingControlOffsetClass}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className={PANEL_SECTION_LABEL_CLASS}>렌더 상태</div>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2 py-0.5 font-semibold text-cyan-100">
              {fpsStats.capLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <div className="text-slate-500">FPS</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
                {fpsStats.fps}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <div className="text-slate-500">차량</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
                {fpsStats.vehicles}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <div className="text-slate-500">처리</div>
              <div className="mt-1 font-semibold tabular-nums text-slate-100">
                {fpsStats.simulationMs.toFixed(2)}ms
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <div className="text-slate-500">렌더</div>
              <div className="mt-1 font-semibold tabular-nums text-slate-100">
                {fpsStats.renderMs.toFixed(2)}ms
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
            <span className="text-slate-500">갱신 주기</span>
            <span className="font-semibold tabular-nums text-slate-100">
              {fpsStats.simulationHz}
            </span>
          </div>
        </div>
      ) : null}

      <div
        data-ui-panel="desktop-simulation-clock"
        className={`absolute left-3 top-3 z-10 w-[min(calc(100vw-1.5rem),320px)] rounded-2xl border border-white/10 bg-slate-950/84 p-3 text-white shadow-2xl backdrop-blur-md lg:left-4 lg:top-4 lg:w-[320px] lg:p-4 ${isMapFocusMode ? "hidden" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={PANEL_EYEBROW_CLASS}>실시간 입력</p>
            <div className="mt-1 text-lg font-semibold text-slate-50">
              {liveInputTitle}
            </div>
            <div className="mt-1 text-[11px] leading-5 text-slate-400">
              {liveInputSummary || "강남권 주요 생활권과 날씨를 실시간으로 확인합니다."}
            </div>
          </div>
          <span className={panelBadgeClass(circumstanceMode === "live")}>
            {circumstanceMode === "live" ? "자동 연동" : "수동 설정"}
          </span>
        </div>

        <div className="mt-3 min-w-0">
          <span
            className={`${liveSourceTokenClass} text-[11px] font-medium`}
            title={liveCoverageTitle}
          >
            {liveSourceTokenText}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
            <div className="text-slate-500">현재 시각</div>
            <div className="mt-1 font-semibold tabular-nums text-slate-100">
              {formattedSimulationTime}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500">
              {formattedSimulationDate} · {simulationTimeBand}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
            <div className="text-slate-500">현재 날씨</div>
            <div className="mt-1 font-semibold text-slate-100">
              {liveWeatherSummary}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500">
              {liveObservationLabel ?? "관측 기준 확인 중"}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
            <div className="text-slate-500">관찰 범위</div>
            <div className="mt-1 font-semibold text-slate-100">
              {MAP_SCOPE_LABEL}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500">
              {primaryLiveArea?.areaName ?? "강남권 주요 생활권"}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
            <div className="text-slate-500">연결 상태</div>
            <div className="mt-1 font-semibold text-slate-100">
              {telemetryFrame ? telemetryStatusLabel : liveStatusLabel}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500">
              {telemetryFrame ? telemetryStatusDetail : (liveLatencyLabel ?? "반영 시차 확인 중")}
            </div>
          </div>
        </div>

        {forecastSnapshotSummary ? (
          <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-slate-300">
            <span className="font-medium text-amber-200">예측 값은 저장 스냅샷</span>
            <div className="mt-1 text-[11px] text-slate-300">
              {forecastSnapshotSummary}
              {isForecastSnapshotStale ? " · 현재 기준 예측 아님" : ""}
              {isForecastLowConfidence ? " · 신뢰도 낮음" : ""}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsScenarioControlsExpanded((current) => !current)}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05]"
          aria-expanded={isScenarioControlsExpanded}
        >
          <div>
            <div className="font-semibold text-slate-100">시뮬레이션 조건</div>
            <div className="mt-0.5 text-[10px] text-slate-500">
              날짜·시간·날씨를 직접 설정합니다.
            </div>
          </div>
          {isScenarioControlsExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
          )}
        </button>

        {isScenarioControlsExpanded ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/72 p-3">
            <div className="grid grid-cols-2 gap-2">
              {circumstanceOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCircumstanceMode(option.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition ${panelSelectableClass(
                    circumstanceMode === option.id,
                  )}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                날짜
                <input
                  type="date"
                  value={simulationDate}
                  onChange={(event) => {
                    setCircumstanceMode("specific");
                    setSimulationDate(event.target.value);
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
                  aria-label="운영 지도 기준 날짜"
                />
              </label>
              <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                시간
                <input
                  type="time"
                  step={300}
                  value={formattedSimulationTime}
                  onChange={(event) => {
                    const nextMinutes = parseTimeInput(event.target.value);
                    if (nextMinutes === null) {
                      return;
                    }
                    setCircumstanceMode("specific");
                    setSimulationTimeMinutes(nextMinutes);
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
                  aria-label="운영 지도 기준 시간"
                />
              </label>
            </div>

            <label className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-slate-500">
              날씨 조건
              <select
                value={weatherMode}
                onChange={(event) => {
                  setCircumstanceMode("specific");
                  setWeatherMode(event.target.value as WeatherMode);
                }}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
                aria-label="운영 지도 날씨 조건"
              >
                {WEATHER_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      {isSidebarVisible ? (
        <button
          type="button"
          aria-label="운영 패널 닫기"
          onClick={toggleSidebar}
          className="absolute inset-0 z-10 bg-slate-950/40 lg:hidden"
        />
      ) : null}

      {isSidebarVisible ? (
        <div
          data-ui-panel="right-sidebar"
          className="absolute bottom-0 left-0 right-0 z-20 max-h-[min(68vh,calc(100vh-4rem))] overflow-y-auto rounded-t-[1.75rem] border-t border-white/10 bg-slate-950/94 p-4 text-white shadow-2xl backdrop-blur-md sm:max-h-[min(72vh,calc(100vh-4rem))] lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:max-h-none lg:w-[38vw] lg:min-w-[400px] lg:max-w-[500px] lg:rounded-none lg:border-l lg:border-t-0 lg:p-5"
        >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={PANEL_EYEBROW_CLASS}>운영 현황</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-slate-50">
              역삼권 운영 패널
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              실시간 교통·혼잡 입력 기반 역삼권 운영 현황
            </p>
          </div>
          <span
            className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${operationalBadgeClass}`}
          >
            {operationalBadgeText}
          </span>
        </div>

        <AnalysisStatusBadge />


        <div className={`mt-3 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className={PANEL_SECTION_LABEL_CLASS}>실시간 공개데이터</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                {primaryLiveArea?.areaName ?? "서울 공개데이터 확인 중"}
              </div>
              <div className="mt-0.5 text-[11px] leading-5 text-slate-500">
                {liveObservationLabel ?? "관측 기준 시각을 확인하는 중입니다."}
              </div>
            </div>
            <span
              className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] ${
                liveData?.meta.isPartial
                  ? "border-amber-300/25 bg-amber-300/[0.08] text-amber-200"
                  : isLiveFresh
                  ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                  : liveDataStatus === "error"
                    ? "border-rose-400/25 bg-rose-400/[0.08] text-rose-300"
                    : "border-white/10 bg-white/[0.05] text-slate-400"
              }`}
            >
              {liveStatusLabel}
            </span>
          </div>

          {liveData && primaryLiveArea ? (
            <>
              <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-[1.08fr_0.92fr]">
                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
                  <div className="text-slate-500">생활인구</div>
                  <div className="mt-1 truncate font-semibold tabular-nums text-slate-100">
                    {formatLivePopulation(primaryLiveArea)}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
                  <div className="text-slate-500">혼잡 / 교통</div>
                  <div className="mt-1 truncate font-semibold text-slate-100">
                    {primaryLiveArea.congestionLevel} ·{" "}
                    {primaryLiveArea.trafficIndex || "정보 없음"}
                  </div>
                </div>
              </div>

              <div className="mt-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.045] px-3 py-2 text-[11px] leading-5 text-cyan-50/80">
                날씨 {formatLiveWeather(
                  liveData.weather.tempC,
                  liveData.weather.precipitationType,
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {topLiveAreas.map((area) => (
                  <span
                    key={area.areaName}
                    className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] text-slate-400"
                  >
                    {area.areaName} {formatLivePopulation(area)}
                  </span>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] leading-5 text-slate-500">
                {liveMetaSummary.map((item) => (
                  <span
                    key={item}
                    title={item.includes("실시간 반영") ? liveCoverageTitle : undefined}
                    className="inline-flex whitespace-nowrap rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5"
                  >
                    {item}
                  </span>
                ))}
                {liveLatencyLabel ? (
                  <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 ${liveLatencyBadgeClass}`}>
                    {liveLatencyLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 text-[11px] leading-5 text-slate-500">
                공개데이터 특성상 1~2시간 반영 시차가 있을 수 있습니다.
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-slate-500">
              강남역·역삼역·선릉역 등 주변 실시간 생활인구, 혼잡도, 날씨를
              불러오는 중입니다.
            </div>
          )}
        </div>

        {forecastSnapshotSummary ? (
          <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-[11px] leading-5 text-slate-400">
            <span className="font-medium text-amber-200">
              보조 예측 입력
            </span>
            <div className="mt-1">
              {forecastSnapshotSummary}
              {forecastResult?.weather ? ` · ${forecastResult.weather}` : ""}
              {forecastAverageConfidence != null ? (
                <> · 평균 신뢰도 {Math.round(forecastAverageConfidence * 100)}%</>
              ) : null}
            </div>
          </div>
        ) : null}

        {selectedPoi ? (
          <div
            className={`mt-3 ${PANEL_CARD_CLASS}`}
            data-ui-panel="poi-detail-panel"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={PANEL_SECTION_LABEL_CLASS}>현장 정보</div>
                <div className="mt-1 truncate text-sm font-semibold text-slate-100">
                  {selectedPoi.poi_name}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">
                  {selectedPoi.coverage_dong ?? "담당 동 미지정"} ·{" "}
                  {categoryLabel(selectedPoi.category)}
                </div>
              </div>
              <span
                className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  (selectedPoi.poi_pressure_score ?? 0) >= 0.72
                    ? "border-rose-400/25 bg-rose-400/[0.08] text-rose-300"
                    : (selectedPoi.poi_pressure_score ?? 0) >= 0.56
                      ? "border-amber-300/25 bg-amber-300/[0.08] text-amber-200"
                      : "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-200"
                }`}
              >
                  {demandLevelLabel(selectedPoi.poi_pressure_score ?? 0)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
                <div className="text-slate-500">현재 인구</div>
                <div className="mt-1 truncate font-semibold tabular-nums text-slate-100">
                  {formatPoiPopulationRange(selectedPoi)}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
                <div className="text-slate-500">혼잡 / 속도</div>
                <div className="mt-1 truncate font-semibold text-slate-100">
                  {selectedPoi.current_congestion_level ?? "-"} ·{" "}
                  {selectedPoi.current_traffic_speed_kmh == null
                    ? "-"
                    : `${selectedPoi.current_traffic_speed_kmh}km/h`}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
                <div className="text-slate-500">관측 기준</div>
                <div className="mt-1 truncate font-semibold text-slate-100">
                  {formatKstDateTime(selectedPoi.observed_at)}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
                <div className="text-slate-500">담당 동</div>
                <div className="mt-1 truncate font-semibold text-slate-100">
                  {selectedPoi.coverage_dong ?? "미매핑"}
                </div>
              </div>
            </div>

            <div className="mt-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.045] px-3 py-2 text-[11px] leading-5 text-cyan-50/80">
              서울 공개데이터 · 관측 {formatKstDateTime(selectedPoi.observed_at)} ·{" "}
              {selectedPoi.current_precipitation_type ?? "강수 없음"}
            </div>

            {selectedPoiGrounding ? (
              <div className="mt-2 rounded-xl border border-fuchsia-300/15 bg-fuchsia-300/[0.05] px-3 py-2 text-[11px] leading-5 text-fuchsia-50/80">
                {selectedPoi.coverage_dong} · 승차대 {selectedPoiGrounding.taxiStandCount}개 ·{" "}
                {hotspotTierLabel(selectedPoiGrounding.reportHotspotTier)} ·{" "}
                {selectedPoiGrounding.groundingNote}
              </div>
            ) : null}

            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {sortedMapPoiRows.slice(0, 6).map((poi) => {
                const isSelected = poi.poi_code === selectedPoi.poi_code;
                return (
                  <button
                    key={poi.poi_code}
                    type="button"
                    data-poi-code={poi.poi_code}
                    onClick={() => handlePoiSelect(poi.poi_code)}
                    className={`rounded-xl border px-2.5 py-2 text-left text-[11px] transition ${
                      isSelected
                        ? "border-cyan-300/35 bg-cyan-300/[0.1] text-cyan-50"
                        : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-slate-100"
                    }`}
                  >
                    <div className="truncate font-semibold">{poi.poi_name}</div>
                    <div className="mt-0.5 text-[10px] tabular-nums text-slate-500">
                      {demandLevelLabel(poi.poi_pressure_score ?? 0)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className={`mt-4 ${PANEL_CARD_CLASS} py-3`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>실시간 커버리지</div>
            </div>
            <span className="text-[11px] tabular-nums text-slate-500">
              {liveCoverageLabel ?? "확인 중"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
            {sortedMapPoiRows.slice(0, 4).map((poi) => (
              <div
                key={poi.poi_code}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
              >
                <div className="truncate font-semibold text-slate-100">
                  {poi.poi_name}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  {poi.coverage_dong ?? "미매핑"} · {formatKstClock(poi.observed_at)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] leading-5 text-slate-500">
            서울 공개데이터 실시간 수신 현황입니다. 연결 실패 시 이전 데이터로 유지됩니다.
          </div>
        </div>

        <div className={`mt-3 ${PANEL_ACCENT_CARD_CLASS} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>미니맵</div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              현재 위치
              <div className="mt-0.5 font-medium text-slate-300">
                {demandMiniMap?.focusLabel ?? "지도 로딩 중"}
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#08111d]">
            {demandMiniMap ? (
              <svg
                viewBox="0 0 100 100"
                role="img"
                aria-label="역삼동 주변 9개 동 운영 신호 지도"
                className="block aspect-square w-full"
              >
                <defs>
                  <radialGradient id="forecastFocusGlow">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                    <stop offset="50%" stopColor="rgba(34,211,238,0.35)" />
                    <stop offset="100%" stopColor="rgba(34,211,238,0)" />
                  </radialGradient>
                </defs>
                <rect x="0" y="0" width="100" height="100" fill="#07111c" />
                {demandMiniMap.regions.map((region) => (
                  <g key={`${region.name}-shape`}>
                    <path
                      d={region.path}
                      fill={demandFillForScore(region.score)}
                      stroke={demandStrokeForScore(region.score)}
                      strokeWidth={region.score >= 0.55 ? 0.7 : 0.42}
                    />
                    <title>
                      {region.name} 운영 신호 {Math.round(region.score * 100)}
                    </title>
                  </g>
                ))}
                {demandMiniMap.focus ? (
                  <g>
                    <circle
                      cx={demandMiniMap.focus.x}
                      cy={demandMiniMap.focus.y}
                      r="7"
                      fill="url(#forecastFocusGlow)"
                    />
                    {demandMiniMap.focusHeading ? (
                      <line
                        x1={demandMiniMap.focusHeading.x1}
                        y1={demandMiniMap.focusHeading.y1}
                        x2={demandMiniMap.focusHeading.x2}
                        y2={demandMiniMap.focusHeading.y2}
                        stroke="#e0f2fe"
                        strokeWidth="0.62"
                        strokeLinecap="round"
                        opacity="0.78"
                      />
                    ) : null}
                    <circle
                      cx={demandMiniMap.focus.x}
                      cy={demandMiniMap.focus.y}
                      r="1.8"
                      fill="#e0f2fe"
                      stroke="#22d3ee"
                      strokeWidth="0.5"
                    />
                  </g>
                ) : null}
                {demandMiniMap.regions.map((region) => {
                  const dispatchIcon = dispatchMiniMapIcon(region.dispatchActionLevel);
                  return (
                    <g key={`${region.name}-label`} pointerEvents="none">
                      <text
                        x={region.labelX}
                        y={region.labelY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={region.score >= 0.55 ? "#fff7ed" : "#dbeafe"}
                        fontSize={region.score >= 0.85 ? 3.8 : 3.2}
                        fontWeight={region.score >= 0.55 ? 700 : 600}
                        paintOrder="stroke"
                        stroke="rgba(7, 17, 28, 0.82)"
                        strokeWidth="0.72"
                        strokeLinejoin="round"
                      >
                        {region.name}
                      </text>
                      {dispatchIcon ? (
                        <text
                          x={region.labelX + 7.2}
                          y={region.labelY - 4.1}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={dispatchMiniMapIconColor(region.dispatchActionLevel)}
                          fontSize="3.3"
                          fontWeight="800"
                          paintOrder="stroke"
                          stroke="rgba(7, 17, 28, 0.92)"
                          strokeWidth="0.64"
                          strokeLinejoin="round"
                        >
                          {dispatchIcon}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                {demandMiniMap.pois.map((poi) => (
                  <g
                    key={poi.code}
                    role="button"
                    tabIndex={0}
                    aria-label={`${poi.name} POI 선택`}
                    className="cursor-pointer outline-none"
                    onClick={() => handlePoiSelect(poi.code)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handlePoiSelect(poi.code);
                      }
                    }}
                  >
                    <circle
                      cx={poi.x}
                      cy={poi.y}
                      r={poi.isSelected ? "4.2" : "2.7"}
                      fill="rgba(7, 17, 28, 0.68)"
                      stroke={poi.isSelected ? "#f8fafc" : demandStrokeForScore(poi.score)}
                      strokeWidth={poi.isSelected ? "0.7" : "0.46"}
                    >
                      <title>
                        {poi.name} 혼잡도 {Math.round(poi.score * 100)}%
                      </title>
                    </circle>
                    <circle
                      cx={poi.x}
                      cy={poi.y}
                      r={poi.isSelected ? "1.95" : "1.5"}
                      fill={demandStrokeForScore(poi.score)}
                      stroke="rgba(7, 17, 28, 0.82)"
                      strokeWidth="0.35"
                    />
                    {poi.isSelected || poi.score >= 0.56 ? (
                      <text
                        x={poi.labelX}
                        y={poi.labelY}
                        textAnchor={poi.textAnchor}
                        fill={poi.isSelected ? "#f8fafc" : "#cffafe"}
                        fontSize={poi.isSelected ? "2.45" : "2.05"}
                        fontWeight={poi.isSelected ? "800" : "650"}
                        paintOrder="stroke"
                        stroke="rgba(7, 17, 28, 0.92)"
                        strokeWidth={poi.isSelected ? "0.66" : "0.5"}
                        pointerEvents="none"
                      >
                        {poi.label}
                      </text>
                    ) : null}
                  </g>
                ))}
                {demandMiniMap.landmarks.map((landmark) => (
                  <g
                    key={landmark.name}
                    opacity={landmark.isPrimary ? 1 : 0.78}
                  >
                    <circle
                      cx={landmark.x}
                      cy={landmark.y}
                      r={landmark.isPrimary ? "1.45" : "1.05"}
                      fill={landmark.isPrimary ? "#67e8f9" : "#bae6fd"}
                      stroke="#082f49"
                      strokeWidth={landmark.isPrimary ? "0.45" : "0.34"}
                    >
                      <title>{landmark.name}</title>
                    </circle>
                    <text
                      x={landmark.labelX}
                      y={landmark.labelY}
                      textAnchor={landmark.textAnchor}
                      fill={landmark.isPrimary ? "#cffafe" : "#e0f2fe"}
                      fontSize={landmark.isPrimary ? "2.55" : "2.1"}
                      fontWeight={landmark.isPrimary ? "700" : "600"}
                      paintOrder="stroke"
                      stroke="rgba(7, 17, 28, 0.9)"
                      strokeWidth={landmark.isPrimary ? "0.55" : "0.48"}
                      pointerEvents="none"
                    >
                      {landmark.label}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <div className="flex aspect-square items-center justify-center text-sm text-slate-500">
                행정동 지도를 준비하는 중
              </div>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["매우 낮음", "bg-slate-400/20"],
              ["낮음", "bg-teal-300/35"],
              ["중간", "bg-yellow-300/55"],
              ["높음", "bg-orange-400/65"],
              ["매우 높음", "bg-rose-500/75"],
            ].map(([label, colorClass]) => (
              <div key={label} className="flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border border-white/50 bg-cyan-300" />
              혼잡 지점
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-white bg-transparent" />
              선택 지점
            </span>
            <span>지점 선택 시 3D 카메라가 해당 위치로 이동합니다</span>
          </div>
        </div>

        <div className={`mt-3 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>주요 관찰 지역</div>
            </div>
            <span className={panelBadgeClass(true)}>
              {topDemandScoreLabel}점
            </span>
          </div>

          <div className="mt-2 space-y-1.5">
            {rankedForecastDongs.slice(0, 3).map((dong, index) => (
              <div
                key={dong.dongName}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">
                        #{index + 1}
                      </span>
                      <span className="font-semibold text-slate-100">
                        {dong.dongName}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {demandLevelLabel(dong.relativeScore)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="inline-flex whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">
                        승차대 {dong.taxiStandCount ?? 0}개
                      </span>
                      <span className="inline-flex whitespace-nowrap rounded-full border border-fuchsia-300/15 bg-fuchsia-300/[0.06] px-2 py-0.5 text-[10px] text-fuchsia-100/80">
                        {hotspotTierLabel(dong.reportHotspotTier)}
                      </span>
                      {dong.source === "live" ? (
                        <>
                          <span className="inline-flex whitespace-nowrap rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-2 py-0.5 text-[10px] text-cyan-100">
                            관측 지점 {dong.livePoiCount ?? 0}개
                          </span>
                          {dong.liveCongestionLevel ? (
                            <span className="inline-flex whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">
                              {dong.liveCongestionLevel}
                            </span>
                          ) : null}
                        </>
                      ) : dong.source === "model" ? (
                        <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-0.5 text-[10px] text-emerald-400/80">
                          신뢰도 {Math.round((dong.confidence ?? 0) * 100)}%
                        </span>
                      ) : (
                        demandReasonsFor(dong).map((reason) => (
                          <span
                            key={reason}
                            className="inline-flex whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400"
                          >
                            {reason}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums text-rose-100">
                      {Math.round(dong.relativeScore * 100)}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-rose-400"
                    style={{
                      width: `${Math.max(4, Math.round(dong.relativeScore * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {sortedDispatchDecisions.length > 0 ? (
          <div className={`mt-3 ${PANEL_CARD_CLASS}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className={PANEL_SECTION_LABEL_CLASS}>실시간 수급 불균형 및 동적 배차</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  택시 수요 집중 (Surge Pricing) 지역
                </div>
              </div>
              <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] ${operationalBadgeClass}`}>
                {operationalBadgeText}
              </span>
            </div>

            <div className="mt-2 space-y-1.5">
              {sortedDispatchDecisions.slice(0, 5).map((decision, index) => {
                const scorePercent = Math.round((decision.imbalance_score ?? 0) * 100);
                const statusGrade = monitoringStatusGrade(decision.action_level);
                return (
                  <div
                    key={decision.dong_name}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold tracking-tighter text-slate-600">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-bold text-slate-100">
                            {decision.dong_name}
                          </span>
                        </div>
                        
                        <div className="mt-2.5 flex items-center gap-3">
                          <div className="relative h-1 w-full max-w-[80px] overflow-hidden rounded-full bg-slate-800">
                            <div 
                              className={`h-full rounded-full transition-all duration-700 ${
                                decision.action_level === 'high' ? 'bg-red-500' :
                                decision.action_level === 'medium' ? 'bg-amber-400' :
                                'bg-cyan-500'
                              }`}
                              style={{ width: `${Math.max(8, scorePercent)}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-black tracking-tight ${dispatchActionTextClass(decision.action_level)}`}>
                            {scorePercent}%
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap gap-2 text-[10px]">
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/50 bg-slate-800/40 px-1.5 py-0.5 font-medium text-slate-300">
                            <svg className="h-3 w-3 text-cyan-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            잠재 수요 {decision.live_population_mid ? `${(decision.live_population_mid / 10000).toFixed(1)}만명` : '집계중'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/50 bg-slate-800/40 px-1.5 py-0.5 font-medium text-slate-300">
                            <svg className="h-3 w-3 text-amber-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            도로 {decision.live_traffic_index || '정보없음'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/50 bg-slate-800/40 px-1.5 py-0.5 font-medium text-slate-300">
                            <svg className="h-3 w-3 text-emerald-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            승차대 {decision.taxi_stand_count}개
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/50 bg-slate-800/40 px-1.5 py-0.5 font-medium text-slate-300">
                            <svg className="h-3 w-3 text-fuchsia-300/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.286 3.959c.3.921-.755 1.688-1.54 1.118l-3.367-2.446a1 1 0 00-1.176 0L7.123 18.986c-.784.57-1.838-.197-1.539-1.118l1.285-3.959a1 1 0 00-.363-1.118L3.14 9.386c-.783-.57-.38-1.81.588-1.81H7.89a1 1 0 00.951-.69l1.287-3.959z" />
                            </svg>
                            {hotspotTierLabel(decision.hotspot_tier)}
                          </span>
                        </div>
                        <div className="mt-1.5 text-[10px] font-medium text-slate-500">
                          {monitoringActionLabel(decision.action, decision.action_level)} · 추천 배차 {decision.recommended_taxis}대
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[9px] font-black tracking-widest ${dispatchActionBadgeClass(
                            decision.action_level,
                          )}`}
                        >
                          {statusGrade}
                        </span>
                        <button className="rounded-full bg-white/5 p-1 text-slate-400 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 text-[11px] leading-5 text-slate-500">
              실시간 공개데이터에 서울시 택시승차대 현황과 심야 택시 수요 리포트 기반 정적 priors를 더해 계산한 우선순위입니다.
            </div>
          </div>
        ) : null}

        <div className={`mt-3 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className={PANEL_SECTION_LABEL_CLASS}>지도 출처 / 신뢰도</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                OSM 기반 디지털 트윈 프로토타입
              </div>
              <div className="mt-0.5 text-[11px] leading-5 text-slate-500">
                실시간 공개데이터에 정적 택시 운영 근거를 더해 배차 판단을 안정화합니다.
              </div>
            </div>
            <span className="inline-flex whitespace-nowrap rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-0.5 text-[10px] text-cyan-200">
              OpenStreetMap
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] leading-5 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.045] px-3 py-2 text-emerald-100/80">
              <span className="font-medium text-emerald-300">신뢰 높음</span>
              <br />
              행정동 경계, 주요 도로, 지하철역 좌표
            </div>
            <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.045] px-3 py-2 text-amber-100/75">
              <span className="font-medium text-amber-200">시뮬레이션</span>
              <br />
              차선 수, 신호 주기, 실제 차량 궤적
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {mapEvidenceMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2"
              >
                <div className="text-[10px] text-slate-500">{metric.label}</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-slate-100">
                  {metric.value}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-slate-500">
                  {metric.detail}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-[11px] leading-5 text-slate-500">
            OpenStreetMap/Overpass에서 추출한 도로·건물·행정동 데이터를 기반으로 합니다. 히트맵은 도시 가독성을 위해 작은 행정동 조각을 단순화해 표시합니다.
          </div>
          <div className="mt-2 text-[11px] leading-5 text-slate-500">
            강남역·역삼역·선릉역·신논현역 주변 주요 도로와 건물 위치를 기준으로 검증했습니다.
          </div>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-slate-400">
            {MAP_GROUNDING_SOURCE_LABEL} 기반 정적 수요·공급 priors를 함께 사용합니다.
          </div>
        </div>
        </div>
      ) : null}

      </section>
    </div>
  );
}
