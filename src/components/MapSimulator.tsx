"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { BuildVersionInfo } from "@/components/map-simulator/utils";
import type { CircumstanceMode } from "@/components/map-simulator/types";
import { MapSimulatorErrorBoundary } from "@/components/MapSimulatorErrorBoundary";
import {
  currentSimulationClock,
  format24Hour,
  normalizeDayMinutes,
  useWeatherForecast,
} from "@/components/map-simulator/environment";
import { MapSimulatorSceneRuntimeProps } from "@/components/map-simulator/map-simulator-scene-runtime";
import {
  type MiniMapFocus,
} from "@/components/map-simulator/hooks";
import { useMapSimulatorStores } from "@/components/map-simulator/hooks";
import { SceneLoading } from "@/components/map-simulator/ui/SceneLoading";
import { WeatherBadge } from "@/components/map-simulator/ui/WeatherBadge";
import { Menu } from "lucide-react";
import type { DemandSidebarProps } from "@/components/map-simulator/ui/DemandSidebar";
import { DEMAND_VISUAL_UNIT_CALLS } from "@/components/map-simulator/demand";
import type { FpsMode } from "@/components/map-simulator/camera";
import { projectPoint } from "@/components/map-simulator/utils";
import { useMapDemandState } from "@/components/map-simulator/demand";
import { useMapPoiState } from "@/components/map-simulator/hooks";
import { useMapSceneRuntimeRefs } from "@/components/map-simulator/hooks";
import { useSimulationDataLoader } from "@/components/map-simulator/hooks";
import { trafficCountForLoadPercent } from "@/components/map-simulator/simulation";

type MapSimulatorProps = {
  buildVersion: BuildVersionInfo;
  initialMode?: CircumstanceMode;
};

const ONE_HOUR_MS = 60 * 60 * 1000;

function millisecondsUntilNextHour(date = new Date()) {
  const elapsedInHourMs =
    date.getMinutes() * 60_000 +
    date.getSeconds() * 1000 +
    date.getMilliseconds();

  return Math.max(1000, ONE_HOUR_MS - elapsedInHourMs + 250);
}

const MapSimulatorSceneRuntime = dynamic<MapSimulatorSceneRuntimeProps>(
  () => import("@/components/map-simulator/map-simulator-scene-runtime"),
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

export default function MapSimulator({
  buildVersion,
  initialMode = "live",
}: MapSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appliedInitialModeRef = useRef<CircumstanceMode | null>(null);
  const { state, setters } = useMapSimulatorStores();
  const {
    data,
    status,
    statusDetail,
    loadingProgress,
    circumstanceMode,
    simulationDate,
    simulationTimeMinutes,
    weatherMode,
    trafficLoadPercent,
    cameraMode,
    miniMapFocus,
    followTaxiId,
    selectedPoiCode,
    isSidebarCollapsed,
  } = state;

  const {
    setData,
    setStatus,
    setStatusDetail,
    setLoadingProgress,
    setCircumstanceMode,
    setSimulationDate,
    setSimulationTimeMinutes,
    setWeatherMode,
    setTrafficLoadPercent,
    setCameraMode,
    setMiniMapFocus,
    setFollowTaxiId,
    setStats,
    setSelectedPoiCode,
    setIsSidebarCollapsed,
  } = setters;

  const showLabels = false;
  const showNonRoad = true;
  const showTransit = true;
  const showRoadNetwork = false;
  const fpsMode: FpsMode = "fixed60";
  const layoutStyle = {
    "--demand-sidebar-width": "clamp(400px, 38vw, 500px)",
  } as CSSProperties;
  const normalizedSimulationTimeMinutes = normalizeDayMinutes(
    simulationTimeMinutes,
  );
  const appliedTrafficCount = trafficCountForLoadPercent(trafficLoadPercent);

  useEffect(() => {
    if (appliedInitialModeRef.current === initialMode) {
      return;
    }
    appliedInitialModeRef.current = initialMode;

    if (initialMode === "live") {
      const clock = currentSimulationClock();
      setSimulationDate(clock.dateIso);
      setSimulationTimeMinutes(clock.minutes);
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
    setCircumstanceMode(initialMode);
  }, [
    initialMode,
    setCircumstanceMode,
    setIsSidebarCollapsed,
    setSimulationDate,
    setSimulationTimeMinutes,
  ]);

  useEffect(() => {
    if (circumstanceMode !== "live") {
      return;
    }

    function syncCurrentClock() {
      const clock = currentSimulationClock();
      setSimulationDate(clock.dateIso);
      setSimulationTimeMinutes(clock.minutes);
    }

    let timeoutId: number | undefined;
    function scheduleNextHourSync() {
      timeoutId = window.setTimeout(() => {
        syncCurrentClock();
        scheduleNextHourSync();
      }, millisecondsUntilNextHour());
    }

    syncCurrentClock();
    scheduleNextHourSync();
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    circumstanceMode,
    setSimulationDate,
    setSimulationTimeMinutes,
  ]);

  const {
    activePoiCode,
    mapPoiFeatureRows,
    scenePoiFeatureRowsRef,
  } = useMapPoiState({
    data,
    selectedPoiCode,
    cameraMode,
    miniMapFocus,
  });

  useSimulationDataLoader({
    setData,
    setStatus,
    setStatusDetail,
    setLoadingProgress,
  });

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
  const demandState = useMapDemandState({
    data,
    mapPoiFeatureRows,
    miniMapFocus,
    scenarioMapCenter,
    activePoiCode,
    circumstanceMode,
    simulationDate,
    normalizedSimulationTimeMinutes,
  });
  const weatherState = useWeatherForecast({
    normalizedSimulationTimeMinutes: demandState.heatmapHour * 60,
    setWeatherMode,
    simulationDate,
  });
  const runtimeRefs = useMapSceneRuntimeRefs({
    appliedTaxiCount: demandState.appliedTaxiCount,
    appliedTrafficCount,
    cameraMode,
    followTaxiId,
    fpsMode,
    showLabels,
    showNonRoad,
    showRoadNetwork,
    showTransit,
    simulationDate,
    simulationTimeMinutes: circumstanceMode === "live" ? simulationTimeMinutes : demandState.heatmapHour * 60,
    weatherMode,
  });
  const { setCameraControlValues, setCameraFocusTarget } = runtimeRefs;
  const handlePoiSelect = useCallback((poiCode: string) => {
    const poi = mapPoiFeatureRows.find((row) => row.poi_code === poiCode);
    setSelectedPoiCode(poiCode);
    if (circumstanceMode !== "live") {
      setIsSidebarCollapsed(false);
    }
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
      setCameraFocusTarget({
        x: projected.x,
        z: projected.z,
        distance: 78,
        pitch: 0.68,
        label: poi.poi_name,
      });
      setCameraMode("drive");
    }
  }, [
    circumstanceMode,
    data,
    mapPoiFeatureRows,
    setCameraFocusTarget,
    setIsSidebarCollapsed,
    setSelectedPoiCode,
    setCameraMode,
  ]);
  const handleCameraFocusChange = useCallback((focus: MiniMapFocus) => {
    setCameraControlValues(focus);
    setMiniMapFocus(focus);
  }, [setCameraControlValues, setMiniMapFocus]);
  const formattedSimulationTime = format24Hour(normalizedSimulationTimeMinutes);
  const isLiveMode = circumstanceMode === "live";
  const isSidebarVisible = !isSidebarCollapsed;
  const mapCanvasClass = isSidebarVisible
    ? "h-full w-full touch-none border-white/10 transition-[margin,width] duration-300 ease-in-out lg:ml-[var(--demand-sidebar-width)] lg:w-[calc(100%-var(--demand-sidebar-width))] lg:border-l"
    : "h-full w-full touch-none transition-[margin,width] duration-300 ease-in-out";

  function toggleSidebar() {
    if (isSidebarVisible) {
      setIsSidebarCollapsed(true);
      return;
    }
    setIsSidebarCollapsed(false);
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#060d16]">
      <section className="relative h-full overflow-hidden" style={layoutStyle}>
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
            onDongSelect={demandState.setSelectedDongName}
            appliedTaxiCountRef={runtimeRefs.appliedTaxiCountRef}
            appliedTrafficCountRef={runtimeRefs.appliedTrafficCountRef}
            selectedDemandDongRef={demandState.refs.selectedDemandDongRef}
            hasDemandDataRef={demandState.refs.hasDemandDataRef}
            selectedDemandScoreRef={demandState.refs.selectedDemandScoreRef}
            currentFiveMinuteDemandRef={demandState.refs.currentFiveMinuteDemandRef}
            currentDemandVisualUnitsRef={
              demandState.refs.currentDemandVisualUnitsRef
            }
            cameraModeRef={runtimeRefs.cameraModeRef}
            followTaxiIdRef={runtimeRefs.followTaxiIdRef}
            rideExitModeRef={runtimeRefs.rideExitModeRef}
            showLabelsRef={runtimeRefs.showLabelsRef}
            optionalLabelObjectsRef={runtimeRefs.optionalLabelObjectsRef}
            showTransitRef={runtimeRefs.showTransitRef}
            transitGroupRef={runtimeRefs.transitGroupRef}
            hoverRefreshRequestRef={runtimeRefs.hoverRefreshRequestRef}
            labelRefreshRequestRef={runtimeRefs.labelRefreshRequestRef}
            fpsModeRef={runtimeRefs.fpsModeRef}
            showNonRoadRef={runtimeRefs.showNonRoadRef}
            nonRoadGroupRef={runtimeRefs.nonRoadGroupRef}
            showRoadNetworkRef={runtimeRefs.showRoadNetworkRef}
            roadNetworkGroupRef={runtimeRefs.roadNetworkGroupRef}
            cameraFocusTargetRef={runtimeRefs.cameraFocusTargetRef}
            simulationDateRef={runtimeRefs.simulationDateRef}
            simulationTimeRef={runtimeRefs.simulationTimeRef}
            weatherModeRef={runtimeRefs.weatherModeRef}
            cameraPitchControlRef={runtimeRefs.cameraPitchControlRef}
            cameraYawControlRef={runtimeRefs.cameraYawControlRef}
            setStatus={setStatus}
            setStatusDetail={setStatusDetail}
            setLoadingProgress={setLoadingProgress}
            setStats={setStats}
            setFollowTaxiId={setFollowTaxiId}
            setCameraMode={setCameraMode}
            onCameraFocusChange={handleCameraFocusChange}
          />
        </MapSimulatorErrorBoundary>

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="정보 패널 열기"
          aria-expanded={isSidebarVisible}
          className={`absolute left-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-950/80 text-slate-300 shadow-xl backdrop-blur-md transition-all duration-300 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${
            isSidebarVisible ? "pointer-events-none opacity-0 -translate-x-4" : "pointer-events-auto opacity-100 translate-x-0"
          }`}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>



        {!isSceneBusy ? (
          <WeatherBadge
            weatherFetchStatus={weatherState.weatherFetchStatus}
            weatherObservation={weatherState.weatherObservation}
            simulationDate={simulationDate}
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


        <DemandSidebar
          isVisible={isSidebarVisible}
          onClose={toggleSidebar}
          selectedDongName={demandState.selectedDongName}
          setSelectedDongName={demandState.setSelectedDongName}
          demandFetchBadgeText={demandState.demandFetchBadgeText}
          demandFetchBadgeClass={demandState.demandFetchBadgeClass}
          hasDemandData={demandState.hasDemandData}
          selectedPeakDemand={demandState.selectedPeakDemand}
          selectedDemandIntensityLabel={demandState.selectedDemandIntensityLabel}
          currentDemandSlot={demandState.currentDemandSlot}
          currentFiveMinuteDemand={demandState.currentFiveMinuteDemand}
          appliedTaxiCount={demandState.appliedTaxiCount}
          demandChart={demandState.demandChart}
          selectedAverageDemand={demandState.selectedAverageDemand}
          heatmapFetchStatus={demandState.heatmapFetchStatus}
          heatmapHour={demandState.heatmapHour}
          heatmapMaxDemand={demandState.heatmapMaxDemand}
          heatmapScope={demandState.heatmapScope}
          setHeatmapHour={demandState.setHeatmapHour}
          setHeatmapScope={demandState.setHeatmapScope}
          demandMiniMap={demandState.demandMiniMap}
          mapPoiFeatureRows={mapPoiFeatureRows}
          onPoiSelect={handlePoiSelect}
          circumstanceMode={circumstanceMode}
          simulationDate={simulationDate}
          formattedSimulationTime={formattedSimulationTime}
          setCircumstanceMode={setCircumstanceMode}
          setSimulationDate={setSimulationDate}
          setSimulationTimeMinutes={setSimulationTimeMinutes}
          trafficLoadPercent={trafficLoadPercent}
          setTrafficLoadPercent={setTrafficLoadPercent}
          appliedTrafficCount={appliedTrafficCount}
        />

      </section>
    </div>
  );
}
