import * as THREE from "three";
import poiConfig from "@/components/map-simulator/config/gangnam-pois.json";
import type { SimulationData } from "@/components/map-simulator/map-simulator-types";
import { MAX_TAXI_COUNT } from "@/components/map-simulator/simulation-defaults";
import { projectPoint } from "@/components/map-simulator/map-geometry-utils";
import {
  format24Hour,
  normalizeDayMinutes,
} from "@/components/map-simulator/simulation-environment";
import type { MiniMapFocus } from "@/components/map-simulator/simulator-stores";
import type {
  DemandChartGeometry,
  DemandMiniMapData,
  DemandMiniMapLandmark,
  DemandMiniMapPoi,
  DemandMiniMapRegion,
  DemandWeekdayId,
  FiveMinuteDemandPoint,
  HourlyDemandPoint,
  MapPoiFeatureRow,
  TransitFeature,
} from "@/components/map-simulator/demand-types";
import { DEMAND_WEEKDAYS } from "@/components/map-simulator/demand-types";

export const PRIMARY_SUBWAY_STATION_NAMES = new Set([
  "강남",
  "역삼",
  "선릉",
  "신논현",
]);

export const DEMAND_SLOT_MINUTES = 5;
export const DEMAND_SLOTS_PER_HOUR = 60 / DEMAND_SLOT_MINUTES;
export const DEMAND_VISUAL_UNIT_CALLS = 100;
export const DEMAND_VISUAL_MAX_TAXIS = MAX_TAXI_COUNT;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function weekdayIdFromDate(dateIso: string): DemandWeekdayId {
  const parsed = new Date(`${dateIso}T00:00:00`);
  const dayIndex = Number.isFinite(parsed.getTime()) ? parsed.getDay() : 5;
  const byDayIndex: DemandWeekdayId[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return byDayIndex[dayIndex] ?? "friday";
}

export function weekdayLabel(id: DemandWeekdayId) {
  return DEMAND_WEEKDAYS.find((weekday) => weekday.id === id)?.label ?? "금";
}

export function withDemandTrend(points: HourlyDemandPoint[]) {
  return points.map((point, index) => {
    const neighbors = points.slice(
      Math.max(0, index - 1),
      Math.min(points.length, index + 2),
    );
    const averageDemand =
      neighbors.reduce((sum, neighbor) => sum + neighbor.demandPred, 0) /
      Math.max(1, neighbors.length);
    return {
      ...point,
      trendDemandPred: Math.round(averageDemand),
    };
  });
}

export function normalizeRemoteDemandPoints(payload: unknown) {
  const pointsPayload =
    payload && typeof payload === "object" && "points" in payload
      ? (payload as { points?: unknown }).points
      : null;
  if (!Array.isArray(pointsPayload)) {
    return null;
  }

  const points = pointsPayload.flatMap((point) => {
    if (!point || typeof point !== "object") {
      return [];
    }
    const record = point as Record<string, unknown>;
    const hour = Number(record.hour);
    const rawPopulationPred = Number(
      record.population_pred ?? record.populationPred ?? record.population,
    );
    const demandPred = Number(
      record.demand_count ??
        record.demandCount ??
        record.demand_pred ??
        record.demandPred ??
        record.demand,
    );
    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isFinite(demandPred)
    ) {
      return [];
    }
    return [
      {
        hour,
        populationPred: Number.isFinite(rawPopulationPred)
          ? Math.round(rawPopulationPred)
          : null,
        demandPred: Math.round(demandPred),
        trendDemandPred: 0,
      } satisfies HourlyDemandPoint,
    ];
  });

  if (!points.length) {
    return null;
  }

  return withDemandTrend(
    points
      .sort((left, right) => left.hour - right.hour)
      .filter(
        (point, index, sorted) =>
          index === 0 || point.hour !== sorted[index - 1]?.hour,
      ),
  );
}

export function demandVisualUnitCount(fiveMinuteDemand: number) {
  if (!Number.isFinite(fiveMinuteDemand) || fiveMinuteDemand <= 0) {
    return 0;
  }
  return THREE.MathUtils.clamp(
    Math.round(fiveMinuteDemand / DEMAND_VISUAL_UNIT_CALLS),
    1,
    DEMAND_VISUAL_MAX_TAXIS,
  );
}

export function buildFiveMinuteDemandSeries(points: HourlyDemandPoint[]) {
  if (!points.length) {
    return [];
  }

  const demandByHour = new globalThis.Map(
    points.map((point) => [point.hour, Math.max(0, point.demandPred)] as const),
  );
  const hourlyTotals = Array.from({ length: 24 }, (_, hour) =>
    demandByHour.get(hour) ?? 0,
  );
  const fiveMinutePoints: FiveMinuteDemandPoint[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    const hourlyTotal = hourlyTotals[hour]!;
    const slotDemand = hourlyTotal / DEMAND_SLOTS_PER_HOUR;

    for (let slot = 0; slot < DEMAND_SLOTS_PER_HOUR; slot += 1) {
      fiveMinutePoints.push({
        minuteOfDay: hour * 60 + slot * DEMAND_SLOT_MINUTES,
        hour,
        slot,
        demand: slotDemand,
        visualUnits: demandVisualUnitCount(slotDemand),
      });
    }
  }

  return fiveMinutePoints;
}

export function demandSlotLabel(point: FiveMinuteDemandPoint | null) {
  if (!point) {
    return "-";
  }
  const start = point.minuteOfDay;
  const end = normalizeDayMinutes(start + DEMAND_SLOT_MINUTES);
  return `${format24Hour(start)}-${format24Hour(end)}`;
}

export function buildDemandChartGeometry(
  points: HourlyDemandPoint[],
): DemandChartGeometry {
  const width = 320;
  const height = 164;
  const paddingLeft = 30;
  const paddingRight = 12;
  const paddingTop = 16;
  const paddingBottom = 28;
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;
  const maxDemand = Math.max(1, ...points.map((point) => point.demandPred));
  const yMax = Math.ceil(maxDemand / 50) * 50;
  const xForHour = (hour: number) => paddingLeft + (hour / 23) * graphWidth;
  const yForDemand = (demand: number) =>
    paddingTop + graphHeight - (Math.max(0, demand) / yMax) * graphHeight;
  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForDemand(point.demandPred).toFixed(2)}`,
    )
    .join(" ");
  const trendPath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForHour(point.hour).toFixed(2)} ${yForDemand(point.trendDemandPred).toFixed(2)}`,
    )
    .join(" ");
  const baseY = paddingTop + graphHeight;
  const areaPath = points.length
    ? `${linePath} L ${xForHour(points[points.length - 1]!.hour).toFixed(2)} ${baseY.toFixed(2)} L ${xForHour(points[0]!.hour).toFixed(2)} ${baseY.toFixed(2)} Z`
    : "";
  const peakPoint = points.reduce(
    (peak, point) => (point.demandPred > peak.demandPred ? point : peak),
    points[0] ?? {
      hour: 0,
      populationPred: null,
      demandPred: 0,
      trendDemandPred: 0,
    },
  );

  return {
    width,
    height,
    paddingLeft,
    baseY,
    yMax,
    linePath,
    trendPath,
    areaPath,
    peakPoint,
    peakX: xForHour(peakPoint.hour),
    peakY: yForDemand(peakPoint.demandPred),
    xTicks: [0, 6, 12, 18, 23].map((hour) => ({
      hour,
      x: xForHour(hour),
    })),
    yTicks: [0, Math.round(yMax / 2), yMax].map((value) => ({
      value,
      y: yForDemand(value),
    })),
  };
}

export function averageDemand(points: HourlyDemandPoint[]) {
  if (!points.length) return 0;
  return Math.round(
    points.reduce((sum, point) => sum + point.demandPred, 0) / points.length,
  );
}

export function scoreDemandAtHour(points: HourlyDemandPoint[], minutes: number) {
  if (!points.length) {
    return null;
  }
  const hour = Math.floor(normalizeDayMinutes(minutes) / 60);
  const point =
    points.find((candidate) => candidate.hour === hour) ?? points[0] ?? null;
  const maxDemand = Math.max(
    0,
    ...points.map((candidate) => candidate.demandPred),
  );
  if (!point || maxDemand <= 0) {
    return null;
  }
  return clamp01(point.demandPred / maxDemand);
}

export function contextPoiWeight(category: string | null | undefined) {
  if (category === "road_corridor_context") {
    return 0.85;
  }
  if (category === "station_context") {
    return 0.72;
  }
  return 0.58;
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

export function demandFillForScore(score: number | null, isSelected = false) {
  if (score === null) {
    return isSelected
      ? "rgba(148, 163, 184, 0.4)"
      : "rgba(148, 163, 184, 0.16)";
  }
  if (score >= 0.85) return "rgba(244, 63, 94, 0.75)";
  if (score >= 0.55) return "rgba(251, 146, 60, 0.65)";
  if (score >= 0.25) return "rgba(253, 224, 71, 0.55)";
  if (score >= 0.04) return "rgba(94, 234, 212, 0.35)";
  return "rgba(148, 163, 184, 0.20)";
}

export function demandStrokeForScore(score: number | null, isSelected = false) {
  if (isSelected) return "rgba(255, 255, 255, 0.95)";
  if (score === null) return "rgba(148, 163, 184, 0.42)";
  if (score >= 0.85) return "rgba(244, 63, 94, 0.95)";
  if (score >= 0.55) return "rgba(251, 146, 60, 0.90)";
  if (score >= 0.25) return "rgba(253, 224, 71, 0.80)";
  if (score >= 0.04) return "rgba(94, 234, 212, 0.66)";
  return "rgba(148, 163, 184, 0.44)";
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
  ];
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
  selectedDongName,
  dongDemandScores,
}: {
  data: SimulationData | null;
  mapPoiFeatureRows: MapPoiFeatureRow[];
  miniMapFocus: MiniMapFocus | null;
  scenarioMapCenter: THREE.Vector3 | null;
  activePoiCode: string;
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
  const padding = 5;
  const drawWidth = 100 - padding * 2;
  const drawHeight = 100 - padding * 2;
  const mapPoint = (point: THREE.Vector3) => ({
    x: padding + ((point.x - min.x) / width) * drawWidth,
    y: padding + ((point.z - min.z) / depth) * drawHeight,
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
          x2: THREE.MathUtils.clamp(focus.x + miniMapFocus.headingX * 10, 2, 98),
          y2: THREE.MathUtils.clamp(focus.y + miniMapFocus.headingZ * 10, 2, 98),
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
        const point = mapPoint(projected);
        const x = THREE.MathUtils.clamp(point.x, 4, 96);
        const y = THREE.MathUtils.clamp(point.y, 4, 96);
        const labelOnLeft = x > 76;
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
      .slice(0, 8)
      .map((poi, index) => {
        const projected = projectPoint(
          [poi.lon as number, poi.lat as number],
          data.center,
        );
        const point = mapPoint(projected);
        const x = THREE.MathUtils.clamp(point.x, 4, 96);
        const y = THREE.MathUtils.clamp(point.y, 4, 96);
        const labelOnLeft = x > 72;
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
