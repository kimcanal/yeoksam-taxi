import { useMemo } from "react";
import type * as THREE from "three";
import { buildDemandMiniMapData } from "@/components/map-simulator/demand";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";
import type {
  CircumstanceMode,
  SimulationData,
} from "@/components/map-simulator/types";
import type { MiniMapFocus } from "@/components/map-simulator/hooks/simulator-stores";
import { useDemandForecast } from "@/components/map-simulator/demand";
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

function buildDongDemandScores(heatmapDemandByDong: Record<string, number>) {
  const scores: Record<string, number> = {};
  const maxDemand = Math.max(0, ...Object.values(heatmapDemandByDong));
  if (maxDemand <= 0) {
    return scores;
  }
  Object.entries(heatmapDemandByDong).forEach(([dongName, demand]) => {
    scores[dongName] = Math.max(0, demand) / maxDemand;
  });
  return scores;
}

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
  const dongDemandScores = useMemo(
    () => buildDongDemandScores(forecast.heatmapDemandByDong),
    [forecast.heatmapDemandByDong],
  );
  const demandMiniMap = useMemo(
    () =>
      buildDemandMiniMapData({
        data,
        mapPoiFeatureRows,
        miniMapFocus,
        scenarioMapCenter,
        activePoiCode,
        dongDemandCounts: forecast.heatmapDemandByDong,
        selectedDongName: forecast.selectedDongName,
        dongDemandScores,
      }),
    [
      activePoiCode,
      data,
      dongDemandScores,
      forecast.heatmapDemandByDong,
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
