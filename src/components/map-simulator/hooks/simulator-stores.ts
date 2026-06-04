import type { WeatherMode } from "@/components/map-simulator/environment";
import { currentSimulationClock } from "@/components/map-simulator/environment";
import type { CameraMode } from "@/components/map-simulator/camera";
import type {
  CircumstanceMode,
  FpsStats,
  SceneStatus,
  SimulationData,
  Stats,
} from "@/components/map-simulator/types";
import {
  DEFAULT_TAXI_COUNT,
  DEFAULT_TRAFFIC_COUNT,
  DEFAULT_TRAFFIC_LOAD_PERCENT,
} from "@/components/map-simulator/simulation";
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
  pitchControlValue: number;
  yawControlValue: number;
};

export type GraphicsQuality = "performance" | "quality";

type SceneState = {
  data: SimulationData | null;
  status: SceneStatus;
  statusDetail: string;
  loadingProgress: number;
  circumstanceMode: CircumstanceMode;
  simulationDate: string;
  simulationTimeMinutes: number;
  weatherMode: WeatherMode;
  trafficLoadPercent: number;
  cameraMode: CameraMode;
  graphicsQuality: GraphicsQuality;
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
};

const initialSimulationClock = currentSimulationClock();

const initialSceneState: SceneState = {
  data: null,
  status: "loading",
  statusDetail: "OSM 지도 데이터 불러오는 중",
  loadingProgress: 0,
  circumstanceMode: "live",
  simulationDate: initialSimulationClock.dateIso,
  simulationTimeMinutes: initialSimulationClock.minutes,
  weatherMode: "clear",
  trafficLoadPercent: DEFAULT_TRAFFIC_LOAD_PERCENT,
  cameraMode: "overview",
  graphicsQuality: "performance",
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
    visibleVehicles: 0,
    buildingChunksVisible: 0,
    buildingChunksTotal: 0,
    roadChunksVisible: 0,
    roadChunksTotal: 0,
  },
  stats: {
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
  },
};

const initialUiState: UiState = {
  selectedPoiCode: "",
  isSidebarCollapsed: true,
  isMapFocusMode: false,
};

export const sceneStore = createStore(initialSceneState);
export const uiStore = createStore(initialUiState);

export const sceneSetters = {
  setData: createFieldSetter(sceneStore, "data"),
  setStatus: createFieldSetter(sceneStore, "status"),
  setStatusDetail: createFieldSetter(sceneStore, "statusDetail"),
  setLoadingProgress: createFieldSetter(sceneStore, "loadingProgress"),
  setCircumstanceMode: createFieldSetter(sceneStore, "circumstanceMode"),
  setSimulationDate: createFieldSetter(sceneStore, "simulationDate"),
  setSimulationTimeMinutes: createFieldSetter(sceneStore, "simulationTimeMinutes"),
  setWeatherMode: createFieldSetter(sceneStore, "weatherMode"),
  setTrafficLoadPercent: createFieldSetter(sceneStore, "trafficLoadPercent"),
  setCameraMode: createFieldSetter(sceneStore, "cameraMode"),
  setGraphicsQuality: createFieldSetter(sceneStore, "graphicsQuality"),
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
};
