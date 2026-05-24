import * as THREE from "three";
import {
  outerRingOfBuilding,
  outerRingsOfDong,
} from "@/components/map-simulator/map-geometry-utils";
import { distanceXZ, polygonAreaXZ } from "@/components/map-simulator/route-motion-utils";
import {
  BUILDING_HEIGHT_SCALE,
  LARGE_LOW_RISE_BUILDING_AREA_M2,
  LARGE_LOW_RISE_BUILDING_MAX_HEIGHT_M,
} from "@/components/map-simulator/scene-constants";
import type {
  BuildingFeatureCollection,
  BuildingMass,
  DongBoundarySegment,
  DongFeatureCollection,
  DongRegion,
} from "@/components/map-simulator/core";

const DONG_REGION_COLORS = [0x667983, 0x728274, 0x8f8068, 0x876f6a, 0x728193];

function colorForBuilding(height: number, kind?: string | null) {
  if (kind === "apartments" || kind === "residential") return 0xc9c2b4;
  if (kind === "commercial" || kind === "retail") return 0x92aebf;
  if (kind === "school" || kind === "university") return 0xcdb49d;
  if (kind === "hospital" || kind === "clinic") return 0xcee3ec;

  if (height >= 45) return 0x8f99a5;
  if (height >= 25) return 0x76808a;
  return 0x5d6670;
}

export function buildDongRegions(
  dongs: DongFeatureCollection,
  center: { lat: number; lon: number },
) {
  return dongs.features
    .map((feature, index) => {
      const rings = outerRingsOfDong(feature, center).filter(
        (ring) => ring.length >= 3,
      );
      if (!rings.length) {
        return null;
      }

      const bounds = new THREE.Box3();
      rings.forEach((ring) =>
        ring.forEach((point) => bounds.expandByPoint(point)),
      );

      return {
        id: `dong-${index}`,
        name: feature.properties.name,
        nameEn: feature.properties.nameEn,
        position: bounds.getCenter(new THREE.Vector3()),
        rings,
        color: DONG_REGION_COLORS[index % DONG_REGION_COLORS.length],
      } satisfies DongRegion;
    })
    .filter(Boolean) as DongRegion[];
}

function pointInDongRing(point: THREE.Vector3, ring: THREE.Vector3[]) {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const current = ring[index];
    const prior = ring[previous];
    const intersects =
      current.z > point.z !== prior.z > point.z &&
      point.x <
      ((prior.x - current.x) * (point.z - current.z)) /
      (prior.z - current.z || Number.EPSILON) +
      current.x;

    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

export function dongContainsPoint(dong: DongRegion, point: THREE.Vector3) {
  return dong.rings.some(
    (ring) => ring.length >= 3 && pointInDongRing(point, ring),
  );
}

function canonicalBoundaryPoint(point: THREE.Vector3) {
  return `${point.x.toFixed(3)}:${point.z.toFixed(3)}`;
}

export function buildDongBoundarySegments(dongRegions: DongRegion[]) {
  const segmentMap = new Map<
    string,
    {
      start: THREE.Vector3;
      end: THREE.Vector3;
    }
  >();

  dongRegions.forEach((dong) => {
    dong.rings.forEach((ring) => {
      for (let index = 0; index < ring.length - 1; index += 1) {
        const start = ring[index];
        const end = ring[index + 1];
        const length = distanceXZ(start, end);
        if (length < 1.5) {
          continue;
        }

        const useOriginalOrder =
          start.x < end.x ||
          (Math.abs(start.x - end.x) < 0.001 && start.z <= end.z);
        const canonicalStart = useOriginalOrder ? start : end;
        const canonicalEnd = useOriginalOrder ? end : start;
        const key = `${canonicalBoundaryPoint(canonicalStart)}|${canonicalBoundaryPoint(canonicalEnd)}`;

        if (!segmentMap.has(key)) {
          segmentMap.set(key, {
            start: canonicalStart.clone(),
            end: canonicalEnd.clone(),
          });
        }
      }
    });
  });

  return [...segmentMap.entries()]
    .map(([key, value]) => {
      const direction = value.end.clone().sub(value.start);
      const length = direction.length();
      const center = value.start.clone().lerp(value.end, 0.5);
      const normal = new THREE.Vector3(
        -direction.z,
        0,
        direction.x,
      ).normalize();
      const probeDistance = Math.min(Math.max(length * 0.08, 0.9), 2.2);
      const leftProbe = center.clone().addScaledVector(normal, probeDistance);
      const rightProbe = center.clone().addScaledVector(normal, -probeDistance);
      const leftDong =
        dongRegions.find((dong) => dongContainsPoint(dong, leftProbe))?.name ??
        null;
      const rightDong =
        dongRegions.find((dong) => dongContainsPoint(dong, rightProbe))?.name ??
        null;

      return {
        id: key,
        start: value.start,
        end: value.end,
        center,
        angle: Math.atan2(
          value.end.x - value.start.x,
          value.end.z - value.start.z,
        ),
        length,
        leftDong,
        rightDong,
      } satisfies DongBoundarySegment;
    })
    .filter(
      (segment) =>
        Boolean(segment.leftDong) &&
        Boolean(segment.rightDong) &&
        segment.leftDong !== segment.rightDong,
    );
}

export function buildBuildingMasses(
  buildings: BuildingFeatureCollection,
  center: { lat: number; lon: number },
) {
  const BUILDING_FOOTPRINT_INSET = 1.1;

  return buildings.features
    .map((feature, index) => {
      const footprintAreaM2 = feature.properties.area ?? 0;
      const heightMeters = feature.properties.height ?? 15;
      const label = feature.properties.label ?? "";
      const isLargeLowRiseComplex =
        footprintAreaM2 >= LARGE_LOW_RISE_BUILDING_AREA_M2 &&
        heightMeters <= LARGE_LOW_RISE_BUILDING_MAX_HEIGHT_M;
      const isUndergroundRetailSlab =
        /지하|underground/i.test(label) &&
        footprintAreaM2 >= 4_000 &&
        heightMeters <= LARGE_LOW_RISE_BUILDING_MAX_HEIGHT_M;

      // Very large low-rise footprints such as underground malls or horizontal
      // retail complexes collapse into one oversized slab when rendered as a
      // single box. Skipping those keeps roads/signals readable.
      if (isLargeLowRiseComplex || isUndergroundRetailSlab) {
        return null;
      }

      const ring = outerRingOfBuilding(feature, center);
      if (ring.length < 4) {
        return null;
      }

      let longestEdgeLength = 0;
      let rotationY = 0;
      for (let index = 0; index < ring.length - 1; index += 1) {
        const current = ring[index];
        const next = ring[index + 1];
        const edgeLength = distanceXZ(current, next);
        if (edgeLength <= longestEdgeLength) {
          continue;
        }
        longestEdgeLength = edgeLength;
        rotationY = Math.atan2(next.x - current.x, next.z - current.z);
      }

      const anchor = ring
        .reduce((sum, point) => sum.add(point), new THREE.Vector3())
        .multiplyScalar(1 / ring.length);
      const cos = Math.cos(rotationY);
      const sin = Math.sin(rotationY);
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minZ = Number.POSITIVE_INFINITY;
      let maxZ = Number.NEGATIVE_INFINITY;

      ring.forEach((point) => {
        const dx = point.x - anchor.x;
        const dz = point.z - anchor.z;
        const localX = dx * cos - dz * sin;
        const localZ = dx * sin + dz * cos;
        minX = Math.min(minX, localX);
        maxX = Math.max(maxX, localX);
        minZ = Math.min(minZ, localZ);
        maxZ = Math.max(maxZ, localZ);
      });

      const rawWidth = maxX - minX;
      const rawDepth = maxZ - minZ;
      const footprintArea = polygonAreaXZ(ring);
      const bboxArea = rawWidth * rawDepth;
      const footprintFillRatio =
        bboxArea > 0 ? THREE.MathUtils.clamp(footprintArea / bboxArea, 0, 1) : 1;
      // Concave or courtyard footprints look overly inflated as one box, so
      // compact them a bit while keeping the renderer lightweight.
      const compactScale =
        bboxArea >= 140 && footprintFillRatio < 0.92
          ? Math.sqrt(
            THREE.MathUtils.lerp(
              THREE.MathUtils.clamp(footprintFillRatio, 0.24, 1),
              1,
              0.42,
            ),
          )
          : 1;
      const width = Math.max(
        0.8,
        Math.max(0.8, rawWidth - BUILDING_FOOTPRINT_INSET) * compactScale,
      );
      const depth = Math.max(
        0.8,
        Math.max(0.8, rawDepth - BUILDING_FOOTPRINT_INSET) * compactScale,
      );
      if (width < 0.8 || depth < 0.8) {
        return null;
      }

      const localCenterX = (minX + maxX) / 2;
      const localCenterZ = (minZ + maxZ) / 2;
      const footprintCenter = new THREE.Vector3(
        anchor.x + localCenterX * cos + localCenterZ * sin,
        0,
        anchor.z - localCenterX * sin + localCenterZ * cos,
      );

      return {
        id: `building-${index}`,
        label: feature.properties.label,
        height: Math.max(2, heightMeters * BUILDING_HEIGHT_SCALE),
        position: footprintCenter,
        width,
        depth,
        rotationY,
        color: colorForBuilding(heightMeters, feature.properties.kind),
      } satisfies BuildingMass;
    })
    .filter(Boolean) as BuildingMass[];
}
