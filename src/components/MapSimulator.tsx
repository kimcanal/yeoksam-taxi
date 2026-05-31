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
import type { CircumstanceMode } from "@/components/map-simulator/types";
import { MapSimulatorErrorBoundary } from "@/components/MapSimulatorErrorBoundary";
import {
  format24Hour,
  normalizeDayMinutes,
  useWeatherForecast,
} from "@/components/map-simulator/environment";
import { MapSimulatorSceneRuntimeProps } from "@/components/map-simulator/map-simulator-scene-runtime";
import { useLiveClockSync } from "@/components/map-simulator/hooks/use-live-clock-sync";
import { useMapInteractions } from "@/components/map-simulator/hooks/use-map-interactions";
import { pitchFromControlValue } from "@/components/map-simulator/camera";
import { useMapPoiState } from "@/components/map-simulator/hooks/use-map-poi-state";
import { useMapSceneRuntimeRefs } from "@/components/map-simulator/hooks/use-map-scene-runtime-refs";
import { useMapSimulatorStores } from "@/components/map-simulator/hooks/use-map-simulator-stores";
import { useSimulationDataLoader } from "@/components/map-simulator/hooks/use-simulation-data-loader";
import { SceneLoading } from "@/components/map-simulator/ui/SceneLoading";
import { WeatherBadge } from "@/components/map-simulator/ui/WeatherBadge";
import { Menu } from "lucide-react";
import type { DemandSidebarProps } from "@/components/map-simulator/ui/DemandSidebar";
import type { FpsMode } from "@/components/map-simulator/camera";
import { useMapDemandState } from "@/components/map-simulator/demand";
import { trafficCountForLoadPercent } from "@/components/map-simulator/simulation";

type MapSimulatorProps = {
  buildVersion: BuildVersionInfo;
  initialMode?: CircumstanceMode;
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

export default function MapSimulator({
  buildVersion,
  initialMode = "live",
}: MapSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  // 실시간 시계 및 초기 환경 연동 훅
  useLiveClockSync({
    initialMode,
    circumstanceMode,
    setCircumstanceMode,
    setSimulationDate,
    setSimulationTimeMinutes,
    setIsSidebarCollapsed,
  });

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
    appliedTaxiCount: demandState.appliedMapTaxiCount,
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

  // POI 및 미니맵 카메라 상호작용 훅
  const { handlePoiSelect, handleCameraFocusChange } = useMapInteractions({
    data,
    mapPoiFeatureRows,
    circumstanceMode,
    setSelectedPoiCode,
    setIsSidebarCollapsed,
    setCameraMode,
    setMiniMapFocus,
    setCameraFocusTarget,
    setCameraControlValues,
  });

  const compassAngle = useMemo(() => {
    if (!miniMapFocus) {
      return 0;
    }
    // headingX and headingZ represent the camera's horizontal forward direction.
    // In Three.js, positive X is East, negative Z is North.
    // So Math.atan2(headingX, -headingZ) computes the angle in radians clockwise from North.
    const angleRad = Math.atan2(miniMapFocus.headingX, -miniMapFocus.headingZ);
    return (angleRad * 180) / Math.PI;
  }, [miniMapFocus]);

  const handleResetCompass = useCallback(() => {
    if (!miniMapFocus) {
      return;
    }

    // Switch to free-drive mode if not already
    setCameraMode("drive");

    // Command the 3D camera to smoothly transition and align exactly North-Up
    setCameraFocusTarget({
      x: miniMapFocus.x,
      z: miniMapFocus.z,
      distance: 120, // A highly readable default distance that looks pristine!
      yaw: 0, // 0 is exactly North-Up!
      pitch: pitchFromControlValue(miniMapFocus.pitchControlValue),
      label: "지도 정북 방향 정렬",
    });
  }, [miniMapFocus, setCameraMode, setCameraFocusTarget]);

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

        {/* 나침반 UI */}
        {!isSceneBusy && miniMapFocus ? (
          <div
            data-ui-panel="compass"
            onClick={handleResetCompass}
            title="클릭 시 지도 정북 방향(North-Up) 정렬"
            className="absolute right-4 top-4 z-30 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 p-3 shadow-xl backdrop-blur-md transition-all duration-300 cursor-pointer hover:bg-slate-900/90 hover:scale-105 active:scale-95"
          >
            <div className="relative h-12 w-12 flex items-center justify-center">
              {/* 나침반 다이얼 */}
              <div
                className="absolute inset-0 rounded-full border border-white/5 bg-slate-900/40 transition-transform duration-200"
                style={{ transform: `rotate(${-compassAngle}deg)` }}
              >
                {/* 방위 표시 */}
                <span className="absolute left-1/2 top-0.5 -translate-x-1/2 text-[9px] font-bold text-red-500">N</span>
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400">S</span>
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">W</span>
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">E</span>
              </div>
              {/* 바늘 */}
              <div className="z-10 h-7 w-0.5 bg-gradient-to-b from-red-500 to-slate-400 rounded-full shadow-lg" />
            </div>
            <span className="mt-1 text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
              {Math.round((compassAngle + 360) % 360)}° {(() => {
                const normalizedAngle = ((compassAngle % 360) + 360) % 360;
                if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return "북";
                if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return "북동";
                if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return "동";
                if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return "남동";
                if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return "남";
                if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return "남서";
                if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return "서";
                return "북서";
              })()}
            </span>
          </div>
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
          demandState={demandState}
          poiState={{
            mapPoiFeatureRows,
            onPoiSelect: handlePoiSelect,
          }}
          environmentControls={{
            circumstanceMode,
            simulationDate,
            formattedSimulationTime,
            setCircumstanceMode,
            setSimulationDate,
            setSimulationTimeMinutes,
          }}
        />

      </section>
    </div>
  );
}
