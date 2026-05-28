import { useMemo } from "react";
import type * as THREE from "three";
import { buildDemandMiniMapData } from "@/components/map-simulator/demand";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";
import type { SimulationData } from "@/components/map-simulator/types";
import type { MiniMapFocus } from "@/components/map-simulator/hooks";
import { useDemandForecast } from "@/components/map-simulator/demand";
import { useSyncRef } from "@/components/map-simulator/hooks";

type UseMapDemandStateParams = {
  data: SimulationData | null;
  mapPoiFeatureRows: MapPoiFeatureRow[];
  miniMapFocus: MiniMapFocus | null;
  scenarioMapCenter: THREE.Vector3 | null;
  activePoiCode: string;
  simulationDate: string;
  normalizedSimulationTimeMinutes: number;
};

function buildDongDemandScores({
  selectedDongName,
  selectedDemandScore,
}: {
  selectedDongName: string;
  selectedDemandScore: number | null;
}) {
  const scores: Record<string, number> = {};
  if (selectedDemandScore !== null) {
    scores[selectedDongName] = selectedDemandScore;
  }
  return scores;
}

export function useMapDemandState({
  data,
  mapPoiFeatureRows,
  miniMapFocus,
  scenarioMapCenter,
  activePoiCode,
  simulationDate,
  normalizedSimulationTimeMinutes,
}: UseMapDemandStateParams) {
  const forecast = useDemandForecast({
    simulationDate,
    normalizedSimulationTimeMinutes,
  });
  const dongDemandScores = useMemo(
    () =>
      buildDongDemandScores({
        selectedDongName: forecast.selectedDongName,
        selectedDemandScore: forecast.selectedDemandScore,
      }),
    [
      forecast.selectedDemandScore,
      forecast.selectedDongName,
    ],
  );
  const demandMiniMap = useMemo(
    () =>
      buildDemandMiniMapData({
        data,
        mapPoiFeatureRows,
        miniMapFocus,
        scenarioMapCenter,
        activePoiCode,
        selectedDongName: forecast.selectedDongName,
        dongDemandScores,
      }),
    [
      activePoiCode,
      data,
      dongDemandScores,
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
