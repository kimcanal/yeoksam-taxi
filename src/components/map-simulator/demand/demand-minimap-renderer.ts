import * as THREE from "three";
import poiConfig from "@/components/map-simulator/config/gangnam-pois.json";
import {
  DEMAND_CONTEXT_POI_WEIGHTS,
  DEMAND_MINI_MAP_EDGE_INSET,
  DEMAND_MINI_MAP_HEADING_EDGE_INSET,
  DEMAND_MINI_MAP_HEADING_LENGTH,
  DEMAND_MINI_MAP_LANDMARK_LABEL_LEFT_THRESHOLD,
  DEMAND_MINI_MAP_MAX_POIS,
  DEMAND_MINI_MAP_PADDING,
  DEMAND_MINI_MAP_POI_LABEL_LEFT_THRESHOLD,
  DEMAND_MINI_MAP_VIEWBOX_SIZE,
  PRIMARY_SUBWAY_STATION_NAMES,
} from "@/components/map-simulator/constants/demand-constants";
import type {
  DemandMiniMapData,
  DemandMiniMapLandmark,
  DemandMiniMapPoi,
  DemandMiniMapRegion,
  MapPoiFeatureRow,
  TransitFeature,
} from "@/components/map-simulator/demand";
import { projectPoint } from "@/components/map-simulator/utils";
import type { SimulationData } from "@/components/map-simulator/types";
import type { MiniMapFocus } from "@/components/map-simulator/hooks";

export function contextPoiWeight(category: string | null | undefined) {
  if (category === "road_corridor_context") {
    return DEMAND_CONTEXT_POI_WEIGHTS.roadCorridor;
  }
  if (category === "station_context") {
    return DEMAND_CONTEXT_POI_WEIGHTS.station;
  }
  return DEMAND_CONTEXT_POI_WEIGHTS.fallback;
}

export function isSubwayStationFeature(feature: TransitFeature) {
  return (
    feature.properties.category === "subway_station" &&
    feature.properties.sourceType === "station"
  );
}

export function projectedRingArea(ring: THREE.Vector3[]) {
  if (ring.length < 3) {
    return 0;
  }
  let area = 0;
  ring.forEach((point, index) => {
    const next = ring[(index + 1) % ring.length]!;
    area += point.x * next.z - next.x * point.z;
  });
  return Math.abs(area) / 2;
}

export function displayRingsForHeatmap(rings: THREE.Vector3[][]) {
  const validRings = rings.filter((ring) => ring.length >= 3);
  if (validRings.length <= 1) {
    return validRings;
  }

  return [
    validRings.reduce((largest, ring) =>
      projectedRingArea(ring) > projectedRingArea(largest) ? ring : largest,
    ),
  ];
}

export function centerOfRings(rings: THREE.Vector3[][]) {
  const bounds = new THREE.Box3();
  rings.forEach((ring) =>
    ring.forEach((point) => bounds.expandByPoint(point)),
  );
  return bounds.getCenter(new THREE.Vector3());
}

export function compactPoiLabel(name: string) {
  const normalized = name.replace(/\s+/g, " ").trim();
  return normalized.length > 8 ? normalized.slice(0, 8) : normalized;
}

export function buildStaticPoiFeatureRows() {
  const rows = [
    ...poiConfig.context_pois.map((poi) => ({
      code: poi.code,
      name: poi.name,
      coverageDong: poi.coverage_dong,
      category: poi.category,
      lon: poi.lon,
      lat: poi.lat,
    })),
    ...poiConfig.supplemental_context_pois.map((poi) => ({
      code: poi.id,
      name: poi.name,
      coverageDong: poi.coverage_dong,
      category: poi.category,
      lon: poi.lon,
      lat: poi.lat,
    })),
  ].filter((poi) => poi.coverageDong !== null);
  const rawScores = rows.map((poi) => contextPoiWeight(poi.category));
  const maxScore = Math.max(...rawScores, 1);

  return rows
    .map((poi, index) => {
      const contextScore =
        Math.round(((rawScores[index] ?? 0) / maxScore) * 1000) / 1000;
      return {
        poi_code: poi.code,
        poi_name: poi.name,
        coverage_dong: poi.coverageDong,
        category: poi.category,
        lon: poi.lon,
        lat: poi.lat,
        context_score: contextScore,
      } satisfies MapPoiFeatureRow;
    })
    .sort((left, right) => right.context_score - left.context_score);
}

export function buildDemandMiniMapData({
  data,
  mapPoiFeatureRows,
  miniMapFocus,
  scenarioMapCenter,
  activePoiCode,
  dongDemandCounts,
  selectedDongName,
  dongDemandScores,
}: {
  data: SimulationData | null;
  mapPoiFeatureRows: MapPoiFeatureRow[];
  miniMapFocus: MiniMapFocus | null;
  scenarioMapCenter: THREE.Vector3 | null;
  activePoiCode: string;
  dongDemandCounts: Record<string, number>;
  selectedDongName: string;
  dongDemandScores: Record<string, number>;
}): DemandMiniMapData | null {
  const dongRegions = data?.dongRegions;
  if (!data || !dongRegions?.length) {
    return null;
  }

  const displayDongs = dongRegions
    .map((dong) => ({
      ...dong,
      rings: displayRingsForHeatmap(dong.rings),
    }))
    .filter((dong) => dong.rings.length > 0);

  const bounds = new THREE.Box3();
  displayDongs.forEach((dong) => {
    dong.rings.forEach((ring) => {
      ring.forEach((point) => bounds.expandByPoint(point));
    });
  });

  const min = bounds.min;
  const size = bounds.getSize(new THREE.Vector3());
  const width = Math.max(size.x, 1);
  const depth = Math.max(size.z, 1);
  const drawSize = DEMAND_MINI_MAP_VIEWBOX_SIZE - DEMAND_MINI_MAP_PADDING * 2;
  const maxDimension = Math.max(width, depth);
  const scale = drawSize / maxDimension;
  const xOffset =
    DEMAND_MINI_MAP_PADDING + (drawSize - width * scale) / 2;
  const yOffset =
    DEMAND_MINI_MAP_PADDING + (drawSize - depth * scale) / 2;

  const mapPoint = (point: THREE.Vector3) => ({
    x: xOffset + (point.x - min.x) * scale,
    y: yOffset + (point.z - min.z) * scale,
  });
  const focusPoint = miniMapFocus
    ? new THREE.Vector3(miniMapFocus.x, 0, miniMapFocus.z)
    : scenarioMapCenter;
  const focus = focusPoint ? mapPoint(focusPoint) : null;
  const focusHeading =
    focus && miniMapFocus
      ? {
          x1: focus.x,
          y1: focus.y,
          x2: THREE.MathUtils.clamp(
            focus.x + miniMapFocus.headingX * DEMAND_MINI_MAP_HEADING_LENGTH,
            DEMAND_MINI_MAP_HEADING_EDGE_INSET,
            DEMAND_MINI_MAP_VIEWBOX_SIZE - DEMAND_MINI_MAP_HEADING_EDGE_INSET,
          ),
          y2: THREE.MathUtils.clamp(
            focus.y + miniMapFocus.headingZ * DEMAND_MINI_MAP_HEADING_LENGTH,
            DEMAND_MINI_MAP_HEADING_EDGE_INSET,
            DEMAND_MINI_MAP_VIEWBOX_SIZE - DEMAND_MINI_MAP_HEADING_EDGE_INSET,
          ),
        }
      : null;

  return {
    regions: displayDongs.map((dong) => {
      const path = dong.rings
        .map((ring) =>
          ring
            .map((point, index) => {
              const mapped = mapPoint(point);
              return `${index === 0 ? "M" : "L"} ${mapped.x.toFixed(2)} ${mapped.y.toFixed(2)}`;
            })
            .join(" ")
            .concat(" Z"),
        )
        .join(" ");
      const labelPoint = mapPoint(centerOfRings(dong.rings));
      return {
        name: dong.name,
        path,
        labelX: labelPoint.x,
        labelY: labelPoint.y,
        score: dongDemandScores[dong.name] ?? null,
        demandCount: dongDemandCounts[dong.name] ?? null,
        isSelected: dong.name === selectedDongName,
      } satisfies DemandMiniMapRegion;
    }),
    landmarks: data.transit.features
      .filter(isSubwayStationFeature)
      .flatMap((feature) => {
        const name = feature.properties.name ?? "";
        if (!name) {
          return [];
        }
        const isPrimary = PRIMARY_SUBWAY_STATION_NAMES.has(name);
        const projected = projectPoint(feature.geometry.coordinates, data.center);
        if (!bounds.containsPoint(projected)) {
          return [];
        }
        const point = mapPoint(projected);
        const x = THREE.MathUtils.clamp(
          point.x,
          DEMAND_MINI_MAP_EDGE_INSET,
          DEMAND_MINI_MAP_VIEWBOX_SIZE - DEMAND_MINI_MAP_EDGE_INSET,
        );
        const y = THREE.MathUtils.clamp(
          point.y,
          DEMAND_MINI_MAP_EDGE_INSET,
          DEMAND_MINI_MAP_VIEWBOX_SIZE - DEMAND_MINI_MAP_EDGE_INSET,
        );
        const labelOnLeft = x > DEMAND_MINI_MAP_LANDMARK_LABEL_LEFT_THRESHOLD;
        return [
          {
            name: `${name}역`,
            label: name,
            isPrimary,
            x,
            y,
            labelX: labelOnLeft ? x - 2.1 : x + 2.1,
            labelY: y - 1.2,
            textAnchor: labelOnLeft ? "end" : "start",
          } satisfies DemandMiniMapLandmark,
        ];
      })
      .sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? 1 : -1;
        }
        return left.label.localeCompare(right.label, "ko");
      }),
    pois: [...mapPoiFeatureRows]
      .filter((poi) => Number.isFinite(poi.lon) && Number.isFinite(poi.lat))
      .sort((left, right) => right.context_score - left.context_score)
      .slice(0, DEMAND_MINI_MAP_MAX_POIS)
      .map((poi, index) => {
        const projected = projectPoint(
          [poi.lon as number, poi.lat as number],
          data.center,
        );
        const point = mapPoint(projected);
        const x = THREE.MathUtils.clamp(
          point.x,
          DEMAND_MINI_MAP_EDGE_INSET,
          DEMAND_MINI_MAP_VIEWBOX_SIZE - DEMAND_MINI_MAP_EDGE_INSET,
        );
        const y = THREE.MathUtils.clamp(
          point.y,
          DEMAND_MINI_MAP_EDGE_INSET,
          DEMAND_MINI_MAP_VIEWBOX_SIZE - DEMAND_MINI_MAP_EDGE_INSET,
        );
        const labelOnLeft = x > DEMAND_MINI_MAP_POI_LABEL_LEFT_THRESHOLD;
        return {
          code: poi.poi_code,
          name: poi.poi_name,
          label: compactPoiLabel(poi.poi_name),
          x,
          y,
          labelX: labelOnLeft ? x - 2.6 : x + 2.6,
          labelY: y + (index % 2 === 0 ? -1.8 : 3),
          contextScore: poi.context_score,
          isSelected: poi.poi_code === activePoiCode,
          textAnchor: labelOnLeft ? "end" : "start",
        } satisfies DemandMiniMapPoi;
      }),
    focus,
    focusHeading,
    focusLabel: miniMapFocus?.label ?? "현재 지도 중심",
  };
}
