import type { WeatherMode } from "@/components/map-simulator/simulation-environment";
import { HYDRATION_SAFE_SIMULATION_CLOCK } from "@/components/map-simulator/simulation-environment";
import type {
  CameraMode,
  CircumstanceMode,
  FpsStats,
  SceneStatus,
  SimulationData,
  Stats,
} from "@/components/map-simulator/core";
import { DEFAULT_TAXI_COUNT } from "@/components/map-simulator/core";
import {
  createFieldSetter,
  createStore,
} from "@/lib/external-store";

export type MiniMapFocus = {
  x: number;
  z: number;
  label: string;
  headingX: number;
  headingZ: number;
};

type SceneState = {
  data: SimulationData | null;
  status: SceneStatus;
  statusDetail: string;
  loadingProgress: number;
  circumstanceMode: CircumstanceMode;
  simulationDate: string;
  simulationTimeMinutes: number;
  weatherMode: WeatherMode;
  cameraMode: CameraMode;
  miniMapFocus: MiniMapFocus | null;
  followTaxiId: string;
  showFps: boolean;
  fpsStats: FpsStats;
  stats: Stats;
};

type UiState = {
  selectedPoiCode: string;
  isSidebarCollapsed: boolean;
  isMapFocusMode: boolean;
  isScenarioControlsExpanded: boolean;
};

type AnalysisState = {
  externalPatternId: string;
  demandImbalanceMap: Record<string, number>; // DongName -> Score (-1 to 1)
  predictedFlowIntensity: number;
  highlightedAnomalies: string[]; // List of POI codes
};


const initialSceneState: SceneState = {
  data: null,
  status: "loading",
  statusDetail: "OSM 지도 데이터 불러오는 중",
  loadingProgress: 0,
  circumstanceMode: "specific",
  simulationDate: HYDRATION_SAFE_SIMULATION_CLOCK.dateIso,
  simulationTimeMinutes: HYDRATION_SAFE_SIMULATION_CLOCK.minutes,
  weatherMode: "clear",
  cameraMode: "overview",
  miniMapFocus: null,
  followTaxiId: "",
  showFps: false,
  fpsStats: {
    fps: 60,
    capLabel: "60 FPS",
    simulationMs: 0,
    signalMs: 0,
    vehicleMs: 0,
    overlayMs: 0,
    renderMs: 0,
    simulationHz: 0,
    vehicles: 0,
  },
  stats: {
    taxis: DEFAULT_TAXI_COUNT,
    traffic: 0,
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
  },
};

const initialUiState: UiState = {
  selectedPoiCode: "",
  isSidebarCollapsed: true,
  isMapFocusMode: false,
  isScenarioControlsExpanded: false,
};

const initialAnalysisState: AnalysisState = {
  externalPatternId: "none",
  demandImbalanceMap: {},
  predictedFlowIntensity: 0,
  highlightedAnomalies: [],
};


export const sceneStore = createStore(initialSceneState);
export const uiStore = createStore(initialUiState);
export const analysisStore = createStore(initialAnalysisState);


export const sceneSetters = {
  setData: createFieldSetter(sceneStore, "data"),
  setStatus: createFieldSetter(sceneStore, "status"),
  setStatusDetail: createFieldSetter(sceneStore, "statusDetail"),
  setLoadingProgress: createFieldSetter(sceneStore, "loadingProgress"),
  setCircumstanceMode: createFieldSetter(sceneStore, "circumstanceMode"),
  setSimulationDate: createFieldSetter(sceneStore, "simulationDate"),
  setSimulationTimeMinutes: createFieldSetter(sceneStore, "simulationTimeMinutes"),
  setWeatherMode: createFieldSetter(sceneStore, "weatherMode"),
  setCameraMode: createFieldSetter(sceneStore, "cameraMode"),
  setMiniMapFocus: createFieldSetter(sceneStore, "miniMapFocus"),
  setFollowTaxiId: createFieldSetter(sceneStore, "followTaxiId"),
  setShowFps: createFieldSetter(sceneStore, "showFps"),
  setFpsStats: createFieldSetter(sceneStore, "fpsStats"),
  setStats: createFieldSetter(sceneStore, "stats"),
};

export const uiSetters = {
  setSelectedPoiCode: createFieldSetter(uiStore, "selectedPoiCode"),
  setIsSidebarCollapsed: createFieldSetter(uiStore, "isSidebarCollapsed"),
  setIsMapFocusMode: createFieldSetter(uiStore, "isMapFocusMode"),
  setIsScenarioControlsExpanded: createFieldSetter(
    uiStore,
    "isScenarioControlsExpanded",
  ),
};

export const analysisSetters = {
  setExternalPatternId: createFieldSetter(analysisStore, "externalPatternId"),
  setDemandImbalanceMap: createFieldSetter(analysisStore, "demandImbalanceMap"),
  setPredictedFlowIntensity: createFieldSetter(analysisStore, "predictedFlowIntensity"),
  setHighlightedAnomalies: createFieldSetter(analysisStore, "highlightedAnomalies"),
};
