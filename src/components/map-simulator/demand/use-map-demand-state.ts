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
  data,
  normalizedSimulationTimeMinutes,
  selectedDongName,
  selectedDemandScore,
}: {
  data: SimulationData | null;
  normalizedSimulationTimeMinutes: number;
  selectedDongName: string;
  selectedDemandScore: number | null;
}) {
  const scores: Record<string, number> = {};
  if (!data?.dongRegions) {
    return scores;
  }

  const hour = Math.floor(normalizedSimulationTimeMinutes / 60);
  data.dongRegions.forEach((dong, index) => {
    if (dong.name === selectedDongName) {
      scores[dong.name] = selectedDemandScore ?? 0;
      return;
    }
    scores[dong.name] = (Math.sin(hour * 0.5 + index) + 1) / 2;
  });
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
        data,
        normalizedSimulationTimeMinutes,
        selectedDongName: forecast.selectedDongName,
        selectedDemandScore: forecast.selectedDemandScore,
      }),
    [
      data,
      forecast.selectedDemandScore,
      forecast.selectedDongName,
      normalizedSimulationTimeMinutes,
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
  const dongDemandScoresRef = useSyncRef(dongDemandScores);
  const hasDemandDataRef = useSyncRef(forecast.hasDemandData);
  const selectedDemandDongRef = useSyncRef(forecast.selectedDongName);
  const selectedDemandScoreRef = useSyncRef(forecast.selectedDemandScore);

  return {
    ...forecast,
    demandMiniMap,
    refs: {
      currentDemandVisualUnitsRef,
      currentFiveMinuteDemandRef,
      dongDemandScoresRef,
      hasDemandDataRef,
      selectedDemandDongRef,
      selectedDemandScoreRef,
    },
  };
}
