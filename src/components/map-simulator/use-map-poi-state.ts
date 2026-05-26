import { useMemo } from "react";
import type { CameraMode } from "@/components/map-simulator/camera-types";
import { buildStaticPoiFeatureRows } from "@/components/map-simulator/demand-minimap-renderer";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand-types";
import type { SimulationData } from "@/components/map-simulator/map-simulator-types";
import {
  buildPoiSpatialIndex,
  visiblePoiRowsForCamera,
} from "@/components/map-simulator/poi-render-utils";
import type { MiniMapFocus } from "@/components/map-simulator/simulator-stores";
import { useSyncRef } from "@/components/map-simulator/use-sync-ref";

type UseMapPoiStateParams = {
  data: SimulationData | null;
  selectedPoiCode: string;
  cameraMode: CameraMode;
  miniMapFocus: MiniMapFocus | null;
};

export function useMapPoiState({
  data,
  selectedPoiCode,
  cameraMode,
  miniMapFocus,
}: UseMapPoiStateParams) {
  const mapPoiFeatureRows = useMemo<MapPoiFeatureRow[]>(
    () => buildStaticPoiFeatureRows(),
    [],
  );
  const poiSpatialIndex = useMemo(() => {
    if (!data) {
      return null;
    }
    return buildPoiSpatialIndex(mapPoiFeatureRows, data.center);
  }, [data, mapPoiFeatureRows]);
  const activePoiCode = mapPoiFeatureRows.some(
    (poi) => poi.poi_code === selectedPoiCode,
  )
    ? selectedPoiCode
    : mapPoiFeatureRows[0]?.poi_code ?? "";
  const scenePoiFeatureRows = useMemo(
    () =>
      visiblePoiRowsForCamera({
        rows: mapPoiFeatureRows,
        spatialIndex: poiSpatialIndex,
        activePoiCode,
        cameraMode,
        miniMapFocus,
      }),
    [
      activePoiCode,
      cameraMode,
      mapPoiFeatureRows,
      miniMapFocus,
      poiSpatialIndex,
    ],
  );
  const scenePoiFeatureRowsRef = useSyncRef(scenePoiFeatureRows);

  return {
    activePoiCode,
    mapPoiFeatureRows,
    scenePoiFeatureRowsRef,
  };
}
