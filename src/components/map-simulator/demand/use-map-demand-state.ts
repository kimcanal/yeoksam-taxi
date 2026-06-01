import { useMemo } from "react";
import type * as THREE from "three";
import { buildDemandMiniMapData } from "@/components/map-simulator/demand";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";
import type { SimulationData } from "@/components/map-simulator/types";
import type { MiniMapFocus } from "@/components/map-simulator/hooks";
import { useDemandForecast, getAllDongScoresFromCache } from "@/components/map-simulator/demand";
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
    () => {
      // 캐시에서 전체 동 점수 읽기 + 현재 선택된 동 점수 보장
      const scores = getAllDongScoresFromCache(
        simulationDate,
        forecast.selectedWeekday,
        normalizedSimulationTimeMinutes,
      );
      if (forecast.selectedDemandScore !== null) {
        scores[forecast.selectedDongName] = forecast.selectedDemandScore;
      }
      return scores;
    },
    [
      forecast.selectedDemandScore,
      forecast.selectedDongName,
      forecast.selectedWeekday,
      normalizedSimulationTimeMinutes,
      simulationDate,
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
