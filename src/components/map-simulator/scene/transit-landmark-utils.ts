import * as THREE from "three";
import { projectPoint } from "@/components/map-simulator/utils";
import { distanceXZ } from "@/components/map-simulator/road";
import {
  nearestRoadContext,
  roadRank,
} from "@/components/map-simulator/road";
import {
  type ProjectedRoadSegment,
  type RoadSegmentSpatialIndex,
  type TaxiStandFeatureCollection,
  type TaxiStandLandmark,
  type TransitFeatureCollection,
  type TransitLandmark,
} from "@/components/map-simulator/types";

function filterTransitBySpacing(
  landmarks: TransitLandmark[],
  minimumDistance: number,
  maximumCount: number,
) {
  const kept: TransitLandmark[] = [];
  landmarks
    .sort((left, right) => {
      const importanceGap = right.importance - left.importance;
      if (importanceGap !== 0) {
        return importanceGap;
      }

      return (left.name ?? "").localeCompare(right.name ?? "", "ko");
    })
    .forEach((landmark) => {
      if (kept.length >= maximumCount) {
        return;
      }

      if (
        kept.every(
          (entry) =>
            distanceXZ(entry.position, landmark.position) >= minimumDistance,
        )
      ) {
        kept.push(landmark);
      }
    });

  return kept;
}

export function buildTransitLandmarks(
  transit: TransitFeatureCollection,
  center: { lat: number; lon: number },
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex,
) {
  const raw = transit.features
    .map((feature, index) => {
      if (feature.geometry.type !== "Point") {
        return null;
      }

      const originalPoint = projectPoint(feature.geometry.coordinates, center);

      if (feature.properties.category === "bus_stop") {
        const nearestRoad = nearestRoadContext(
          originalPoint,
          roadSegments,
          roadSegmentSpatialIndex,
          12,
        );
        if (
          !nearestRoad ||
          nearestRoad.distance > 12 ||
          nearestRoad.roadClass !== "arterial"
        ) {
          return null;
        }

        const right = new THREE.Vector3(
          nearestRoad.heading.z,
          0,
          -nearestRoad.heading.x,
        ).normalize();
        const sideSign =
          right.dot(originalPoint.clone().sub(nearestRoad.closest)) >= 0
            ? 1
            : -1;
        const importance =
          feature.properties.importance +
          roadRank(nearestRoad.roadClass) * 2 +
          (nearestRoad.name ? 1 : 0);

        return {
          id: `transit-${index}`,
          category: "bus_stop" as const,
          name: feature.properties.name,
          position: nearestRoad.closest
            .clone()
            .addScaledVector(
              right,
              sideSign * (nearestRoad.width * 0.58 + 1.35),
            )
            .setY(0.12),
          heading: nearestRoad.heading.clone(),
          sideSign,
          yaw: Math.atan2(nearestRoad.heading.x, nearestRoad.heading.z),
          importance,
          roadClass: nearestRoad.roadClass,
          isMajor: nearestRoad.roadClass === "arterial" || importance >= 9,
        } satisfies TransitLandmark;
      }

      const nearestRoad = nearestRoadContext(
        originalPoint,
        roadSegments,
        roadSegmentSpatialIndex,
        22,
      );
      if (!nearestRoad) {
        return null;
      }
      const nearestHeading = nearestRoad.heading.clone();
      const nearestRight = new THREE.Vector3(
        nearestHeading.z,
        0,
        -nearestHeading.x,
      ).normalize();
      const sideSign =
        nearestRoad && nearestRoad.distance < 22
          ? nearestRight.dot(originalPoint.clone().sub(nearestRoad.closest)) >=
            0
            ? 1
            : -1
          : 1;
      const position =
        nearestRoad && nearestRoad.distance < 22
          ? nearestRoad.closest
            .clone()
            .addScaledVector(
              nearestRight,
              sideSign * (nearestRoad.width * 0.42 + 2.3),
            )
            .setY(0.12)
          : originalPoint.clone().setY(0.12);

      return {
        id: `transit-${index}`,
        category: "subway_station" as const,
        name: feature.properties.name,
        position,
        heading: nearestHeading,
        sideSign,
        yaw: Math.atan2(nearestHeading.x, nearestHeading.z),
        importance:
          feature.properties.importance +
          2 +
          (feature.properties.name ? 4 : 0) +
          (nearestRoad?.name ? 1 : 0),
        roadClass: nearestRoad?.roadClass ?? null,
        isMajor: Boolean(feature.properties.name),
      } satisfies TransitLandmark;
    })
    .filter(Boolean) as TransitLandmark[];

  const subwayStations = filterTransitBySpacing(
    raw.filter((feature) => feature.category === "subway_station"),
    62,
    8,
  );
  const busStops = filterTransitBySpacing(
    raw.filter((feature) => feature.category === "bus_stop"),
    62,
    8,
  );

  return [...subwayStations, ...busStops];
}

export function buildTaxiStandLandmarks(
  taxiStands: TaxiStandFeatureCollection,
  center: { lat: number; lon: number },
  roadSegments: ProjectedRoadSegment[],
  roadSegmentSpatialIndex: RoadSegmentSpatialIndex,
) {
  const landmarks = taxiStands.features
    .map((feature, index) => {
      if (feature.geometry.type !== "Point" || !feature.properties.is_target_dong) {
        return null;
      }

      const originalPoint = projectPoint(feature.geometry.coordinates, center);
      const nearestRoad = nearestRoadContext(
        originalPoint,
        roadSegments,
        roadSegmentSpatialIndex,
        28,
      );
      if (!nearestRoad || nearestRoad.distance > 28) {
        return null;
      }

      const right = new THREE.Vector3(
        nearestRoad.heading.z,
        0,
        -nearestRoad.heading.x,
      ).normalize();
      const sideSign =
        right.dot(originalPoint.clone().sub(nearestRoad.closest)) >= 0 ? 1 : -1;
      const name =
        feature.properties.location_name ||
        feature.properties.road_address ||
        "택시승차대";

      return {
        id: `taxi-stand-${index}`,
        standId: feature.properties.stand_id,
        name,
        dongName: feature.properties.dong_name,
        roadAddress: feature.properties.road_address,
        position: nearestRoad.closest
          .clone()
          .addScaledVector(right, sideSign * (nearestRoad.width * 0.58 + 1.55))
          .setY(0.14),
        heading: nearestRoad.heading.clone(),
        sideSign,
        yaw: Math.atan2(nearestRoad.heading.x, nearestRoad.heading.z),
        isShelter: /쉘터/.test(feature.properties.stand_type),
      } satisfies TaxiStandLandmark;
    })
    .filter(Boolean) as TaxiStandLandmark[];

  return landmarks
    .sort((left, right) => left.name.localeCompare(right.name, "ko"))
    .slice(0, 24);
}
