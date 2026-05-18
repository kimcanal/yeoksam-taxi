"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Gauge,
  LineChart,
  Map as MapIcon,
  Maximize2,
  Menu,
  Minimize2,
  Navigation,
  Search,
  X,
} from "lucide-react";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";
import { MapSimulatorErrorBoundary } from "@/components/MapSimulatorErrorBoundary";
import mapGroundingConfig from "@/components/map-simulator/config/gangnam-map-grounding.json";
import poiConfig from "@/components/map-simulator/config/gangnam-pois.json";
import {
  WEATHER_OPTIONS,
  format24Hour,
  formatDateLabel,
  normalizeDayMinutes,
  type WeatherMode,
} from "@/components/map-simulator/simulation-environment";
import { loadSimulationData } from "@/components/map-simulator/load-simulation-data";
import { createLocalSimulationSource } from "@/components/map-simulator/local-simulation-source";
import MapSimulatorSceneRuntime from "@/components/map-simulator/MapSimulatorSceneRuntime";
import { useSyncRef } from "@/components/map-simulator/use-sync-ref";
import {
  conditionDemandMock,
  DEMAND_MOCK_SNAPSHOTS,
  type DemandMockDong,
} from "@/components/map-simulator/demand-mock-series";
import {
  sceneSetters,
  sceneStore,
  uiSetters,
  uiStore,
} from "@/components/map-simulator/simulator-stores";
import { QuadTree } from "@/components/map-simulator/spatial-quadtree";
import {
  BaseCameraMode,
  CameraFocusTarget,
  CameraMode,
  DEFAULT_TAXI_COUNT,
  FpsMode,
  PANEL_ACCENT_CARD_CLASS,
  PANEL_CARD_CLASS,
  PANEL_EYEBROW_CLASS,
  PANEL_SECTION_LABEL_CLASS,
  PANEL_TOKEN_CLASS,
  SimulationData,
  projectPoint,
} from "@/components/map-simulator/core";
type MapSimulatorProps = {
  buildVersion: BuildVersionInfo;
};

type MapPoiFeatureRow = {
  poi_code: string;
  poi_name: string;
  coverage_dong: string | null;
  category: string | null;
  lon: number | null;
  lat: number | null;
  context_score: number;
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

type DemandMiniMapRegion = {
  name: string;
  path: string;
  labelX: number;
  labelY: number;
  score: number;
  isSelected?: boolean;
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
  contextScore: number;
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

const DEMAND_WEEKDAYS = [
  { id: "monday", label: "월" },
  { id: "tuesday", label: "화" },
  { id: "wednesday", label: "수" },
  { id: "thursday", label: "목" },
  { id: "friday", label: "금" },
  { id: "saturday", label: "토" },
  { id: "sunday", label: "일" },
] as const;

type DemandWeekdayId = (typeof DEMAND_WEEKDAYS)[number]["id"];

type HourlyDemandPoint = {
  hour: number;
  populationPred: number;
  r: number;
  demandPred: number;
  trendDemandPred: number;
  relativeScore: number;
};

type DemandFetchStatus = "local" | "loading" | "ready" | "error";

const WEEKDAY_DEMAND_MULTIPLIER: Record<DemandWeekdayId, number> = {
  monday: 0.94,
  tuesday: 0.96,
  wednesday: 0.98,
  thursday: 1.02,
  friday: 1.14,
  saturday: 1.08,
  sunday: 0.86,
};

const DEMAND_API_ENDPOINT =
  process.env.NEXT_PUBLIC_DEMAND_API_ENDPOINT?.trim() ?? "";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function weekdayIdFromDate(dateIso: string): DemandWeekdayId {
  const parsed = new Date(`${dateIso}T00:00:00`);
  const dayIndex = Number.isFinite(parsed.getTime()) ? parsed.getDay() : 5;
  const byDayIndex: DemandWeekdayId[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return byDayIndex[dayIndex] ?? "friday";
}

function weekdayLabel(id: DemandWeekdayId) {
  return DEMAND_WEEKDAYS.find((weekday) => weekday.id === id)?.label ?? "금";
}

function hourlyPulse(hour: number, centerHour: number, radiusHours: number) {
  const dayHours = 24;
  const diff = Math.abs(hour - centerHour) % dayHours;
  const distance = Math.min(diff, dayHours - diff);
  return Math.max(0, 1 - distance / radiusHours);
}

function roundedR(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function withDemandTrend(points: HourlyDemandPoint[]) {
  return points.map((point, index) => {
    const neighbors = points.slice(
      Math.max(0, index - 1),
      Math.min(points.length, index + 2),
    );
    const averageDemand =
      neighbors.reduce((sum, neighbor) => sum + neighbor.demandPred, 0) /
      Math.max(1, neighbors.length);
    return {
      ...point,
      trendDemandPred: Math.round(averageDemand),
    };
  });
}

function buildLocalHourlyDemandSeries({
  dongName,
  weekday,
  weatherMode,
  grounding,
}: {
  dongName: string;
  weekday: DemandWeekdayId;
  weatherMode: WeatherMode;
  grounding: DongGroundingInfo | null;
}) {
  const weekdayMultiplier = WEEKDAY_DEMAND_MULTIPLIER[weekday];
  const hotspotBoost =
    grounding?.reportHotspotTier === "primary"
      ? 0.0032
      : grounding?.reportHotspotTier === "secondary"
        ? 0.0016
        : 0.0006;

  const points = Array.from({ length: 24 }, (_, hour) => {
    const demandSample =
      conditionDemandMock(
        DEMAND_MOCK_SNAPSHOTS[0],
        hour * 60,
        weatherMode,
      ).find((dong) => dong.dongName === dongName) ??
      DEMAND_MOCK_SNAPSHOTS[0].dongs.find((dong) => dong.dongName === dongName);
    const relativeScore = clamp01(demandSample?.relativeScore ?? 0.08);
    const lateNight = hourlyPulse(hour, 23, 4.2);
    const commute = hourlyPulse(hour, 19, 4.5) + hourlyPulse(hour, 8.5, 3);
    const populationPred = Math.round(
      (10_500 +
        relativeScore * 58_000 +
        (demandSample?.publicTransitSignal ?? 0.2) * 8_500 +
        (grounding?.demandGroundingScore ?? demandSample?.contextPrior ?? 0) * 90_000) *
        weekdayMultiplier,
    );
    const r = roundedR(
      0.0046 +
        relativeScore * 0.0068 +
        lateNight * 0.0036 +
        commute * 0.0012 +
        hotspotBoost +
        (weekday === "friday" || weekday === "saturday" ? 0.0014 : 0),
    );

    return {
      hour,
      populationPred,
      r,
      demandPred: Math.max(0, Math.round(populationPred * r)),
      trendDemandPred: 0,
      relativeScore,
    } satisfies HourlyDemandPoint;
  });

  return withDemandTrend(points);
}

function normalizeRemoteDemandPoints(payload: unknown) {
  const pointsPayload =
    payload && typeof payload === "object" && "points" in payload
      ? (payload as { points?: unknown }).points
      : null;
  if (!Array.isArray(pointsPayload)) {
    return null;
  }

  const points = pointsPayload.flatMap((point) => {
    if (!point || typeof point !== "object") {
      return [];
    }
    const record = point as Record<string, unknown>;
    const hour = Number(record.hour);
    const populationPred = Number(
      record.population_pred ?? record.populationPred ?? record.population,
    );
    const r = Number(record.r);
    const demandPred = Number(
      record.demand_pred ?? record.demandPred ?? record.demand,
    );
    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isFinite(populationPred) ||
      !Number.isFinite(r) ||
      !Number.isFinite(demandPred)
    ) {
      return [];
    }
    return [
      {
        hour,
        populationPred: Math.round(populationPred),
        r: roundedR(r),
        demandPred: Math.round(demandPred),
        trendDemandPred: 0,
        relativeScore: 0,
      } satisfies HourlyDemandPoint,
    ];
  });

  if (!points.length) {
    return null;
  }

  return withDemandTrend(
    points
      .sort((left, right) => left.hour - right.hour)
      .filter((point, index, sorted) => index === 0 || point.hour !== sorted[index - 1]?.hour),
  );
}

function buildDemandChartGeometry(points: HourlyDemandPoint[]) {
  const width = 320;
  const height = 164;
  const paddingLeft = 30;
  const paddingRight = 12;
  const paddingTop = 16;
  const paddingBottom = 28;
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;
  const maxDemand = Math.max(1, ...points.map((point) => point.demandPred));
  const yMax = Math.ceil(maxDemand / 50) * 50;
  const xForHour = (hour: number) => paddingLeft + (hour / 23) * graphWidth;
  const yForDemand = (demand: number) =>
    paddingTop + graphHeight - (Math.max(0, demand) / yMax) * graphHeight;
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForDemand(point.demandPred).toFixed(2)}`)
    .join(" ");
  const trendPath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForDemand(point.trendDemandPred).toFixed(2)}`)
    .join(" ");
  const baseY = paddingTop + graphHeight;
  const areaPath = points.length
    ? `${linePath} L ${xForHour(points[points.length - 1]!.hour).toFixed(2)} ${baseY.toFixed(2)} L ${xForHour(points[0]!.hour).toFixed(2)} ${baseY.toFixed(2)} Z`
    : "";
  const peakPoint = points.reduce(
    (peak, point) => (point.demandPred > peak.demandPred ? point : peak),
    points[0] ?? {
      hour: 0,
      populationPred: 0,
      r: 0,
      demandPred: 0,
      trendDemandPred: 0,
      relativeScore: 0,
    },
  );

  return {
    width,
    height,
    paddingLeft,
    baseY,
    yMax,
    linePath,
    trendPath,
    areaPath,
    peakPoint,
    peakX: xForHour(peakPoint.hour),
    peakY: yForDemand(peakPoint.demandPred),
    xTicks: [0, 6, 12, 18, 23].map((hour) => ({
      hour,
      x: xForHour(hour),
    })),
    yTicks: [0, Math.round(yMax / 2), yMax].map((value) => ({
      value,
      y: yForDemand(value),
    })),
  };
}

function averageDemand(points: HourlyDemandPoint[]) {
  if (!points.length) return 0;
  return Math.round(
    points.reduce((sum, point) => sum + point.demandPred, 0) / points.length,
  );
}

function contextPoiWeight(category: string | null | undefined) {
  if (category === "road_corridor_context") {
    return 0.85;
  }
  if (category === "station_context") {
    return 0.72;
  }
  return 0.58;
}

function isSubwayStationFeature(feature: SimulationData["transit"]["features"][number]) {
  return (
    feature.properties.category === "subway_station" &&
    feature.properties.sourceType === "station"
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

function compactPoiLabel(name: string) {
  const normalized = name.replace(/\s+/g, " ").trim();
  return normalized.length > 8 ? normalized.slice(0, 8) : normalized;
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

function buildStaticPoiFeatureRows() {
  const rows = [
    ...poiConfig.context_pois.map((poi) => ({
      code: poi.code,
      name: poi.name,
      coverageDong: poi.coverage_dong,
      category: poi.category,
      lon: poi.lon,
      lat: poi.lat,
    })),
    ...poiConfig.supplemental_context_pois.map((poi) => ({
      code: poi.id,
      name: poi.name,
      coverageDong: poi.coverage_dong,
      category: poi.category,
      lon: poi.lon,
      lat: poi.lat,
    })),
  ];
  const rawScores = rows.map((poi) =>
    contextPoiWeight(poi.category),
  );
  const maxScore = Math.max(...rawScores, 1);

  return rows
    .map((poi, index) => {
      const contextScore = Math.round(((rawScores[index] ?? 0) / maxScore) * 1000) / 1000;
      return {
        poi_code: poi.code,
        poi_name: poi.name,
        coverage_dong: poi.coverageDong,
        category: poi.category,
        lon: poi.lon,
        lat: poi.lat,
        context_score: contextScore,
      } satisfies MapPoiFeatureRow;
    })
    .sort((left, right) => right.context_score - left.context_score);
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

function poiRenderRadius(cameraMode: CameraMode) {
  if (cameraMode === "overview") return 320;
  if (cameraMode === "follow") return 180;
  if (cameraMode === "ride") return 140;
  return 220;
}

export default function MapSimulator({ buildVersion }: MapSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationSource = useMemo(() => createLocalSimulationSource(), []);
  const data = sceneStore.useStore((state) => state.data);
  const status = sceneStore.useStore((state) => state.status);
  const statusDetail = sceneStore.useStore((state) => state.statusDetail);
  const loadingProgress = sceneStore.useStore((state) => state.loadingProgress);
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
  const [selectedDongName, setSelectedDongName] = useState<string>("역삼1동");
  const [selectedWeekday, setSelectedWeekday] = useState<DemandWeekdayId>(
    () => weekdayIdFromDate(simulationDate),
  );
  const [remoteDemandPoints, setRemoteDemandPoints] = useState<
    HourlyDemandPoint[] | null
  >(null);
  const [demandFetchStatus, setDemandFetchStatus] =
    useState<DemandFetchStatus>("local");

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
  const demandOffsetMinutes = 15;
  const fpsMode: FpsMode = "fixed60";
  const appliedTaxiCount = DEFAULT_TAXI_COUNT;
  // Keep the map focused on taxi operations until backend traffic markers land.
  const appliedTrafficCount = 0;
  const appliedTaxiCountRef = useSyncRef(appliedTaxiCount);
  const appliedTrafficCountRef = useSyncRef(appliedTrafficCount);
  const simulationDateRef = useSyncRef(simulationDate);
  const simulationTimeRef = useSyncRef(simulationTimeMinutes);
  const weatherModeRef = useSyncRef<WeatherMode>(weatherMode);
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

  const mapPoiFeatureRows = useMemo(
    () => buildStaticPoiFeatureRows(),
    [],
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
    [...poiConfig.context_pois, ...poiConfig.supplemental_context_pois].forEach((poi) => {
      const dongName = poi.coverage_dong;
      if (!dongName || !TARGET_DONGS.includes(dongName as (typeof TARGET_DONGS)[number])) {
        return;
      }
      contextPoiCounts.set(dongName, (contextPoiCounts.get(dongName) ?? 0) + 1);
      contextPoiScores.set(
        dongName,
        (contextPoiScores.get(dongName) ?? 0) +
          contextPoiWeight(poi.category),
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
      .sort((left, right) => right.context_score - left.context_score)
      .slice(0, 24);
  }, [activePoiCode, cameraMode, mapPoiFeatureRows, miniMapFocus, poiSpatialIndex]);
  const scenePoiFeatureRowsRef = useSyncRef(scenePoiFeatureRows);

  const markSceneRendering = useCallback((detail: string) => {
    setStatus("rendering");
    setStatusDetail(detail);
  }, [setStatus, setStatusDetail]);

  const markSceneError = useCallback((detail: string) => {
    setStatus("error");
    setStatusDetail(detail);
  }, [setStatus, setStatusDetail]);

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
  const conditionedDemandDongs = useMemo(
    () => {
      const snapshot =
        DEMAND_MOCK_SNAPSHOTS.find(
          (sample) => sample.offsetMinutes === demandOffsetMinutes,
        ) ?? DEMAND_MOCK_SNAPSHOTS[0];
      return conditionDemandMock(
        snapshot,
        normalizeDayMinutes(
          normalizedSimulationTimeMinutes + snapshot.offsetMinutes,
        ),
        weatherMode,
      );
    },
    [demandOffsetMinutes, normalizedSimulationTimeMinutes, weatherMode],
  );
  // effectiveDongs is what the heatmap actually renders. Keep it local and
  // deterministic so the map stays light and offline-friendly.
  type OperationalSource = "sample";
  type EffectiveDong = DemandMockDong & {
    confidence?: number;
    source: OperationalSource;
    staticPoiCount?: number;
    taxiStandCount?: number;
    supplyGroundingScore?: number;
    demandGroundingScore?: number;
    reportHotspotTier?: string;
    groundingNote?: string;
  };
  const effectiveDongs = useMemo((): EffectiveDong[] => {
    return conditionedDemandDongs.map((d) => ({
      ...d,
      relativeScore: clamp01(
        d.relativeScore * 0.9 +
          (dongGroundingByName.get(d.dongName)?.demandGroundingScore ?? 0) * 0.1,
      ),
      contextPrior: dongGroundingByName.get(d.dongName)?.demandGroundingScore ?? d.contextPrior,
      source: "sample" as const,
      staticPoiCount: mapPoiFeatureRows.filter(
        (poi) => poi.coverage_dong === d.dongName,
      ).length,
      taxiStandCount: dongGroundingByName.get(d.dongName)?.taxiStandCount ?? 0,
      supplyGroundingScore: dongGroundingByName.get(d.dongName)?.supplyGroundingScore ?? 0,
      demandGroundingScore: dongGroundingByName.get(d.dongName)?.demandGroundingScore ?? 0,
      reportHotspotTier: dongGroundingByName.get(d.dongName)?.reportHotspotTier ?? "context",
      groundingNote: dongGroundingByName.get(d.dongName)?.groundingNote,
    }));
  }, [
    conditionedDemandDongs,
    dongGroundingByName,
    mapPoiFeatureRows,
  ]);

  const sortedDemandSignals = useMemo(
    () =>
      [...effectiveDongs]
        .map((dong) => {
          const groundedDemandScore = clamp01(
            dong.relativeScore * 0.82 + (dong.demandGroundingScore ?? 0) * 0.18,
          );
          const supplyProxyScore = dong.supplyGroundingScore ?? 0;
          // supplyProxyScore는 택시승차대 수 기반이므로 패널티를 낮게 유지.
          // 역삼1동처럼 승차대가 많아도 심야 초과수요가 최고인 경우를 반영.
          const imbalanceScore = clamp01(
            groundedDemandScore - supplyProxyScore * 0.12,
          );
          const actionLevel = monitoringLevelForScore(imbalanceScore);
          return {
            dong_name: dong.dongName,
            predicted_demand_score: groundedDemandScore,
            supply_proxy_score: supplyProxyScore,
            imbalance_score: imbalanceScore,
            action_level: actionLevel,
            action: monitoringActionForLevel(actionLevel),
            coverage_units: dong.staticPoiCount ?? 0,
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
            context_signal_label: demandLevelLabel(dong.relativeScore),
            road_signal_label: "정적 도로망",
            taxi_stand_count: dong.taxiStandCount ?? 0,
            hotspot_tier: dong.reportHotspotTier ?? "context",
            grounding_note: dong.groundingNote ?? null,
          };
        })
        .sort((left, right) => right.imbalance_score - left.imbalance_score),
    [effectiveDongs],
  );
  const demandSignalByDong = useMemo(
    () =>
      new globalThis.Map(
        sortedDemandSignals.map(
          (decision) => [decision.dong_name, decision] as const,
        ),
      ),
    [sortedDemandSignals],
  );

  const selectedDemandGrounding =
    dongGroundingByName.get(selectedDongName) ?? null;
  const localDemandSeries = useMemo(
    () =>
      buildLocalHourlyDemandSeries({
        dongName: selectedDongName,
        weekday: selectedWeekday,
        weatherMode,
        grounding: selectedDemandGrounding,
      }),
    [selectedDongName, selectedWeekday, selectedDemandGrounding, weatherMode],
  );

  useEffect(() => {
    if (!DEMAND_API_ENDPOINT) {
      return;
    }

    const controller = new AbortController();
    const url = new URL(DEMAND_API_ENDPOINT, window.location.origin);
    url.searchParams.set("dong", selectedDongName);
    url.searchParams.set("weekday", selectedWeekday);

    fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Demand API request failed: ${response.status}`);
        }
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        const normalized = normalizeRemoteDemandPoints(payload);
        if (!normalized) {
          throw new Error("Demand API response has no valid points.");
        }
        setRemoteDemandPoints(normalized);
        setDemandFetchStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        setRemoteDemandPoints(null);
        setDemandFetchStatus("error");
      });

    return () => controller.abort();
  }, [selectedDongName, selectedWeekday]);

  const hourlyDemandSeries = remoteDemandPoints ?? localDemandSeries;
  const demandChart = useMemo(
    () => buildDemandChartGeometry(hourlyDemandSeries),
    [hourlyDemandSeries],
  );
  const selectedDemandSignal = demandSignalByDong.get(selectedDongName) ?? null;
  const selectedAverageDemand = averageDemand(hourlyDemandSeries);
  const selectedPeakDemand = demandChart.peakPoint;
  const selectedDemandRLabel = `${(selectedPeakDemand.r * 100).toFixed(2)}%`;
  const demandFetchBadgeText =
    demandFetchStatus === "ready"
      ? "백엔드"
      : demandFetchStatus === "loading"
        ? "요청 중"
        : demandFetchStatus === "error"
          ? "로컬 대체"
          : "로컬";

  const demandByDong = useMemo(
    () =>
      new globalThis.Map(
        effectiveDongs.map(
          (dong) => [dong.dongName, dong] as const,
        ),
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
        return {
          name: dong.name,
          path,
          labelX: labelPoint.x,
          labelY: labelPoint.y,
          score: demandByDong.get(dong.name)?.relativeScore ?? 0,
          isSelected: dong.name === selectedDongName,
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
            Number.isFinite(poi.lon) &&
            Number.isFinite(poi.lat),
        )
        .sort((left, right) => right.context_score - left.context_score)
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
            contextScore: poi.context_score,
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
    mapPoiFeatureRows,
    miniMapFocus,
    scenarioMapCenter,
    activePoiCode,
    selectedDongName,
  ]);
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
  const formattedSimulationTime = format24Hour(normalizedSimulationTimeMinutes);
  const formattedSimulationDate = formatDateLabel(simulationDate);
  const operationalBadgeClass =
    "border-sky-300/25 bg-sky-300/[0.08] text-sky-100";
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
    <div className="relative h-screen w-full overflow-hidden bg-[#060d16]">
      <section className="relative h-full overflow-hidden">
        <div
          ref={containerRef}
          className={mapCanvasClass}
        />
        <MapSimulatorErrorBoundary>
          <MapSimulatorSceneRuntime
            containerRef={containerRef}
            data={data}
            poiFeatureRowsRef={scenePoiFeatureRowsRef}
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

        <div
          data-ui-panel="map-search-control"
          className={`absolute left-3 right-3 top-3 z-30 max-w-[430px] lg:left-4 lg:right-auto ${isSidebarVisible ? "lg:max-w-[calc(62vw-2rem)]" : ""}`}
        >
          <div className="flex h-14 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/96 px-2.5 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.20)] backdrop-blur-md">
            <button
              type="button"
              aria-label="지도 조건 열기"
              aria-expanded={isScenarioControlsExpanded}
              onClick={() => setIsScenarioControlsExpanded((current) => !current)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              <Search className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-950">
                  강남 교통 운영
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {MAP_SCOPE_LABEL} · {formattedSimulationTime} · {selectedWeather.label}
                </span>
              </span>
            </button>

            <span className="hidden shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 sm:inline-flex">
              로컬
            </span>

            <button
              type="button"
              data-ui-control="map-sidebar-toggle"
              aria-label={isSidebarVisible ? "운영 패널 닫기" : "운영 패널 열기"}
              aria-expanded={isSidebarVisible}
              onClick={toggleSidebar}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              {isSidebarVisible ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {isScenarioControlsExpanded ? (
            <div
              data-ui-panel="map-condition-drawer"
              className="mt-2 rounded-2xl border border-slate-200/80 bg-white/96 p-3 text-slate-900 shadow-[0_12px_34px_rgba(15,23,42,0.18)] backdrop-blur-md"
            >
              <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                <div className="rounded-xl bg-slate-100 px-3 py-2">
                  <div className="text-slate-500">날짜</div>
                  <div className="mt-0.5 font-semibold text-slate-900">
                    {formattedSimulationDate}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-100 px-3 py-2">
                  <div className="text-slate-500">시간</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-slate-900">
                    {formattedSimulationTime}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-100 px-3 py-2">
                  <div className="text-slate-500">날씨</div>
                  <div className="mt-0.5 font-semibold text-slate-900">
                    {selectedWeather.label}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-100 px-3 py-2">
                  <div className="text-slate-500">데이터</div>
                  <div className="mt-0.5 font-semibold text-slate-900">
                    오프라인
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  날짜
                  <input
                    type="date"
                    value={simulationDate}
                    onChange={(event) => {
                      setCircumstanceMode("specific");
                      setSimulationDate(event.target.value);
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-cyan-400"
                    aria-label="운영 지도 기준 날짜"
                  />
                </label>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
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
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-cyan-400"
                    aria-label="운영 지도 기준 시간"
                  />
                </label>
              </div>

              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                날씨
                <select
                  value={weatherMode}
                  onChange={(event) => {
                    setCircumstanceMode("specific");
                    setWeatherMode(event.target.value as WeatherMode);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-cyan-400"
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
            <p className={PANEL_EYEBROW_CLASS}>수요 예측</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-slate-50">
              동별 24시간 택시 수요
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {selectedDongName} · {weekdayLabel(selectedWeekday)}요일 · 0-23시
            </p>
          </div>
          <span
            className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${operationalBadgeClass}`}
          >
            {demandFetchBadgeText}
          </span>
        </div>

        <div
          className={`mt-4 ${PANEL_CARD_CLASS} p-4`}
          data-ui-panel="hourly-demand-mock-series"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-100">
                <LineChart className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className={PANEL_SECTION_LABEL_CLASS}>수요 곡선</div>
                <div className="mt-0.5 truncate text-sm font-semibold text-slate-100">
                  생활인구 예측치 × r
                </div>
              </div>
            </div>
            <span className="inline-flex whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-300">
              24H
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">
              동
              <select
                value={selectedDongName}
                onChange={(event) => setSelectedDongName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
                aria-label="수요 예측 행정동"
              >
                {TARGET_DONGS.map((dongName) => (
                  <option key={dongName} value={dongName}>
                    {dongName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">
              요일
              <select
                value={selectedWeekday}
                onChange={(event) =>
                  setSelectedWeekday(event.target.value as DemandWeekdayId)
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
                aria-label="수요 예측 요일"
              >
                {DEMAND_WEEKDAYS.map((weekday) => (
                  <option key={weekday.id} value={weekday.id}>
                    {weekday.label}요일
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.035] text-center">
            <div className="px-2 py-2">
              <div className="text-[10px] text-slate-500">피크</div>
              <div className="mt-1 font-semibold tabular-nums text-slate-100">
                {selectedPeakDemand.hour}시
              </div>
            </div>
            <div className="px-2 py-2">
              <div className="text-[10px] text-slate-500">수요</div>
              <div className="mt-1 font-semibold tabular-nums text-rose-100">
                {selectedPeakDemand.demandPred.toLocaleString("ko-KR")}
              </div>
            </div>
            <div className="px-2 py-2">
              <div className="text-[10px] text-slate-500">r</div>
              <div className="mt-1 font-semibold tabular-nums text-cyan-100">
                {selectedDemandRLabel}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#07111c]">
            <svg
              viewBox={`0 0 ${demandChart.width} ${demandChart.height}`}
              role="img"
              aria-label={`${selectedDongName} ${weekdayLabel(selectedWeekday)}요일 시간대별 택시 수요 예측`}
              className="block h-auto w-full"
            >
              <defs>
                <linearGradient id="demandCurveFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,211,238,0.32)" />
                  <stop offset="100%" stopColor="rgba(34,211,238,0)" />
                </linearGradient>
              </defs>
              <rect
                x="0"
                y="0"
                width={demandChart.width}
                height={demandChart.height}
                fill="#07111c"
              />
              {demandChart.yTicks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={demandChart.paddingLeft}
                    y1={tick.y}
                    x2={demandChart.width - 12}
                    y2={tick.y}
                    stroke="rgba(148,163,184,0.16)"
                    strokeWidth="0.8"
                  />
                  <text
                    x={demandChart.paddingLeft - 8}
                    y={tick.y + 3}
                    textAnchor="end"
                    fill="rgba(148,163,184,0.74)"
                    fontSize="8"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}
              {demandChart.xTicks.map((tick) => (
                <g key={tick.hour}>
                  <line
                    x1={tick.x}
                    y1={demandChart.baseY}
                    x2={tick.x}
                    y2={demandChart.baseY + 4}
                    stroke="rgba(148,163,184,0.35)"
                    strokeWidth="0.8"
                  />
                  <text
                    x={tick.x}
                    y={demandChart.baseY + 16}
                    textAnchor="middle"
                    fill="rgba(148,163,184,0.78)"
                    fontSize="8"
                  >
                    {tick.hour}
                  </text>
                </g>
              ))}
              <path d={demandChart.areaPath} fill="url(#demandCurveFill)" />
              <path
                d={demandChart.trendPath}
                fill="none"
                stroke="#fda4af"
                strokeDasharray="4 4"
                strokeLinecap="round"
                strokeWidth="1.6"
                opacity="0.9"
              />
              <path
                d={demandChart.linePath}
                fill="none"
                stroke="#22d3ee"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
              />
              <circle
                cx={demandChart.peakX}
                cy={demandChart.peakY}
                r="4"
                fill="#fff7ed"
                stroke="#fb7185"
                strokeWidth="1.6"
              />
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-4 rounded-full bg-cyan-300" />
                예측 수요
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0 w-4 border-t border-dashed border-rose-300" />
                추세
              </span>
            </div>
            <span className="tabular-nums">
              평균 {selectedAverageDemand.toLocaleString("ko-KR")} · 추천{" "}
              {selectedDemandSignal?.recommended_taxis ?? "-"}대
            </span>
          </div>
        </div>

        <div className={`mt-3 ${PANEL_ACCENT_CARD_CLASS} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>미니맵</div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              선택 동
              <div className="mt-0.5 font-medium text-slate-300">
                {selectedDongName}
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
                  <radialGradient id="demandFocusGlow">
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
	                      stroke={region.isSelected ? "#e0f2fe" : demandStrokeForScore(region.score)}
	                      strokeWidth={region.isSelected ? 1.25 : region.score >= 0.55 ? 0.7 : 0.42}
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
                      fill="url(#demandFocusGlow)"
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
                {demandMiniMap.regions.map((region) => (
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
                  </g>
                ))}
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
                      stroke={poi.isSelected ? "#f8fafc" : "#67e8f9"}
                      strokeWidth={poi.isSelected ? "0.7" : "0.46"}
                    >
                      <title>{poi.name} 관심 지점</title>
                    </circle>
                    <circle
                      cx={poi.x}
                      cy={poi.y}
                      r={poi.isSelected ? "1.95" : "1.5"}
                      fill={poi.isSelected ? "#f8fafc" : "#67e8f9"}
                      stroke="rgba(7, 17, 28, 0.82)"
                      strokeWidth="0.35"
                    />
                    {poi.isSelected || poi.contextScore >= 0.56 ? (
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
              관심 지점
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-white bg-transparent" />
              선택 동
            </span>
            <span>POI {mapPoiFeatureRows.length}개</span>
          </div>
        </div>

        </div>
      ) : null}

      </section>
    </div>
  );
}
