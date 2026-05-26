import * as THREE from "three";
import { projectPoint } from "@/components/map-simulator/utils";
import { dongContainsPoint } from "@/components/map-simulator/utils";
import type {
  DongRegion,
  TaxiStandLandmark,
} from "@/components/map-simulator/types";
import type { MapPoiFeatureRow } from "@/components/map-simulator/demand";

export type DemandAnchorKind = "poi" | "stand";

export type DemandAnchor = {
  id: string;
  label: string;
  kind: DemandAnchorKind;
  position: THREE.Vector3;
  dongNames: string[];
  score: number;
};

type BuildDemandAnchorsParams = {
  poiFeatureRows: MapPoiFeatureRow[];
  taxiStandLandmarks: TaxiStandLandmark[];
  dongRegions: DongRegion[];
  center: { lat: number; lon: number };
};

export function poiMarkerColor(category: string | null | undefined) {
  if (category === "station_context") return "#67e8f9";
  if (category === "road_corridor_context") return "#93c5fd";
  return "#bae6fd";
}

export function buildDemandAnchors({
  poiFeatureRows,
  taxiStandLandmarks,
  dongRegions,
  center,
}: BuildDemandAnchorsParams) {
  const poiDemandAnchors = poiFeatureRows
    .filter(
      (poi) =>
        Number.isFinite(poi.lon) &&
        Number.isFinite(poi.lat),
    )
    .map((poi) => {
      const projected = projectPoint(
        [poi.lon as number, poi.lat as number],
        center,
      );
      const position = new THREE.Vector3(projected.x, 0, projected.z);
      const inferredDongs = poi.coverage_dong
        ? [poi.coverage_dong]
        : dongRegions
            .filter((dong) => dongContainsPoint(dong, position))
            .map((dong) => dong.name);

      return {
        id: `poi-${poi.poi_code}`,
        label: poi.poi_name,
        kind: "poi" as const,
        position,
        dongNames: inferredDongs,
        score: THREE.MathUtils.clamp(poi.context_score, 0.25, 1),
      } satisfies DemandAnchor;
    })
    .filter((anchor) => anchor.dongNames.length > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 24);

  const standDemandAnchors = taxiStandLandmarks
    .map((stand) => ({
      id: `stand-${stand.standId || stand.id}`,
      label: stand.name,
      kind: "stand" as const,
      position: stand.position.clone().setY(0),
      dongNames: [stand.dongName],
      score: stand.isShelter ? 0.72 : 0.58,
    }) satisfies DemandAnchor)
    .slice(0, 24);

  return [...poiDemandAnchors, ...standDemandAnchors];
}
