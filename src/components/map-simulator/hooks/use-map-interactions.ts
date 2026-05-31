import { useCallback } from "react";
import type { SimulationData } from "@/components/map-simulator/types";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";
import type { MiniMapFocus } from "@/components/map-simulator/hooks/simulator-stores";
import type { CameraMode, CameraFocusTarget } from "@/components/map-simulator/camera";
import type { CircumstanceMode } from "@/components/map-simulator/types";
import { projectPoint } from "@/components/map-simulator/utils";

type MapInteractionsParams = {
  data: SimulationData | null;
  mapPoiFeatureRows: MapPoiFeatureRow[];
  circumstanceMode: CircumstanceMode;
  setSelectedPoiCode: (code: string) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  setCameraMode: (mode: CameraMode) => void;
  setMiniMapFocus: (focus: MiniMapFocus) => void;
  setCameraFocusTarget: (target: CameraFocusTarget | null) => void;
  setCameraControlValues: (values: { pitchControlValue: number; yawControlValue: number }) => void;
};

export function useMapInteractions({
  data,
  mapPoiFeatureRows,
  circumstanceMode,
  setSelectedPoiCode,
  setIsSidebarCollapsed,
  setCameraMode,
  setMiniMapFocus,
  setCameraFocusTarget,
  setCameraControlValues,
}: MapInteractionsParams) {
  const handlePoiSelect = useCallback((poiCode: string) => {
    const poi = mapPoiFeatureRows.find((row) => row.poi_code === poiCode);
    setSelectedPoiCode(poiCode);
    if (circumstanceMode !== "live") {
      setIsSidebarCollapsed(false);
    }
    if (
      data &&
      poi &&
      Number.isFinite(poi.lon) &&
      Number.isFinite(poi.lat)
    ) {
      const projected = projectPoint(
        [poi.lon as number, poi.lat as number],
        data.center,
      );
      setCameraFocusTarget({
        x: projected.x,
        z: projected.z,
        distance: 78,
        pitch: 0.68,
        label: poi.poi_name,
      });
      setCameraMode("drive");
    }
  }, [
    circumstanceMode,
    data,
    mapPoiFeatureRows,
    setCameraFocusTarget,
    setIsSidebarCollapsed,
    setSelectedPoiCode,
    setCameraMode,
  ]);

  const handleCameraFocusChange = useCallback((focus: MiniMapFocus) => {
    setCameraControlValues(focus);
    setMiniMapFocus(focus);
  }, [setCameraControlValues, setMiniMapFocus]);

  return {
    handlePoiSelect,
    handleCameraFocusChange,
  };
}
