import type * as THREE from "three";
import { dongContainsPoint } from "@/components/map-simulator/utils";
import { distanceXZ } from "@/components/map-simulator/road";
import type {
  DongRegion,
  ProjectedRoadSegment,
} from "@/components/map-simulator/types";

export type DemandCorridorSegment = {
  segment: ProjectedRoadSegment;
  index: number;
  center: THREE.Vector3;
  length: number;
  angle: number;
  dongNames: string[];
};

export function buildDemandCorridorSegments(
  roadSegments: ProjectedRoadSegment[],
  dongRegions: DongRegion[],
) {
  return roadSegments
    .filter((segment) => segment.roadClass !== "local")
    .map((segment, index) => {
      const length = distanceXZ(segment.start, segment.end);
      const center = segment.start.clone().lerp(segment.end, 0.5);
      return {
        segment,
        index,
        center,
        length,
        angle: Math.atan2(
          segment.end.x - segment.start.x,
          segment.end.z - segment.start.z,
        ),
        dongNames: dongRegions
          .filter((dong) => dongContainsPoint(dong, center))
          .map((dong) => dong.name),
      } satisfies DemandCorridorSegment;
    })
    .filter((entry) => entry.length >= 14 && entry.dongNames.length > 0)
    .slice(0, 520);
}
