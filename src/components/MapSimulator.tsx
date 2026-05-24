"use client";

import {
  startTransition,
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LineChart,
} from "lucide-react";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";
import { MapSimulatorErrorBoundary } from "@/components/MapSimulatorErrorBoundary";
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
  sceneSetters,
  sceneStore,
  type MiniMapFocus,
  uiSetters,
  uiStore,
} from "@/components/map-simulator/simulator-stores";
import { SceneLoading } from "@/components/map-simulator/ui/SceneLoading";
import { MapFooter } from "@/components/map-simulator/ui/MapFooter";
import { CameraOrbitControls } from "@/components/map-simulator/ui/CameraOrbitControls";
import { MapSearchControl } from "@/components/map-simulator/ui/MapSearchControl";
import { QuadTree } from "@/components/map-simulator/spatial-quadtree";
import {
  BaseCameraMode,
  CameraPitchControlState,
  CameraFocusTarget,
  CameraMode,
  CameraYawControlState,
  DEFAULT_CAMERA_PITCH_CONTROL_VALUE,
  DEFAULT_CAMERA_YAW_CONTROL_VALUE,
  DEFAULT_TAXI_COUNT,
  FpsMode,
  MAX_TAXI_COUNT,
  PANEL_ACCENT_CARD_CLASS,
  PANEL_CARD_CLASS,
  PANEL_EYEBROW_CLASS,
  PANEL_SECTION_LABEL_CLASS,
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

const MOBILE_LAYOUT_QUERY = "(max-width: 1023px)";
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
  score: number | null;
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
  populationPred: number | null;
  demandPred: number;
  trendDemandPred: number;
};

type FiveMinuteDemandPoint = {
  minuteOfDay: number;
  hour: number;
  slot: number;
  demand: number;
  visualUnits: number;
};

type DemandFetchStatus = "idle" | "loading" | "ready" | "error";

const DEMAND_API_ENDPOINT =
  process.env.NEXT_PUBLIC_DEMAND_API_ENDPOINT?.trim() ?? "";
const DEMAND_SLOT_MINUTES = 5;
const DEMAND_SLOTS_PER_HOUR = 60 / DEMAND_SLOT_MINUTES;
const DEMAND_VISUAL_UNIT_CALLS = 100;
const DEMAND_VISUAL_MAX_TAXIS = MAX_TAXI_COUNT;

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
    const rawPopulationPred = Number(
      record.population_pred ?? record.populationPred ?? record.population,
    );
    const demandPred = Number(
      record.demand_count ??
      record.demandCount ??
      record.demand_pred ??
      record.demandPred ??
      record.demand,
    );
    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isFinite(demandPred)
    ) {
      return [];
    }
    return [
      {
        hour,
        populationPred: Number.isFinite(rawPopulationPred)
          ? Math.round(rawPopulationPred)
          : null,
        demandPred: Math.round(demandPred),
        trendDemandPred: 0,
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

function demandVisualUnitCount(fiveMinuteDemand: number) {
  if (!Number.isFinite(fiveMinuteDemand) || fiveMinuteDemand <= 0) {
    return 0;
  }
  return THREE.MathUtils.clamp(
    Math.round(fiveMinuteDemand / DEMAND_VISUAL_UNIT_CALLS),
    1,
    DEMAND_VISUAL_MAX_TAXIS,
  );
}

function buildFiveMinuteDemandSeries(points: HourlyDemandPoint[]) {
  if (!points.length) {
    return [];
  }

  const demandByHour = new globalThis.Map(
    points.map((point) => [point.hour, Math.max(0, point.demandPred)] as const),
  );
  const hourlyTotals = Array.from({ length: 24 }, (_, hour) =>
    demandByHour.get(hour) ?? 0,
  );
  const fiveMinutePoints: FiveMinuteDemandPoint[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    const hourlyTotal = hourlyTotals[hour]!;
    const slotDemand = hourlyTotal / DEMAND_SLOTS_PER_HOUR;

    for (let slot = 0; slot < DEMAND_SLOTS_PER_HOUR; slot += 1) {
      fiveMinutePoints.push({
        minuteOfDay: hour * 60 + slot * DEMAND_SLOT_MINUTES,
        hour,
        slot,
        demand: slotDemand,
        visualUnits: demandVisualUnitCount(slotDemand),
      });
    }
  }

  return fiveMinutePoints;
}

function demandSlotLabel(point: FiveMinuteDemandPoint | null) {
  if (!point) {
    return "-";
  }
  const start = point.minuteOfDay;
  const end = normalizeDayMinutes(start + DEMAND_SLOT_MINUTES);
  return `${format24Hour(start)}-${format24Hour(end)}`;
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
      populationPred: null,
      demandPred: 0,
      trendDemandPred: 0,
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

function scoreDemandAtHour(points: HourlyDemandPoint[], minutes: number) {
  if (!points.length) {
    return null;
  }
  const hour = Math.floor(normalizeDayMinutes(minutes) / 60);
  const point =
    points.find((candidate) => candidate.hour === hour) ?? points[0] ?? null;
  const maxDemand = Math.max(0, ...points.map((candidate) => candidate.demandPred));
  if (!point || maxDemand <= 0) {
    return null;
  }
  return clamp01(point.demandPred / maxDemand);
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

function demandFillForScore(score: number | null, isSelected = false) {
  if (score === null) {
    return isSelected ? "rgba(148, 163, 184, 0.4)" : "rgba(148, 163, 184, 0.16)";
  }
  if (score >= 0.85) return "rgba(244, 63, 94, 0.75)";
  if (score >= 0.55) return "rgba(251, 146, 60, 0.65)";
  if (score >= 0.25) return "rgba(253, 224, 71, 0.55)";
  if (score >= 0.04) return "rgba(94, 234, 212, 0.35)";
  return "rgba(148, 163, 184, 0.20)";
}

function demandStrokeForScore(score: number | null, isSelected = false) {
  if (isSelected) return "rgba(255, 255, 255, 0.95)";
  if (score === null) return "rgba(148, 163, 184, 0.42)";
  if (score >= 0.85) return "rgba(244, 63, 94, 0.95)";
  if (score >= 0.55) return "rgba(251, 146, 60, 0.90)";
  if (score >= 0.25) return "rgba(253, 224, 71, 0.80)";
  if (score >= 0.04) return "rgba(94, 234, 212, 0.66)";
  return "rgba(148, 163, 184, 0.44)";
}

function compactPoiLabel(name: string) {
  const normalized = name.replace(/\s+/g, " ").trim();
  return normalized.length > 8 ? normalized.slice(0, 8) : normalized;
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
  const selectedPoiCode = uiStore.useStore((state) => state.selectedPoiCode);
  const isSidebarCollapsed = uiStore.useStore(
    (state) => state.isSidebarCollapsed,
  );
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
    useState<DemandFetchStatus>("idle");
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [pitchControlValue, setPitchControlValue] = useState(
    DEFAULT_CAMERA_PITCH_CONTROL_VALUE,
  );
  const [yawControlValue, setYawControlValue] = useState(
    DEFAULT_CAMERA_YAW_CONTROL_VALUE,
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
    setStats,
  } = sceneSetters;
  const {
    setSelectedPoiCode,
    setIsSidebarCollapsed,
    setIsScenarioControlsExpanded,
  } = uiSetters;
  const showLabels = false;
  const showNonRoad = false;
  const showTransit = true;
  const showRoadNetwork = false;
  const fpsMode: FpsMode = "fixed60";
  const normalizedSimulationTimeMinutes = normalizeDayMinutes(
    simulationTimeMinutes,
  );
  const hourlyDemandSeries = useMemo(
    () => remoteDemandPoints ?? [],
    [remoteDemandPoints],
  );
  const hasDemandData = hourlyDemandSeries.length > 0;
  const fiveMinuteDemandSeries = useMemo(
    () => buildFiveMinuteDemandSeries(hourlyDemandSeries),
    [hourlyDemandSeries],
  );
  const currentDemandSlot = useMemo(() => {
    if (!fiveMinuteDemandSeries.length) {
      return null;
    }
    const slotIndex = Math.min(
      fiveMinuteDemandSeries.length - 1,
      Math.floor(normalizedSimulationTimeMinutes / DEMAND_SLOT_MINUTES),
    );
    return fiveMinuteDemandSeries[slotIndex] ?? null;
  }, [fiveMinuteDemandSeries, normalizedSimulationTimeMinutes]);
  const currentDemandVisualUnits = currentDemandSlot?.visualUnits ?? 0;
  const currentFiveMinuteDemand = currentDemandSlot?.demand ?? 0;
  const appliedTaxiCount = hasDemandData
    ? currentDemandVisualUnits
    : DEFAULT_TAXI_COUNT;
  const appliedTrafficCount = 0;
  const appliedTaxiCountRef = useSyncRef(appliedTaxiCount);
  const appliedTrafficCountRef = useSyncRef(appliedTrafficCount);
  const simulationDateRef = useSyncRef(simulationDate);
  const simulationTimeRef = useSyncRef(simulationTimeMinutes);
  const weatherModeRef = useSyncRef<WeatherMode>(weatherMode);
  const cameraModeRef = useSyncRef<CameraMode>(cameraMode);
  const followTaxiIdRef = useSyncRef(followTaxiId);
  const rideExitModeRef = useRef<BaseCameraMode>("drive");
  const cameraPitchControlRef = useRef<CameraPitchControlState>({
    value: DEFAULT_CAMERA_PITCH_CONTROL_VALUE,
    version: 0,
  });
  const cameraYawControlRef = useRef<CameraYawControlState>({
    value: DEFAULT_CAMERA_YAW_CONTROL_VALUE,
    version: 0,
  });
  const showLabelsRef = useSyncRef(showLabels);
  const optionalLabelObjectsRef = useRef<CSS2DObject[]>([]);
  const showTransitRef = useSyncRef(showTransit);
  const transitGroupRef = useRef<THREE.Group | null>(null);
  const hoverRefreshRequestRef = useRef(0);
  const labelRefreshRequestRef = useRef(0);
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
      pitchControlValue,
      yawControlValue,
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
  }, [
    activePoiCode,
    cameraMode,
    mapPoiFeatureRows,
    miniMapFocus,
    pitchControlValue,
    yawControlValue,
    poiSpatialIndex,
  ]);
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
    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const syncMobileLayout = () => setIsMobileLayout(mediaQuery.matches);
    syncMobileLayout();
    mediaQuery.addEventListener("change", syncMobileLayout);
    return () => {
      mediaQuery.removeEventListener("change", syncMobileLayout);
    };
  }, []);

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
  const selectedDemandHour = Math.floor(normalizedSimulationTimeMinutes / 60);

  useEffect(() => {
    if (!DEMAND_API_ENDPOINT) {
      return;
    }

    const controller = new AbortController();
    const url = new URL(DEMAND_API_ENDPOINT, window.location.origin);
    url.searchParams.set("dong", selectedDongName);
    url.searchParams.set("date", simulationDate);
    url.searchParams.set("hour", String(selectedDemandHour));
    url.searchParams.set("timezone", "Asia/Seoul");
    url.searchParams.set("weekday", selectedWeekday);
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setRemoteDemandPoints(null);
        setDemandFetchStatus("loading");
      }
    });

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
  }, [
    selectedDemandHour,
    selectedDongName,
    selectedWeekday,
    simulationDate,
  ]);

  const demandChart = useMemo(
    () => buildDemandChartGeometry(hourlyDemandSeries),
    [hourlyDemandSeries],
  );
  const selectedAverageDemand = averageDemand(hourlyDemandSeries);
  const selectedPeakDemand = demandChart.peakPoint;
  const selectedDemandScore = useMemo(
    () => scoreDemandAtHour(hourlyDemandSeries, normalizedSimulationTimeMinutes),
    [hourlyDemandSeries, normalizedSimulationTimeMinutes],
  );
  const selectedDemandIntensityLabel =
    selectedDemandScore === null
      ? "-"
      : `${Math.round(selectedDemandScore * 100).toLocaleString("ko-KR")}%`;
  const selectedDemandDongRef = useSyncRef(selectedDongName);
  const hasDemandDataRef = useSyncRef(hasDemandData);
  const selectedDemandScoreRef = useSyncRef(selectedDemandScore);
  const dongDemandScores = useMemo(() => {
    const scores: Record<string, number> = {};
    if (!data?.dongRegions) return scores;
    const hour = Math.floor(normalizedSimulationTimeMinutes / 60);
    // [Mock] 백엔드 API 연동 전까지 화면의 히트맵 시각화를 테스트하기 위한 가상의 점수입니다.
    // 프론트엔드 자체적인 통계/예측 연산이 아님을 백엔드 팀에 명시합니다.
    data.dongRegions.forEach((dong, i) => {
      if (dong.name === selectedDongName) {
        scores[dong.name] = selectedDemandScore ?? 0;
      } else {
        scores[dong.name] = (Math.sin(hour * 0.5 + i) + 1) / 2;
      }
    });
    return scores;
  }, [data, normalizedSimulationTimeMinutes, selectedDongName, selectedDemandScore]);
  const dongDemandScoresRef = useSyncRef(dongDemandScores);

  const currentFiveMinuteDemandRef = useSyncRef(currentFiveMinuteDemand);
  const currentDemandVisualUnitsRef = useSyncRef(currentDemandVisualUnits);
  const demandFetchBadgeText =
    demandFetchStatus === "ready"
      ? "백엔드"
      : demandFetchStatus === "loading"
        ? "요청 중"
        : demandFetchStatus === "error"
          ? "연결 실패"
          : "API 필요";
  const demandFetchBadgeClass =
    demandFetchStatus === "ready"
      ? "border-sky-300/25 bg-sky-300/[0.08] text-sky-100"
      : demandFetchStatus === "loading"
        ? "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100"
        : demandFetchStatus === "error"
          ? "border-rose-300/25 bg-rose-300/[0.08] text-rose-100"
          : "border-slate-500/30 bg-slate-500/[0.08] text-slate-300";
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
          score: dongDemandScores[dong.name] ?? null,
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
    mapPoiFeatureRows,
    miniMapFocus,
    scenarioMapCenter,
    activePoiCode,
    selectedDongName,
    dongDemandScores,
  ]);
  const handlePoiSelect = useCallback((poiCode: string) => {
    const poi = mapPoiFeatureRows.find((row) => row.poi_code === poiCode);
    setSelectedPoiCode(poiCode);
    if (isMobileLayout) {
      setIsScenarioControlsExpanded(false);
    }
    setIsSidebarCollapsed(false);
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
    isMobileLayout,
    mapPoiFeatureRows,
    setCameraMode,
    setIsSidebarCollapsed,
    setIsScenarioControlsExpanded,
    setSelectedPoiCode,
  ]);
  const handleCameraFocusChange = useCallback((focus: MiniMapFocus) => {
    const nextPitchValue = Math.round(focus.pitchControlValue);
    const nextYawValue = Math.round(focus.yawControlValue);
    cameraPitchControlRef.current.value = nextPitchValue;
    cameraYawControlRef.current.value = nextYawValue;
    setPitchControlValue((current) =>
      Math.abs(current - nextPitchValue) < 1 ? current : nextPitchValue,
    );
    setYawControlValue((current) =>
      Math.abs(current - nextYawValue) < 1 ? current : nextYawValue,
    );
    setMiniMapFocus(focus);
  }, [setMiniMapFocus]);
  const formattedSimulationTime = format24Hour(normalizedSimulationTimeMinutes);
  const formattedSimulationDate = formatDateLabel(simulationDate);
  const isSidebarVisible = !isSidebarCollapsed;
  const mapCanvasClass = isSidebarVisible
    ? "h-full w-full border-r border-white/10 lg:w-[62vw] xl:w-[calc(100%-500px)]"
    : "h-full w-full";
  const floatingControlOffsetClass = isSidebarVisible
    ? "lg:right-[calc(min(38vw,500px)+1rem)]"
    : "lg:right-4";

  useEffect(() => {
    if (isSidebarVisible && isScenarioControlsExpanded) {
      setIsScenarioControlsExpanded(false);
    }
  }, [
    isScenarioControlsExpanded,
    isSidebarVisible,
    setIsScenarioControlsExpanded,
  ]);

  function toggleScenarioControls() {
    setIsScenarioControlsExpanded((current) => {
      const next = !current;
      if (next) {
        setIsSidebarCollapsed(true);
      }
      return next;
    });
  }

  function handlePitchControlChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = THREE.MathUtils.clamp(Number(event.target.value), 0, 100);
    cameraPitchControlRef.current = {
      value: nextValue,
      version: cameraPitchControlRef.current.version + 1,
    };
    setPitchControlValue(nextValue);
  }

  function handleYawControlChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = THREE.MathUtils.clamp(Number(event.target.value), 0, 359);
    cameraYawControlRef.current = {
      value: nextValue,
      version: cameraYawControlRef.current.version + 1,
    };
    setYawControlValue(nextValue);
  }

  function toggleSidebar() {
    if (isSidebarVisible) {
      setIsSidebarCollapsed(true);
      return;
    }
    setIsScenarioControlsExpanded(false);
    setIsSidebarCollapsed(false);
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#060d16]">
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
            onDongSelect={setSelectedDongName}
            simulationSource={simulationSource}
            appliedTaxiCountRef={appliedTaxiCountRef}
            appliedTrafficCountRef={appliedTrafficCountRef}
            selectedDemandDongRef={selectedDemandDongRef}
            hasDemandDataRef={hasDemandDataRef}
            selectedDemandScoreRef={selectedDemandScoreRef}
            dongDemandScoresRef={dongDemandScoresRef}
            currentFiveMinuteDemandRef={currentFiveMinuteDemandRef}
            currentDemandVisualUnitsRef={currentDemandVisualUnitsRef}
            cameraModeRef={cameraModeRef}
            followTaxiIdRef={followTaxiIdRef}
            rideExitModeRef={rideExitModeRef}
            showLabelsRef={showLabelsRef}
            optionalLabelObjectsRef={optionalLabelObjectsRef}
            showTransitRef={showTransitRef}
            transitGroupRef={transitGroupRef}
            hoverRefreshRequestRef={hoverRefreshRequestRef}
            labelRefreshRequestRef={labelRefreshRequestRef}
            fpsModeRef={fpsModeRef}
            showNonRoadRef={showNonRoadRef}
            nonRoadGroupRef={nonRoadGroupRef}
            showRoadNetworkRef={showRoadNetworkRef}
            roadNetworkGroupRef={roadNetworkGroupRef}
            cameraFocusTargetRef={cameraFocusTargetRef}
            simulationDateRef={simulationDateRef}
            simulationTimeRef={simulationTimeRef}
            weatherModeRef={weatherModeRef}
            cameraPitchControlRef={cameraPitchControlRef}
            cameraYawControlRef={cameraYawControlRef}
            setStatus={setStatus}
            setStatusDetail={setStatusDetail}
            setLoadingProgress={setLoadingProgress}
            setStats={setStats}
            setFollowTaxiId={setFollowTaxiId}
            setCameraMode={setCameraMode}
            onCameraFocusChange={handleCameraFocusChange}
          />
        </MapSimulatorErrorBoundary>

        <MapSearchControl
          isSidebarVisible={isSidebarVisible}
          isScenarioControlsExpanded={isScenarioControlsExpanded}
          toggleScenarioControls={toggleScenarioControls}
          formattedSimulationTime={formattedSimulationTime}
          formattedSimulationDate={formattedSimulationDate}
          hasDemandData={hasDemandData}
          appliedTaxiCount={appliedTaxiCount}
          selectedWeather={selectedWeather}
          toggleSidebar={toggleSidebar}
          simulationDate={simulationDate}
          setCircumstanceMode={setCircumstanceMode}
          setSimulationDate={setSimulationDate}
          setSimulationTimeMinutes={setSimulationTimeMinutes}
          weatherMode={weatherMode}
          setWeatherMode={setWeatherMode}
        />

        {!isSceneBusy ? (
          <MapFooter
            isSidebarVisible={isSidebarVisible}
            demandFetchBadgeText={demandFetchBadgeText}
            demandVisualUnitCalls={DEMAND_VISUAL_UNIT_CALLS}
            buildVersion={buildVersion}
          />
        ) : null}

        {isSceneBusy ? (
          <SceneLoading
            statusLabel={statusLabel}
            loadingProgress={loadingProgress}
            statusDetail={statusDetail}
            loadingHint={loadingHint}
            buildVersion={buildVersion}
          />
        ) : null}

        {!isSceneBusy && cameraMode !== "ride" ? (
          <CameraOrbitControls
            isSidebarVisible={isSidebarVisible}
            floatingControlOffsetClass={floatingControlOffsetClass}
            pitchControlValue={pitchControlValue}
            handlePitchControlChange={handlePitchControlChange}
            yawControlValue={yawControlValue}
            handleYawControlChange={handleYawControlChange}
          />
        ) : null}

        {isSidebarVisible ? (
          <button
            type="button"
            aria-label="정보 패널 닫기"
            onClick={toggleSidebar}
            className="absolute inset-0 z-10 bg-slate-950/56 lg:hidden"
          />
        ) : null}

        {isSidebarVisible ? (
          <div
            data-ui-panel="right-sidebar"
            className="absolute bottom-0 left-0 right-0 z-20 max-h-[min(68vh,calc(100vh-4rem))] overflow-y-auto rounded-t-[1.75rem] border-t border-white/14 bg-slate-950/98 p-4 text-white shadow-2xl backdrop-blur-md sm:max-h-[min(72vh,calc(100vh-4rem))] lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:max-h-none lg:w-[38vw] lg:min-w-[400px] lg:max-w-[500px] lg:rounded-none lg:border-l lg:border-t-0 lg:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className={PANEL_EYEBROW_CLASS}>수요 예측</p>
                <h2 className="mt-1 text-xl font-semibold leading-tight text-slate-50">
                  동별 수요와 지도 축척
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {selectedDongName} · {weekdayLabel(selectedWeekday)}요일 · 0-23시
                </p>
              </div>
              <span
                className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${demandFetchBadgeClass}`}
              >
                {demandFetchBadgeText}
              </span>
            </div>

            <div
              className={`mt-4 ${PANEL_CARD_CLASS} p-4`}
              data-ui-panel="hourly-demand-api-series"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-100">
                    <LineChart className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className={PANEL_SECTION_LABEL_CLASS}>수요 곡선</div>
                    <div className="mt-0.5 truncate text-sm font-semibold text-slate-100">
                      백엔드 1시간 실제 수요량
                    </div>
                  </div>
                </div>
                <span className="inline-flex whitespace-nowrap rounded-full border border-white/12 bg-white/[0.08] px-2 py-0.5 text-[10px] text-slate-300">
                  1H / 12
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  동
                  <select
                    value={selectedDongName}
                    onChange={(event) => setSelectedDongName(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/12 bg-slate-900/88 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
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
                    className="mt-1 w-full rounded-xl border border-white/12 bg-slate-900/88 px-2.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400/40"
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

              <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/12 bg-white/[0.08] text-center">
                <div className="px-2 py-2">
                  <div className="text-[10px] text-slate-500">피크</div>
                  <div className="mt-1 font-semibold tabular-nums text-slate-100">
                    {hasDemandData ? `${selectedPeakDemand.hour}시` : "-"}
                  </div>
                </div>
                <div className="px-2 py-2">
                  <div className="text-[10px] text-slate-500">1H 수요</div>
                  <div className="mt-1 font-semibold tabular-nums text-rose-100">
                    {hasDemandData
                      ? selectedPeakDemand.demandPred.toLocaleString("ko-KR")
                      : "-"}
                  </div>
                </div>
                <div className="px-2 py-2">
                  <div className="text-[10px] text-slate-500">현재 강도</div>
                  <div className="mt-1 font-semibold tabular-nums text-cyan-100">
                    {selectedDemandIntensityLabel}
                  </div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-center">
                <div className="px-2 py-2">
                  <div className="text-[10px] text-slate-500">현재 슬롯</div>
                  <div className="mt-1 text-[11px] font-semibold tabular-nums text-slate-100">
                    {demandSlotLabel(currentDemandSlot)}
                  </div>
                </div>
                <div className="px-2 py-2">
                  <div className="text-[10px] text-slate-500">5분 수요</div>
                  <div className="mt-1 font-semibold tabular-nums text-cyan-100">
                    {hasDemandData
                      ? Math.round(currentFiveMinuteDemand).toLocaleString("ko-KR")
                      : "-"}
                  </div>
                </div>
                <div className="px-2 py-2">
                  <div className="text-[10px] text-slate-500">지도 차량</div>
                  <div className="mt-1 font-semibold tabular-nums text-amber-100">
                    {hasDemandData ? `${appliedTaxiCount}대` : "-"}
                  </div>
                </div>
              </div>
              <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] leading-4 text-slate-400">
                5분 값은 백엔드 1시간 수요를 12등분한 표시값이며, 지도 차량 1대는 약 실제 호출 {DEMAND_VISUAL_UNIT_CALLS.toLocaleString("ko-KR")}건 기준입니다. 지도는 선택 동의 도로 회랑과 수요 앵커를 함께 강조합니다.
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#07111c]">
                {hasDemandData ? (
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
                ) : (
                  <div className="flex h-[164px] items-center justify-center px-5 text-center text-xs leading-5 text-slate-500">
                    백엔드 수요 API가 연결되면 선택한 동의 0-23시 그래프가 표시됩니다.
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-4 rounded-full bg-cyan-300" />
                    1시간 수요
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0 w-4 border-t border-dashed border-rose-300" />
                    추세
                  </span>
                </div>
                <span className="tabular-nums">
                  {hasDemandData
                    ? `평균 ${selectedAverageDemand.toLocaleString("ko-KR")}`
                    : "백엔드 응답 대기"}
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
                    aria-label="역삼동 주변 9개 동 수요 표시 지도"
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
                          fill={demandFillForScore(region.score, region.isSelected)}
                          stroke={demandStrokeForScore(region.score, region.isSelected)}
                          strokeWidth={
                            region.isSelected
                              ? 1.25
                              : region.score !== null && region.score >= 0.55
                                ? 0.7
                                : 0.42
                          }
                        />
                        <title>
                          {region.score === null
                            ? `${region.name} 수요 데이터 없음`
                            : `${region.name} 수요 ${Math.round(region.score * 100)}`}
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
                          fill={region.isSelected ? "#f8fafc" : "#dbeafe"}
                          fontSize={region.isSelected ? 3.6 : 3.2}
                          fontWeight={region.isSelected ? 700 : 600}
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
