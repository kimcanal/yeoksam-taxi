import { useMemo } from "react";
import type * as THREE from "three";
import {
  buildDemandMiniMapData,
  useDemandForecast,
} from "@/components/map-simulator/demand";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";
import type {
  CircumstanceMode,
  SimulationData,
} from "@/components/map-simulator/types";
import type { MiniMapFocus } from "@/components/map-simulator/hooks/simulator-stores";
import { useSyncRef } from "@/components/map-simulator/hooks/use-sync-ref";

type UseMapDemandStateParams = {
  data: SimulationData | null;
  mapPoiFeatureRows: MapPoiFeatureRow[];
  miniMapFocus: MiniMapFocus | null;
  scenarioMapCenter: THREE.Vector3 | null;
  activePoiCode: string;
  circumstanceMode: CircumstanceMode;
  simulationDate: string;
  normalizedSimulationTimeMinutes: number;
};

export function useMapDemandState({
  data,
  mapPoiFeatureRows,
  miniMapFocus,
  scenarioMapCenter,
  activePoiCode,
  circumstanceMode,
  simulationDate,
  normalizedSimulationTimeMinutes,
}: UseMapDemandStateParams) {
  const forecast = useDemandForecast({
    circumstanceMode,
    simulationDate,
    normalizedSimulationTimeMinutes,
  });
  const demandMiniMap = useMemo(
    () =>
      buildDemandMiniMapData({
        data,
        mapPoiFeatureRows,
        miniMapFocus,
        scenarioMapCenter,
        activePoiCode,
        dongDemandCounts: forecast.activeMiniMapCounts,
        selectedDongName: forecast.selectedDongName,
        dongDemandScores: forecast.activeMiniMapScores,
      }),
    [
      activePoiCode,
      data,
      forecast.activeMiniMapScores,
      forecast.activeMiniMapCounts,
      forecast.selectedDongName,
      mapPoiFeatureRows,
      miniMapFocus,
      scenarioMapCenter,
    ],
  );
  const currentDemandVisualUnitsRef = useSyncRef(
    forecast.currentDemandVisualUnits,
  );
  const currentFiveMinuteDemandRef = useSyncRef(
    forecast.currentFiveMinuteDemand,
  );
  const hasDemandDataRef = useSyncRef(forecast.hasDemandData);
  const selectedDemandDongRef = useSyncRef(forecast.selectedDongName);
  const selectedDemandScoreRef = useSyncRef(forecast.selectedDemandScore);

  return {
    ...forecast,
    demandMiniMap,
    refs: {
      currentDemandVisualUnitsRef,
      currentFiveMinuteDemandRef,
      hasDemandDataRef,
      selectedDemandDongRef,
      selectedDemandScoreRef,
    },
  };
}
