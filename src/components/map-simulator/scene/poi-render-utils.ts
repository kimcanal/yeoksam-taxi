import { QuadTree } from "@/components/map-simulator/utils";
import { projectPoint } from "@/components/map-simulator/utils";
import type { MiniMapFocus } from "@/components/map-simulator/hooks/simulator-stores";
import type { CameraMode } from "@/components/map-simulator/camera";
import type {
  IndexedMapPoiFeatureRow,
  MapPoiFeatureRow,
} from "@/components/map-simulator/demand";

type PoiSpatialIndex = {
  tree: QuadTree<IndexedMapPoiFeatureRow>;
  byCode: Map<string, IndexedMapPoiFeatureRow>;
};

function poiRenderRadius(cameraMode: CameraMode) {
  if (cameraMode === "overview") return 320;
  if (cameraMode === "follow") return 180;
  if (cameraMode === "ride") return 140;
  return 220;
}

export function buildPoiSpatialIndex(
  rows: MapPoiFeatureRow[],
  center: { lat: number; lon: number },
): PoiSpatialIndex | null {
  const indexedRows = rows
    .filter((poi) => Number.isFinite(poi.lon) && Number.isFinite(poi.lat))
    .map((poi) => {
      const projected = projectPoint(
        [poi.lon as number, poi.lat as number],
        center,
      );
      return {
        ...poi,
        projectedX: projected.x,
        projectedZ: projected.z,
      } satisfies IndexedMapPoiFeatureRow;
    });

  if (!indexedRows.length) {
    return null;
  }

  const minX = Math.min(...indexedRows.map((poi) => poi.projectedX));
  const maxX = Math.max(...indexedRows.map((poi) => poi.projectedX));
  const minY = Math.min(...indexedRows.map((poi) => poi.projectedZ));
  const maxY = Math.max(...indexedRows.map((poi) => poi.projectedZ));
  const tree = new QuadTree<IndexedMapPoiFeatureRow>({
    minX: minX - 1,
    minY: minY - 1,
    maxX: maxX + 1,
    maxY: maxY + 1,
  });
  indexedRows.forEach((poi) => {
    tree.insert({
      x: poi.projectedX,
      y: poi.projectedZ,
      value: poi,
    });
  });

  return {
    tree,
    byCode: new Map(indexedRows.map((poi) => [poi.poi_code, poi] as const)),
  };
}

type VisiblePoiRowsParams = {
  rows: MapPoiFeatureRow[];
  spatialIndex: PoiSpatialIndex | null;
  activePoiCode: string;
  cameraMode: CameraMode;
  miniMapFocus: MiniMapFocus | null;
};

export function visiblePoiRowsForCamera({
  rows,
  spatialIndex,
  activePoiCode,
  cameraMode,
  miniMapFocus,
}: VisiblePoiRowsParams) {
  if (!spatialIndex) {
    return rows;
  }

  const radius = poiRenderRadius(cameraMode);
  const focusX = miniMapFocus?.x ?? 0;
  const focusZ = miniMapFocus?.z ?? 0;
  const nearbyRows = spatialIndex.tree
    .query({
      minX: focusX - radius,
      minY: focusZ - radius,
      maxX: focusX + radius,
      maxY: focusZ + radius,
    })
    .map((entry) => entry.value);
  const selectedPoi = spatialIndex.byCode.get(activePoiCode);
  const deduped = new Map<string, MapPoiFeatureRow>();
  nearbyRows.forEach((poi) => deduped.set(poi.poi_code, poi));
  if (selectedPoi) {
    deduped.set(selectedPoi.poi_code, selectedPoi);
  }

  return [...deduped.values()]
    .sort((left, right) => right.context_score - left.context_score)
    .slice(0, 24);
}
