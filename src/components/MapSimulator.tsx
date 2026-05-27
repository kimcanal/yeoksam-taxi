"use client";

import {
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { BuildVersionInfo } from "@/components/map-simulator/utils";
import { MapSimulatorErrorBoundary } from "@/components/MapSimulatorErrorBoundary";
import {
  WEATHER_OPTIONS,
  format24Hour,
  normalizeDayMinutes,
} from "@/components/map-simulator/environment";
import { MapSimulatorSceneRuntimeProps } from "@/components/map-simulator/map-simulator-scene-runtime";
import {
  type MiniMapFocus,
} from "@/components/map-simulator/hooks";
import { useMapSimulatorStores } from "@/components/map-simulator/hooks";
import { SceneLoading } from "@/components/map-simulator/ui/SceneLoading";
import { MapFooter } from "@/components/map-simulator/ui/MapFooter";
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
};

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

export default function MapSimulator({ buildVersion }: MapSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, setters } = useMapSimulatorStores();
  const {
    data,
    status,
    statusDetail,
    loadingProgress,
    simulationDate,
    simulationTimeMinutes,
    weatherMode,
    trafficLoadPercent,
    cameraMode,
    miniMapFocus,
    followTaxiId,
    selectedPoiCode,
    isSidebarCollapsed,
    isMobileLayout,
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
    simulationDate,
    normalizedSimulationTimeMinutes,
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
    simulationTimeMinutes,
    weatherMode,
  });
  const { setCameraControlValues, setCameraFocusTarget } = runtimeRefs;
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
    data,
    isMobileLayout,
    mapPoiFeatureRows,
    setCameraFocusTarget,
    setIsSidebarCollapsed,
    setSelectedPoiCode,
  ]);
  const handleCameraFocusChange = useCallback((focus: MiniMapFocus) => {
    setCameraControlValues(focus);
    setMiniMapFocus(focus);
  }, [setCameraControlValues, setMiniMapFocus]);
  const formattedSimulationTime = format24Hour(normalizedSimulationTimeMinutes);
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

  function handleSimulationDateChange(date: string) {
    setSimulationDate(date);
    demandState.setSimulationDateWeekday(date);
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
          <MapFooter
            isSidebarVisible={isSidebarVisible}
            demandFetchBadgeText={demandState.demandFetchBadgeText}
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


        <DemandSidebar
          isVisible={isSidebarVisible}
          onClose={toggleSidebar}
          selectedDongName={demandState.selectedDongName}
          setSelectedDongName={demandState.setSelectedDongName}
          selectedWeekday={demandState.selectedWeekday}
          setSelectedWeekday={demandState.setSelectedWeekday}
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
          demandMiniMap={demandState.demandMiniMap}
          mapPoiFeatureRows={mapPoiFeatureRows}
          onPoiSelect={handlePoiSelect}
          simulationDate={simulationDate}
          formattedSimulationTime={formattedSimulationTime}
          setCircumstanceMode={setCircumstanceMode}
          setSimulationDate={handleSimulationDateChange}
          setSimulationTimeMinutes={setSimulationTimeMinutes}
          weatherMode={weatherMode}
          setWeatherMode={setWeatherMode}
          trafficLoadPercent={trafficLoadPercent}
          setTrafficLoadPercent={setTrafficLoadPercent}
          appliedTrafficCount={appliedTrafficCount}
        />

      </section>
    </div>
  );
}
