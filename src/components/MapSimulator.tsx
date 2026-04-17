"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";
import {
  HYDRATION_SAFE_SIMULATION_CLOCK,
  MINUTES_PER_DAY,
  TIME_PRESETS,
  WEATHER_OPTIONS,
  currentSimulationClock,
  daylightFactor,
  format24Hour,
  formatDateLabel,
  formatMetricDuration,
  normalizeDayMinutes,
  timeBandLabel,
  twilightFactor,
  type WeatherMode,
} from "@/components/map-simulator/simulation-environment";
import {
  LOCAL_SCENARIO_FOCUS_CENTER_BLEND,
  LOCAL_SCENARIO_FOCUS_DISTANCE,
  LOCAL_SCENARIO_FOCUS_PITCH,
  LOCAL_SCENARIO_FOCUS_YAW_OFFSET,
  SUBWAY_FOCUS_DISTANCE,
  SUBWAY_FOCUS_PITCH,
} from "@/components/map-simulator/scene-constants";
import { loadSimulationData } from "@/components/map-simulator/load-simulation-data";
import MapSimulatorSceneRuntime from "@/components/map-simulator/MapSimulatorSceneRuntime";
import { useSyncRef } from "@/components/map-simulator/use-sync-ref";
import {
  ACTIVE_DISPATCH_PLANNER_ID,
  BaseCameraMode,
  CameraFocusTarget,
  CameraMode,
  CircumstanceMode,
  DEFAULT_MAP_CENTER,
  DEFAULT_TAXI_COUNT,
  DEFAULT_TRAFFIC_COUNT,
  FpsMode,
  FpsStats,
  HoverInfo,
  LOCAL_SCENARIO_PRESETS,
  LocalScenarioPreset,
  MAX_TAXI_COUNT,
  MAX_TRAFFIC_COUNT,
  MIN_TAXI_COUNT,
  MIN_TRAFFIC_COUNT,
  PANEL_ACCENT_CARD_CLASS,
  PANEL_CARD_CLASS,
  PANEL_CARD_COMPACT_CLASS,
  PANEL_EYEBROW_CLASS,
  PANEL_INSET_CLASS,
  PANEL_INSET_PADDED_CLASS,
  PANEL_SECTION_LABEL_CLASS,
  PANEL_STATUS_TILE_CLASS,
  PANEL_TOKEN_CLASS,
  SIMULATION_ASSET_LABELS,
  SceneStatus,
  SimulationData,
  Stats,
  TransitLandmark,
  assetFileName,
  buildMajorRoadNames,
  fpsModeSummary,
  panelBadgeClass,
  panelPillToggleClass,
  panelSelectableClass,
  renderCapLabel,
  resolveDispatchPlannerPresentation,
  resolveRenderCap,
} from "@/components/map-simulator/core";
type MapSimulatorProps = {
  buildVersion: BuildVersionInfo;
};

export default function MapSimulator({ buildVersion }: MapSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SimulationData | null>(null);
  const [status, setStatus] = useState<SceneStatus>("loading");
  const [statusDetail, setStatusDetail] = useState(
    "OSM 지도 데이터 불러오는 중",
  );
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLabels, setShowLabels] = useState(false);
  const [showNonRoad, setShowNonRoad] = useState(true);
  const [showTransit, setShowTransit] = useState(false);
  const [showRoadNetwork, setShowRoadNetwork] = useState(false);
  const [circumstanceMode, setCircumstanceMode] =
    useState<CircumstanceMode>("live");
  const [simulationDate, setSimulationDate] = useState(
    () => HYDRATION_SAFE_SIMULATION_CLOCK.dateIso,
  );
  const [simulationTimeMinutes, setSimulationTimeMinutes] = useState(
    () => HYDRATION_SAFE_SIMULATION_CLOCK.minutes,
  );
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("clear");
  const [cameraMode, setCameraMode] = useState<CameraMode>("overview");
  const [followTaxiId, setFollowTaxiId] = useState("");
  const [selectedSubwayName, setSelectedSubwayName] = useState("");
  const [simulationDensity, setSimulationDensity] = useState(() => ({
    taxis: DEFAULT_TAXI_COUNT,
    traffic: DEFAULT_TRAFFIC_COUNT,
  }));
  const [showFps, setShowFps] = useState(false);
  const [fpsMode, setFpsMode] = useState<FpsMode>("fixed60");
  const [fpsStats, setFpsStats] = useState<FpsStats>({
    fps: resolveRenderCap("drive", "fixed60", null) ?? 60,
    capLabel: renderCapLabel(
      resolveRenderCap("drive", "fixed60", null),
      false,
      "fixed60",
    ),
    simulationMs: 0,
    signalMs: 0,
    vehicleMs: 0,
    overlayMs: 0,
    renderMs: 0,
    simulationHz: 0,
    vehicles: 0,
  });
  const appliedTaxiCount = simulationDensity.taxis;
  const appliedTrafficCount = simulationDensity.traffic;
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
  const [stats, setStats] = useState<Stats>({
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

  const roadNames = useMemo(
    () => buildMajorRoadNames(data?.roads ?? null),
    [data],
  );
  const dongNames = useMemo(
    () => data?.dongs.features.map((dong) => dong.properties.name) ?? [],
    [data],
  );
  const transitHighlights = useMemo(() => {
    if (!data) {
      return [] as TransitLandmark[];
    }

    return data.transitLandmarks;
  }, [data]);
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
  const transitCounts = useMemo(
    () => ({
      busStops: transitHighlights.filter(
        (feature) => feature.category === "bus_stop",
      ).length,
      subwayStations: transitHighlights.filter(
        (feature) => feature.category === "subway_station",
      ).length,
    }),
    [transitHighlights],
  );
  const dispatchPlannerId =
    data?.meta.dispatchPlannerId ?? ACTIVE_DISPATCH_PLANNER_ID;
  const dispatchPresentation = useMemo(
    () => resolveDispatchPlannerPresentation(dispatchPlannerId),
    [dispatchPlannerId],
  );
  const subwayHubs = useMemo(
    () => {
      const byName = new Map<string, TransitLandmark>();
      transitHighlights
        .filter(
          (feature) => feature.category === "subway_station" && feature.isMajor,
        )
        .forEach((feature) => {
          const name = feature.name;
          if (!name) {
            return;
          }

          const existing = byName.get(name);
          if (!existing || feature.importance > existing.importance) {
            byName.set(name, feature);
          }
        });

      return [...byName.values()]
        .sort((left, right) => right.importance - left.importance)
        .slice(0, 8);
    },
    [transitHighlights],
  );
  const handleSubwayFocus = (
    station: TransitLandmark,
    options?: {
      x?: number;
      z?: number;
      distance?: number;
      pitch?: number;
      yaw?: number;
    },
  ) => {
    const label = station.name ?? "지하철역";
    setSelectedSubwayName(label);
    setShowTransit(true);
    cameraFocusTargetRef.current = {
      x: options?.x ?? station.position.x,
      z: options?.z ?? station.position.z,
      distance: options?.distance ?? SUBWAY_FOCUS_DISTANCE,
      pitch: options?.pitch ?? SUBWAY_FOCUS_PITCH,
      label,
      yaw: options?.yaw,
    };
    if (cameraModeRef.current !== "drive") {
      cameraModeRef.current = "drive";
      setCameraMode("drive");
    }
  };
  const applyLocalScenario = (scenario: LocalScenarioPreset) => {
    const clock = currentSimulationClock();
    const scenarioCamera = scenario.camera;
    const shouldRebuildVehicleLayer =
      appliedTaxiCountRef.current !== scenario.taxis ||
      appliedTrafficCountRef.current !== scenario.traffic;
    const focusStation =
      (scenario.focusStationKeyword
        ? subwayHubs.find((station) =>
          (station.name ?? "").includes(scenario.focusStationKeyword ?? ""),
        )
        : null) ??
      subwayHubs[0] ??
      null;

    if (shouldRebuildVehicleLayer) {
      markSceneRendering("시나리오 기준으로 차량 배치 다시 구성 중");
    }
    setCircumstanceMode("specific");
    setSimulationDate(clock.dateIso);
    setSimulationTimeMinutes(scenario.minutes);
    setWeatherMode(scenario.weather);
    setSimulationDensity({
      taxis: scenario.taxis,
      traffic: scenario.traffic,
    });

    if (focusStation) {
      const focusCenterBlend =
        scenarioCamera?.focusCenterBlend ?? LOCAL_SCENARIO_FOCUS_CENTER_BLEND;
      const scenarioFocusX = scenarioMapCenter
        ? THREE.MathUtils.lerp(
            focusStation.position.x,
            scenarioMapCenter.x,
            focusCenterBlend,
          )
        : focusStation.position.x;
      const scenarioFocusZ = scenarioMapCenter
        ? THREE.MathUtils.lerp(
            focusStation.position.z,
            scenarioMapCenter.z,
            focusCenterBlend,
          )
        : focusStation.position.z;
      const scenarioYaw = scenarioMapCenter
        ? Math.atan2(
            scenarioFocusX - scenarioMapCenter.x,
            scenarioFocusZ - scenarioMapCenter.z,
          )
        : undefined;
      handleSubwayFocus(focusStation, {
        x: scenarioFocusX,
        z: scenarioFocusZ,
        distance:
          scenarioCamera?.distance ?? LOCAL_SCENARIO_FOCUS_DISTANCE,
        pitch: scenarioCamera?.pitch ?? LOCAL_SCENARIO_FOCUS_PITCH,
        yaw:
          scenarioYaw === undefined
            ? undefined
            : scenarioYaw +
              (scenarioCamera?.yawOffset ?? LOCAL_SCENARIO_FOCUS_YAW_OFFSET),
      });
      return;
    }

    if (cameraModeRef.current !== "drive") {
      cameraModeRef.current = "drive";
      setCameraMode("drive");
    }
  };
  const taxiOptions = useMemo(
    () =>
      Array.from({ length: stats.taxis }, (_, index) => ({
        id: `taxi-${index}`,
        label: `택시 ${index + 1}`,
        detail:
          dongNames[index % Math.max(dongNames.length, 1)] ??
          roadNames[index % Math.max(roadNames.length, 1)] ??
          "강남 코어 순환",
      })),
    [stats.taxis, dongNames, roadNames],
  );
  const selectedTaxiId =
    taxiOptions.find((taxi) => taxi.id === followTaxiId)?.id ??
    taxiOptions[0]?.id ??
    "";
  const selectedTaxi = useMemo(
    () =>
      taxiOptions.find((taxi) => taxi.id === selectedTaxiId) ??
      taxiOptions[0] ??
      null,
    [selectedTaxiId, taxiOptions],
  );
  const cameraModeLabel =
    cameraMode === "overview"
      ? "오버뷰"
      : cameraMode === "follow"
        ? "택시 추적"
        : cameraMode === "ride"
          ? "택시 시점"
          : "드라이브";
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
  const controlHint =
    cameraMode === "overview"
      ? "오버뷰: 좌클릭 드래그로 도시를 돌려보고 휠로 줌을 조절합니다. 택시를 클릭하면 택시 시점으로 들어갑니다."
      : cameraMode === "follow"
        ? `팔로우: ${selectedTaxi?.label ?? "선택한 택시"}를 자동 추적하고, 드래그로 시점을 살짝 돌릴 수 있습니다. 택시를 클릭하면 더 가까운 택시 시점으로 전환됩니다.`
        : cameraMode === "ride"
          ? `택시 시점: ${selectedTaxi?.label ?? "선택한 택시"} 뒤를 따라가며 이동합니다. Esc를 누르면 이전 시점으로 돌아갑니다.`
          : "드라이브: 좌클릭 드래그로 시점을 돌리고 W/S 또는 ↑/↓로 전후진, A/D 또는 ←/→로 좌우 이동, Q/E로 회전합니다. 택시를 클릭하면 택시 시점으로 들어갑니다.";
  const selectedWeather =
    WEATHER_OPTIONS.find((option) => option.id === weatherMode) ??
    WEATHER_OPTIONS[0];
  const assetVersionDetails = useMemo(() => {
    if (!data) {
      return [];
    }

    return SIMULATION_ASSET_LABELS.flatMap(({ key, label }) => {
      const meta = data.meta.assets[key];
      if (!meta) {
        return [];
      }

      return [
        {
          key,
          label,
          pathLabel: assetFileName(meta.path),
          updatedAt: meta.lastModified ?? "갱신 시각 없음",
          featureCount: meta.featureCount,
        },
      ];
    });
  }, [data]);
  const normalizedSimulationTimeMinutes = normalizeDayMinutes(
    simulationTimeMinutes,
  );
  const activeLocalScenario =
    circumstanceMode === "specific"
      ? LOCAL_SCENARIO_PRESETS.find(
        (scenario) =>
          scenario.minutes === normalizedSimulationTimeMinutes &&
          scenario.weather === weatherMode &&
          scenario.taxis === simulationDensity.taxis &&
          scenario.traffic === simulationDensity.traffic,
      ) ?? null
      : null;
  const solarReferenceCenter = data?.center ?? DEFAULT_MAP_CENTER;
  const formattedSimulationTime = format24Hour(normalizedSimulationTimeMinutes);
  const formattedSimulationDate = formatDateLabel(simulationDate);
  const simulationTimeBand = timeBandLabel(normalizedSimulationTimeMinutes);
  const daylightValue = daylightFactor(
    simulationDate,
    normalizedSimulationTimeMinutes,
    solarReferenceCenter,
  );
  const twilightValue = twilightFactor(
    simulationDate,
    normalizedSimulationTimeMinutes,
    solarReferenceCenter,
  );
  const daylightLabel =
    daylightValue > 0.18 ? "낮" : twilightValue > 0.25 ? "황혼" : "밤";
  const circumstanceModeLabel =
    circumstanceMode === "live" ? "실시간" : "특정 시각";
  const circumstanceOptions: Array<{ id: CircumstanceMode; label: string }> = [
    { id: "live", label: "실시간" },
    { id: "specific", label: "특정 시각" },
  ];
  const fpsModeOptions: Array<{ id: FpsMode; label: string }> = [
    { id: "auto", label: "자동" },
    { id: "fixed60", label: "60 FPS" },
    { id: "unlimited", label: "무제한" },
  ];
  const fpsFloatingAnchorClass = "absolute bottom-4 right-4 z-20";
  const isDensityApplying =
    status !== "ready" ||
    simulationDensity.taxis !== stats.taxis ||
    simulationDensity.traffic !== stats.traffic;
  const totalVehicles = stats.taxis + stats.traffic;
  const waitingShare = totalVehicles
    ? Math.round((stats.waiting / totalVehicles) * 100)
    : 0;
  const tripVolume = stats.activeTrips + stats.completedTrips;
  const tripCompletionShare = tripVolume
    ? Math.round((stats.completedTrips / tripVolume) * 100)
    : 0;
  const localFlowLabel =
    tripVolume === 0
      ? "대기"
      : waitingShare >= 30
        ? "혼잡"
        : tripCompletionShare >= 50
          ? "안정"
          : "활발";
  const averagePickupWaitLabel =
    stats.pickups > 0 ? formatMetricDuration(stats.avgPickupWaitSeconds) : "-";
  const averageRideDurationLabel =
    stats.dropoffs > 0 ? formatMetricDuration(stats.avgRideSeconds) : "-";
  const scenarioBrief = activeLocalScenario
    ? {
      title: activeLocalScenario.label,
      summary: activeLocalScenario.summary,
      note: activeLocalScenario.presentationNote,
      speakerNotes: activeLocalScenario.speakerNotes,
      focusLabel: activeLocalScenario.focusLabel,
      weatherLabel:
        WEATHER_OPTIONS.find(
          (option) => option.id === activeLocalScenario.weather,
        )?.label ?? selectedWeather.label,
    }
    : {
      title: "수동 조합",
      summary:
        "현재 장면은 프리셋 조합에서 벗어난 수동 상태로, 시간·날씨·밀도를 직접 맞춘 발표용 커스텀 장면입니다.",
      note:
        "슬라이더나 시간/날씨를 개별 조정한 뒤 원하는 설명 흐름에 맞춰 보여줄 때 적합합니다.",
      speakerNotes: [
        "현재 장면은 프리셋이 아니라 발표 의도에 맞춰 직접 조정한 커스텀 상태입니다.",
        "시간, 날씨, 밀도를 개별 조정해 필요한 장면만 골라 설명할 때 적합합니다.",
      ],
      focusLabel: selectedSubwayName || "현재 카메라 기준",
      weatherLabel: selectedWeather.label,
    };
  const recommendedWeatherLabel = activeLocalScenario
    ? WEATHER_OPTIONS.find(
      (option) => option.id === activeLocalScenario.weather,
    )?.label ?? selectedWeather.label
    : selectedWeather.label;
  const circumstanceHelpTitle =
    circumstanceMode === "live" ? "Live 모드" : "특정 시각 모드";
  const circumstanceHelpBody =
    circumstanceMode === "live"
      ? "강남 기준 현재 KST 시간을 따라갑니다. 날씨는 API 연동 전까지 수동 선택입니다."
      : "날짜와 시간을 고정해 같은 장면을 반복 재현합니다. 비교 시연에 적합합니다.";
  const weatherManualHelp =
    "실시간 기상 API 연동 전 단계라 수동 선택입니다.";
  const timeLightingHelp =
    "하늘과 전체 조도 중심으로 바뀌고, 도로·건물 톤은 크게 흔들지 않습니다.";
  const timeWeatherControls = (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
          기준 선택
        </div>
        <HoverInfo title={circumstanceHelpTitle} align="right">
          {circumstanceHelpBody}
        </HoverInfo>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {circumstanceOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setCircumstanceMode(option.id);
              setStatusDetail(
                option.id === "live"
                  ? "실시간 기준으로 장면 값을 유지 중"
                  : "특정 시각 기준으로 장면 값을 조정 중",
              );
            }}
            className={`rounded-2xl border px-3 py-2 text-left transition ${panelSelectableClass(
              circumstanceMode === option.id,
            )}`}
          >
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
              기준
            </div>
            <div className="mt-1 text-sm font-medium">{option.label}</div>
          </button>
        ))}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
            <span>시간 + 날씨</span>
            <HoverInfo title="시간대 연출">
              {timeLightingHelp}
            </HoverInfo>
          </div>
          <div className="mt-2 flex items-end gap-3">
            <div className="text-[28px] font-semibold tracking-tight tabular-nums text-slate-50">
              {formattedSimulationTime}
            </div>
            <span className={panelBadgeClass(true)}>
              {daylightLabel} / {simulationTimeBand}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {formattedSimulationDate} · {circumstanceModeLabel}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <span>날씨</span>
            <HoverInfo title="날씨 선택" align="right">
              {weatherManualHelp}
            </HoverInfo>
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-100">
            {selectedWeather.label}
          </div>
          <div className="text-[11px] text-slate-400">
            {selectedWeather.detail}
          </div>
        </div>
      </div>

      <div className={`mt-3 ${PANEL_ACCENT_CARD_CLASS} px-3 py-3`}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#99cbbd]/80">
            프리셋 추천값
          </div>
          <span className={panelBadgeClass(Boolean(activeLocalScenario))}>
            {activeLocalScenario?.label ?? "수동 조정중"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className={PANEL_TOKEN_CLASS}>
            시간 {activeLocalScenario ? format24Hour(activeLocalScenario.minutes) : formattedSimulationTime}
          </span>
          <span className={PANEL_TOKEN_CLASS}>
            날씨 {recommendedWeatherLabel}
          </span>
          <span className={PANEL_TOKEN_CLASS}>
            밀도 택시 {activeLocalScenario?.taxis ?? simulationDensity.taxis} / 일반 {activeLocalScenario?.traffic ?? simulationDensity.traffic}
          </span>
          <span className={PANEL_TOKEN_CLASS}>
            포커스 {scenarioBrief.focusLabel}
          </span>
        </div>
      </div>

      {circumstanceMode === "specific" ? (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSimulationTimeMinutes(preset.minutes)}
                className={`rounded-2xl border px-2 py-2 text-xs transition ${panelSelectableClass(
                  simulationTimeMinutes === preset.minutes,
                )}`}
              >
                <div className="font-medium tabular-nums">{preset.label}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  {preset.detail}
                </div>
              </button>
            ))}
          </div>

          <div className={`mt-3 ${PANEL_INSET_PADDED_CLASS}`}>
            <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <span>시간 슬라이더</span>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-[#d7efe6]">
                  {formattedSimulationTime}
                </span>
                <HoverInfo title="시간 고정">
                  특정 시각 모드에서 날짜와 시간을 고정해 비교용 장면을 재현합니다.
                </HoverInfo>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                날짜
              </div>
              <input
                type="date"
                value={simulationDate}
                onChange={(event) => setSimulationDate(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[#87cbb0]/40"
                aria-label="시뮬레이션 날짜"
              />
            </div>
            <input
              type="range"
              min={0}
              max={MINUTES_PER_DAY - 1}
              step={1}
              value={normalizedSimulationTimeMinutes}
              onChange={(event) =>
                setSimulationTimeMinutes(Number(event.target.value))
              }
              className="mt-3 h-2 w-full cursor-pointer accent-[#87cbb0]"
              aria-label="시뮬레이션 시간"
            />
            <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-500">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:30</span>
              <span>23:59</span>
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {WEATHER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setWeatherMode(option.id)}
            className={`rounded-2xl border px-3 py-3 text-left transition ${panelSelectableClass(
              weatherMode === option.id,
            )}`}
          >
            <div className="text-sm font-medium">{option.label}</div>
            <div className="mt-1 text-[11px] leading-5 text-slate-400">
              {option.detail}
            </div>
          </button>
        ))}
      </div>

    </>
  );

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#060d16]">
      <div ref={containerRef} className="h-full w-full" />
      <MapSimulatorSceneRuntime
        containerRef={containerRef}
        data={data}
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
      />

      {isSceneBusy ? (
        <div
          data-ui-panel="scene-loading"
          className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/46 px-6 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-[420px] rounded-[24px] border border-white/12 bg-slate-950/88 p-5 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full border-2 border-white/15 border-t-[#87cbb0] animate-spin" />
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
                <span className="tabular-nums text-[#d7efe6]">
                  {loadingProgress}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[#87cbb0] transition-[width] duration-300"
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
        data-ui-panel={showFps ? "fps-overlay" : "fps-toggle"}
        className={`${fpsFloatingAnchorClass} w-[188px] overflow-hidden rounded-2xl border border-lime-300/20 bg-slate-950/82 text-sm text-slate-200 shadow-xl backdrop-blur-md transition-all duration-200 ${showFps ? "w-[280px]" : ""}`}
      >
        <button
          type="button"
          aria-expanded={showFps}
          onClick={() => setShowFps((current) => !current)}
          className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-lime-300/80">
              성능
            </div>
            <div className="mt-1 flex items-end gap-2">
              <div className="text-2xl font-semibold tabular-nums text-lime-100">
                {fpsStats.fps}
              </div>
              <div className="pb-1 text-[11px] text-slate-400">
                {fpsStats.capLabel}
              </div>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300 transition hover:border-white/20 hover:bg-white/10">
            {showFps ? "접기" : "보기"}
          </div>
        </button>

        {!showFps ? (
          <div className="px-4 pb-3 text-[11px] text-slate-500">
            클릭하거나 `F`로 펼칠 수 있습니다.
          </div>
        ) : null}

        <div
          className={`overflow-hidden transition-all duration-200 ${showFps ? "max-h-[520px] border-t border-white/8 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  시뮬
                </div>
                <div className="tabular-nums text-lime-100">
                  {fpsStats.simulationMs.toFixed(2)} ms
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  렌더
                </div>
                <div className="tabular-nums text-lime-100">
                  {fpsStats.renderMs.toFixed(2)} ms
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  시뮬 Hz
                </div>
                <div className="tabular-nums text-lime-100">
                  {fpsStats.simulationHz}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  차량 수
                </div>
                <div className="tabular-nums text-lime-100">{fpsStats.vehicles}</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px] text-slate-300">
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  신호
                </div>
                <div className="tabular-nums text-lime-100">
                  {fpsStats.signalMs.toFixed(2)} ms
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  차량
                </div>
                <div className="tabular-nums text-lime-100">
                  {fpsStats.vehicleMs.toFixed(2)} ms
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  보조
                </div>
                <div className="tabular-nums text-lime-100">
                  {fpsStats.overlayMs.toFixed(2)} ms
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {fpsModeOptions.map((option) => {
                const isSelected = fpsMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFpsMode(option.id)}
                    className={`rounded-xl border px-2 py-2 text-left text-[11px] transition ${isSelected
                      ? "border-lime-300/40 bg-lime-400/10 text-lime-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/8"
                      }`}
                  >
                    <div className="font-medium">{option.label}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 max-w-[240px] text-[11px] leading-4 text-slate-500">
              {fpsModeSummary(fpsMode)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              카메라 {cameraModeLabel} · F로 숨기기
            </div>
          </div>
        </div>
      </div>

      <div
        data-ui-panel="right-sidebar"
        className="absolute right-4 top-4 z-10 hidden max-h-[calc(100vh-2rem)] w-[360px] overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/82 p-5 text-white shadow-2xl backdrop-blur-md lg:block"
      >
        {timeWeatherControls}
      </div>

      <div
        data-ui-panel="left-sidebar"
        className="absolute left-2 top-2 z-10 max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[400px] overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/82 p-5 text-white shadow-2xl backdrop-blur-md sm:left-4 sm:top-4 sm:max-h-[calc(100vh-2rem)] sm:w-[400px]"
      >
        <p className={PANEL_EYEBROW_CLASS}>
          A-Eye 모듈 1 보조 레이어
        </p>
        <h1 className="text-[28px] font-semibold leading-tight">
          강남역 마이크로 영역 9개 동 OSM 디지털 트윈
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          이 장면은 `A-Eye`의 단순화된 Yeoksam 3x3 SUMO baseline을 대체하는
          별도 평가계가 아니라, 같은 강남역 마이크로 영역을 9개 실제 행정동과
          OSM 도로 위에서 더 구체적으로 보여주는 Module 1 공간 레이어입니다.
          역삼1·2동을 중심으로 논현, 삼성, 신사, 청담, 대치4동까지 이어지는 9개
          동을 OSM 경계 기준으로 불러와 3D로 다시 렌더링했고, 택시는 우측 차선
          기준으로 주행하며 교차로에서는 보호 좌회전, 황색, 보행 phase를 함께
          반영합니다. 신호등은 OSM `traffic_signals` 노드를 기준으로 묶어 쓰고,
          승하차 위치도 실제 도로 그래프와 curbside 쪽으로 맞추고 있습니다.
        </p>

        <div className={`mt-4 ${PANEL_ACCENT_CARD_CLASS}`}>
          <div className={PANEL_SECTION_LABEL_CLASS}>
            역할
          </div>
          <div className="mt-1 text-sm font-semibold text-[#d7efe6]">
            강남역 마이크로 디지털 트윈 보조 레이어
          </div>
          <div className="mt-2 text-xs leading-5 text-slate-300">
            목표는 강남구 전체나 서울 전체를 그대로 복제하는 것이 아니라,
            A-Eye의 마이크로 영역 수요·배차 스토리를 실제 도로와 행정동 위에서
            읽히게 만드는 것입니다. 즉 3x3는 나중 배차 비교 레이어로 남겨둘 수
            있고, 이 장면은 9개 동 OSM 지오메트리 뼈대 위에서 도로 단위 움직임과
            시각화를 다듬는 역할에 집중합니다.
          </div>
        </div>

        <div className={`mt-5 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                로컬 시나리오
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                외부 수집 없이 바로 쓰는 발표/검증 프리셋
              </div>
            </div>
            <span className={panelBadgeClass(Boolean(activeLocalScenario))}>
              {activeLocalScenario?.label ?? "수동 조합"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {LOCAL_SCENARIO_PRESETS.map((scenario) => {
              const isSelected = activeLocalScenario?.id === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => applyLocalScenario(scenario)}
                  data-local-scenario-button={scenario.id}
                  data-selected={isSelected ? "true" : "false"}
                  aria-label={`${scenario.label} 시나리오 적용`}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${panelSelectableClass(
                    isSelected,
                  )}`}
                >
                  <div className="text-sm font-semibold">{scenario.label}</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-400">
                    {scenario.detail}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    <span>{format24Hour(scenario.minutes)}</span>
                    <span>·</span>
                    <span>택시 {scenario.taxis}</span>
                    <span>·</span>
                    <span>일반 {scenario.traffic}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
            프리셋은 시간, 날씨, 차량 밀도, 주요 지하철역 시점을 함께 맞춥니다.
            실제 수요 API나 외부 데이터 없이도 `A-Eye Module 1` 설명용 장면을
            빠르게 재현하는 용도입니다.
          </div>
        </div>

        <div className={`mt-5 ${PANEL_ACCENT_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>
                시나리오 브리프
              </div>
              <div className="mt-1 text-sm font-semibold text-[#d7efe6]">
                {scenarioBrief.title}
              </div>
            </div>
            <span className={panelBadgeClass(true)}>
              발표용 요약
            </span>
          </div>

          <div className="mt-3 text-sm leading-6 text-slate-200">
            {scenarioBrief.summary}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2">
              <div className="text-slate-500">포커스</div>
              <div className="mt-1 font-medium text-slate-100">
                {scenarioBrief.focusLabel}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2">
              <div className="text-slate-500">현재 조합</div>
              <div className="mt-1 font-medium text-slate-100">
                {formattedSimulationTime} · {scenarioBrief.weatherLabel}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {scenarioBrief.speakerNotes.map((line, index) => (
              <div
                key={`${scenarioBrief.title}-${index}`}
                className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2 text-xs leading-5 text-slate-300"
              >
                멘트 {index + 1}. {line}
              </div>
            ))}
          </div>

          <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
            {scenarioBrief.note}
          </div>
        </div>

        <div className={`mt-5 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                로컬 체크
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                장면 내부 상태만으로 보는 단순 검증 지표
              </div>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[11px] font-medium text-amber-100">
              참고용
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                평균 대기
              </div>
              <div className="mt-1 text-lg font-semibold text-amber-100">
                {averagePickupWaitLabel}
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                평균 이동
              </div>
              <div className="mt-1 text-lg font-semibold text-sky-100">
                {averageRideDurationLabel}
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                활성 호출
              </div>
              <div className="mt-1 text-lg font-semibold text-rose-200">
                {stats.activeCalls}
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                대기 비율
              </div>
              <div className="mt-1 text-lg font-semibold text-rose-200">
                {waitingShare}%
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                누적 승차
              </div>
              <div className="mt-1 text-lg font-semibold text-[#d7efe6]">
                {stats.pickups}
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                누적 하차
              </div>
              <div className="mt-1 text-lg font-semibold text-lime-200">
                {stats.dropoffs}
              </div>
            </div>
            <div className={PANEL_STATUS_TILE_CLASS}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                흐름 상태
              </div>
              <div className="mt-1 text-lg font-semibold text-[#d7efe6]">
                {localFlowLabel}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs leading-5 text-slate-500">
            평균 대기와 평균 이동은 로컬 시뮬레이터 안에서 완료된 승차/하차를
            기준으로 누적한 참고값입니다. 운영 KPI라기보다 프리셋 간 상대 비교와
            배차 로직 설명용 지표에 가깝습니다.
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">택시</div>
            <div className="mt-1 text-lg font-semibold text-amber-200">
              {stats.taxis}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">일반 차량</div>
            <div className="mt-1 text-lg font-semibold text-sky-200">
              {stats.traffic}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">신호등</div>
            <div className="mt-1 text-lg font-semibold text-emerald-200">
              {stats.signals}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">대기</div>
            <div className="mt-1 text-lg font-semibold text-rose-200">
              {stats.waiting}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">진행 중 운행</div>
            <div className="mt-1 text-lg font-semibold text-[#d7efe6]">
              {stats.activeTrips}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">완료</div>
            <div className="mt-1 text-lg font-semibold text-lime-200">
              {stats.completedTrips}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">보행자</div>
            <div className="mt-1 text-lg font-semibold text-violet-200">
              {stats.pedestrians}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">버스 정류장</div>
            <div className="mt-1 text-lg font-semibold text-emerald-200">
              {transitCounts.busStops}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">지하철</div>
            <div className="mt-1 text-lg font-semibold text-[#d7efe6]">
              {transitCounts.subwayStations}
            </div>
          </div>
          <div className={PANEL_CARD_COMPACT_CLASS}>
            <div className="text-slate-400">라우팅</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">
              {dispatchPresentation.routingLabel}
            </div>
            <div className="mt-1 text-[11px] leading-5 text-slate-500">
              {dispatchPresentation.routingDetail}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className={PANEL_TOKEN_CLASS}>planner {dispatchPlannerId}</span>
            </div>
          </div>
        </div>

        <div className={`mt-5 ${PANEL_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                시뮬레이션 밀도
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                택시와 일반 차량 수 조절
              </div>
            </div>
            <span
              className={`rounded-full border px-2 py-1 text-[11px] font-medium ${isDensityApplying
                ? "border-amber-300/25 bg-amber-300/12 text-amber-100"
                : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                }`}
            >
              {isDensityApplying ? "적용 중" : "반영됨"}
            </span>
          </div>

          <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
            밀도를 바꾸면 실제 차량 배치를 다시 구성합니다. 슬라이더를 움직이는
            동안에는 마지막 안정적인 장면을 유지한 뒤 새 밀도로 자연스럽게
            갈아탑니다.
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
              <span>택시</span>
              <span className="tabular-nums text-amber-200">
                {simulationDensity.taxis}
              </span>
            </div>
            <input
              type="range"
              min={MIN_TAXI_COUNT}
              max={MAX_TAXI_COUNT}
              step={1}
              value={simulationDensity.taxis}
              onChange={(event) => {
                markSceneRendering("택시 배치를 다시 구성 중");
                setSimulationDensity((current) => ({
                  ...current,
                  taxis: Number(event.target.value),
                }));
              }}
              className="mt-3 h-2 w-full cursor-pointer accent-[#ff9f1c]"
              aria-label="택시 밀도"
            />
            <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-500">
              <span>{MIN_TAXI_COUNT}</span>
              <span>{DEFAULT_TAXI_COUNT}</span>
              <span>{MAX_TAXI_COUNT}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
              <span>일반 차량</span>
              <span className="tabular-nums text-sky-200">
                {simulationDensity.traffic}
              </span>
            </div>
            <input
              type="range"
              min={MIN_TRAFFIC_COUNT}
              max={MAX_TRAFFIC_COUNT}
              step={1}
              value={simulationDensity.traffic}
              onChange={(event) => {
                markSceneRendering("일반 차량 배치를 다시 구성 중");
                setSimulationDensity((current) => ({
                  ...current,
                  traffic: Number(event.target.value),
                }));
              }}
              className="mt-3 h-2 w-full cursor-pointer accent-[#87cbb0]"
              aria-label="일반 차량 밀도"
            />
            <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-500">
              <span>{MIN_TRAFFIC_COUNT}</span>
              <span>{DEFAULT_TRAFFIC_COUNT}</span>
              <span>{MAX_TRAFFIC_COUNT}</span>
            </div>
          </div>

          <div className="mt-3 text-xs leading-5 text-slate-500">
            현재 장면 기준: 택시 {stats.taxis}대, 일반 차량 {stats.traffic}대
          </div>
        </div>

        <div
          data-ui-panel="mobile-time-weather"
          className={`mt-5 ${PANEL_CARD_CLASS} lg:hidden`}
        >
          {timeWeatherControls}
        </div>

        <div className={`mt-5 ${PANEL_ACCENT_CARD_CLASS}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className={PANEL_SECTION_LABEL_CLASS}>
                데이터 소스
              </div>
              <div className="mt-1 text-sm font-semibold text-[#d7efe6]">
                {data?.meta.source ?? "OpenStreetMap + Overpass"}
              </div>
            </div>
            <span className={panelBadgeClass(true)}>
              {data?.meta.boundarySource ?? "OSM 행정 경계"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2">
              <div className="text-slate-500">최근 에셋 갱신</div>
              <div className="mt-1 font-medium text-slate-100">
                {data?.meta.latestAssetUpdatedAt ?? "갱신 시각 없음"}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2">
              <div className="text-slate-500">뷰어 로드 시각</div>
              <div className="mt-1 font-medium text-slate-100">
                {data?.meta.loadedAt ?? "알 수 없음"}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className={PANEL_TOKEN_CLASS}>
              행정동 {data?.meta.assets.dongs.featureCount ?? 0}
            </span>
            {data?.meta.assets.nonRoad ? (
              <span className={PANEL_TOKEN_CLASS}>
                비도로 {data.meta.assets.nonRoad.featureCount}
              </span>
            ) : null}
            <span className={PANEL_TOKEN_CLASS}>
              도로 {data?.meta.assets.roads.featureCount ?? 0}
            </span>
            <span className={PANEL_TOKEN_CLASS}>
              건물 {data?.meta.assets.buildings.featureCount ?? 0}
            </span>
            <span className={PANEL_TOKEN_CLASS}>
              대중교통 {data?.meta.assets.transit.featureCount ?? 0}
            </span>
            {data?.meta.assets.trafficSignals ? (
              <span className={PANEL_TOKEN_CLASS}>
                신호등 {data.meta.assets.trafficSignals.featureCount}
              </span>
            ) : null}
            {data?.meta.assets.roadNetwork ? (
              <span className={PANEL_TOKEN_CLASS}>
                도로 그래프 {data.meta.assets.roadNetwork.featureCount}
              </span>
            ) : null}
          </div>

          <div className={`mt-3 ${PANEL_INSET_PADDED_CLASS} text-xs`}>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              에셋 버전
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {assetVersionDetails.map((asset) => (
                <div
                  key={asset.key}
                  className="rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-100">{asset.label}</div>
                    <div className="tabular-nums text-[11px] text-slate-400">
                      {asset.featureCount}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {asset.pathLabel}
                  </div>
                  <div className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                    {asset.updatedAt}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
            동 경계는 OSM 행정동 relation 기준이고, 건물과 도로는 OSM
            지오메트리에서 가져옵니다. 이 장면에서 OSM은 단순 배경지도가 아니라
            A-Eye 마이크로 영역 디지털 트윈의 공간 뼈대 역할을 합니다. 신호등
            위치는 OSM traffic_signals 노드를 기준으로 묶어 쓰고, 차량 phase는
            도로 방향을 읽어 좌회전·직진·황색 흐름으로 단순화했습니다. 다만 이
            프로젝트는 아직 도시 전체 복제나 법적 수준의 배차 지도를 주장하지는
            않습니다.
          </div>
        </div>

        <div className={`mt-5 ${PANEL_CARD_CLASS}`}>
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
            카메라
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["overview", "오버뷰"],
                ["drive", "드라이브"],
                ["follow", "택시 추적"],
                ["ride", "택시 시점"],
              ] as Array<[CameraMode, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                data-camera-mode-button={mode}
                onClick={() => {
                  if (mode === "ride" && selectedTaxiId) {
                    rideExitModeRef.current =
                      cameraMode === "overview" || cameraMode === "follow"
                        ? cameraMode
                        : "drive";
                    setFollowTaxiId(selectedTaxiId);
                  }
                  setCameraMode(mode);
                }}
                disabled={mode === "ride" && !selectedTaxiId}
                className={`rounded-2xl border px-3 py-2 text-xs font-medium transition ${cameraMode === mode
                  ? panelSelectableClass(true)
                  : `${panelSelectableClass(false)} disabled:cursor-not-allowed disabled:opacity-45`
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              대상 택시
            </div>
            <select
              value={selectedTaxiId}
              onChange={(event) => {
                setFollowTaxiId(event.target.value);
              }}
              disabled={!taxiOptions.length}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/75 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[#87cbb0]/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {taxiOptions.map((taxi) => (
                <option key={taxi.id} value={taxi.id}>
                  {taxi.label} · {taxi.detail}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              빈차, 승객 탑승 중, 정차 중인 택시와 관계없이 언제든 선택해 시점을
              붙일 수 있습니다.
            </div>
          </div>

          <div className={`mt-3 ${PANEL_INSET_CLASS}`}>
            {controlHint}
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(event) => setShowLabels(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-400"
          />
          도로/건물/지하철 라벨 보기
        </label>

        <label className="mt-3 flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showTransit}
            onChange={(event) => setShowTransit(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-[#87cbb0]"
          />
          지하철 입구 구조물 보기
        </label>
        <div className="mt-2 text-xs leading-5 text-slate-500">
          실제 지하철역 위치를 고정 구조물로 강조합니다. 버스 정류장 시각화는
          우선 보류하고 데이터만 유지합니다.
        </div>

        {data?.meta.assets.nonRoad ? (
          <>
            <label className="mt-3 flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showNonRoad}
                onChange={(event) => setShowNonRoad(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400"
              />
              비도로 영역 보기
            </label>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              공원, 주차장, 광장, 수변, 시설 부지 같은 OSM polygon 기반 non-road
              면을 도로 아래에 따로 보여줍니다.
            </div>
          </>
        ) : null}

        <label className="mt-3 flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showRoadNetwork}
            onChange={(event) => setShowRoadNetwork(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-lime-400"
          />
          도로 네트워크 레이어 보기
        </label>
        <div className="mt-2 text-xs leading-5 text-slate-500">
          라우팅에 쓰는 도로 그래프를 얇은 edge 선과 node 점으로 겹쳐
          보여줍니다.
        </div>

        {subwayHubs.length ? (
          <div className={`mt-5 ${PANEL_CARD_COMPACT_CLASS}`}>
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              지하철 허브
            </div>
            <div className="flex flex-wrap gap-2">
              {subwayHubs.map((station) => {
                const label = station.name ?? "지하철역";
                const isSelected = selectedSubwayName === label;
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => handleSubwayFocus(station)}
                    className={panelPillToggleClass(isSelected)}
                    title={`${label}로 이동`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              역 이름을 누르면 해당 지하철역 주변으로 카메라가 이동합니다.
            </div>
            {selectedSubwayName ? (
              <div className="mt-2 text-xs text-[#d7efe6]">
                현재 선택: {selectedSubwayName}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          data-scene-status={status}
          className={`mt-4 ${PANEL_CARD_CLASS} px-4 py-3 text-xs leading-5 text-slate-400`}
        >
          상태: <span className="text-slate-100">{statusLabel}</span>
          <br />
          단계: <span className="text-slate-100">{statusDetail}</span>
          <br />
          기준: <span className="text-slate-100">{circumstanceModeLabel}</span>
          <br />
          날짜:{" "}
          <span className="text-slate-100 tabular-nums">
            {formattedSimulationDate}
          </span>
          <br />
          시간:{" "}
          <span className="text-slate-100 tabular-nums">
            {formattedSimulationTime}
          </span>
          <br />
          날씨: <span className="text-slate-100">{selectedWeather.label}</span>
          <br />
          카메라: <span className="text-slate-100">{cameraModeLabel}</span>
          <br />
          배차:{" "}
          <span className="text-slate-100">
            {dispatchPresentation.label} · {dispatchPlannerId}
          </span>
          <br />
          환경: <span className="text-slate-100">{buildVersion.environmentLabel}</span>
          <br />
          브랜치: <span className="text-slate-100 tabular-nums">{buildVersion.branch}</span>
          <br />
          빌드:{" "}
          <span className="text-slate-100 tabular-nums">
            {buildVersion.builtAtLabel}
            {buildVersion.commit ? ` · ${buildVersion.commit}` : ""}
          </span>
          <br />
          밀도:{" "}
          <span className="text-slate-100">
            택시 {stats.taxis} / 일반 {stats.traffic}
          </span>
          <br />
          조작: {controlHint}
        </div>
      </div>

      <div
        data-ui-panel="bottom-legend"
        className="absolute bottom-4 left-4 z-10 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-300 shadow-xl backdrop-blur-md"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#76808a]" />
            건물
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3d4349]" />
            주요 도로
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#eef4ff]" />
            횡단보도
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff9f1c]" />
            택시
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#b89662]" />
            콜 포인트
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4ca7ff]" />
            지하철 입구
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f6f7ff]" />
            보행자 신호
          </span>
        </div>
      </div>
    </section>
  );
}
