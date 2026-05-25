"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";
import { MapSimulatorErrorBoundary } from "@/components/MapSimulatorErrorBoundary";
import {
  WEATHER_OPTIONS,
  format24Hour,
  formatDateLabel,
  normalizeDayMinutes,
  type WeatherMode,
} from "@/components/map-simulator/simulation-environment";
import { loadSimulationData } from "@/components/map-simulator/load-simulation-data";
import type { MapSimulatorSceneRuntimeProps } from "@/components/map-simulator/MapSimulatorSceneRuntime";
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
import { MapSearchControl } from "@/components/map-simulator/ui/MapSearchControl";
import type { DemandSidebarProps } from "@/components/map-simulator/ui/DemandSidebar";
import { useDemandForecast } from "@/components/map-simulator/use-demand-forecast";
import {
  DEMAND_VISUAL_UNIT_CALLS,
  buildDemandMiniMapData,
  buildStaticPoiFeatureRows,
} from "@/components/map-simulator/demand-utils";
import {
  buildPoiSpatialIndex,
  visiblePoiRowsForCamera,
} from "@/components/map-simulator/poi-render-utils";
import {
  DEFAULT_CAMERA_PITCH_CONTROL_VALUE,
  DEFAULT_CAMERA_YAW_CONTROL_VALUE,
  type BaseCameraMode,
  type CameraFocusTarget,
  type CameraMode,
  type CameraPitchControlState,
  type CameraYawControlState,
  type FpsMode,
} from "@/components/map-simulator/camera-types";
import { projectPoint } from "@/components/map-simulator/map-geometry-utils";

type MapSimulatorProps = {
  buildVersion: BuildVersionInfo;
};

const MOBILE_LAYOUT_QUERY = "(max-width: 1023px)";

const MapSimulatorSceneRuntime = dynamic<MapSimulatorSceneRuntimeProps>(
  () => import("@/components/map-simulator/MapSimulatorSceneRuntime"),
  {
    ssr: false,
    loading: () => null,
  },
);

const DemandSidebar = dynamic<DemandSidebarProps>(
  () =>
    import("@/components/map-simulator/ui/DemandSidebar").then(
      (module) => module.DemandSidebar,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function MapSimulator({ buildVersion }: MapSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
  const [isMobileLayout, setIsMobileLayout] = useState(false);

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
  const {
    selectedDongName,
    setSelectedDongName,
    selectedWeekday,
    setSelectedWeekday,
    currentDemandSlot,
    currentDemandVisualUnits,
    currentFiveMinuteDemand,
    appliedTaxiCount,
    hasDemandData,
    demandChart,
    selectedAverageDemand,
    selectedPeakDemand,
    selectedDemandScore,
    selectedDemandIntensityLabel,
    demandFetchBadgeText,
    demandFetchBadgeClass,
    setSimulationDateWeekday,
  } = useDemandForecast({
    simulationDate,
    normalizedSimulationTimeMinutes,
  });
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
    return buildPoiSpatialIndex(mapPoiFeatureRows, data.center);
  }, [data, mapPoiFeatureRows]);
  const activePoiCode = mapPoiFeatureRows.some(
    (poi) => poi.poi_code === selectedPoiCode,
  )
    ? selectedPoiCode
    : mapPoiFeatureRows[0]?.poi_code ?? "";
  const scenePoiFeatureRows = useMemo(() => {
    return visiblePoiRowsForCamera({
      rows: mapPoiFeatureRows,
      spatialIndex: poiSpatialIndex,
      activePoiCode,
      cameraMode,
      miniMapFocus,
    });
  }, [
    activePoiCode,
    cameraMode,
    mapPoiFeatureRows,
    miniMapFocus,
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
    const controller = new AbortController();

    void loadSimulationData({
      signal: controller.signal,
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
        if (!cancelled) {
          console.error(error);
          markSceneError("자산 또는 초기 장면 준비에 실패했습니다");
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
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
  const demandMiniMap = useMemo(() => {
    return buildDemandMiniMapData({
      data,
      mapPoiFeatureRows,
      miniMapFocus,
      scenarioMapCenter,
      activePoiCode,
      selectedDongName,
      dongDemandScores,
    });
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
    setMiniMapFocus(focus);
  }, [setMiniMapFocus]);
  const formattedSimulationTime = format24Hour(normalizedSimulationTimeMinutes);
  const formattedSimulationDate = formatDateLabel(simulationDate);
  const isSidebarVisible = !isSidebarCollapsed;
  const mapCanvasClass = isSidebarVisible
    ? "h-full w-full border-r border-white/10 lg:w-[62vw] xl:w-[calc(100%-500px)]"
    : "h-full w-full";
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

  function toggleSidebar() {
    if (isSidebarVisible) {
      setIsSidebarCollapsed(true);
      return;
    }
    setIsScenarioControlsExpanded(false);
    setIsSidebarCollapsed(false);
  }

  function handleSimulationDateChange(date: string) {
    setSimulationDate(date);
    setSimulationDateWeekday(date);
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
          setSimulationDate={handleSimulationDateChange}
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



        {isSidebarVisible ? (
          <button
            type="button"
            aria-label="정보 패널 닫기"
            onClick={toggleSidebar}
            className="absolute inset-0 z-10 bg-slate-950/56 lg:hidden"
          />
        ) : null}

        {isSidebarVisible ? (
          <DemandSidebar
            selectedDongName={selectedDongName}
            setSelectedDongName={setSelectedDongName}
            selectedWeekday={selectedWeekday}
            setSelectedWeekday={setSelectedWeekday}
            demandFetchBadgeText={demandFetchBadgeText}
            demandFetchBadgeClass={demandFetchBadgeClass}
            hasDemandData={hasDemandData}
            selectedPeakDemand={selectedPeakDemand}
            selectedDemandIntensityLabel={selectedDemandIntensityLabel}
            currentDemandSlot={currentDemandSlot}
            currentFiveMinuteDemand={currentFiveMinuteDemand}
            appliedTaxiCount={appliedTaxiCount}
            demandChart={demandChart}
            selectedAverageDemand={selectedAverageDemand}
            demandMiniMap={demandMiniMap}
            mapPoiFeatureRows={mapPoiFeatureRows}
            onPoiSelect={handlePoiSelect}
          />
        ) : null}

      </section>
    </div>
  );
}
