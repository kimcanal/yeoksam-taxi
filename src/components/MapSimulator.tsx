"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { BuildVersionInfo } from "@/components/map-simulator/build-version";
import { MapSimulatorErrorBoundary } from "@/components/MapSimulatorErrorBoundary";
import {
  WEATHER_OPTIONS,
  format24Hour,
  formatDateLabel,
  normalizeDayMinutes,
} from "@/components/map-simulator/simulation-environment";
import type { MapSimulatorSceneRuntimeProps } from "@/components/map-simulator/MapSimulatorSceneRuntime";
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
import { DEMAND_VISUAL_UNIT_CALLS } from "@/components/map-simulator/demand-utils";
import type { FpsMode } from "@/components/map-simulator/camera-types";
import { projectPoint } from "@/components/map-simulator/map-geometry-utils";
import { useMapDemandState } from "@/components/map-simulator/use-map-demand-state";
import { useMapPoiState } from "@/components/map-simulator/use-map-poi-state";
import { useMapSceneRuntimeRefs } from "@/components/map-simulator/use-map-scene-runtime-refs";
import { useSimulationDataLoader } from "@/components/map-simulator/use-simulation-data-loader";
import { trafficCountForLoadPercent } from "@/components/map-simulator/simulation-defaults";

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
  const trafficLoadPercent = sceneStore.useStore(
    (state) => state.trafficLoadPercent,
  );
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
    setTrafficLoadPercent,
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

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const syncMobileLayout = () => setIsMobileLayout(mediaQuery.matches);
    syncMobileLayout();
    mediaQuery.addEventListener("change", syncMobileLayout);
    return () => {
      mediaQuery.removeEventListener("change", syncMobileLayout);
    };
  }, []);

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
  const selectedWeather =
    WEATHER_OPTIONS.find((option) => option.id === weatherMode) ??
    WEATHER_OPTIONS[0];
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
    setCameraMode,
    setIsSidebarCollapsed,
    setIsScenarioControlsExpanded,
    setSelectedPoiCode,
  ]);
  const handleCameraFocusChange = useCallback((focus: MiniMapFocus) => {
    setCameraControlValues(focus);
    setMiniMapFocus(focus);
  }, [setCameraControlValues, setMiniMapFocus]);
  const formattedSimulationTime = format24Hour(normalizedSimulationTimeMinutes);
  const formattedSimulationDate = formatDateLabel(simulationDate);
  const isSidebarVisible = !isSidebarCollapsed;
  const mapCanvasClass = isSidebarVisible
    ? "h-full w-full border-white/10 transition-[margin,width] duration-300 ease-in-out lg:ml-[var(--demand-sidebar-width)] lg:w-[calc(100%-var(--demand-sidebar-width))] lg:border-l"
    : "h-full w-full transition-[margin,width] duration-300 ease-in-out";
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

        <MapSearchControl
          isSidebarVisible={isSidebarVisible}
          isScenarioControlsExpanded={isScenarioControlsExpanded}
          toggleScenarioControls={toggleScenarioControls}
          formattedSimulationTime={formattedSimulationTime}
          formattedSimulationDate={formattedSimulationDate}
          hasDemandData={demandState.hasDemandData}
          appliedTaxiCount={demandState.appliedTaxiCount}
          appliedTrafficCount={appliedTrafficCount}
          trafficLoadPercent={trafficLoadPercent}
          selectedWeather={selectedWeather}
          toggleSidebar={toggleSidebar}
          simulationDate={simulationDate}
          setCircumstanceMode={setCircumstanceMode}
          setSimulationDate={handleSimulationDateChange}
          setSimulationTimeMinutes={setSimulationTimeMinutes}
          weatherMode={weatherMode}
          setWeatherMode={setWeatherMode}
          setTrafficLoadPercent={setTrafficLoadPercent}
        />

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



        <button
          type="button"
          aria-label="정보 패널 닫기"
          aria-hidden={!isSidebarVisible}
          tabIndex={isSidebarVisible ? 0 : -1}
          onClick={toggleSidebar}
          className={`absolute inset-0 z-10 bg-slate-950/56 transition-opacity duration-300 ease-in-out lg:hidden ${
            isSidebarVisible
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        />

        <DemandSidebar
          isVisible={isSidebarVisible}
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
        />

      </section>
    </div>
  );
}
