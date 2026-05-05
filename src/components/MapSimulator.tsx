"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Gauge,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Navigation,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";
import {
  HYDRATION_SAFE_SIMULATION_CLOCK,
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
import type { LiveArea } from "@/components/map-simulator/use-live-data";
import {
  conditionDemandForecast,
  DEMAND_FORECAST_SNAPSHOTS,
  type DemandForecastDong,
} from "@/components/map-simulator/demand-forecast";
import { useForecastResult } from "@/components/map-simulator/use-forecast-result";
import type { ForecastSource } from "@/components/map-simulator/forecast-contract";
import {
  useDispatchPlan,
  type DispatchDecision,
} from "@/components/map-simulator/use-dispatch-plan";
import {
  BaseCameraMode,
  CameraFocusTarget,
  CameraMode,
  CircumstanceMode,
  DEFAULT_TAXI_COUNT,
  DEFAULT_TRAFFIC_COUNT,
  FpsMode,
  FpsStats,
  PANEL_ACCENT_CARD_CLASS,
  PANEL_CARD_CLASS,
  PANEL_EYEBROW_CLASS,
  PANEL_SECTION_LABEL_CLASS,
  PANEL_TOKEN_CLASS,
  SceneStatus,
  SimulationData,
  Stats,
  panelBadgeClass,
  panelSelectableClass,
  projectPoint,
} from "@/components/map-simulator/core";
type MapSimulatorProps = {
  buildVersion: BuildVersionInfo;
};

const MAP_SCOPE_LABEL = "역삼동 주변 9개 동";
const MAP_SCOPE_DONGS = "역삼1·2, 논현1·2, 삼성1·2, 신사, 청담, 대치4";
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

type MiniMapFocus = {
  x: number;
  z: number;
  label: string;
  headingX: number;
  headingZ: number;
};

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
    reasons.push("기저 수요");
  }
  return reasons.slice(0, 2);
}

function forecastTargetTime(minutes: number, offsetMinutes: number) {
  return format24Hour(normalizeDayMinutes(minutes + offsetMinutes));
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

function formatLiveObservedAt(value: string) {
  if (!value) {
    return "관측 시간 미제공";
  }
  if (value.includes("T")) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      const parts = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(parsed);
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value ?? "";
      return `${part("year")}.${part("month")}.${part("day")} ${part("hour")}:${part("minute")}`;
    }
  }
  const normalized = value.replace("T", " ");
  if (normalized.length >= 16) {
    return normalized.slice(0, 16);
  }
  return normalized;
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
  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return [
    partMap.get("year"),
    partMap.get("month"),
    partMap.get("day"),
  ].join("-") + ` ${partMap.get("hour")}:${partMap.get("minute")}`;
}

function forecastStrategyLabel(strategy: string | null | undefined) {
  if (strategy === "pattern") return "패턴 추정";
  if (strategy === "exact") return "관측 feature";
  return strategy ? strategy : "모델";
}

function scoreText(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(3) : "-";
}

function dispatchUnits(decision: DispatchDecision) {
  return decision.coverage_units ?? decision.recommended_taxis ?? 0;
}

function monitoringActionLabel(action: string | null | undefined, level?: string | null) {
  if (action === "선제 이동" || level === "high") return "수요 집중 매우 높음";
  if (action === "커버 보강" || level === "medium") return "수요 집중 높음";
  if (action === "관찰" || level === "watch") return "주의 관찰";
  if (action === "유지" || level === "low") return "안정";
  return action ?? "-";
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

export default function MapSimulator({ buildVersion }: MapSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationSource = useMemo(() => createLocalSimulationSource(), []);
  const [data, setData] = useState<SimulationData | null>(null);
  const [status, setStatus] = useState<SceneStatus>("loading");
  const [statusDetail, setStatusDetail] = useState(
    "OSM 지도 데이터 불러오는 중",
  );
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLabels] = useState(false);
  const [showNonRoad] = useState(false);
  const [showTransit] = useState(true);
  const showRoadNetwork = false;
  const [forecastOffsetMinutes, setForecastOffsetMinutes] = useState(15);
  const [circumstanceMode, setCircumstanceMode] =
    useState<CircumstanceMode>("live");
  const [simulationDate, setSimulationDate] = useState(
    () => HYDRATION_SAFE_SIMULATION_CLOCK.dateIso,
  );
  const [simulationTimeMinutes, setSimulationTimeMinutes] = useState(
    () => HYDRATION_SAFE_SIMULATION_CLOCK.minutes,
  );
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("clear");
  const [cameraMode, setCameraMode] = useState<CameraMode>("drive");
  const [miniMapFocus, setMiniMapFocus] = useState<MiniMapFocus | null>(null);
  const [followTaxiId, setFollowTaxiId] = useState("");
  const [showFps, setShowFps] = useState(false);
  const [fpsMode] = useState<FpsMode>("fixed60");
  const [fpsStats, setFpsStats] = useState<FpsStats>({
    fps: 60,
    capLabel: "60 FPS",
    simulationMs: 0,
    signalMs: 0,
    vehicleMs: 0,
    overlayMs: 0,
    renderMs: 0,
    simulationHz: 0,
    vehicles: 0,
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMapFocusMode, setIsMapFocusMode] = useState(false);
  const appliedTaxiCount = DEFAULT_TAXI_COUNT;
  const appliedTrafficCount = DEFAULT_TRAFFIC_COUNT;
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
  const [, setStats] = useState<Stats>({
    taxis: DEFAULT_TAXI_COUNT,
    traffic: DEFAULT_TRAFFIC_COUNT,
    waiting: 0,
    signals: 0,
    activeTrips: 0,
    completedTrips: 0,
    pedestrians: 0,
    pickups: 0,
    dropoffs: 0,
    activeCalls: 0,
    avgPickupWaitSeconds: 0,
    avgRideSeconds: 0,
  });

  const { liveData, status: liveDataStatus } = useLiveData();

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
  }, [circumstanceMode, liveData]);

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

  function markSceneRendering(detail: string) {
    setStatus("rendering");
    setStatusDetail(detail);
  }

  function markSceneError(detail: string) {
    setStatus("error");
    setStatusDetail(detail);
  }

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
  }, [circumstanceMode]);

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
            setData(nextData);
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
  }, []);

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
  const selectedForecast =
    DEMAND_FORECAST_SNAPSHOTS.find(
      (snapshot) => snapshot.offsetMinutes === forecastOffsetMinutes,
    ) ?? DEMAND_FORECAST_SNAPSHOTS[0];
  const forecastTargetMinutes = normalizeDayMinutes(
    normalizedSimulationTimeMinutes + selectedForecast.offsetMinutes,
  );
  const forecastTargetLabel = format24Hour(forecastTargetMinutes);
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
  const dispatchPlan = useDispatchPlan();
  const forecastSource: ForecastSource =
    forecastResult?.regions?.length ? "model" : "sample";
  const forecastResultLabel =
    forecastResult?.source === "demo" ? "데모 예측" : "모델 예측";
  const forecastStrategyText = forecastStrategyLabel(
    forecastResult?.strategy ?? dispatchPlan?.forecast_strategy,
  );
  const forecastAverageConfidence =
    forecastResult?.regions?.length
      ? forecastResult.regions.reduce(
        (sum, region) => sum + region.confidence,
        0,
      ) / forecastResult.regions.length
      : null;
  const isForecastLowConfidence =
    forecastAverageConfidence != null && forecastAverageConfidence < 0.6;
  const forecastBadgeText =
    forecastSource === "model"
      ? [
        forecastResultLabel,
        forecastStrategyText,
        isForecastLowConfidence ? "신뢰도 낮음" : null,
      ].filter(Boolean).join(" · ")
      : "샘플 예측";
  const forecastResultBadgeClass =
    forecastResult?.source === "demo"
      ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  const forecastResultTextClass =
    forecastResult?.source === "demo"
      ? "text-amber-300/85"
      : "text-emerald-400/80";
  const forecastSourceTokenClass =
    forecastSource === "model"
      ? `${PANEL_TOKEN_CLASS} border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200`
      : `${PANEL_TOKEN_CLASS} border-amber-300/25 bg-amber-300/[0.08] text-amber-200`;
  const forecastSourceTokenText =
    forecastSource === "model" && forecastResult
      ? `모델 예측 · ${formatKstFullDateTime(forecastResult.target_datetime)}`
      : "데모 데이터";
  const sortedDispatchDecisions = useMemo(
    () =>
      [...(dispatchPlan?.decisions ?? [])].sort(
        (left, right) => right.imbalance_score - left.imbalance_score,
      ),
    [dispatchPlan],
  );
  const dispatchByDong = useMemo(
    () =>
      new Map(
        sortedDispatchDecisions.map(
          (decision) => [decision.dong_name, decision] as const,
        ),
      ),
    [sortedDispatchDecisions],
  );

  // effectiveDongs is what the heatmap actually renders.
  // In model mode the scores come from latest.json; in sample mode from the
  // conditioned snapshot.
  type EffectiveDong = DemandForecastDong & {
    confidence?: number;
    source: ForecastSource;
  };
  const effectiveDongs = useMemo((): EffectiveDong[] => {
    if (forecastSource === "model" && forecastResult) {
      return forecastResult.regions.map((r) => ({
        dongName: r.dong_name,
        relativeScore: r.score,
        contextPrior: 0,
        publicTransitSignal: 0,
        contextMultiplier: 1,
        confidence: r.confidence,
        source: "model" as const,
      }));
    }
    return conditionedForecastDongs.map((d) => ({ ...d, source: "sample" as const }));
  }, [forecastSource, forecastResult, conditionedForecastDongs]);

  const demandByDong = useMemo(
    () =>
      new Map(
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
      focus,
      focusHeading,
      focusLabel: miniMapFocus?.label ?? "현재 지도 중심",
    };
  }, [
    data,
    demandByDong,
    dispatchByDong,
    miniMapFocus,
    scenarioMapCenter,
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
          : "실시간 연결"
        : liveDataStatus === "loading"
          ? "연결 중"
          : liveDataStatus === "error"
            ? "연결 실패"
            : "대기";
  const isLiveFresh =
    Boolean(primaryLiveArea && liveData && !liveData.isStale && liveDataStatus !== "error");
  const liveObservedAt = primaryLiveArea?.observedAt
    || liveData?.weather.observedAt
    || liveData?.fetchedAt
    || "";
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
      } else {
        setIsSidebarCollapsed(false);
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
    <section className="relative h-screen w-full overflow-hidden bg-[#060d16]">
      <div
        ref={containerRef}
        className={mapCanvasClass}
      />
      <MapSimulatorSceneRuntime
        containerRef={containerRef}
        data={data}
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
                  Scene Loading
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
              배포 환경에서는 첫 접속이나 새로고침 직후 정적 자산과 3D 초기화 때문에
              몇 초 더 걸릴 수 있습니다.
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
          aria-label={cameraMode === "overview" ? "주행 카메라" : "조감 카메라"}
          aria-pressed={cameraMode === "overview"}
          title={cameraMode === "overview" ? "주행 카메라" : "조감 카메라"}
          onClick={toggleOverviewCamera}
          className={mapToolButtonClass(cameraMode === "overview")}
        >
          {cameraMode === "overview" ? (
            <Navigation className="h-4 w-4" aria-hidden="true" />
          ) : (
            <MapIcon className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{cameraMode === "overview" ? "주행" : "조감"}</span>
        </button>
        <button
          type="button"
          data-ui-control="sidebar-toggle"
          aria-label={isSidebarVisible ? "분석 패널 접기" : "분석 패널 열기"}
          aria-pressed={!isSidebarVisible}
          title={isSidebarVisible ? "분석 패널 접기" : "분석 패널 열기"}
          onClick={toggleSidebar}
          className={mapToolButtonClass(!isSidebarVisible)}
        >
          {isSidebarVisible ? (
            <PanelRightClose className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{isSidebarVisible ? "접기" : "패널"}</span>
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
              <div className="text-slate-500">시뮬</div>
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
            <span className="text-slate-500">simulation Hz</span>
            <span className="font-semibold tabular-nums text-slate-100">
              {fpsStats.simulationHz}
            </span>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 z-10 hidden rounded-2xl border border-white/10 bg-slate-950/78 px-4 py-3 text-xs text-slate-300 shadow-xl backdrop-blur-md lg:block">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-cyan-100">지도 범위</span>
          <span className="text-slate-500">{MAP_SCOPE_LABEL}</span>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-0.5 text-[10px] text-cyan-200">
            OSM 기반
          </span>
        </div>
      </div>

      <div
        data-ui-panel="desktop-simulation-clock"
        className={`absolute left-3 top-3 z-10 w-[min(calc(100vw-1.5rem),320px)] rounded-2xl border border-white/10 bg-slate-950/84 p-3 text-white shadow-2xl backdrop-blur-md lg:left-4 lg:top-4 lg:w-[320px] lg:p-4 ${isMapFocusMode ? "lg:hidden" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={PANEL_EYEBROW_CLASS}>지도 기준</p>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-50">
              {formattedSimulationTime}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {formattedSimulationDate} · {simulationTimeBand}
            </div>
            <div className="mt-1 text-[11px] text-cyan-100/80">
              {MAP_SCOPE_LABEL}
            </div>
          </div>
          <span className={panelBadgeClass(circumstanceMode === "live")}>
            {circumstanceMode === "live" ? "Live" : "고정"}
          </span>
        </div>

        <div className="mt-3 flex items-center">
          <span className={`${forecastSourceTokenClass} text-[11px] font-medium`}>
            {forecastSourceTokenText}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
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

        <div className="mt-3 grid grid-cols-2 gap-2">
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
              aria-label="heatmap 기준 날짜"
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
              aria-label="heatmap 기준 시간"
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
            aria-label="heatmap 날씨 조건"
          >
            {WEATHER_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2 text-xs leading-5 text-slate-300">
          {forecastSource === "model" ? (
            <>
              <span className={forecastResultTextClass}>
                {forecastResultLabel}
              </span> ·{" "}
              {forecastStrategyText} ·{" "}
              {formatKstClock(forecastResult?.target_datetime)} 기준 ·{" "}
              {forecastResult?.weather}
              {isForecastLowConfidence ? " · 신뢰도 낮음" : ""}
            </>
          ) : (
            <>
              Heatmap 조건: {formattedSimulationDate} {forecastTargetLabel} ·{" "}
              {selectedForecast.label} · {selectedWeather.label}
            </>
          )}
        </div>
      </div>

      {isSidebarVisible ? (
        <div
          data-ui-panel="right-sidebar"
          className="absolute bottom-0 left-0 right-0 z-10 max-h-[64vh] overflow-y-auto border-t border-white/10 bg-slate-950/92 p-4 text-white shadow-2xl backdrop-blur-md lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:max-h-none lg:w-[38vw] lg:min-w-[400px] lg:max-w-[500px] lg:border-l lg:border-t-0 lg:p-5"
        >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={PANEL_EYEBROW_CLASS}>수요 예측</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-slate-50">
              역삼동 주변 수요 heatmap
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {MAP_SCOPE_DONGS}
            </p>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              forecastSource === "model"
                ? forecastResultBadgeClass
                : "border-white/10 bg-white/[0.06] text-slate-400"
            }`}
          >
            {forecastBadgeText}
          </span>
        </div>

        {forecastSource === "model" && forecastResult && (
          <div className="mt-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2 text-[11px] leading-5 text-slate-400">
            <span className={forecastResultTextClass}>대상</span>{" "}
            {formatKstDateTime(forecastResult.target_datetime)} ·{" "}
            {forecastStrategyText} · {forecastResult.weather}
            {forecastAverageConfidence != null ? (
              <> · 평균 신뢰도 {Math.round(forecastAverageConfidence * 100)}%</>
            ) : null}{" "}
            <span className="text-slate-500">
              {formatKstDateTime(forecastResult.generated_at)} 생성
            </span>
          </div>
        )}

        <div className={`mt-3 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>실시간 상황</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                {primaryLiveArea?.areaName ?? "서울 citydata 확인 중"}
              </div>
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] ${
                isLiveFresh
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
              <div className="mt-3 grid grid-cols-[1.08fr_0.92fr] gap-2 text-[11px]">
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

              <div className="mt-2 text-[11px] leading-5 text-slate-500">
                서울 열린데이터광장 citydata · {liveData.snapshotLabel} · 관측{" "}
                {formatLiveObservedAt(liveObservedAt)}
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-slate-500">
              강남역·역삼역·선릉역 등 주변 실시간 생활인구, 혼잡도, 날씨를
              불러오는 중입니다.
            </div>
          )}
        </div>

        <div className={`mt-4 ${PANEL_CARD_CLASS} py-3`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>예측 시점</div>
            </div>
            <span className="text-[11px] tabular-nums text-slate-500">
              {formattedSimulationDate} {forecastTargetLabel}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {DEMAND_FORECAST_SNAPSHOTS.map((snapshot) => {
              const isSelected =
                snapshot.offsetMinutes === selectedForecast.offsetMinutes;
              return (
                <button
                  key={snapshot.offsetMinutes}
                  type="button"
                  onClick={() => setForecastOffsetMinutes(snapshot.offsetMinutes)}
                  className={`rounded-2xl border px-2 py-2 text-left text-xs transition ${panelSelectableClass(
                    isSelected,
                  )}`}
                >
                  <div className="font-semibold">{snapshot.label}</div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {forecastTargetTime(
                      normalizedSimulationTimeMinutes,
                      snapshot.offsetMinutes,
                    )}
                  </div>
                </button>
              );
            })}
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
                aria-label="역삼동 주변 9개 동 미래 수요 heatmap"
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
                      {region.name} 수요 {Math.round(region.score * 100)}
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

          <div className="mt-2 grid grid-cols-5 gap-1.5 text-[10px] text-slate-400">
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
        </div>

        <div className={`mt-3 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>Top 수요 지역</div>
            </div>
            <span className={panelBadgeClass(true)}>
              Top {topDemandScoreLabel}
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
                      {(dong as EffectiveDong).source === "model" ? (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-0.5 text-[10px] text-emerald-400/80">
                          신뢰도 {Math.round(((dong as EffectiveDong).confidence ?? 0) * 100)}%
                        </span>
                      ) : (
                        demandReasonsFor(dong).map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400"
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

        {dispatchPlan && sortedDispatchDecisions.length > 0 ? (
          <div className={`mt-3 ${PANEL_CARD_CLASS}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={PANEL_SECTION_LABEL_CLASS}>수요 관찰 우선순위</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  수요압력 우선 관찰 동
                </div>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] ${
                  dispatchPlan.forecast_strategy === "pattern"
                    ? "border-amber-300/25 bg-amber-300/[0.08] text-amber-200"
                    : "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                }`}
              >
                {forecastStrategyLabel(dispatchPlan.forecast_strategy)}
              </span>
            </div>

            <div className="mt-2 space-y-1.5">
              {sortedDispatchDecisions.slice(0, 5).map((decision, index) => (
                <div
                  key={decision.dong_name}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-slate-500">
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-slate-100">
                          {decision.dong_name}
                        </span>
                        <span className={`text-[11px] font-semibold ${dispatchActionTextClass(decision.action_level)}`}>
                          {monitoringActionLabel(decision.action, decision.action_level)}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-500">
                        수요압력 {scoreText(decision.imbalance_score)} · 접근성{" "}
                        {scoreText(decision.supply_proxy_score)} · 평균속도{" "}
                        {decision.avg_speed_kmh == null ? "-" : `${decision.avg_speed_kmh}km/h`}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${dispatchActionBadgeClass(
                        decision.action_level,
                      )}`}
                    >
                      우선순위 {dispatchUnits(decision)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 text-[11px] leading-5 text-slate-500">
              우선순위는 실제 택시 대수가 아니라 수요 score와 도로 접근성 proxy를
              결합한 관찰 단계입니다.
            </div>
          </div>
        ) : null}

        <div className={`mt-3 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>지도 출처 / 신뢰도</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                OSM 기반 디지털 트윈 프로토타입
              </div>
            </div>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-0.5 text-[10px] text-cyan-200">
              OpenStreetMap
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] leading-5">
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

          <div className="mt-3 grid grid-cols-4 gap-2">
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
            출처는 OpenStreetMap/Overpass에서 추출한 `public/*.geojson`과
            파생 도로 그래프입니다. 히트맵은 발표 가독성을 위해 분리된
            작은 행정동 조각을 단순화해 표시합니다.
          </div>
          <div className="mt-2 text-[11px] leading-5 text-slate-500">
            검증 기준점은 강남역·역삼역·선릉역·신논현역 station 노드와
            주변 주요 도로/건물의 근접 일치입니다.
          </div>
        </div>
        </div>
      ) : null}

    </section>
  );
}
