import { sceneSetters, sceneStore, uiSetters, uiStore } from "@/components/map-simulator/hooks";

export function useMapSimulatorStores() {
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
  
  return {
    state: {
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
    },
    setters: {
      ...sceneSetters,
      ...uiSetters,
    },
  };
}
